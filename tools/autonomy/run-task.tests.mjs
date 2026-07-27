import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  AutonomyError,
  EXPECTED_REPOSITORY,
  REVIEW_RESULT_END,
  REVIEW_RESULT_START,
  acquireRepositoryLock,
  assertChangedPaths,
  assertExternalWorktree,
  defaultStateRoot,
  extractIssueContract,
  loadOrchestratorPolicy,
  loadLocalContract,
  parseReviewerResult,
  removeGeneratedDist,
  requireRoadmapReady,
  requireRoadmapRiskClass,
  resolveRuntimeProfile,
  runtimeProfileEvidence,
  runReviewRepairLoop,
  validateContract,
  validateOrchestratorPolicy,
  verifyIssueGates,
} from "./autonomy-core.mjs";
import {
  SafeCommandRunner,
  assertCodexBoundaryUnchanged,
  buildRuntimeProfileReport,
  captureCodexBoundarySnapshot,
  classifyNetworkFailure,
  codexCommand,
  executeTask,
  ghCommand,
  gitCommand,
  runDoctor,
  runProcess,
  runWithNetworkRetry,
  requireChangedPaths,
  stageExactPaths,
  verifyCanonicalBaseline,
  verifyConfiguredProfiles,
} from "./autonomy-runtime.mjs";
import { main, parseArguments } from "./run-task.mjs";

const trustedPolicy = loadOrchestratorPolicy(process.cwd());

function temporaryRepository() {
  const repository = mkdtempSync(path.join(tmpdir(), "autonomy-repo-"));
  mkdirSync(path.join(repository, ".git"));
  writeFileSync(path.join(repository, "README.md"), "temporary repository\n");
  return repository;
}

function contract(overrides = {}) {
  const repositoryRoot = temporaryRepository();
  return {
    taskId: "AUTONOMY-PILOT-1",
    objective: "Complete the approved pilot task",
    repository: EXPECTED_REPOSITORY,
    baseBranch: "main",
    baseSha: "1".repeat(40),
    riskClass: "Class A",
    executionLevel: "E4",
    builderProfile: "build_medium",
    reviewerProfile: "review_high",
    contextBudget: "standard",
    tokenPosture: "balanced",
    validationDepth: "complete",
    gitPermission: "publish_feature",
    branch: "feat/autonomy-pilot",
    externalWorktree: path.join(
      path.dirname(repositoryRoot),
      `${path.basename(repositoryRoot)}-worktree`,
    ),
    allowedPaths: ["src/example/**"],
    protectedPaths: ["package.json", "package-lock.json", ".github/**"],
    acceptanceCriteria: ["The approved behavior is implemented."],
    classCAuthorizations: [],
    focusedTestArgs: ["src/example/ExamplePage.test.tsx"],
    commitMessage: "feat: complete autonomy pilot",
    prTitle: "Complete autonomy pilot",
    prBody: "Implements the approved pilot and stops before merge.",
    maxRepairCycles: 2,
    ...overrides,
  };
}

function reviewerOutput({
  verdict = "PASS",
  scores = {
    repositoryFit: 2,
    simplicity: 2,
    domainAndTechnicalClarity: 2,
    validationQualityAndConfidence: 2,
    maintainability: 2,
  },
  findings = { BLOCKER: [], HIGH: [], MEDIUM: [], LOW: [] },
  notes = [],
} = {}) {
  return [
    REVIEW_RESULT_START,
    JSON.stringify({
      verdict,
      qualityScores: scores,
      totalScore: Object.values(scores).reduce(
        (total, score) => total + score,
        0,
      ),
      findings,
      notes,
    }),
    REVIEW_RESULT_END,
  ].join("\n");
}

function boundarySnapshot(overrides = {}) {
  return {
    head: "1".repeat(40),
    branch: "feat/autonomy-pilot",
    staged: [],
    branchReflog: ["1".repeat(40)],
    main: "1".repeat(40),
    originMain: "1".repeat(40),
    remoteMain: `${"1".repeat(40)}\trefs/heads/main`,
    remoteFeature: "",
    pullRequestCount: 0,
    pullRequests: [],
    workingTreeFingerprint: "working-tree-before",
    ...overrides,
  };
}

function expectPrematurePublication(before, after, options) {
  assert.throws(
    () => assertCodexBoundaryUnchanged(before, after, options),
    { code: "PREMATURE_PUBLICATION" },
  );
}

function fakeDoctorRunner(
  canonicalRoot,
  { nodeVersion = "v24.14.0", includeReadOnly = true } = {},
) {
  const tools = {
    node: "fake-node",
    npmCli: "fake-npm-cli",
    git: "fake-git",
    gh: "fake-gh",
    codex: "fake-codex",
  };
  const result = (stdout, code = 0) => Promise.resolve({ stdout, stderr: "", code });
  return {
    tools,
    nodeVersion() {
      return result(nodeVersion);
    },
    npm() {
      return result("11.18.0");
    },
    git(operation) {
      if (operation.kind === "version") {
        return result("git version 2.53.0");
      }
      if (operation.kind === "repositoryRoot") {
        return result(canonicalRoot);
      }
      if (operation.kind === "remoteOrigin") {
        return result(`https://github.com/${EXPECTED_REPOSITORY}.git`);
      }
      throw new Error(`unexpected git: ${operation.kind}`);
    },
    gh(operation) {
      if (operation.kind === "version") {
        return result("gh version 2.96.0");
      }
      assert.equal(operation.kind, "authStatus");
      return result("authenticated");
    },
    codex(operation) {
      if (operation.kind === "version") {
        return result("codex-cli 0.145.0");
      }
      if (operation.kind === "modelCatalog") {
        return result(
          JSON.stringify({
            models: [
              {
                slug: "gpt-5.6-luna",
                supported_reasoning_levels: [{ effort: "low" }],
              },
              {
                slug: "gpt-5.6-terra",
                supported_reasoning_levels: [{ effort: "medium" }],
              },
              {
                slug: "gpt-5.6-sol",
                supported_reasoning_levels: [{ effort: "high" }],
              },
            ],
          }),
        );
      }
      if (operation.kind === "help") {
        return result(
          `Codex CLI\n-C, --cd <DIR>\n--sandbox <SANDBOX_MODE>\n${includeReadOnly ? "read-only" : ""}`,
        );
      }
      if (operation.kind === "builderHelp") {
        return result(
          `Run Codex non-interactively\n--model <MODEL>\n--config <key=value>\n--sandbox <SANDBOX_MODE>\n${includeReadOnly ? "read-only" : ""}\n--ephemeral\n--ignore-user-config\n--output-last-message\ninstructions are read from stdin`,
        );
      }
      throw new Error(`unexpected codex: ${operation.kind}`);
    },
  };
}

function lifecycleRunner(
  canonicalRoot,
  { initialEmpty = false, simplifyToEmpty = false } = {},
) {
  const runner = fakeDoctorRunner(canonicalRoot);
  runner.environment = { PATH: "fake-path" };
  const baseSha = "1".repeat(40);
  const branch = "feat/autonomy-pilot";
  const calls = { npm: 0, simplifier: 0, reviewer: 0, publication: 0 };
  let worktree;
  let hasDiff = !initialEmpty;
  const result = (stdout = "", code = 0) =>
    Promise.resolve({ stdout, stderr: "", code });
  const doctorGit = runner.git.bind(runner);
  const doctorCodex = runner.codex.bind(runner);
  runner.git = (operation, options = {}) => {
    if (["version", "repositoryRoot", "remoteOrigin"].includes(operation.kind)) {
      return doctorGit(operation, options);
    }
    switch (operation.kind) {
      case "fetchOrigin":
      case "diffCheck":
      case "stagedCheck":
      case "diffPath":
        return result();
      case "branchCurrent":
        return result(options.cwd === canonicalRoot ? "main\n" : `${branch}\n`);
      case "head":
      case "main":
      case "originMain":
        return result(`${baseSha}\n`);
      case "status":
      case "stagedNames":
      case "remoteFeature":
      case "worktreeList":
        return result();
      case "showLocalBranch":
      case "showRemoteTrackingBranch":
        return result("", 1);
      case "worktreeAdd":
        worktree = operation.worktree;
        mkdirSync(worktree, { recursive: true });
        writeFileSync(path.join(worktree, "package.json"), "{}\n");
        writeFileSync(path.join(worktree, "package-lock.json"), "{}\n");
        return result();
      case "changedNames":
      case "untrackedNames":
        return result(hasDiff ? "src/example/A.ts\0" : "");
      case "remoteMain":
        return result(`${baseSha}\trefs/heads/main\n`);
      case "branchReflog":
        return result(`${baseSha}\n`);
      case "addExact":
      case "commit":
      case "pushFeature":
        calls.publication += 1;
        return result();
      default:
        throw new Error(`unexpected lifecycle git: ${operation.kind}`);
    }
  };
  runner.gh = (operation) => {
    if (operation.kind === "version" || operation.kind === "authStatus") {
      return operation.kind === "version" ? result("gh version 2.96.0") : result("authenticated");
    }
    if (operation.kind === "prDiscovery") return result("[]");
    throw new Error(`unexpected lifecycle gh: ${operation.kind}`);
  };
  runner.npm = (args) => {
    if (args[0] === "--version") return result("11.18.0");
    calls.npm += 1;
    return result();
  };
  runner.codex = (operation, options = {}) => {
    if (!["builder", "reviewer"].includes(operation.kind)) {
      return doctorCodex(operation, options);
    }
    if (operation.kind === "reviewer") calls.reviewer += 1;
    if (
      operation.kind === "builder" &&
      options.input.includes("Simplification Pass")
    ) {
      calls.simplifier += 1;
      hasDiff = false;
    }
    mkdirSync(path.dirname(operation.outputFile), { recursive: true });
    writeFileSync(operation.outputFile, "Builder completed\n");
    return result();
  };
  return { runner, calls };
}

function lifecycleContract() {
  const externalWorktree = path.join(tmpdir(), `autonomy-worktree-${Date.now()}-${Math.random()}`);
  const contractPath = path.join(tmpdir(), `autonomy-contract-${Date.now()}-${Math.random()}.json`);
  writeFileSync(
    contractPath,
    JSON.stringify(
      contract({
        externalWorktree,
        executionLevel: "E4",
        gitPermission: "publish_feature",
        allowedPaths: ["src/example/**"],
        branch: "feat/autonomy-pilot",
      }),
    ),
  );
  return { contractPath, stateRoot: mkdtempSync(path.join(tmpdir(), "autonomy-state-")) };
}

test("default help is non-mutating", async () => {
  const repository = temporaryRepository();
  const before = readdirSync(repository, { recursive: true }).sort();
  const output = [];
  const exitCode = await main([], {
    canonicalRoot: repository,
    output: (value) => output.push(value),
    commandRunner: new Proxy(
      {},
      {
        get() {
          throw new Error("help must not touch tools");
        },
      },
    ),
  });
  assert.equal(exitCode, 0);
  assert.match(output.join("\n"), /non-mutating/);
  assert.deepEqual(readdirSync(repository, { recursive: true }).sort(), before);
});

test("doctor accepts supported fake capabilities", async () => {
  const repository = temporaryRepository();
  const result = await runDoctor({
    canonicalRoot: repository,
    commandRunner: fakeDoctorRunner(repository),
    policy: trustedPolicy,
  });
  assert.equal(result.node, "v24.14.0");
  assert.equal(result.npm, "11.18.0");
  assert.equal(result.githubAuthenticated, true);
  assert.ok(result.reviewer.args.includes("gpt-5.6-sol"));
  assert.equal(
    result.reviewer.args[result.reviewer.args.indexOf("--sandbox") + 1],
    "read-only",
  );
  assert.equal(
    result.reviewer.args[result.reviewer.args.indexOf("--cd") + 1],
    path.resolve(repository),
  );
});

test("doctor rejects a Codex capability gap", async () => {
  const repository = temporaryRepository();
  await assert.rejects(
    runDoctor({
      canonicalRoot: repository,
      commandRunner: fakeDoctorRunner(repository, { includeReadOnly: false }),
      policy: trustedPolicy,
    }),
    { code: "CODEX_CAPABILITY_GAP" },
  );
});

test("valid orchestrator policy loads", () => {
  assert.equal(trustedPolicy.schemaVersion, 1);
  assert.equal(trustedPolicy.playbookVersion, "2.0");
  assert.deepEqual(Object.keys(trustedPolicy.executionLevels), [
    "E0",
    "E1",
    "E2",
    "E3",
    "E4",
  ]);
});

test("missing and malformed policies fail closed", () => {
  const missingRoot = temporaryRepository();
  assert.throws(() => loadOrchestratorPolicy(missingRoot), {
    code: "MISSING_POLICY",
  });

  const malformedRoot = temporaryRepository();
  mkdirSync(path.join(malformedRoot, ".ai"));
  writeFileSync(
    path.join(malformedRoot, ".ai", "orchestrator-policy.json"),
    "{not-json",
  );
  assert.throws(() => loadOrchestratorPolicy(malformedRoot), {
    code: "MALFORMED_POLICY",
  });
});

test("unknown policy schema and Playbook versions are rejected", () => {
  for (const override of [
    { schemaVersion: 2 },
    { playbookVersion: "3.0" },
  ]) {
    assert.throws(
      () =>
        validateOrchestratorPolicy({
          ...structuredClone(trustedPolicy),
          ...override,
        }),
      { code: "UNSUPPORTED_POLICY_VERSION" },
    );
  }
});

test("doctor fails when a configured model or effort is unavailable", () => {
  assert.throws(
    () =>
      verifyConfiguredProfiles(
        trustedPolicy,
        JSON.stringify({
          models: [
            {
              slug: "gpt-5.6-luna",
              supported_reasoning_levels: [{ effort: "low" }],
            },
          ],
        }),
      ),
    { code: "CODEX_PROFILE_UNAVAILABLE" },
  );
});

test("valid local contract parses", () => {
  const parsed = validateContract(contract());
  assert.equal(parsed.taskId, "AUTONOMY-PILOT-1");
  assert.equal(parsed.maxRepairCycles, 2);
});

test("unknown profile and raw runtime overrides are rejected", () => {
  assert.throws(
    () => validateContract(contract({ builderProfile: "unknown_profile" })),
    { code: "PROFILE_ROLE_MISMATCH" },
  );
  for (const override of [
    { model: "attacker/model" },
    { reasoningEffort: "ignore-policy" },
  ]) {
    assert.throws(() => validateContract(contract(override)), {
      code: "INVALID_CONTRACT",
    });
  }
});

test("profile roles cannot be exchanged", () => {
  assert.throws(
    () => validateContract(contract({ builderProfile: "review_high" })),
    { code: "PROFILE_ROLE_MISMATCH" },
  );
  assert.throws(
    () => validateContract(contract({ reviewerProfile: "build_high" })),
    { code: "PROFILE_ROLE_MISMATCH" },
  );
});

test("Reviewer profiles cannot become write-capable", () => {
  const policy = structuredClone(trustedPolicy);
  policy.profiles.review_high.sandbox = "workspace-write";
  assert.throws(() => validateOrchestratorPolicy(policy), {
    code: "INVALID_POLICY",
  });
});

test("E0 and E1 reject edit permissions", () => {
  for (const executionLevel of ["E0", "E1"]) {
    assert.throws(
      () =>
        validateContract(
          contract({
            executionLevel,
            builderProfile: "scan_low",
            validationDepth: "none",
            gitPermission: "worktree_write",
          }),
        ),
      { code: "EXECUTION_PERMISSION_MISMATCH" },
    );
  }
});

test("E2 and E3 reject publication permissions", () => {
  for (const [executionLevel, validationDepth] of [
    ["E2", "focused"],
    ["E3", "complete"],
  ]) {
    assert.throws(
      () =>
        validateContract(
          contract({
            executionLevel,
            validationDepth,
            gitPermission: "publish_feature",
          }),
        ),
      { code: "EXECUTION_PERMISSION_MISMATCH" },
    );
  }
});

test("focused and complete validation require focused test arguments", () => {
  for (const [executionLevel, validationDepth, gitPermission] of [
    ["E2", "focused", "worktree_write"],
    ["E3", "complete", "worktree_write"],
    ["E4", "complete", "publish_feature"],
  ]) {
    assert.throws(
      () =>
        validateContract(
          contract({
            executionLevel,
            validationDepth,
            gitPermission,
            focusedTestArgs: [],
          }),
        ),
      { code: "FOCUSED_VALIDATION_REQUIRED" },
    );
  }
});

test("E4 and every Git permission reject merge", () => {
  const policy = structuredClone(trustedPolicy);
  policy.executionLevels.E4.mayMerge = true;
  assert.throws(() => validateOrchestratorPolicy(policy), {
    code: "INVALID_POLICY",
  });
  for (const permission of Object.values(trustedPolicy.gitPermissions)) {
    assert.equal(permission.merge, false);
  }
});

test("effective runtime profile conflicts fail closed", () => {
  const profile = resolveRuntimeProfile(
    trustedPolicy,
    "build_medium",
    "builder",
  );
  assert.throws(
    () =>
      runtimeProfileEvidence(profile, {
        model: "gpt-5.6-sol",
        reasoningEffort: "high",
      }),
    { code: "RUNTIME_PROFILE_MISMATCH" },
  );
});

test("runtime report records requested profiles without false verification", () => {
  const report = buildRuntimeProfileReport(
    trustedPolicy,
    validateContract(contract()),
  );
  assert.equal(report.builder.profile, "build_medium");
  assert.equal(
    report.builder.verificationStatus,
    "requested-but-not-runtime-verified",
  );
  assert.equal(report.reviewer.requestedModel, "gpt-5.6-sol");
});

test("malformed local contract is rejected", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "autonomy-contract-"));
  const contractPath = path.join(directory, "task.json");
  writeFileSync(contractPath, "{not-json");
  assert.throws(() => loadLocalContract(contractPath), {
    code: "MALFORMED_CONTRACT",
  });
});

test("path traversal is rejected", () => {
  assert.throws(
    () => validateContract(contract({ allowedPaths: ["../outside"] })),
    { code: "INVALID_PATH" },
  );
});

test("malformed worktree path is rejected", () => {
  assert.throws(
    () => validateContract(contract({ externalWorktree: "relative/path" })),
    { code: "INVALID_WORKTREE" },
  );
});

test("overlapping allowed and protected paths are rejected", () => {
  assert.throws(
    () =>
      validateContract(
        contract({
          allowedPaths: [".github/ISSUE_TEMPLATE/codex-task.yml"],
          protectedPaths: [".github/**"],
        }),
      ),
    { code: "OVERLAPPING_PATHS" },
  );
});

test("production repository is rejected", () => {
  assert.throws(
    () =>
      validateContract(
        contract({
          repository: "lukaszgebicki/dock-scheduling-app-ai-studio1707",
        }),
      ),
    { code: "PRODUCTION_REPOSITORY_PROHIBITED" },
  );
});

test("main branch is rejected", () => {
  assert.throws(() => validateContract(contract({ branch: "main" })), {
    code: "INVALID_BRANCH",
  });
});

test("Class D is rejected", () => {
  assert.throws(() => validateContract(contract({ riskClass: "Class D" })), {
    code: "CLASS_D_PROHIBITED",
  });
});

test("Class C local contract without Project Lead approval is rejected", () => {
  assert.throws(
    () =>
      validateContract(
        contract({
          riskClass: "Class C",
          allowedPaths: ["tools/autonomy/**"],
          classCAuthorizations: ["Local runner orchestration"],
        }),
      ),
    { code: "MISSING_CLASS_C_AUTHORIZATION" },
  );
});

test("Class C authorization must match affected paths", () => {
  assert.throws(
    () =>
      validateContract(
        contract({
          riskClass: "Class C",
          allowedPaths: ["package.json"],
          protectedPaths: [".github/**"],
          classCAuthorizations: ["GitHub issue template governance"],
          projectLeadAuthorization: {
            approved: true,
            authorizedBy: "ChatGPT Project Lead",
            concerns: ["GitHub governance"],
          },
        }),
      ),
    { code: "INCOMPATIBLE_CLASS_C_AUTHORIZATION" },
  );
});

test("Class C-sensitive paths reject lower-risk contracts", () => {
  for (const allowedPath of [
    ".ai/orchestrator-policy.json",
    ".ai/**",
    ".github/ISSUE_TEMPLATE/**",
    "src/**",
    "docs/**",
  ]) {
    assert.throws(
      () =>
        validateContract(
          contract({
            allowedPaths: [allowedPath],
            protectedPaths: ["package.json"],
          }),
        ),
      { code: "CLASS_C_PATH_REQUIRES_AUTHORIZATION" },
    );
  }
});

test("non-READY roadmap task is rejected", () => {
  assert.throws(
    () =>
      requireRoadmapReady(
        "### AUTONOMY-PILOT-1 — pilot\n\n- State: `BLOCKED`.\n",
        "AUTONOMY-PILOT-1",
      ),
    { code: "TASK_NOT_READY" },
  );
});

test("roadmap risk class must match the contract", () => {
  const roadmap = [
    "### AUTONOMY-PILOT-1 — pilot",
    "",
    "- State: `READY`.",
    "- Risk class: Class C.",
  ].join("\n");
  assert.throws(
    () => requireRoadmapRiskClass(roadmap, "AUTONOMY-PILOT-1", "Class A"),
    { code: "RISK_CLASS_MISMATCH" },
  );
  assert.doesNotThrow(() =>
    requireRoadmapRiskClass(roadmap, "AUTONOMY-PILOT-1", "Class C"),
  );
});

function baselineRunner({ dirty = false, drift = false } = {}) {
  return {
    git(operation) {
      if (operation.kind === "branchCurrent") {
        return Promise.resolve({ stdout: "main\n" });
      }
      if (
        operation.kind === "head" ||
        operation.kind === "main" ||
        operation.kind === "originMain"
      ) {
        return Promise.resolve({
          stdout: `${drift && operation.kind === "head" ? "2".repeat(40) : "1".repeat(40)}\n`,
        });
      }
      if (operation.kind === "status") {
        return Promise.resolve({ stdout: dirty ? " M package.json\n" : "" });
      }
      if (operation.kind === "stagedNames") {
        return Promise.resolve({ stdout: "" });
      }
      throw new Error(`unexpected git: ${operation.kind}`);
    },
  };
}

test("dirty baseline is rejected", async () => {
  const validated = validateContract(contract());
  await assert.rejects(
    verifyCanonicalBaseline(
      baselineRunner({ dirty: true }),
      temporaryRepository(),
      validated,
    ),
    { code: "DIRTY_BASELINE" },
  );
});

test("baseline SHA drift is rejected", async () => {
  const validated = validateContract(contract());
  await assert.rejects(
    verifyCanonicalBaseline(
      baselineRunner({ drift: true }),
      temporaryRepository(),
      validated,
    ),
    { code: "BASELINE_SHA_DRIFT" },
  );
});

test("worktree inside canonical repository is rejected", () => {
  const repository = temporaryRepository();
  assert.throws(
    () => assertExternalWorktree(repository, path.join(repository, "nested")),
    { code: "WORKTREE_INSIDE_CANONICAL" },
  );
});

test("unexpected changed path is rejected", () => {
  const validated = validateContract(contract());
  assert.throws(
    () => assertChangedPaths(["src/other/Unexpected.ts"], validated),
    { code: "UNEXPECTED_CHANGED_PATH" },
  );
});

test("package-lock is rejected even if a contract attempts to allow it", () => {
  const validated = validateContract(
    contract({
      riskClass: "Class C",
      allowedPaths: ["package-lock.json"],
      protectedPaths: [".github/**"],
      classCAuthorizations: ["Package lockfile authorization"],
      projectLeadAuthorization: {
        approved: true,
        authorizedBy: "ChatGPT Project Lead",
        concerns: ["Package lockfile authorization"],
      },
    }),
  );
  assert.throws(() => assertChangedPaths(["package-lock.json"], validated), {
    code: "PROTECTED_PATH_CHANGED",
  });
});

test("malformed Reviewer output is rejected", () => {
  assert.throws(() => parseReviewerResult('{"verdict":"PASS"}'), {
    code: "MALFORMED_REVIEWER_RESULT",
  });
});

test("Reviewer FAIL is repaired and followed by PASS", async () => {
  const fail = parseReviewerResult(
    reviewerOutput({
      verdict: "FAIL",
      findings: {
        BLOCKER: [],
        HIGH: [],
        MEDIUM: ["Missing boundary check"],
        LOW: [],
      },
    }),
  );
  const pass = parseReviewerResult(reviewerOutput());
  let reviews = 0;
  let repairs = 0;
  let validations = 0;
  const result = await runReviewRepairLoop({
    review: async () => (reviews++ === 0 ? fail : pass),
    repair: async () => {
      repairs += 1;
    },
    validate: async () => {
      validations += 1;
    },
  });
  assert.equal(result.result.verdict, "PASS");
  assert.equal(result.repairCycles, 1);
  assert.equal(repairs, 1);
  assert.equal(validations, 1);
});

test("repair limit exhaustion stops the run", async () => {
  const fail = parseReviewerResult(
    reviewerOutput({
      verdict: "FAIL",
      findings: {
        BLOCKER: [],
        HIGH: ["Unsafe publication"],
        MEDIUM: [],
        LOW: [],
      },
    }),
  );
  await assert.rejects(
    runReviewRepairLoop({
      maxRepairCycles: 2,
      review: async () => fail,
      repair: async () => {},
      validate: async () => {},
    }),
    { code: "REPAIR_LIMIT_EXHAUSTED" },
  );
});

test("Builder commit creation is detected by HEAD and reflog snapshots", () => {
  const before = boundarySnapshot();
  const after = boundarySnapshot({
    head: "2".repeat(40),
    branchReflog: ["2".repeat(40), "1".repeat(40)],
  });
  expectPrematurePublication(before, after, { processKind: "Builder" });
});

test("Builder staging is detected", () => {
  expectPrematurePublication(
    boundarySnapshot(),
    boundarySnapshot({ staged: ["src/example/A.ts"] }),
    { processKind: "Builder" },
  );
});

test("Builder remote feature branch creation or movement is detected", () => {
  expectPrematurePublication(
    boundarySnapshot(),
    boundarySnapshot({
      remoteFeature: `${"2".repeat(40)}\trefs/heads/feat/autonomy-pilot`,
    }),
    { processKind: "Builder" },
  );
});

test("Builder PR creation is detected", () => {
  const pullRequest = {
    number: 9,
    state: "OPEN",
    headRefName: "feat/autonomy-pilot",
    headRefOid: "1".repeat(40),
    baseRefName: "main",
    isDraft: false,
    updatedAt: "2026-07-26T12:00:00Z",
    url: "https://github.com/example/repository/pull/9",
  };
  expectPrematurePublication(
    boundarySnapshot(),
    boundarySnapshot({ pullRequestCount: 1, pullRequests: [pullRequest] }),
    { processKind: "Builder" },
  );
});

test("Reviewer working-tree modification is detected", () => {
  expectPrematurePublication(
    boundarySnapshot(),
    boundarySnapshot({ workingTreeFingerprint: "working-tree-after" }),
    { processKind: "Reviewer", requireWorkingTreeUnchanged: true },
  );
});

test("Reviewer commit creation is detected", () => {
  expectPrematurePublication(
    boundarySnapshot(),
    boundarySnapshot({
      head: "3".repeat(40),
      branchReflog: ["3".repeat(40), "1".repeat(40)],
    }),
    { processKind: "Reviewer", requireWorkingTreeUnchanged: true },
  );
});

test("repair-process premature publication is detected", () => {
  expectPrematurePublication(
    boundarySnapshot(),
    boundarySnapshot({
      remoteFeature: `${"4".repeat(40)}\trefs/heads/feat/autonomy-pilot`,
      pullRequestCount: 1,
      pullRequests: [{ number: 10, state: "OPEN" }],
    }),
    { processKind: "repair Builder 1" },
  );
});

test("unchanged local, remote, and PR state passes", () => {
  const before = boundarySnapshot();
  const after = structuredClone(before);
  assert.doesNotThrow(() =>
    assertCodexBoundaryUnchanged(before, after, {
      processKind: "Builder",
    }),
  );
});

test("fake Git and GitHub state produces deterministic boundary snapshots", async () => {
  const worktree = temporaryRepository();
  const changedFile = path.join(worktree, "changed.txt");
  writeFileSync(changedFile, "before\n");
  const validated = validateContract(
    contract({
      externalWorktree: worktree,
      allowedPaths: ["changed.txt"],
    }),
  );
  const baseSha = validated.baseSha;
  const commandRunner = {
    git(operation) {
      const outputs = {
        head: `${baseSha}\n`,
        stagedNames: "",
        branchCurrent: `${validated.branch}\n`,
        remoteFeature: "",
        main: `${baseSha}\n`,
        originMain: `${baseSha}\n`,
        remoteMain: `${baseSha}\trefs/heads/main\n`,
        branchReflog: `${baseSha}\n`,
        status: "?? changed.txt\n",
        changedNames: "",
        untrackedNames: "changed.txt\0",
      };
      if (!(operation.kind in outputs)) {
        throw new Error(`unexpected fake Git operation: ${operation.kind}`);
      }
      return Promise.resolve({ stdout: outputs[operation.kind] });
    },
    gh(operation) {
      assert.equal(operation.kind, "prDiscovery");
      return Promise.resolve({ stdout: "[]" });
    },
  };
  const before = await captureCodexBoundarySnapshot({
    commandRunner,
    contract: validated,
    worktree,
  });
  writeFileSync(changedFile, "after\n");
  const after = await captureCodexBoundarySnapshot({
    commandRunner,
    contract: validated,
    worktree,
  });
  assert.notEqual(before.workingTreeFingerprint, after.workingTreeFingerprint);
  assert.equal(before.remoteFeature, "");
  assert.equal(before.pullRequestCount, 0);
});

test("existing PR update or reopen is detected", () => {
  const pullRequest = {
    number: 7,
    state: "CLOSED",
    updatedAt: "2026-07-26T10:00:00Z",
  };
  expectPrematurePublication(
    boundarySnapshot({ pullRequestCount: 1, pullRequests: [pullRequest] }),
    boundarySnapshot({
      pullRequestCount: 1,
      pullRequests: [
        {
          ...pullRequest,
          state: "OPEN",
          updatedAt: "2026-07-26T10:05:00Z",
        },
      ],
    }),
    { processKind: "Reviewer", requireWorkingTreeUnchanged: true },
  );
});

test("main or origin/main movement during Codex is detected", () => {
  expectPrematurePublication(
    boundarySnapshot(),
    boundarySnapshot({
      main: "5".repeat(40),
      originMain: "6".repeat(40),
      remoteMain: `${"6".repeat(40)}\trefs/heads/main`,
    }),
    { processKind: "Builder" },
  );
});

test("exact changed paths are staged and checked", async () => {
  const calls = [];
  const changedPaths = ["src/example/A.ts", "src/example/B.ts"];
  const runner = {
    git(operation) {
      calls.push(operation);
      if (operation.kind === "stagedNames") {
        return Promise.resolve({
          stdout: `${changedPaths.join("\0")}\0`,
        });
      }
      return Promise.resolve({ stdout: "" });
    },
  };
  const staged = await stageExactPaths({
    commandRunner: runner,
    worktree: temporaryRepository(),
    changedPaths,
  });
  assert.deepEqual(staged, changedPaths);
  assert.deepEqual(calls[0], { kind: "addExact", paths: changedPaths });
  assert.deepEqual(calls.at(-1), { kind: "stagedCheck" });
});

test("prohibited Git and GitHub operations cannot be built", () => {
  const tools = { git: "fake-git", gh: "fake-gh" };
  for (const kind of ["merge", "pull", "rebase", "reset", "clean", "config"]) {
    assert.throws(() => gitCommand(tools, { kind }), {
      code: "PROHIBITED_GIT_OPERATION",
    });
  }
  assert.throws(() => gitCommand(tools, { kind: "pushFeature", branch: "main" }), {
    code: "INVALID_BRANCH",
  });
  assert.throws(
    () =>
      gitCommand(tools, {
        kind: "pushFeature",
        branch: "feat/safe",
        force: true,
      }),
    { code: "PROHIBITED_PROCESS_ARGUMENT" },
  );
  assert.throws(() => ghCommand(tools, { kind: "prMerge" }), {
    code: "PROHIBITED_GITHUB_OPERATION",
  });
});

test("protected command builders reject arbitrary trailing arguments", () => {
  const tools = { git: "fake-git", gh: "fake-gh", codex: "fake-codex" };
  assert.throws(
    () => gitCommand(tools, { kind: "head", args: ["reset", "--hard"] }),
    { code: "PROHIBITED_PROCESS_ARGUMENT" },
  );
  assert.throws(
    () => ghCommand(tools, { kind: "authStatus", trailing: ["pr", "merge"] }),
    { code: "PROHIBITED_PROCESS_ARGUMENT" },
  );
  assert.throws(
    () => codexCommand(tools, { kind: "help", flags: ["--sandbox", "danger-full-access"] }),
    { code: "PROHIBITED_PROCESS_ARGUMENT" },
  );
});

test("Codex builder rejects model and reasoning override fields", () => {
  const tools = { codex: "fake-codex" };
  const worktree = path.join(tmpdir(), "profile-worktree");
  const runDirectory = path.join(tmpdir(), "profile-output");
  const operation = {
    kind: "builder",
    worktree,
    expectedWorktree: worktree,
    outputFile: path.join(runDirectory, "builder.txt"),
    runDirectory,
    runtimeProfile: resolveRuntimeProfile(
      trustedPolicy,
      "build_medium",
      "builder",
    ),
  };
  for (const override of [
    { model: "attacker/model" },
    { reasoningEffort: "ultra" },
    { flags: ["--model", "attacker/model"] },
  ]) {
    assert.throws(() => codexCommand(tools, { ...operation, ...override }), {
      code: "PROHIBITED_PROCESS_ARGUMENT",
    });
  }
});

test("issue-provided strings cannot become GitHub CLI arguments", () => {
  assert.throws(
    () =>
      ghCommand(
        { gh: "fake-gh" },
        {
          kind: "issueView",
          number: "1 --repo attacker/repository",
          repository: EXPECTED_REPOSITORY,
        },
      ),
    { code: "INVALID_ARGUMENT" },
  );
});

test("no command builder can produce a merge operation", () => {
  const tools = { git: "fake-git", gh: "fake-gh", codex: "fake-codex" };
  for (const builder of [
    () => gitCommand(tools, { kind: "merge" }),
    () => ghCommand(tools, { kind: "merge" }),
    () => codexCommand(tools, { kind: "merge" }),
  ]) {
    assert.throws(builder);
  }
});

test("SafeCommandRunner exposes only structured protected operations", () => {
  const runner = new SafeCommandRunner({
    tools: {
      node: "node",
      npmCli: "npm-cli.js",
      git: "git",
      gh: "gh",
      codex: "codex",
    },
    processRunner: async () => ({ stdout: "", stderr: "", code: 0 }),
  });
  assert.throws(() => runner.git(["merge", "main"]), {
    code: "PROHIBITED_GIT_OPERATION",
  });
  assert.throws(() => runner.gh(["pr", "merge", "1"]), {
    code: "PROHIBITED_GITHUB_OPERATION",
  });
});

test("publication callback occurs only after Reviewer PASS", async () => {
  const fail = parseReviewerResult(
    reviewerOutput({
      verdict: "FAIL",
      findings: {
        BLOCKER: [],
        HIGH: [],
        MEDIUM: [],
        LOW: ["Clarify report"],
      },
    }),
  );
  const pass = parseReviewerResult(reviewerOutput());
  let reviewCount = 0;
  let published = false;
  const loop = await runReviewRepairLoop({
    review: async () => (reviewCount++ === 0 ? fail : pass),
    repair: async () => {
      assert.equal(published, false);
    },
    validate: async () => {
      assert.equal(published, false);
    },
  });
  assert.equal(loop.result.verdict, "PASS");
  published = true;
  assert.equal(published, true);
});

test("run state defaults outside a temporary repository", () => {
  const repository = temporaryRepository();
  assert.doesNotThrow(() =>
    assertExternalWorktree(repository, defaultStateRoot()),
  );
});

test("generated dist cleanup is exact", () => {
  const repository = temporaryRepository();
  const dist = path.join(repository, "dist");
  const sibling = path.join(repository, "dist-preserve");
  mkdirSync(dist);
  mkdirSync(sibling);
  writeFileSync(path.join(dist, "asset.js"), "generated");
  removeGeneratedDist(repository);
  assert.equal(existsSync(dist), false);
  assert.equal(existsSync(sibling), true);
});

test("repository lock prevents concurrent execution", () => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "autonomy-state-"));
  const repository = temporaryRepository();
  const firstLock = acquireRepositoryLock(
    stateRoot,
    repository,
    "AUTONOMY-PILOT-1",
  );
  assert.throws(
    () =>
      acquireRepositoryLock(
        stateRoot,
        repository,
        "AUTONOMY-PILOT-2",
      ),
    { code: "REPOSITORY_LOCKED" },
  );
  firstLock.release();
  const secondLock = acquireRepositoryLock(
    stateRoot,
    repository,
    "AUTONOMY-PILOT-2",
  );
  secondLock.release();
});

test("GitHub issue requires exactly one autonomy-task block and READY", () => {
  const issueContract = contract();
  const body = `Task contract\n\n\`\`\`autonomy-task\n${JSON.stringify(issueContract)}\n\`\`\``;
  const parsed = extractIssueContract(body);
  assert.equal(parsed.taskId, issueContract.taskId);
  assert.doesNotThrow(() =>
    verifyIssueGates(
      { state: "OPEN", labels: [{ name: "READY" }] },
      parsed,
    ),
  );
  assert.throws(
    () => extractIssueContract(`${body}\n\n${body}`),
    { code: "MALFORMED_ISSUE_CONTRACT" },
  );
});

test("Class C issue requires class-c-approved", () => {
  const issueContract = validateContract(
    contract({
      riskClass: "Class C",
      allowedPaths: ["tools/autonomy/**"],
      classCAuthorizations: ["Local runner orchestration"],
    }),
    { sourceKind: "issue" },
  );
  assert.throws(
    () =>
      verifyIssueGates(
        { state: "OPEN", labels: [{ name: "READY" }] },
        issueContract,
      ),
    { code: "MISSING_CLASS_C_AUTHORIZATION" },
  );
});

test("Builder and Reviewer invocations use distinct enforced sandboxes", () => {
  const tools = { codex: "fake-codex" };
  const worktree = path.join(tmpdir(), "review-worktree");
  const runDirectory = path.join(tmpdir(), "review-output");
  const builder = codexCommand(tools, {
    kind: "builder",
    worktree,
    expectedWorktree: worktree,
    outputFile: path.join(runDirectory, "builder.txt"),
    runDirectory,
    runtimeProfile: resolveRuntimeProfile(
      trustedPolicy,
      "build_medium",
      "builder",
    ),
  });
  const reviewer = codexCommand(tools, {
    kind: "reviewer",
    worktree,
    expectedWorktree: worktree,
    outputFile: path.join(runDirectory, "reviewer.txt"),
    runDirectory,
    runtimeProfile: resolveRuntimeProfile(
      trustedPolicy,
      "review_high",
      "reviewer",
    ),
  });
  assert.equal(
    builder.args[builder.args.indexOf("--sandbox") + 1],
    "workspace-write",
  );
  assert.equal(
    reviewer.args[reviewer.args.indexOf("--sandbox") + 1],
    "read-only",
  );
  assert.ok(!reviewer.args.includes("review"));
  assert.ok(!reviewer.args.includes("--uncommitted"));
  assert.ok(!builder.args.includes("--uncommitted"));
  assert.equal(builder.args[builder.args.indexOf("--ask-for-approval") + 2], "exec");
  assert.equal(reviewer.args[reviewer.args.indexOf("--ask-for-approval") + 2], "exec");
  assert.equal(builder.args.at(-1), "-");
  assert.equal(reviewer.args.at(-1), "-");
});

test("initial Builder empty diff stops before validation, simplification, review, and publication", async () => {
  const { runner, calls } = lifecycleRunner(process.cwd(), { initialEmpty: true });
  const { contractPath, stateRoot } = lifecycleContract();
  await assert.rejects(
    executeTask({
      canonicalRoot: process.cwd(),
      contractPath,
      stateRoot,
      commandRunner: runner,
    }),
    { code: "EMPTY_INITIAL_BUILDER_DIFF" },
  );
  assert.deepEqual(calls, {
    npm: 0,
    simplifier: 0,
    reviewer: 0,
    publication: 0,
  });
});

test("empty simplified diff stops before post-simplification validation, review, and publication", async () => {
  const { runner, calls } = lifecycleRunner(process.cwd(), { simplifyToEmpty: true });
  const { contractPath, stateRoot } = lifecycleContract();
  await assert.rejects(
    executeTask({
      canonicalRoot: process.cwd(),
      contractPath,
      stateRoot,
      commandRunner: runner,
    }),
    { code: "EMPTY_SIMPLIFIED_DIFF" },
  );
  assert.deepEqual(calls, {
    npm: 6,
    simplifier: 1,
    reviewer: 0,
    publication: 0,
  });
});

test("initial Builder empty diff stops before validation", () => {
  const validated = validateContract(contract());
  assert.throws(() => requireChangedPaths([], validated, "initial Builder"), {
    code: "EMPTY_INITIAL_BUILDER_DIFF",
  });
});

test("empty diff after simplification stops before review", () => {
  const validated = validateContract(contract());
  assert.throws(() => requireChangedPaths([], validated, "simplification"), {
    code: "EMPTY_SIMPLIFIED_DIFF",
  });
});

test("Codex command shapes reject sandbox, worktree, and output overrides", () => {
  const tools = { codex: "fake-codex" };
  const worktree = path.join(tmpdir(), "validated-worktree");
  const runDirectory = path.join(tmpdir(), "external-run");
  const baseOperation = {
    kind: "reviewer",
    worktree,
    expectedWorktree: worktree,
    outputFile: path.join(runDirectory, "reviewer.txt"),
    runDirectory,
    runtimeProfile: resolveRuntimeProfile(
      trustedPolicy,
      "review_high",
      "reviewer",
    ),
  };
  assert.throws(
    () => codexCommand(tools, { ...baseOperation, sandbox: "workspace-write" }),
    { code: "PROHIBITED_PROCESS_ARGUMENT" },
  );
  assert.throws(
    () =>
      codexCommand(tools, {
        ...baseOperation,
        worktree: path.join(tmpdir(), "escaped-worktree"),
      }),
    { code: "PROHIBITED_CODEX_INVOCATION" },
  );
  assert.throws(
    () =>
      codexCommand(tools, {
        ...baseOperation,
        outputFile: path.join(worktree, "reviewer.txt"),
      }),
    { code: "PROHIBITED_CODEX_INVOCATION" },
  );
});

test("fake executable shim receives literal argument array", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "autonomy-shim-"));
  const shim = path.join(directory, "fake-codex.mjs");
  writeFileSync(
    shim,
    "process.stdout.write(JSON.stringify(process.argv.slice(2)));",
  );
  const argument = "literal value; not a shell command";
  const result = await runProcess(process.execPath, [shim, argument], {
    cwd: directory,
  });
  assert.deepEqual(JSON.parse(result.stdout), [argument]);
});

test("HTTP 4xx stops immediately while HTTP 5xx retries are bounded", async () => {
  const authorizationError = new AutonomyError("HTTP 403 forbidden", "PROCESS_FAILED");
  assert.equal(classifyNetworkFailure(authorizationError), "authorization");
  let authorizationAttempts = 0;
  await assert.rejects(
    runWithNetworkRetry(async () => {
      authorizationAttempts += 1;
      throw authorizationError;
    }),
    { code: "GITHUB_AUTHORIZATION_FAILED" },
  );
  assert.equal(authorizationAttempts, 1);

  let transientAttempts = 0;
  await assert.rejects(
    runWithNetworkRetry(
      async () => {
        transientAttempts += 1;
        throw new AutonomyError("HTTP 503 unavailable", "PROCESS_FAILED");
      },
      { wait: async () => {} },
    ),
  );
  assert.equal(transientAttempts, 3);
});

test("argument parser accepts only documented task sources", () => {
  assert.deepEqual(parseArguments(["plan", "--issue", "12"]), {
    command: "plan",
    issueNumber: "12",
    contractPath: undefined,
  });
  assert.throws(() => parseArguments(["execute", "--issue", "1", "extra"]), {
    code: "INVALID_ARGUMENT",
  });
});

test("example contract remains valid JSON", () => {
  const example = JSON.parse(
    readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "task-contract.example.json",
      ),
      "utf8",
    ),
  );
  assert.equal(example.repository, EXPECTED_REPOSITORY);
});

test("GitHub issue form collects the required governance fields", () => {
  const template = readFileSync(
    path.resolve(".github/ISSUE_TEMPLATE/codex-task.yml"),
    "utf8",
  );
  for (const field of [
    "id: task-id",
    "id: objective",
    "id: risk-class",
    "id: acceptance-criteria",
    "id: allowed-paths",
    "id: protected-paths",
    "id: class-c-authorization",
    "id: autonomy-contract",
  ]) {
    assert.match(template, new RegExp(field));
  }
  assert.equal((template.match(/render: autonomy-task/g) ?? []).length, 1);
  assert.match(template, /READY` does not override required Class C approval/);
  assert.match(template, /Production\s+repository access is prohibited/);
  assert.match(template, /stops\s+before merge/);
  assert.doesNotMatch(template, /^labels:/m);
});

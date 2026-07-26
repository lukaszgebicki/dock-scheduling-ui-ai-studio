import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  AutonomyError,
  EXPECTED_REPOSITORY,
  PRODUCTION_REPOSITORY,
  REVIEW_RESULT_END,
  REVIEW_RESULT_START,
  REVIEW_SCORE_KEYS,
  REVIEW_SEVERITIES,
  acquireRepositoryLock,
  assertChangedPaths,
  assertExternalWorktree,
  assertStateOutsideRepository,
  assertTrustedRuntimeProfile,
  createExternalRunDirectory,
  defaultStateRoot,
  extractIssueContract,
  loadOrchestratorPolicy,
  loadLocalContract,
  parseReviewerResult,
  removeGeneratedDist,
  resolveRuntimeProfile,
  requireRoadmapReady,
  requireRoadmapRiskClass,
  runtimeProfileEvidence,
  runReviewRepairLoop,
  verifyIssueGates,
} from "./autonomy-core.mjs";

const DEFAULT_PROCESS_TIMEOUT_MS = 10 * 60 * 1000;
const CODEX_PROCESS_TIMEOUT_MS = 30 * 60 * 1000;
const CI_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_CAPTURE_BYTES = 8 * 1024 * 1024;

const SAFE_ENVIRONMENT_KEYS = [
  "APPDATA",
  "CODEX_HOME",
  "COMSPEC",
  "GH_CONFIG_DIR",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "LANG",
  "LOCALAPPDATA",
  "NO_COLOR",
  "NPM_CONFIG_CACHE",
  "NUMBER_OF_PROCESSORS",
  "OS",
  "PATH",
  "PATHEXT",
  "PROGRAMDATA",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "SYSTEMDRIVE",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "WINDIR",
];

function isWindows() {
  return process.platform === "win32";
}

function executableNames(name) {
  if (!isWindows()) {
    return [name];
  }
  return [`${name}.exe`, `${name}.cmd`, `${name}.bat`, name];
}

function findOnPath(name) {
  const pathValue = process.env.PATH ?? "";
  for (const directory of pathValue.split(path.delimiter)) {
    if (!directory) {
      continue;
    }
    for (const executableName of executableNames(name)) {
      const candidate = path.join(directory, executableName);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

function firstExistingFile(candidates) {
  return candidates.find((candidate) => {
    try {
      return candidate && existsSync(candidate) && statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}

function findNpmCli() {
  const configured = process.env.npm_execpath;
  if (configured && existsSync(configured)) {
    return configured;
  }

  if (isWindows()) {
    const npmLinksRoot = path.join(
      homedir(),
      "AppData",
      "Local",
      "pnpm",
      "store",
      "v11",
      "links",
      "@",
      "npm",
    );
    if (existsSync(npmLinksRoot)) {
      const versions = readdirSync(npmLinksRoot)
        .filter((version) => /^11\.\d+\.\d+$/.test(version))
        .sort((left, right) =>
          right.localeCompare(left, undefined, { numeric: true }),
        );
      for (const version of versions) {
        const versionRoot = path.join(npmLinksRoot, version);
        for (const hashDirectory of readdirSync(versionRoot)) {
          const candidate = path.join(
            versionRoot,
            hashDirectory,
            "node_modules",
            "npm",
            "bin",
            "npm-cli.js",
          );
          if (existsSync(candidate)) {
            return candidate;
          }
        }
      }
    }
  }

  throw new AutonomyError(
    "npm 11 CLI was not found",
    "MISSING_EXECUTABLE",
  );
}

export function discoverTools(overrides = {}) {
  const userHome = homedir();
  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const node = overrides.node ?? process.execPath;
  const npmCli = overrides.npmCli ?? findNpmCli();
  const git =
    overrides.git ??
    firstExistingFile([
      findOnPath("git"),
      isWindows() ? path.join(programFiles, "Git", "cmd", "git.exe") : null,
      isWindows()
        ? path.join(
            userHome,
            ".cache",
            "codex-runtimes",
            "codex-primary-runtime",
            "dependencies",
            "native",
            "git",
            "cmd",
            "git.exe",
          )
        : null,
    ]);
  const gh =
    overrides.gh ??
    firstExistingFile([
      findOnPath("gh"),
      isWindows() ? path.join(programFiles, "GitHub CLI", "gh.exe") : null,
    ]);
  const codex =
    overrides.codex ??
    firstExistingFile([
      findOnPath("codex"),
      isWindows()
        ? path.join(userHome, ".codex", ".sandbox-bin", "codex.exe")
        : path.join(userHome, ".codex", ".sandbox-bin", "codex"),
    ]);

  for (const [name, executable] of Object.entries({
    node,
    npmCli,
    git,
    gh,
    codex,
  })) {
    if (!executable || !existsSync(executable)) {
      throw new AutonomyError(
        `${name} executable was not found`,
        "MISSING_EXECUTABLE",
      );
    }
  }

  return Object.freeze({ node, npmCli, git, gh, codex });
}

export function sanitizedEnvironment(tools, additions = {}) {
  const environment = {};
  for (const key of SAFE_ENVIRONMENT_KEYS) {
    const actualKey = Object.keys(process.env).find(
      (candidate) => candidate.toUpperCase() === key,
    );
    if (actualKey && process.env[actualKey] !== undefined) {
      environment[actualKey] = process.env[actualKey];
    }
  }

  const pathDirectories = [
    path.dirname(tools.node),
    path.dirname(tools.git),
    path.dirname(tools.gh),
    path.dirname(tools.codex),
    environment.PATH ?? environment.Path ?? "",
  ].filter(Boolean);
  environment.PATH = pathDirectories.join(path.delimiter);
  delete environment.Path;

  for (const [key, value] of Object.entries(additions)) {
    if (typeof value === "string") {
      environment[key] = value;
    }
  }
  return environment;
}

export function sanitizeLog(value) {
  return String(value)
    .replace(/\b(gh[pousr]_[A-Za-z0-9_]{8})[A-Za-z0-9_]+\b/g, "$1…REDACTED")
    .replace(/\b(github_pat_[A-Za-z0-9_]{8})[A-Za-z0-9_]+\b/g, "$1…REDACTED")
    .replace(
      /(\b(?:authorization|token|password|secret)\b\s*[:=]\s*)\S+/gi,
      "$1[REDACTED]",
    )
    .replace(/(Bearer\s+)\S+/gi, "$1[REDACTED]");
}

function errorEvidence(error) {
  return [
    error?.message,
    error?.details?.stdout,
    error?.details?.stderr,
  ]
    .filter(Boolean)
    .join("\n");
}

export function classifyNetworkFailure(error) {
  const evidence = errorEvidence(error);
  if (/\bHTTP(?:\/\d(?:\.\d)?)?\s+4\d\d\b|\bstatus(?: code)?[:= ]+4\d\d\b/i.test(evidence)) {
    return "authorization";
  }
  if (
    /\bHTTP(?:\/\d(?:\.\d)?)?\s+5\d\d\b|\bstatus(?: code)?[:= ]+5\d\d\b/i.test(
      evidence,
    ) ||
    /ECONN(?:RESET|REFUSED)|ENETUNREACH|ETIMEDOUT|timed out|temporary failure|could not resolve|connection.*closed|network.*unavailable/i.test(
      evidence,
    )
  ) {
    return "transient";
  }
  return "permanent";
}

export async function runWithNetworkRetry(
  action,
  {
    attempts = 3,
    wait = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {},
) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action(attempt);
    } catch (error) {
      lastError = error;
      const classification = classifyNetworkFailure(error);
      if (classification === "authorization") {
        throw new AutonomyError(
          "GitHub authorization failure; stopping immediately",
          "GITHUB_AUTHORIZATION_FAILED",
          error.details,
        );
      }
      if (classification !== "transient" || attempt === attempts) {
        throw error;
      }
      await wait(500 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

export function runProcess(
  executable,
  args,
  {
    cwd,
    input,
    timeoutMs = DEFAULT_PROCESS_TIMEOUT_MS,
    environment,
    allowedExitCodes = [0],
    onOutput,
  } = {},
) {
  if (
    typeof executable !== "string" ||
    !Array.isArray(args) ||
    args.some((argument) => typeof argument !== "string")
  ) {
    throw new AutonomyError(
      "processes require an executable and argument array",
      "INVALID_PROCESS_INVOCATION",
    );
  }

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env: environment,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let capturedBytes = 0;
    let timedOut = false;

    const capture = (target, chunk) => {
      capturedBytes += chunk.length;
      if (capturedBytes > MAX_CAPTURE_BYTES) {
        child.kill();
        reject(
          new AutonomyError(
            "process output exceeded the capture limit",
            "PROCESS_OUTPUT_LIMIT",
          ),
        );
        return target;
      }
      const text = chunk.toString("utf8");
      onOutput?.(sanitizeLog(text));
      return target + text;
    };

    child.stdout.on("data", (chunk) => {
      stdout = capture(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = capture(stderr, chunk);
    });
    child.on("error", (error) => {
      reject(
        new AutonomyError(
          `unable to start ${path.basename(executable)}: ${error.message}`,
          "PROCESS_START_FAILED",
        ),
      );
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const result = {
        code: code ?? -1,
        signal,
        stdout: sanitizeLog(stdout),
        stderr: sanitizeLog(stderr),
      };
      if (timedOut) {
        reject(
          new AutonomyError(
            `${path.basename(executable)} timed out after ${timeoutMs}ms`,
            "PROCESS_TIMEOUT",
            result,
          ),
        );
        return;
      }
      if (!allowedExitCodes.includes(result.code)) {
        reject(
          new AutonomyError(
            `${path.basename(executable)} exited with ${result.code}`,
            "PROCESS_FAILED",
            result,
          ),
        );
        return;
      }
      resolve(result);
    });

    if (input !== undefined) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

function assertExactKeys(value, allowedKeys, operation) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new AutonomyError(
      `${operation} requires a structured operation`,
      "INVALID_PROCESS_INVOCATION",
    );
  }
  const unexpected = Object.keys(value).filter(
    (key) => !allowedKeys.includes(key),
  );
  if (unexpected.length > 0) {
    throw new AutonomyError(
      `${operation} contains unsupported fields: ${unexpected.join(", ")}`,
      "PROHIBITED_PROCESS_ARGUMENT",
    );
  }
}

function assertFeatureBranch(branch) {
  if (
    typeof branch !== "string" ||
    branch === "main" ||
    branch.startsWith("refs/") ||
    branch.endsWith("/") ||
    branch.endsWith(".") ||
    branch.endsWith(".lock") ||
    branch.includes("..") ||
    branch.includes("//") ||
    branch.includes("@{") ||
    /[\s~^:?*[\]\\]/.test(branch) ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch)
  ) {
    throw new AutonomyError(
      "a validated non-main feature branch is required",
      "INVALID_BRANCH",
    );
  }
  return branch;
}

function assertFullSha(sha) {
  if (typeof sha !== "string" || !/^[0-9a-f]{40}$/.test(sha)) {
    throw new AutonomyError(
      "a full lowercase commit SHA is required",
      "INVALID_BASE_SHA",
    );
  }
  return sha;
}

function assertRepository(repository) {
  if (repository !== EXPECTED_REPOSITORY) {
    throw new AutonomyError(
      "GitHub operation repository is not permitted",
      "REPOSITORY_MISMATCH",
    );
  }
  return repository;
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new AutonomyError(
      `${label} must be a positive integer`,
      "INVALID_ARGUMENT",
    );
  }
  return String(value);
}

function assertNonEmptyArgument(value, label) {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.includes("\0")
  ) {
    throw new AutonomyError(
      `${label} must be a non-empty literal argument`,
      "INVALID_PROCESS_INVOCATION",
    );
  }
  return value;
}

function assertPullRequestUrl(value) {
  const url = assertNonEmptyArgument(value, "pull request URL");
  const escapedRepository = EXPECTED_REPOSITORY.replace("/", "\\/");
  if (
    !new RegExp(
      `^https:\\/\\/github\\.com\\/${escapedRepository}\\/pull\\/[1-9]\\d*$`,
    ).test(url)
  ) {
    throw new AutonomyError(
      "pull request URL is not permitted",
      "PROHIBITED_GITHUB_OPERATION",
    );
  }
  return url;
}

function assertAbsolutePath(value, label) {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    value.includes("\0")
  ) {
    throw new AutonomyError(
      `${label} must be an absolute path`,
      "INVALID_PROCESS_INVOCATION",
    );
  }
  return path.resolve(value);
}

function isPathWithin(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function gitCommand(tools, operation) {
  const kind = operation?.kind;
  const fixed = (args, keys = ["kind"]) => {
    assertExactKeys(operation, keys, `Git ${kind}`);
    return Object.freeze({ executable: tools.git, args: Object.freeze(args) });
  };

  switch (kind) {
    case "version":
      return fixed(["version"]);
    case "fetchOrigin":
      return fixed(["fetch", "--prune", "origin"]);
    case "branchCurrent":
      return fixed(["branch", "--show-current"]);
    case "head":
      return fixed(["rev-parse", "HEAD"]);
    case "main":
      return fixed(["rev-parse", "main"]);
    case "originMain":
      return fixed(["rev-parse", "origin/main"]);
    case "repositoryRoot":
      return fixed(["rev-parse", "--show-toplevel"]);
    case "remoteOrigin":
      return fixed(["remote", "get-url", "origin"]);
    case "status":
      return fixed(["status", "--porcelain=v1", "--untracked-files=all"]);
    case "stagedNames":
      return fixed(["diff", "--cached", "--name-only", "-z"]);
    case "stagedCheck":
      return fixed(["diff", "--cached", "--check"]);
    case "diffCheck":
      return fixed(["diff", "--check"]);
    case "changedNames":
      return fixed([
        "diff",
        "--name-only",
        "--diff-filter=ACMRTUXB",
        "-z",
        "HEAD",
      ]);
    case "untrackedNames":
      return fixed(["ls-files", "--others", "--exclude-standard", "-z"]);
    case "diffPath": {
      assertExactKeys(operation, ["kind", "path"], "Git diffPath");
      const filePath = operation.path;
      if (!["package.json", "package-lock.json"].includes(filePath)) {
        throw new AutonomyError(
          "Git diffPath is limited to package manifests",
          "PROHIBITED_GIT_OPERATION",
        );
      }
      return Object.freeze({
        executable: tools.git,
        args: Object.freeze(["diff", "--name-only", "HEAD", "--", filePath]),
      });
    }
    case "showLocalBranch":
      return fixed(
        [
          "show-ref",
          "--verify",
          "--quiet",
          `refs/heads/${assertFeatureBranch(operation.branch)}`,
        ],
        ["kind", "branch"],
      );
    case "showRemoteTrackingBranch":
      return fixed(
        [
          "show-ref",
          "--verify",
          "--quiet",
          `refs/remotes/origin/${assertFeatureBranch(operation.branch)}`,
        ],
        ["kind", "branch"],
      );
    case "remoteFeature":
      return fixed(
        [
          "ls-remote",
          "--heads",
          "origin",
          `refs/heads/${assertFeatureBranch(operation.branch)}`,
        ],
        ["kind", "branch"],
      );
    case "remoteMain":
      return fixed(["ls-remote", "--heads", "origin", "refs/heads/main"]);
    case "branchReflog":
      return fixed(
        [
          "reflog",
          "show",
          "--format=%H",
          `refs/heads/${assertFeatureBranch(operation.branch)}`,
        ],
        ["kind", "branch"],
      );
    case "worktreeList":
      return fixed(["worktree", "list", "--porcelain"]);
    case "worktreeAdd": {
      assertExactKeys(
        operation,
        ["kind", "branch", "worktree", "baseSha"],
        "Git worktreeAdd",
      );
      return Object.freeze({
        executable: tools.git,
        args: Object.freeze([
          "worktree",
          "add",
          "-b",
          assertFeatureBranch(operation.branch),
          assertAbsolutePath(operation.worktree, "worktree"),
          assertFullSha(operation.baseSha),
        ]),
      });
    }
    case "addExact": {
      assertExactKeys(operation, ["kind", "paths"], "Git addExact");
      if (
        !Array.isArray(operation.paths) ||
        operation.paths.length === 0
      ) {
        throw new AutonomyError(
          "Git addExact requires approved paths",
          "INVALID_PROCESS_INVOCATION",
        );
      }
      const paths = operation.paths.map((filePath) => {
        if (
          typeof filePath !== "string" ||
          filePath.includes("\0") ||
          filePath.startsWith("-") ||
          path.posix.isAbsolute(filePath) ||
          filePath.includes("\\") ||
          filePath.split("/").some((part) => part === ".." || part === ".")
        ) {
          throw new AutonomyError(
            "Git addExact received an invalid repository path",
            "INVALID_PATH",
          );
        }
        return filePath;
      });
      return Object.freeze({
        executable: tools.git,
        args: Object.freeze(["--literal-pathspecs", "add", "--", ...paths]),
      });
    }
    case "commit":
      return fixed(
        ["commit", "-m", assertNonEmptyArgument(operation.message, "commit message")],
        ["kind", "message"],
      );
    case "committedNames":
      return fixed([
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        "-z",
        "HEAD",
      ]);
    case "pushFeature":
      return fixed(
        [
          "push",
          "--set-upstream",
          "origin",
          assertFeatureBranch(operation.branch),
        ],
        ["kind", "branch"],
      );
    default:
      throw new AutonomyError(
        `Git operation is not permitted: ${String(kind)}`,
        "PROHIBITED_GIT_OPERATION",
      );
  }
}

export function ghCommand(tools, operation) {
  const kind = operation?.kind;
  const fixed = (args, keys = ["kind"]) => {
    assertExactKeys(operation, keys, `GitHub ${kind}`);
    return Object.freeze({ executable: tools.gh, args: Object.freeze(args) });
  };

  switch (kind) {
    case "version":
      return fixed(["--version"]);
    case "authStatus":
      return fixed(["auth", "status", "--hostname", "github.com"]);
    case "issueView":
      return fixed(
        [
          "issue",
          "view",
          assertPositiveInteger(operation.number, "issue number"),
          "--repo",
          assertRepository(operation.repository),
          "--json",
          "body,state,labels,number,title,url",
        ],
        ["kind", "number", "repository"],
      );
    case "prDiscovery": {
      assertExactKeys(
        operation,
        ["kind", "repository", "branch", "state"],
        "GitHub prDiscovery",
      );
      if (!["open", "all"].includes(operation.state)) {
        throw new AutonomyError(
          "PR discovery state is not permitted",
          "PROHIBITED_GITHUB_OPERATION",
        );
      }
      const fields =
        operation.state === "all"
          ? "number,state,headRefName,headRefOid,baseRefName,isDraft,updatedAt,url"
          : "number,headRefName";
      return Object.freeze({
        executable: tools.gh,
        args: Object.freeze([
          "pr",
          "list",
          "--repo",
          assertRepository(operation.repository),
          "--state",
          operation.state,
          "--head",
          assertFeatureBranch(operation.branch),
          "--limit",
          "10000",
          "--json",
          fields,
        ]),
      });
    }
    case "prCreate":
      return fixed(
        [
          "pr",
          "create",
          "--repo",
          assertRepository(operation.repository),
          "--base",
          "main",
          "--head",
          assertFeatureBranch(operation.branch),
          "--title",
          assertNonEmptyArgument(operation.title, "pull request title"),
          "--body",
          assertNonEmptyArgument(operation.body, "pull request body"),
          "--no-maintainer-edit",
        ],
        ["kind", "repository", "branch", "title", "body"],
      );
    case "prView":
      return fixed(
        [
          "pr",
          "view",
          assertPullRequestUrl(operation.url),
          "--repo",
          assertRepository(operation.repository),
          "--json",
          "baseRefName,headRefName,headRefOid,isDraft,state,files,url",
        ],
        ["kind", "repository", "url"],
      );
    case "prChecks":
      return fixed(
        [
          "pr",
          "checks",
          assertPullRequestUrl(operation.url),
          "--repo",
          assertRepository(operation.repository),
          "--watch",
          "--interval",
          "10",
        ],
        ["kind", "repository", "url"],
      );
    default:
      throw new AutonomyError(
        `GitHub CLI operation is not permitted: ${String(kind)}`,
        "PROHIBITED_GITHUB_OPERATION",
      );
  }
}

export function codexCommand(tools, operation) {
  const kind = operation?.kind;
  const fixed = (args, keys = ["kind"]) => {
    assertExactKeys(operation, keys, `Codex ${kind}`);
    return Object.freeze({
      executable: tools.codex,
      args: Object.freeze(args),
    });
  };
  switch (kind) {
    case "version":
      return fixed(["--version"]);
    case "modelCatalog":
      return fixed(["debug", "models"]);
    case "help":
      return fixed(["--help"]);
    case "builderHelp": {
      const worktree = assertAbsolutePath(operation.worktree, "worktree");
      return fixed(
        [
          "--sandbox",
          "workspace-write",
          "--cd",
          worktree,
          "--ask-for-approval",
          "never",
          "exec",
          "--help",
        ],
        ["kind", "worktree"],
      );
    }
    case "reviewerHelp": {
      const worktree = assertAbsolutePath(operation.worktree, "worktree");
      return fixed(
        [
          "--sandbox",
          "read-only",
          "--cd",
          worktree,
          "--ask-for-approval",
          "never",
          "exec",
          "review",
          "--help",
        ],
        ["kind", "worktree"],
      );
    }
    case "builder":
    case "repair":
    case "reviewer": {
      assertExactKeys(
        operation,
        [
          "kind",
          "worktree",
          "expectedWorktree",
          "outputFile",
          "runDirectory",
          "runtimeProfile",
        ],
        `Codex ${kind}`,
      );
      const runtimeProfile = assertTrustedRuntimeProfile(
        operation.runtimeProfile,
        kind,
      );
      const worktree = assertAbsolutePath(operation.worktree, "worktree");
      const expectedWorktree = assertAbsolutePath(
        operation.expectedWorktree,
        "expected worktree",
      );
      const outputFile = assertAbsolutePath(operation.outputFile, "output file");
      const runDirectory = assertAbsolutePath(
        operation.runDirectory,
        "run directory",
      );
      if (worktree.toLowerCase() !== expectedWorktree.toLowerCase()) {
        throw new AutonomyError(
          "Codex working directory escaped the validated task worktree",
          "PROHIBITED_CODEX_INVOCATION",
        );
      }
      if (
        isPathWithin(worktree, outputFile) ||
        !isPathWithin(runDirectory, outputFile) ||
        outputFile.toLowerCase() === runDirectory.toLowerCase()
      ) {
        throw new AutonomyError(
          "Codex output must be a file in the external run directory",
          "PROHIBITED_CODEX_INVOCATION",
        );
      }
      const reviewer = kind === "reviewer";
      return fixed(
        [
          "--strict-config",
          "--model",
          runtimeProfile.model,
          "--config",
          `model_reasoning_effort="${runtimeProfile.reasoningEffort}"`,
          "--sandbox",
          runtimeProfile.sandbox,
          "--cd",
          worktree,
          "--ask-for-approval",
          runtimeProfile.approvalMode,
          "exec",
          ...(reviewer ? ["review", "--uncommitted"] : []),
          "--ephemeral",
          "--ignore-user-config",
          "--output-last-message",
          outputFile,
          "-",
        ],
        [
          "kind",
          "worktree",
          "expectedWorktree",
          "outputFile",
          "runDirectory",
          "runtimeProfile",
        ],
      );
    }
    default:
      throw new AutonomyError(
        `Codex invocation is not permitted: ${String(kind)}`,
        "PROHIBITED_CODEX_INVOCATION",
      );
  }
}

export class SafeCommandRunner {
  constructor({
    tools = discoverTools(),
    processRunner = runProcess,
    output,
  } = {}) {
    this.tools = tools;
    this.processRunner = processRunner;
    this.output = output;
    this.environment = sanitizedEnvironment(tools);
  }

  #run(executable, args, options = {}) {
    return this.processRunner(executable, args, {
      ...options,
      environment: {
        ...this.environment,
        ...(options.environment ?? {}),
      },
      onOutput: options.onOutput ?? this.output,
    });
  }

  nodeVersion(options = {}) {
    return this.#run(this.tools.node, ["--version"], options);
  }

  git(operation, options = {}) {
    const command = gitCommand(this.tools, operation);
    return this.#run(command.executable, command.args, options);
  }

  gh(operation, options = {}) {
    const command = ghCommand(this.tools, operation);
    return this.#run(command.executable, command.args, options);
  }

  npm(args, options = {}) {
    return this.#run(this.tools.node, [this.tools.npmCli, ...args], options);
  }

  codex(operation, options = {}) {
    const command = codexCommand(this.tools, operation);
    return this.#run(command.executable, command.args, options);
  }
}

function parseRepositoryRemote(remote) {
  const trimmed = remote.trim().replace(/\.git$/, "");
  const httpsMatch = trimmed.match(
    /^https:\/\/github\.com\/([^/]+\/[^/]+)$/i,
  );
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+\/[^/]+)$/i);
  return httpsMatch?.[1] ?? sshMatch?.[1];
}

function majorVersion(output, label) {
  const match = output.match(/v?(\d+)\./);
  if (!match) {
    throw new AutonomyError(
      `unable to parse ${label} version`,
      "UNSUPPORTED_TOOL_VERSION",
    );
  }
  return Number.parseInt(match[1], 10);
}

export function verifyConfiguredProfiles(policy, rawCatalog) {
  let catalog;
  try {
    catalog = JSON.parse(rawCatalog);
  } catch (error) {
    throw new AutonomyError(
      `Codex model catalog is malformed: ${error.message}`,
      "MALFORMED_MODEL_CATALOG",
    );
  }
  if (!Array.isArray(catalog.models)) {
    throw new AutonomyError(
      "Codex model catalog has no models array",
      "MALFORMED_MODEL_CATALOG",
    );
  }
  const installed = new Map(
    catalog.models.map((model) => [
      model.slug,
      new Set(
        (model.supported_reasoning_levels ?? []).map((level) => level.effort),
      ),
    ]),
  );
  const unavailable = [];
  const available = [];
  for (const [profileId, profile] of Object.entries(policy.profiles)) {
    const efforts = installed.get(profile.model);
    if (!efforts || !efforts.has(profile.reasoningEffort)) {
      unavailable.push({
        profile: profileId,
        model: profile.model,
        reasoningEffort: profile.reasoningEffort,
      });
    } else {
      available.push(profileId);
    }
  }
  if (unavailable.length > 0) {
    throw new AutonomyError(
      "one or more configured Codex profiles are unavailable",
      "CODEX_PROFILE_UNAVAILABLE",
      { unavailable },
    );
  }
  return Object.freeze(available.sort());
}

export async function runDoctor({
  canonicalRoot = process.cwd(),
  commandRunner = new SafeCommandRunner(),
  policy = loadOrchestratorPolicy(canonicalRoot),
} = {}) {
  const { tools } = commandRunner;
  const [
    nodeVersion,
    npmVersion,
    gitVersion,
    ghVersion,
    codexVersion,
    modelCatalog,
  ] =
    await Promise.all([
      commandRunner.nodeVersion({ cwd: canonicalRoot }),
      commandRunner.npm(["--version"], { cwd: canonicalRoot }),
      commandRunner.git({ kind: "version" }, { cwd: canonicalRoot }),
      commandRunner.gh({ kind: "version" }, { cwd: canonicalRoot }),
      commandRunner.codex({ kind: "version" }, { cwd: canonicalRoot }),
      commandRunner.codex({ kind: "modelCatalog" }, { cwd: canonicalRoot }),
    ]);

  if (majorVersion(nodeVersion.stdout, "Node") !== 24) {
    throw new AutonomyError(
      "Node 24.x is required",
      "UNSUPPORTED_TOOL_VERSION",
    );
  }
  if (majorVersion(npmVersion.stdout, "npm") !== 11) {
    throw new AutonomyError(
      "npm 11.x is required",
      "UNSUPPORTED_TOOL_VERSION",
    );
  }

  const [codexHelp, execHelp, reviewHelp, authStatus, repositoryRoot, remote] =
    await Promise.all([
      commandRunner.codex({ kind: "help" }, { cwd: canonicalRoot }),
      commandRunner.codex(
        { kind: "builderHelp", worktree: canonicalRoot },
        { cwd: canonicalRoot },
      ),
      commandRunner.codex(
        { kind: "reviewerHelp", worktree: canonicalRoot },
        { cwd: canonicalRoot },
      ),
      commandRunner.gh({ kind: "authStatus" }, {
        cwd: canonicalRoot,
      }),
      commandRunner.git({ kind: "repositoryRoot" }, {
        cwd: canonicalRoot,
      }),
      commandRunner.git({ kind: "remoteOrigin" }, {
        cwd: canonicalRoot,
      }),
    ]);

  const codexCapabilities = [
    [execHelp.stdout, "Run Codex non-interactively"],
    [execHelp.stdout, "--model <MODEL>"],
    [execHelp.stdout, "--config <key=value>"],
    [codexHelp.stdout, "--cd <DIR>"],
    [codexHelp.stdout, "read-only"],
    [reviewHelp.stdout, "--uncommitted"],
    [reviewHelp.stdout, "--ephemeral"],
  ];
  for (const [helpText, capability] of codexCapabilities) {
    if (!helpText.includes(capability)) {
      throw new AutonomyError(
        `Codex CLI capability is unavailable: ${capability}`,
        "CODEX_CAPABILITY_GAP",
      );
    }
  }

  const resolvedCanonical = path.resolve(canonicalRoot);
  const actualRoot = path.resolve(repositoryRoot.stdout.trim());
  if (actualRoot.toLowerCase() !== resolvedCanonical.toLowerCase()) {
    throw new AutonomyError(
      "doctor must run from the canonical repository root",
      "REPOSITORY_MISMATCH",
    );
  }
  const repository = parseRepositoryRemote(remote.stdout);
  if (repository === PRODUCTION_REPOSITORY) {
    throw new AutonomyError(
      "production repository access is prohibited",
      "PRODUCTION_REPOSITORY_PROHIBITED",
    );
  }
  if (repository !== EXPECTED_REPOSITORY) {
    throw new AutonomyError(
      `origin must be ${EXPECTED_REPOSITORY}`,
      "REPOSITORY_MISMATCH",
    );
  }

  const sampleRunDirectory = path.resolve(
    path.dirname(resolvedCanonical),
    ".autonomy-external-output",
  );
  const sampleOutput = path.join(sampleRunDirectory, "last-message.txt");
  const profileAvailability = verifyConfiguredProfiles(
    policy,
    modelCatalog.stdout,
  );
  const builderProfileId = Object.keys(policy.profiles).find(
    (profileId) => policy.profiles[profileId].role === "builder",
  );
  const reviewerProfileId = Object.keys(policy.profiles).find(
    (profileId) => policy.profiles[profileId].role === "reviewer",
  );
  return Object.freeze({
    node: nodeVersion.stdout.trim(),
    npm: npmVersion.stdout.trim(),
    git: gitVersion.stdout.trim(),
    gh: ghVersion.stdout.split(/\r?\n/, 1)[0],
    codex: codexVersion.stdout.trim(),
    githubAuthenticated: authStatus.code === 0,
    repository,
    canonicalRoot: actualRoot,
    policy: Object.freeze({
      schemaVersion: policy.schemaVersion,
      playbookVersion: policy.playbookVersion,
      profiles: profileAvailability,
    }),
    builder: codexCommand(tools, {
      kind: "builder",
      worktree: resolvedCanonical,
      expectedWorktree: resolvedCanonical,
      outputFile: sampleOutput,
      runDirectory: sampleRunDirectory,
      runtimeProfile: resolveRuntimeProfile(
        policy,
        builderProfileId,
        "builder",
      ),
    }),
    reviewer: codexCommand(tools, {
      kind: "reviewer",
      worktree: resolvedCanonical,
      expectedWorktree: resolvedCanonical,
      outputFile: sampleOutput,
      runDirectory: sampleRunDirectory,
      runtimeProfile: resolveRuntimeProfile(
        policy,
        reviewerProfileId,
        "reviewer",
      ),
    }),
  });
}

function parseIssueNumber(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new AutonomyError(
      "issue number must be a positive integer",
      "INVALID_ARGUMENT",
    );
  }
  return Number.parseInt(value, 10);
}

export async function loadTaskSource({
  contractPath,
  issueNumber,
  canonicalRoot,
  commandRunner,
  policy,
}) {
  if ((contractPath ? 1 : 0) + (issueNumber ? 1 : 0) !== 1) {
    throw new AutonomyError(
      "provide exactly one of --contract or --issue",
      "INVALID_ARGUMENT",
    );
  }

  if (contractPath) {
    return {
      sourceKind: "local",
      contract: loadLocalContract(
        path.isAbsolute(contractPath)
          ? contractPath
          : path.join(canonicalRoot, contractPath),
        policy,
      ),
    };
  }

  const number = parseIssueNumber(issueNumber);
  const result = await runWithNetworkRetry(() =>
    commandRunner.gh(
      { kind: "issueView", number, repository: EXPECTED_REPOSITORY },
      { cwd: canonicalRoot },
    ),
  );
  let issue;
  try {
    issue = JSON.parse(result.stdout);
  } catch (error) {
    throw new AutonomyError(
      `GitHub issue response is malformed: ${error.message}`,
      "MALFORMED_GITHUB_RESPONSE",
    );
  }
  const contract = extractIssueContract(issue.body, policy);
  verifyIssueGates(issue, contract);
  return { sourceKind: "issue", contract, issue };
}

export function verifyRoadmapGate(canonicalRoot, contract) {
  const roadmap = readFileSync(
    path.join(canonicalRoot, "docs", "codex", "ROADMAP.md"),
    "utf8",
  );
  requireRoadmapReady(roadmap, contract.taskId);
  requireRoadmapRiskClass(roadmap, contract.taskId, contract.riskClass);
}

export function plannedLifecycle(contract) {
  if (["E0", "E1"].includes(contract.executionLevel)) {
    return [
      `Task ${contract.taskId}: ${contract.objective}`,
      `Execution ${contract.executionLevel} is non-mutating.`,
      "1. Run doctor and validate the trusted orchestration policy.",
      "2. Validate the task contract, READY state, risk class, and authorization.",
      "3. Report the bounded scope and stop without creating a branch or worktree.",
    ];
  }
  return [
    `Task ${contract.taskId}: ${contract.objective}`,
    `1. Acquire the external repository lock.`,
    `2. Run doctor and revalidate repository identity and tool capabilities.`,
    `3. Validate the ${contract.riskClass} contract, READY state, and authorization.`,
    `4. Fetch origin and verify clean ${contract.baseBranch} at ${contract.baseSha}.`,
    `5. Create ${contract.branch} in ${contract.externalWorktree}.`,
    "6. Invoke a fresh non-interactive Builder with staging and publication prohibited.",
    "7. Enforce unchanged HEAD plus exact allowed/protected changed paths.",
    `8. Run ${contract.validationDepth} validation and enforce the exact scope.`,
    "9. Invoke a fresh Codex Reviewer in a technically read-only sandbox.",
    `10. Run at most ${contract.maxRepairCycles} fresh Builder repair cycles with full revalidation and rereview.`,
    contract.executionLevel === "E4"
      ? "11. After Reviewer PASS only, stage the exact changed paths and validate the cached diff."
      : "11. Stop before staging or publication.",
    contract.executionLevel === "E4"
      ? "12. Create one commit, push only the feature branch, and create one non-draft PR."
      : "12. Write the external report with publication prohibited.",
    contract.executionLevel === "E4"
      ? "13. Verify PR identity and changed files, observe CI with a bounded timeout."
      : "13. Preserve the unstaged worktree for human-controlled continuation.",
    "14. Write the external report, release the lock, and stop before merge.",
  ];
}

function parseNulList(output) {
  return output.split("\0").filter(Boolean).map((value) => value.replace(/\\/g, "/"));
}

async function changedPathInventory(commandRunner, worktree) {
  const [tracked, untracked] = await Promise.all([
    commandRunner.git({ kind: "changedNames" }, { cwd: worktree }),
    commandRunner.git({ kind: "untrackedNames" }, {
      cwd: worktree,
    }),
  ]);
  return [
    ...new Set([
      ...parseNulList(tracked.stdout),
      ...parseNulList(untracked.stdout),
    ]),
  ].sort();
}

function stablePullRequestState(rawOutput) {
  let pullRequests;
  try {
    pullRequests = JSON.parse(rawOutput);
  } catch (error) {
    throw new AutonomyError(
      `GitHub PR discovery response is malformed: ${error.message}`,
      "MALFORMED_GITHUB_RESPONSE",
    );
  }
  if (!Array.isArray(pullRequests)) {
    throw new AutonomyError(
      "GitHub PR discovery response must be an array",
      "MALFORMED_GITHUB_RESPONSE",
    );
  }
  return pullRequests
    .map((pullRequest) => ({
      number: pullRequest.number,
      state: pullRequest.state,
      headRefName: pullRequest.headRefName,
      headRefOid: pullRequest.headRefOid,
      baseRefName: pullRequest.baseRefName,
      isDraft: pullRequest.isDraft,
      updatedAt: pullRequest.updatedAt,
      url: pullRequest.url,
    }))
    .sort((left, right) => left.number - right.number);
}

function workingTreeFingerprint(worktree, status, changedPaths) {
  const hash = createHash("sha256");
  hash.update(status);
  for (const changedPath of changedPaths) {
    hash.update("\0");
    hash.update(changedPath);
    const absolutePath = path.join(worktree, changedPath);
    if (existsSync(absolutePath)) {
      hash.update("\0file\0");
      hash.update(readFileSync(absolutePath));
    } else {
      hash.update("\0missing\0");
    }
  }
  return hash.digest("hex");
}

export async function captureCodexBoundarySnapshot({
  commandRunner,
  contract,
  worktree,
}) {
  const [
    head,
    staged,
    branch,
    remoteFeature,
    pullRequests,
    main,
    originMain,
    remoteMain,
    branchReflog,
    status,
    changedPaths,
  ] = await Promise.all([
    commandRunner.git({ kind: "head" }, { cwd: worktree }),
    commandRunner.git({ kind: "stagedNames" }, { cwd: worktree }),
    commandRunner.git({ kind: "branchCurrent" }, { cwd: worktree }),
    commandRunner.git(
      { kind: "remoteFeature", branch: contract.branch },
      { cwd: worktree },
    ),
    runWithNetworkRetry(() =>
      commandRunner.gh(
        {
          kind: "prDiscovery",
          repository: contract.repository,
          branch: contract.branch,
          state: "all",
        },
        { cwd: worktree },
      ),
    ),
    commandRunner.git({ kind: "main" }, { cwd: worktree }),
    commandRunner.git({ kind: "originMain" }, { cwd: worktree }),
    commandRunner.git({ kind: "remoteMain" }, { cwd: worktree }),
    commandRunner.git(
      { kind: "branchReflog", branch: contract.branch },
      { cwd: worktree },
    ),
    commandRunner.git({ kind: "status" }, { cwd: worktree }),
    changedPathInventory(commandRunner, worktree),
  ]);
  const normalizedPullRequests = stablePullRequestState(pullRequests.stdout);
  const normalizedStaged = parseNulList(staged.stdout).sort();
  return Object.freeze({
    head: head.stdout.trim(),
    branch: branch.stdout.trim(),
    staged: Object.freeze(normalizedStaged),
    branchReflog: Object.freeze(
      branchReflog.stdout.split(/\r?\n/).filter(Boolean),
    ),
    main: main.stdout.trim(),
    originMain: originMain.stdout.trim(),
    remoteMain: remoteMain.stdout.trim(),
    remoteFeature: remoteFeature.stdout.trim(),
    pullRequestCount: normalizedPullRequests.length,
    pullRequests: Object.freeze(normalizedPullRequests),
    workingTreeFingerprint: workingTreeFingerprint(
      worktree,
      status.stdout,
      changedPaths,
    ),
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function assertCodexBoundaryUnchanged(
  before,
  after,
  { processKind, requireWorkingTreeUnchanged = false },
) {
  const differences = [];
  for (const field of [
    "head",
    "branch",
    "branchReflog",
    "main",
    "originMain",
    "remoteMain",
    "remoteFeature",
    "pullRequestCount",
    "pullRequests",
  ]) {
    if (!sameState(before[field], after[field])) {
      differences.push(field);
    }
  }
  if (before.staged.length > 0) {
    differences.push("stagedBeforeCodex");
  }
  if (after.staged.length > 0) {
    differences.push("stagedAfterCodex");
  }
  if (
    requireWorkingTreeUnchanged &&
    before.workingTreeFingerprint !== after.workingTreeFingerprint
  ) {
    differences.push("workingTreeFingerprint");
  }
  if (differences.length > 0) {
    throw new AutonomyError(
      `${processKind} changed protected local or remote state`,
      "PREMATURE_PUBLICATION",
      { processKind, differences, before, after },
    );
  }
}

function assertCodexBoundaryReady(snapshot, contract, processKind) {
  const expectedRemoteMain =
    `${contract.baseSha}\trefs/heads/main`;
  const unexpected = [];
  if (snapshot.head !== contract.baseSha) unexpected.push("head");
  if (snapshot.branch !== contract.branch) unexpected.push("branch");
  if (snapshot.staged.length > 0) unexpected.push("staged");
  if (snapshot.main !== contract.baseSha) unexpected.push("main");
  if (snapshot.originMain !== contract.baseSha) unexpected.push("originMain");
  if (snapshot.remoteMain !== expectedRemoteMain) unexpected.push("remoteMain");
  if (snapshot.remoteFeature !== "") unexpected.push("remoteFeature");
  if (snapshot.pullRequestCount !== 0) unexpected.push("pullRequests");
  if (unexpected.length > 0) {
    throw new AutonomyError(
      `${processKind} boundary was not safe before Codex execution`,
      "PREMATURE_PUBLICATION",
      { processKind, differences: unexpected, before: snapshot },
    );
  }
}

function scanChangedTextFiles(worktree, changedPaths) {
  const textExtensions = new Set([
    ".cjs",
    ".css",
    ".html",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".mjs",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
  ]);
  for (const changedPath of changedPaths) {
    const absolutePath = path.join(worktree, changedPath);
    if (!existsSync(absolutePath) || !textExtensions.has(path.extname(changedPath))) {
      continue;
    }
    const content = readFileSync(absolutePath, "utf8");
    if (content.includes("\0")) {
      throw new AutonomyError(
        `text file contains NUL bytes: ${changedPath}`,
        "INVALID_TEXT_CONTENT",
      );
    }
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/[ \t]+$/.test(line)) {
        throw new AutonomyError(
          `trailing whitespace: ${changedPath}:${index + 1}`,
          "TEXT_SCAN_FAILED",
        );
      }
      if (/^(<<<<<<<|=======|>>>>>>>)/.test(line)) {
        throw new AutonomyError(
          `merge conflict marker: ${changedPath}:${index + 1}`,
          "TEXT_SCAN_FAILED",
        );
      }
    });
  }
}

export async function verifyCanonicalBaseline(
  commandRunner,
  canonicalRoot,
  contract,
) {
  const [branch, head, baseBranch, originBase, status, staged] =
    await Promise.all([
      commandRunner.git({ kind: "branchCurrent" }, { cwd: canonicalRoot }),
      commandRunner.git({ kind: "head" }, { cwd: canonicalRoot }),
      commandRunner.git({ kind: "main" }, {
        cwd: canonicalRoot,
      }),
      commandRunner.git({ kind: "originMain" }, {
        cwd: canonicalRoot,
      }),
      commandRunner.git({ kind: "status" }, { cwd: canonicalRoot }),
      commandRunner.git({ kind: "stagedNames" }, {
        cwd: canonicalRoot,
      }),
    ]);

  const observedShas = [
    head.stdout.trim(),
    baseBranch.stdout.trim(),
    originBase.stdout.trim(),
  ];
  if (
    branch.stdout.trim() !== contract.baseBranch ||
    observedShas.some((sha) => sha !== contract.baseSha)
  ) {
    throw new AutonomyError(
      "canonical branch or baseline SHA drifted",
      "BASELINE_SHA_DRIFT",
      {
        branch: branch.stdout.trim(),
        shas: observedShas,
      },
    );
  }
  if (status.stdout.trim() || staged.stdout.trim()) {
    throw new AutonomyError(
      "canonical baseline is dirty",
      "DIRTY_BASELINE",
    );
  }
}

async function verifyNoConflicts(commandRunner, canonicalRoot, contract) {
  if (existsSync(contract.externalWorktree)) {
    throw new AutonomyError(
      "external worktree path already exists",
      "CONFLICTING_WORKTREE",
    );
  }
  const [localBranch, remoteBranch, worktrees, openPrs] = await Promise.all([
    commandRunner.git(
      { kind: "showLocalBranch", branch: contract.branch },
      { cwd: canonicalRoot, allowedExitCodes: [0, 1] },
    ),
    commandRunner.git(
      { kind: "showRemoteTrackingBranch", branch: contract.branch },
      { cwd: canonicalRoot, allowedExitCodes: [0, 1] },
    ),
    commandRunner.git({ kind: "worktreeList" }, {
      cwd: canonicalRoot,
    }),
    runWithNetworkRetry(() =>
      commandRunner.gh(
        {
          kind: "prDiscovery",
          repository: contract.repository,
          branch: contract.branch,
          state: "open",
        },
        { cwd: canonicalRoot },
      ),
    ),
  ]);
  if (localBranch.code === 0 || remoteBranch.code === 0) {
    throw new AutonomyError(
      "feature branch already exists",
      "CONFLICTING_BRANCH",
    );
  }
  if (
    worktrees.stdout
      .toLowerCase()
      .includes(path.resolve(contract.externalWorktree).toLowerCase())
  ) {
    throw new AutonomyError(
      "conflicting worktree is registered",
      "CONFLICTING_WORKTREE",
    );
  }
  if (JSON.parse(openPrs.stdout).length > 0) {
    throw new AutonomyError(
      "an open PR already uses the feature branch",
      "CONFLICTING_PULL_REQUEST",
    );
  }
}

function recommendedRun(contract, runtimeProfile, completionEvidence) {
  return [
    "RECOMMENDED RUN",
    "",
    `- Model/profile: ${runtimeProfile.model} (${runtimeProfile.id})`,
    `- Reasoning effort: ${runtimeProfile.reasoningEffort}`,
    `- Execution autonomy: ${contract.executionLevel}`,
    `- Context budget: ${contract.contextBudget}`,
    `- Sandbox: ${runtimeProfile.sandbox}`,
    `- Approval mode: ${runtimeProfile.approvalMode}`,
    `- Git permissions: ${contract.gitPermission}`,
    `- Validation depth: ${contract.validationDepth}`,
    `- Token posture: ${contract.tokenPosture}`,
    `- Completion evidence: ${completionEvidence}`,
  ].join("\n");
}

function builderPrompt(contract, runtimeProfile) {
  return [
    `Implement task ${contract.taskId}: ${contract.objective}`,
    "",
    "Read AGENTS.md and docs/codex before editing.",
    `Allowed paths: ${contract.allowedPaths.join(", ")}`,
    `Protected paths: ${contract.protectedPaths.join(", ")}`,
    "Acceptance criteria:",
    ...contract.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    "",
    "Do not stage, commit, push, create or update a PR, merge, rebase, amend,",
    "force, clean, reset, or access the production repository.",
    "Keep HEAD unchanged and finish with a concise implementation summary.",
    "",
    recommendedRun(
      contract,
      runtimeProfile,
      "changed paths, focused implementation evidence and validation handoff",
    ),
  ].join("\n");
}

function repairPrompt(contract, reviewResult, runtimeProfile) {
  const findings = REVIEW_SEVERITIES.flatMap((severity) =>
    reviewResult.findings[severity].map(
      (finding) => `${severity}: ${finding}`,
    ),
  );
  return [
    `Repair only the confirmed Reviewer findings for ${contract.taskId}.`,
    ...findings,
    ...reviewResult.notes.map((note) => `NOTE: ${note}`),
    "",
    `Allowed paths remain: ${contract.allowedPaths.join(", ")}`,
    `Protected paths remain: ${contract.protectedPaths.join(", ")}`,
    "Do not stage, commit, push, create or update a PR, merge, rebase, amend,",
    "force, clean, reset, or access the production repository.",
    "",
    recommendedRun(
      contract,
      runtimeProfile,
      "repaired findings, exact changed paths and revalidation handoff",
    ),
  ].join("\n");
}

function simplificationPrompt(contract, runtimeProfile) {
  return [
    `Perform the mandatory Simplification Pass for ${contract.taskId}.`,
    "Reread the complete diff and remove scaffolding, dead code, unnecessary",
    "indirection, duplication and speculative options without changing the",
    "approved behavior or weakening any safety boundary.",
    `Allowed paths remain: ${contract.allowedPaths.join(", ")}`,
    `Protected paths remain: ${contract.protectedPaths.join(", ")}`,
    "Do not stage, commit, push, create or update a PR, merge, rebase, amend,",
    "force, clean, reset, or access the production repository.",
    "",
    recommendedRun(
      contract,
      runtimeProfile,
      "simplified diff, removed complexity and complete revalidation handoff",
    ),
  ].join("\n");
}

function reviewerPrompt(contract, runtimeProfile) {
  const scoreShape = Object.fromEntries(REVIEW_SCORE_KEYS.map((key) => [key, 0]));
  const findingShape = Object.fromEntries(
    REVIEW_SEVERITIES.map((severity) => [severity, []]),
  );
  const example = {
    verdict: "FAIL",
    qualityScores: scoreShape,
    totalScore: 0,
    findings: findingShape,
    notes: [],
  };
  return [
    `Independently review the complete uncommitted diff for ${contract.taskId}.`,
    `Objective: ${contract.objective}`,
    `Allowed paths: ${contract.allowedPaths.join(", ")}`,
    `Protected paths: ${contract.protectedPaths.join(", ")}`,
    "Assess scope, security, repository fit, validation, AI-code smells, and",
    "the five-category Engineering Quality Score. Do not modify any file.",
    "Return exactly one machine-readable result between these markers:",
    REVIEW_RESULT_START,
    JSON.stringify(example, null, 2),
    REVIEW_RESULT_END,
    "Replace the example values. PASS requires at least 8/10, no zero",
    "category, and no finding at any severity.",
    "",
    recommendedRun(
      contract,
      runtimeProfile,
      "machine-readable findings, verdict and Engineering Quality Score",
    ),
  ].join("\n");
}

async function invokeCodex({
  commandRunner,
  operation,
  prompt,
  cwd,
  outputFile,
}) {
  await commandRunner.codex(operation, {
    cwd,
    input: prompt,
    timeoutMs: CODEX_PROCESS_TIMEOUT_MS,
  });
  if (!existsSync(outputFile)) {
    throw new AutonomyError(
      "Codex did not write its final output",
      "MISSING_CODEX_OUTPUT",
    );
  }
  return readFileSync(outputFile, "utf8");
}

async function invokeCodexWithinBoundary({
  commandRunner,
  contract,
  worktree,
  processKind,
  requireWorkingTreeUnchanged,
  operation,
  prompt,
  outputFile,
}) {
  const before = await captureCodexBoundarySnapshot({
    commandRunner,
    contract,
    worktree,
  });
  assertCodexBoundaryReady(before, contract, processKind);
  let output;
  let invocationError;
  try {
    output = await invokeCodex({
      commandRunner,
      operation,
      prompt,
      cwd: worktree,
      outputFile,
    });
  } catch (error) {
    invocationError = error;
  }
  const after = await captureCodexBoundarySnapshot({
    commandRunner,
    contract,
    worktree,
  });
  assertCodexBoundaryUnchanged(before, after, {
    processKind,
    requireWorkingTreeUnchanged,
  });
  if (invocationError) {
    throw invocationError;
  }
  return output;
}

async function invokeBuilder(
  commandRunner,
  policy,
  contract,
  worktree,
  runDirectory,
  cycle,
  reviewResult,
) {
  const runtimeProfile =
    cycle === 0
      ? resolveRuntimeProfile(policy, contract.builderProfile, "builder")
      : resolveRuntimeProfile(
          policy,
          policy.defaultProfiles.repair,
          "repair",
        );
  const outputFile = path.join(
    runDirectory,
    cycle === 0 ? "builder-initial.txt" : `builder-repair-${cycle}.txt`,
  );
  const processKind = cycle === 0 ? "Builder" : `repair Builder ${cycle}`;
  await invokeCodexWithinBoundary({
    commandRunner,
    contract,
    worktree,
    processKind,
    requireWorkingTreeUnchanged: false,
    operation: {
      kind: cycle === 0 ? "builder" : "repair",
      worktree,
      expectedWorktree: contract.externalWorktree,
      outputFile,
      runDirectory,
      runtimeProfile,
    },
    prompt:
      cycle === 0
        ? builderPrompt(contract, runtimeProfile)
        : repairPrompt(contract, reviewResult, runtimeProfile),
    outputFile,
  });
}

async function invokeReviewer(
  commandRunner,
  policy,
  contract,
  worktree,
  runDirectory,
  cycle,
) {
  const runtimeProfile = resolveRuntimeProfile(
    policy,
    contract.reviewerProfile,
    "reviewer",
  );
  const outputFile = path.join(runDirectory, `reviewer-${cycle}.txt`);
  const output = await invokeCodexWithinBoundary({
    commandRunner,
    contract,
    worktree,
    processKind: `Reviewer ${cycle}`,
    requireWorkingTreeUnchanged: true,
    operation: {
      kind: "reviewer",
      worktree,
      expectedWorktree: contract.externalWorktree,
      outputFile,
      runDirectory,
      runtimeProfile,
    },
    prompt: reviewerPrompt(contract, runtimeProfile),
    outputFile,
  });
  return parseReviewerResult(output);
}

async function invokeSimplifier(
  commandRunner,
  policy,
  contract,
  worktree,
  runDirectory,
) {
  const outputFile = path.join(runDirectory, "builder-simplification.txt");
  const runtimeProfile = resolveRuntimeProfile(
    policy,
    contract.builderProfile,
    "builder",
  );
  await invokeCodexWithinBoundary({
    commandRunner,
    contract,
    worktree,
    processKind: "simplification Builder",
    requireWorkingTreeUnchanged: false,
    operation: {
      kind: "builder",
      worktree,
      expectedWorktree: contract.externalWorktree,
      outputFile,
      runDirectory,
      runtimeProfile,
    },
    prompt: simplificationPrompt(contract, runtimeProfile),
    outputFile,
  });
}

async function validatePackageFiles(commandRunner, worktree, contract) {
  const [packageJsonStatus, packageLockStatus] = await Promise.all([
    commandRunner.git({ kind: "diffPath", path: "package.json" }, {
      cwd: worktree,
    }),
    commandRunner.git(
      { kind: "diffPath", path: "package-lock.json" },
      { cwd: worktree },
    ),
  ]);
  if (packageLockStatus.stdout.trim()) {
    throw new AutonomyError(
      "package-lock.json changed",
      "PACKAGE_LOCK_CHANGED",
    );
  }
  if (
    packageJsonStatus.stdout.trim() &&
    (contract.riskClass !== "Class C" ||
      !contract.allowedPaths.includes("package.json"))
  ) {
    throw new AutonomyError(
      "package.json changed without exact Class C scope",
      "PACKAGE_JSON_CHANGED",
    );
  }
}

async function runValidation(commandRunner, worktree, contract) {
  const npmEnvironment = {
    PATH: [
      path.dirname(commandRunner.tools.node),
      path.join(worktree, "node_modules", ".bin"),
      commandRunner.environment.PATH,
    ].join(path.delimiter),
  };
  try {
    await commandRunner.npm(["ci"], {
      cwd: worktree,
      environment: npmEnvironment,
    });
    if (contract.focusedTestArgs.length > 0) {
      await commandRunner.npm(
        [
          "test",
          "--",
          "--reporter=verbose",
          ...contract.focusedTestArgs,
        ],
        { cwd: worktree, environment: npmEnvironment },
      );
    }
    if (contract.validationDepth === "complete") {
      await commandRunner.npm(["run", "typecheck"], {
        cwd: worktree,
        environment: npmEnvironment,
      });
      await commandRunner.npm(["test", "--", "--reporter=verbose"], {
        cwd: worktree,
        environment: npmEnvironment,
      });
      await commandRunner.npm(["run", "build"], {
        cwd: worktree,
        environment: npmEnvironment,
      });
      await commandRunner.npm(["audit", "--omit=dev"], {
        cwd: worktree,
        environment: npmEnvironment,
      });
    }
    await commandRunner.git({ kind: "diffCheck" }, { cwd: worktree });
    await validatePackageFiles(commandRunner, worktree, contract);
  } finally {
    removeGeneratedDist(worktree);
  }
}

export async function stageExactPaths({
  commandRunner,
  worktree,
  changedPaths,
}) {
  if (changedPaths.length === 0) {
    throw new AutonomyError(
      "there are no changed paths to publish",
      "EMPTY_CHANGE",
    );
  }
  await commandRunner.git(
    { kind: "addExact", paths: changedPaths },
    { cwd: worktree },
  );
  const staged = await commandRunner.git(
    { kind: "stagedNames" },
    { cwd: worktree },
  );
  const stagedPaths = parseNulList(staged.stdout).sort();
  if (JSON.stringify(stagedPaths) !== JSON.stringify([...changedPaths].sort())) {
    throw new AutonomyError(
      "staged inventory differs from the approved changed paths",
      "STAGED_INVENTORY_MISMATCH",
      { changedPaths, stagedPaths },
    );
  }
  await commandRunner.git({ kind: "stagedCheck" }, { cwd: worktree });
  return stagedPaths;
}

async function verifyPullRequest(
  commandRunner,
  contract,
  prUrl,
  commitSha,
  changedPaths,
) {
  const result = await runWithNetworkRetry(() =>
    commandRunner.gh(
      {
        kind: "prView",
        url: prUrl,
        repository: contract.repository,
      },
      { cwd: contract.externalWorktree },
    ),
  );
  const pr = JSON.parse(result.stdout);
  const prPaths = (pr.files ?? []).map((file) => file.path).sort();
  if (
    pr.baseRefName !== contract.baseBranch ||
    pr.headRefName !== contract.branch ||
    pr.headRefOid !== commitSha ||
    pr.isDraft !== false ||
    pr.state !== "OPEN" ||
    JSON.stringify(prPaths) !== JSON.stringify([...changedPaths].sort())
  ) {
    throw new AutonomyError(
      "created PR does not match the verified publication state",
      "PULL_REQUEST_VERIFICATION_FAILED",
      pr,
    );
  }
  return pr;
}

export async function publishAfterReviewerPass({
  commandRunner,
  contract,
  worktree,
  changedPaths,
}) {
  const stagedPaths = await stageExactPaths({
    commandRunner,
    worktree,
    changedPaths,
  });
  await commandRunner.git({ kind: "commit", message: contract.commitMessage }, {
    cwd: worktree,
  });
  const head = await commandRunner.git({ kind: "head" }, {
    cwd: worktree,
  });
  const commitSha = head.stdout.trim();
  const [status, committedInventory] = await Promise.all([
    commandRunner.git({ kind: "status" }, { cwd: worktree }),
    commandRunner.git({ kind: "committedNames" }, { cwd: worktree }),
  ]);
  if (status.stdout.trim()) {
    throw new AutonomyError(
      "worktree is not clean after the controlled commit",
      "POST_COMMIT_STATE_MISMATCH",
    );
  }
  const committedPaths = parseNulList(committedInventory.stdout).sort();
  if (JSON.stringify(committedPaths) !== JSON.stringify(stagedPaths)) {
    throw new AutonomyError(
      "commit inventory differs from the verified staged inventory",
      "POST_COMMIT_STATE_MISMATCH",
    );
  }
  await runWithNetworkRetry(() =>
    commandRunner.git(
      { kind: "pushFeature", branch: contract.branch },
      { cwd: worktree },
    ),
  );
  const prCreate = await runWithNetworkRetry(() =>
    commandRunner.gh(
      {
        kind: "prCreate",
        repository: contract.repository,
        branch: contract.branch,
        title: contract.prTitle,
        body: contract.prBody,
      },
      { cwd: worktree },
    ),
  );
  const prUrl = prCreate.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^https:\/\/github\.com\/.+\/pull\/\d+$/.test(line));
  if (!prUrl) {
    throw new AutonomyError(
      "GitHub CLI did not return a PR URL",
      "PULL_REQUEST_CREATION_FAILED",
    );
  }
  const pr = await verifyPullRequest(
    commandRunner,
    contract,
    prUrl,
    commitSha,
    stagedPaths,
  );
  await runWithNetworkRetry(() =>
    commandRunner.gh(
      {
        kind: "prChecks",
        url: prUrl,
        repository: contract.repository,
      },
      { cwd: worktree, timeoutMs: CI_TIMEOUT_MS },
    ),
  );
  return { commitSha, pr };
}

function reportPath(runDirectory) {
  return path.join(runDirectory, "final-report.json");
}

function writeRunReport(runDirectory, report) {
  writeFileSync(
    reportPath(runDirectory),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
}

function sanitizeReportValue(value) {
  if (typeof value === "string") {
    return sanitizeLog(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeReportValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sanitizeReportValue(entry),
      ]),
    );
  }
  return value;
}

function fileSha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function packageFileByteHashes(worktree) {
  return {
    packageJson: fileSha256(path.join(worktree, "package.json")),
    packageLock: fileSha256(path.join(worktree, "package-lock.json")),
  };
}

export function buildRuntimeProfileReport(policy, contract) {
  const builderRole = ["E0", "E1"].includes(contract.executionLevel)
    ? "scan"
    : "builder";
  return Object.freeze({
    builder: runtimeProfileEvidence(
      resolveRuntimeProfile(policy, contract.builderProfile, builderRole),
    ),
    reviewer: runtimeProfileEvidence(
      resolveRuntimeProfile(
        policy,
        contract.reviewerProfile,
        "reviewer",
      ),
    ),
    repair: runtimeProfileEvidence(
      resolveRuntimeProfile(
        policy,
        policy.defaultProfiles.repair,
        "repair",
      ),
    ),
    scan: runtimeProfileEvidence(
      resolveRuntimeProfile(policy, policy.defaultProfiles.scan, "scan"),
    ),
  });
}

export async function executeTask({
  canonicalRoot = process.cwd(),
  contractPath,
  issueNumber,
  stateRoot = defaultStateRoot(),
  commandRunner = new SafeCommandRunner(),
}) {
  assertStateOutsideRepository(stateRoot, canonicalRoot);
  const provisionalTaskId = contractPath
    ? path.basename(contractPath)
    : `issue-${issueNumber}`;
  const lock = acquireRepositoryLock(
    stateRoot,
    canonicalRoot,
    provisionalTaskId,
  );
  let runDirectory;
  let report = {
    status: "FAIL",
    startedAt: new Date().toISOString(),
    canonicalRoot: path.resolve(canonicalRoot),
  };

  try {
    runDirectory = createExternalRunDirectory(stateRoot, provisionalTaskId);
    const processLog = path.join(runDirectory, "process.log");
    writeFileSync(processLog, "", "utf8");
    commandRunner.output = (value) => {
      appendFileSync(processLog, sanitizeLog(value), "utf8");
    };
    const policy = loadOrchestratorPolicy(canonicalRoot);
    report.doctor = await runDoctor({
      canonicalRoot,
      commandRunner,
      policy,
    });
    const source = await loadTaskSource({
      contractPath,
      issueNumber,
      canonicalRoot,
      commandRunner,
      policy,
    });
    const { contract } = source;
    report.taskId = contract.taskId;
    report.sourceKind = source.sourceKind;
    report.executionPolicy = {
      executionLevel: contract.executionLevel,
      contextBudget: contract.contextBudget,
      tokenPosture: contract.tokenPosture,
      validationDepth: contract.validationDepth,
      gitPermission: contract.gitPermission,
    };
    report.runtimeProfiles = buildRuntimeProfileReport(policy, contract);
    assertExternalWorktree(canonicalRoot, contract.externalWorktree);
    verifyRoadmapGate(canonicalRoot, contract);
    if (!policy.executionLevels[contract.executionLevel].mayEdit) {
      report = {
        ...report,
        status: "PASS",
        completedAt: new Date().toISOString(),
        plan: plannedLifecycle(contract),
        stoppedBeforeWorktree: true,
        stoppedBeforePublication: true,
        stoppedBeforeMerge: true,
      };
      writeRunReport(runDirectory, report);
      return report;
    }

    await runWithNetworkRetry(() =>
      commandRunner.git({ kind: "fetchOrigin" }, { cwd: canonicalRoot }),
    );
    await verifyCanonicalBaseline(commandRunner, canonicalRoot, contract);
    await verifyNoConflicts(commandRunner, canonicalRoot, contract);
    await commandRunner.git(
      {
        kind: "worktreeAdd",
        branch: contract.branch,
        worktree: contract.externalWorktree,
        baseSha: contract.baseSha,
      },
      { cwd: canonicalRoot },
    );
    const packageFilesBefore = packageFileByteHashes(
      contract.externalWorktree,
    );

    await invokeBuilder(
      commandRunner,
      policy,
      contract,
      contract.externalWorktree,
      runDirectory,
      0,
    );
    let changedPaths = assertChangedPaths(
      await changedPathInventory(commandRunner, contract.externalWorktree),
      contract,
    );
    scanChangedTextFiles(contract.externalWorktree, changedPaths);
    await runValidation(commandRunner, contract.externalWorktree, contract);
    if (["E3", "E4"].includes(contract.executionLevel)) {
      await invokeSimplifier(
        commandRunner,
        policy,
        contract,
        contract.externalWorktree,
        runDirectory,
      );
      changedPaths = assertChangedPaths(
        await changedPathInventory(
          commandRunner,
          contract.externalWorktree,
        ),
        contract,
      );
      scanChangedTextFiles(contract.externalWorktree, changedPaths);
      await runValidation(
        commandRunner,
        contract.externalWorktree,
        contract,
      );
    }

    const reviewLoop = await runReviewRepairLoop({
      maxRepairCycles: contract.maxRepairCycles,
      review: async (cycle = 0) =>
        invokeReviewer(
          commandRunner,
          policy,
          contract,
          contract.externalWorktree,
          runDirectory,
          cycle,
        ),
      repair: async (reviewResult, cycle) => {
        await invokeBuilder(
          commandRunner,
          policy,
          contract,
          contract.externalWorktree,
          runDirectory,
          cycle,
          reviewResult,
        );
        changedPaths = assertChangedPaths(
          await changedPathInventory(
            commandRunner,
            contract.externalWorktree,
          ),
          contract,
        );
        scanChangedTextFiles(contract.externalWorktree, changedPaths);
      },
      validate: async () =>
        runValidation(
          commandRunner,
          contract.externalWorktree,
          contract,
        ),
    });

    changedPaths = assertChangedPaths(
      await changedPathInventory(commandRunner, contract.externalWorktree),
      contract,
    );
    const packageFilesAfter = packageFileByteHashes(
      contract.externalWorktree,
    );
    if (packageFilesAfter.packageLock !== packageFilesBefore.packageLock) {
      throw new AutonomyError(
        "package-lock.json changed byte-for-byte",
        "PACKAGE_LOCK_CHANGED",
      );
    }
    const completedReport = {
      ...report,
      status: "PASS",
      completedAt: new Date().toISOString(),
      branch: contract.branch,
      worktree: contract.externalWorktree,
      changedPaths,
      packageFiles: {
        before: packageFilesBefore,
        after: packageFilesAfter,
      },
      repairCycles: reviewLoop.repairCycles,
      review: reviewLoop.result,
      stoppedBeforeMerge: true,
    };
    if (!policy.executionLevels[contract.executionLevel].mayPublish) {
      report = {
        ...completedReport,
        stoppedBeforePublication: true,
      };
      if (runDirectory) {
        writeRunReport(runDirectory, report);
      }
      return report;
    }
    const publication = await publishAfterReviewerPass({
      commandRunner,
      contract,
      worktree: contract.externalWorktree,
      changedPaths,
    });
    report = {
      ...completedReport,
      commitSha: publication.commitSha,
      pullRequest: publication.pr.url,
    };
    if (runDirectory) {
      writeRunReport(runDirectory, report);
    }
    return report;
  } catch (error) {
    report = {
      ...report,
      status: "FAIL",
      completedAt: new Date().toISOString(),
      error: {
        code: error.code ?? "UNEXPECTED_ERROR",
        message: sanitizeLog(error.message),
        ...(error.details === undefined
          ? {}
          : { details: sanitizeReportValue(error.details) }),
      },
      stoppedBeforeMerge: true,
    };
    if (runDirectory) {
      writeRunReport(runDirectory, report);
    }
    throw error;
  } finally {
    lock.release();
  }
}

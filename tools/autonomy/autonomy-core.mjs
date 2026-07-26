import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export const EXPECTED_REPOSITORY =
  "lukaszgebicki/dock-scheduling-ui-ai-studio";
export const PRODUCTION_REPOSITORY =
  "lukaszgebicki/dock-scheduling-app-ai-studio1707";
export const REVIEW_RESULT_START = "AUTONOMY_REVIEW_RESULT_START";
export const REVIEW_RESULT_END = "AUTONOMY_REVIEW_RESULT_END";
export const DEFAULT_REPAIR_CYCLES = 2;
export const ORCHESTRATOR_POLICY_PATH = ".ai/orchestrator-policy.json";
export const RUNTIME_PROFILE_UNVERIFIED =
  "requested-but-not-runtime-verified";

const POLICY_SCHEMA_VERSION = 1;
const PLAYBOOK_VERSION = "2.0";
const EXECUTION_LEVELS = ["E0", "E1", "E2", "E3", "E4"];
const PROFILE_ROLES = ["scan", "builder", "repair", "reviewer"];
const SANDBOXES = ["read-only", "workspace-write"];
const GIT_PERMISSION_IDS = [
  "read_only",
  "worktree_write",
  "publish_feature",
];
const EXPECTED_EXECUTION_POLICY = {
  E0: {
    mayEdit: false,
    mayPublish: false,
    validationDepth: "none",
    gitPermission: "read_only",
  },
  E1: {
    mayEdit: false,
    mayPublish: false,
    validationDepth: "none",
    gitPermission: "read_only",
  },
  E2: {
    mayEdit: true,
    mayPublish: false,
    validationDepth: "focused",
    gitPermission: "worktree_write",
  },
  E3: {
    mayEdit: true,
    mayPublish: false,
    validationDepth: "complete",
    gitPermission: "worktree_write",
  },
  E4: {
    mayEdit: true,
    mayPublish: true,
    validationDepth: "complete",
    gitPermission: "publish_feature",
  },
};
const TRUSTED_RUNTIME_PROFILE = Symbol("trustedRuntimeProfile");

const REQUIRED_CONTRACT_FIELDS = [
  "taskId",
  "objective",
  "repository",
  "baseBranch",
  "baseSha",
  "riskClass",
  "executionLevel",
  "builderProfile",
  "reviewerProfile",
  "contextBudget",
  "tokenPosture",
  "validationDepth",
  "gitPermission",
  "branch",
  "externalWorktree",
  "allowedPaths",
  "protectedPaths",
  "acceptanceCriteria",
  "classCAuthorizations",
  "focusedTestArgs",
  "commitMessage",
  "prTitle",
  "prBody",
];

const OPTIONAL_CONTRACT_FIELDS = [
  "projectLeadAuthorization",
  "maxRepairCycles",
];

const SCORE_KEYS = [
  "repositoryFit",
  "simplicity",
  "domainAndTechnicalClarity",
  "validationQualityAndConfidence",
  "maintainability",
];

const SEVERITIES = ["BLOCKER", "HIGH", "MEDIUM", "LOW"];

const CLASS_C_PATH_CONCERNS = [
  {
    matches: (value) =>
      value === "package.json" || value === "package-lock.json",
    keywords: ["package", "dependency", "lockfile", "npm script"],
  },
  {
    matches: (value) => value === ".github" || value.startsWith(".github/"),
    keywords: ["github", "issue template", "repository governance", "ci"],
  },
  {
    matches: (value) =>
      value === ".ai" ||
      value.startsWith(".ai/") ||
      value === "tools" ||
      value.startsWith("tools/") ||
      value === "AGENTS.md" ||
      value.startsWith("docs/codex/"),
    keywords: [
      "policy",
      "model",
      "execution",
      "runner",
      "orchestration",
      "governance",
      "codex",
      "github cli",
    ],
  },
  {
    matches: (value) =>
      value.startsWith("src/auth/") || value.startsWith("src/api/"),
    keywords: ["authentication", "authorization", "security", "network"],
  },
];

const CLASS_C_PATH_PATTERNS = [
  "package.json",
  "package-lock.json",
  ".ai/**",
  ".github/**",
  "tools/**",
  "AGENTS.md",
  "docs/codex/**",
  "src/auth/**",
  "src/api/**",
];

export class AutonomyError extends Error {
  constructor(message, code = "AUTONOMY_ERROR", details = undefined) {
    super(message);
    this.name = "AutonomyError";
    this.code = code;
    this.details = details;
  }
}

function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AutonomyError(
      `${field} must be a non-empty string`,
      "INVALID_CONTRACT",
    );
  }
  return value.trim();
}

function requireStringArray(value, field, { allowEmpty = false } = {}) {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    throw new AutonomyError(
      `${field} must be ${allowEmpty ? "an" : "a non-empty"} array of non-empty strings`,
      "INVALID_CONTRACT",
    );
  }
  return value.map((entry) => entry.trim());
}

function requirePlainObject(value, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AutonomyError(`${field} must be an object`, "INVALID_POLICY");
  }
  return value;
}

function requireExactKeys(value, keys, field) {
  const object = requirePlainObject(value, field);
  const missing = keys.filter((key) => !(key in object));
  const unexpected = Object.keys(object).filter((key) => !keys.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new AutonomyError(
      `${field} has invalid keys`,
      "INVALID_POLICY",
      { missing, unexpected },
    );
  }
  return object;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function requirePolicyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AutonomyError(`${field} must be a string`, "INVALID_POLICY");
  }
  return value;
}

function requirePolicyBoolean(value, field, expected) {
  if (
    typeof value !== "boolean" ||
    (expected !== undefined && value !== expected)
  ) {
    throw new AutonomyError(
      `${field} has an invalid value`,
      "INVALID_POLICY",
    );
  }
  return value;
}

function validateNamedPolicyObject(value, field) {
  const object = requirePlainObject(value, field);
  if (Object.keys(object).length === 0) {
    throw new AutonomyError(`${field} must not be empty`, "INVALID_POLICY");
  }
  return object;
}

export function validateOrchestratorPolicy(rawPolicy) {
  const policy = requireExactKeys(
    rawPolicy,
    [
      "schemaVersion",
      "playbookVersion",
      "defaultProfiles",
      "executionLevels",
      "profiles",
      "contextBudgets",
      "tokenPostures",
      "validationDepths",
      "gitPermissions",
      "hardStopConditions",
      "prohibitions",
    ],
    "orchestrator policy",
  );
  if (policy.schemaVersion !== POLICY_SCHEMA_VERSION) {
    throw new AutonomyError(
      "unsupported policy schema version",
      "UNSUPPORTED_POLICY_VERSION",
    );
  }
  if (policy.playbookVersion !== PLAYBOOK_VERSION) {
    throw new AutonomyError(
      "unsupported Playbook version",
      "UNSUPPORTED_POLICY_VERSION",
    );
  }

  const profiles = validateNamedPolicyObject(policy.profiles, "profiles");
  for (const [profileId, rawProfile] of Object.entries(profiles)) {
    if (!/^[a-z][a-z0-9_]*$/.test(profileId)) {
      throw new AutonomyError(
        `invalid profile ID: ${profileId}`,
        "INVALID_POLICY",
      );
    }
    const profile = requireExactKeys(
      rawProfile,
      [
        "role",
        "model",
        "reasoningEffort",
        "sandbox",
        "approvalMode",
        "gitPermissionCeiling",
        "maxExecutionLevel",
        "mayMerge",
      ],
      `profiles.${profileId}`,
    );
    if (!PROFILE_ROLES.includes(profile.role)) {
      throw new AutonomyError(
        `invalid role for ${profileId}`,
        "INVALID_POLICY",
      );
    }
    requirePolicyString(profile.model, `profiles.${profileId}.model`);
    requirePolicyString(
      profile.reasoningEffort,
      `profiles.${profileId}.reasoningEffort`,
    );
    if (
      !SANDBOXES.includes(profile.sandbox) ||
      profile.approvalMode !== "never"
    ) {
      throw new AutonomyError(
        `invalid runtime boundary for ${profileId}`,
        "INVALID_POLICY",
      );
    }
    if (!GIT_PERMISSION_IDS.includes(profile.gitPermissionCeiling)) {
      throw new AutonomyError(
        `invalid Git ceiling for ${profileId}`,
        "INVALID_POLICY",
      );
    }
    if (!EXECUTION_LEVELS.includes(profile.maxExecutionLevel)) {
      throw new AutonomyError(
        `invalid execution ceiling for ${profileId}`,
        "INVALID_POLICY",
      );
    }
    requirePolicyBoolean(
      profile.mayMerge,
      `profiles.${profileId}.mayMerge`,
      false,
    );
    if (profile.role === "reviewer" && profile.sandbox !== "read-only") {
      throw new AutonomyError(
        "Reviewer profiles must be read-only",
        "INVALID_POLICY",
      );
    }
    if (
      ["builder", "repair"].includes(profile.role) &&
      profile.sandbox !== "workspace-write"
    ) {
      throw new AutonomyError(
        `${profile.role} profiles must use workspace-write`,
        "INVALID_POLICY",
      );
    }
    const expectedGitCeiling = ["scan", "reviewer"].includes(profile.role)
      ? "read_only"
      : "worktree_write";
    if (profile.gitPermissionCeiling !== expectedGitCeiling) {
      throw new AutonomyError(
        `invalid Git ceiling for ${profileId}`,
        "INVALID_POLICY",
      );
    }
    if (
      (profile.role === "scan" && profile.maxExecutionLevel !== "E1") ||
      (profile.role !== "scan" && profile.maxExecutionLevel !== "E4")
    ) {
      throw new AutonomyError(
        `invalid execution ceiling for ${profileId}`,
        "INVALID_POLICY",
      );
    }
  }
  for (const [profileId, role] of Object.entries({
    scan_low: "scan",
    mechanical_low: "builder",
    build_medium: "builder",
    repair_medium: "repair",
    build_high: "builder",
    review_high: "reviewer",
  })) {
    if (!profiles[profileId] || profiles[profileId].role !== role) {
      throw new AutonomyError(
        `required profile ${profileId} is missing or invalid`,
        "INVALID_POLICY",
      );
    }
  }

  const defaults = requireExactKeys(
    policy.defaultProfiles,
    ["scan", "repair"],
    "defaultProfiles",
  );
  for (const [role, profileId] of Object.entries(defaults)) {
    if (!profiles[profileId] || profiles[profileId].role !== role) {
      throw new AutonomyError(
        `default ${role} profile is invalid`,
        "INVALID_POLICY",
      );
    }
  }

  const validationDepths = requireExactKeys(
    policy.validationDepths,
    ["none", "focused", "complete"],
    "validationDepths",
  );
  Object.entries(validationDepths).forEach(([depth, commands]) => {
    if (
      !Array.isArray(commands) ||
      commands.some((command) => typeof command !== "string")
    ) {
      throw new AutonomyError(
        `validationDepths.${depth} must be an array`,
        "INVALID_POLICY",
      );
    }
  });
  const gitPermissions = requireExactKeys(
    policy.gitPermissions,
    GIT_PERMISSION_IDS,
    "gitPermissions",
  );
  for (const permissionId of GIT_PERMISSION_IDS) {
    const permission = requireExactKeys(
      gitPermissions[permissionId],
      [
        "worktreeWrite",
        "stage",
        "commit",
        "push",
        "pullRequest",
        "merge",
      ],
      `gitPermissions.${permissionId}`,
    );
    Object.entries(permission).forEach(([key, value]) =>
      requirePolicyBoolean(
        value,
        `gitPermissions.${permissionId}.${key}`,
      ),
    );
    requirePolicyBoolean(
      permission.merge,
      `gitPermissions.${permissionId}.merge`,
      false,
    );
  }
  const expectedGitPermissions = {
    read_only: [false, false, false, false, false],
    worktree_write: [true, false, false, false, false],
    publish_feature: [true, true, true, true, true],
  };
  for (const [permissionId, expected] of Object.entries(
    expectedGitPermissions,
  )) {
    const permission = gitPermissions[permissionId];
    const actual = [
      permission.worktreeWrite,
      permission.stage,
      permission.commit,
      permission.push,
      permission.pullRequest,
    ];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new AutonomyError(
        `Git permission ${permissionId} exceeds or misses its ceiling`,
        "INVALID_POLICY",
      );
    }
  }

  const executionLevels = requirePlainObject(
    policy.executionLevels,
    "executionLevels",
  );
  if (
    JSON.stringify(Object.keys(executionLevels)) !==
    JSON.stringify(EXECUTION_LEVELS)
  ) {
    throw new AutonomyError(
      "execution levels must be exactly E0 through E4",
      "INVALID_POLICY",
    );
  }
  for (const levelId of EXECUTION_LEVELS) {
    const level = requireExactKeys(
      executionLevels[levelId],
      [
        "mayEdit",
        "mayPublish",
        "mayMerge",
        "validationDepth",
        "gitPermission",
        "allowedBuilderProfiles",
      ],
      `executionLevels.${levelId}`,
    );
    requirePolicyBoolean(level.mayEdit, `executionLevels.${levelId}.mayEdit`);
    requirePolicyBoolean(
      level.mayPublish,
      `executionLevels.${levelId}.mayPublish`,
    );
    requirePolicyBoolean(
      level.mayMerge,
      `executionLevels.${levelId}.mayMerge`,
      false,
    );
    const expected = EXPECTED_EXECUTION_POLICY[levelId];
    if (
      level.mayEdit !== expected.mayEdit ||
      level.mayPublish !== expected.mayPublish ||
      level.validationDepth !== expected.validationDepth ||
      level.gitPermission !== expected.gitPermission
    ) {
      throw new AutonomyError(
        `execution level ${levelId} conflicts with its fixed ceiling`,
        "INVALID_POLICY",
      );
    }
    if (
      !(level.validationDepth in validationDepths) ||
      !(level.gitPermission in gitPermissions)
    ) {
      throw new AutonomyError(
        `invalid permission mapping for ${levelId}`,
        "INVALID_POLICY",
      );
    }
    const allowedProfiles = requireStringArray(
      level.allowedBuilderProfiles,
      `executionLevels.${levelId}.allowedBuilderProfiles`,
    );
    for (const profileId of allowedProfiles) {
      const expectedRole = ["E0", "E1"].includes(levelId)
        ? "scan"
        : "builder";
      if (!profiles[profileId] || profiles[profileId].role !== expectedRole) {
        throw new AutonomyError(
          `invalid Builder profile for ${levelId}`,
          "INVALID_POLICY",
        );
      }
    }
  }

  requireExactKeys(
    policy.contextBudgets,
    ["minimal", "standard", "extended"],
    "contextBudgets",
  );
  requireExactKeys(
    policy.tokenPostures,
    ["economy", "balanced", "quality_first"],
    "tokenPostures",
  );
  for (const [field, values] of [
    ["contextBudgets", policy.contextBudgets],
    ["tokenPostures", policy.tokenPostures],
  ]) {
    Object.entries(values).forEach(([key, value]) => {
      if (!/^[a-z][a-z0-9_]*$/.test(key)) {
        throw new AutonomyError(
          `invalid ${field} ID`,
          "INVALID_POLICY",
        );
      }
      requirePolicyString(value, `${field}.${key}`);
    });
  }
  if (
    !Array.isArray(policy.hardStopConditions) ||
    policy.hardStopConditions.length === 0
  ) {
    throw new AutonomyError(
      "hardStopConditions must not be empty",
      "INVALID_POLICY",
    );
  }
  policy.hardStopConditions.forEach((value, index) =>
    requirePolicyString(value, `hardStopConditions[${index}]`),
  );
  const prohibitions = requireExactKeys(
    policy.prohibitions,
    [
      "merge",
      "rawModelOverride",
      "rawReasoningOverride",
      "arbitraryArguments",
      "executableOverride",
      "sandboxOverride",
      "approvalOverride",
      "environmentProfileOverride",
    ],
    "prohibitions",
  );
  Object.entries(prohibitions).forEach(([key, value]) =>
    requirePolicyBoolean(value, `prohibitions.${key}`, true),
  );

  return deepFreeze(policy);
}

export function loadOrchestratorPolicy(canonicalRoot) {
  const policyPath = path.join(
    canonicalRoot,
    ...ORCHESTRATOR_POLICY_PATH.split("/"),
  );
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(policyPath, "utf8"));
  } catch (error) {
    throw new AutonomyError(
      `unable to load orchestrator policy: ${error.message}`,
      error.code === "ENOENT" ? "MISSING_POLICY" : "MALFORMED_POLICY",
    );
  }
  return validateOrchestratorPolicy(parsed);
}

export function resolveRuntimeProfile(policy, profileId, expectedRole) {
  const profile = policy.profiles[profileId];
  if (!profile) {
    throw new AutonomyError(`unknown profile: ${profileId}`, "UNKNOWN_PROFILE");
  }
  if (profile.role !== expectedRole) {
    throw new AutonomyError(
      `profile ${profileId} cannot be used for ${expectedRole}`,
      "PROFILE_ROLE_MISMATCH",
    );
  }
  return Object.freeze({
    id: profileId,
    role: profile.role,
    model: profile.model,
    reasoningEffort: profile.reasoningEffort,
    sandbox: profile.sandbox,
    approvalMode: profile.approvalMode,
    [TRUSTED_RUNTIME_PROFILE]: true,
  });
}

export function assertTrustedRuntimeProfile(profile, expectedRole) {
  if (
    !profile ||
    profile[TRUSTED_RUNTIME_PROFILE] !== true ||
    profile.role !== expectedRole
  ) {
    throw new AutonomyError(
      "Codex profile is not trusted for this role",
      "PROFILE_ROLE_MISMATCH",
    );
  }
  return profile;
}

export function runtimeProfileEvidence(profile, effective = undefined) {
  const evidence = {
    profile: profile.id,
    requestedModel: profile.model,
    requestedReasoningEffort: profile.reasoningEffort,
    verificationStatus: RUNTIME_PROFILE_UNVERIFIED,
  };
  if (effective === undefined) {
    return Object.freeze(evidence);
  }
  if (
    effective.model !== profile.model ||
    effective.reasoningEffort !== profile.reasoningEffort
  ) {
    throw new AutonomyError(
      "effective runtime profile conflicts with policy",
      "RUNTIME_PROFILE_MISMATCH",
    );
  }
  return Object.freeze({
    ...evidence,
    effectiveModel: effective.model,
    effectiveReasoningEffort: effective.reasoningEffort,
    verificationStatus: "runtime-verified",
  });
}

export function normalizeRepositoryRelativePattern(value, field = "path") {
  const candidate = requireNonEmptyString(value, field);
  if (
    candidate.includes("\\") ||
    candidate.includes("\0") ||
    path.posix.isAbsolute(candidate) ||
    /^[A-Za-z]:/.test(candidate) ||
    candidate.startsWith("./") ||
    candidate.endsWith("/") ||
    candidate.split("/").some((part) => part === "." || part === "..")
  ) {
    throw new AutonomyError(
      `${field} must be a normalized repository-relative path`,
      "INVALID_PATH",
      candidate,
    );
  }

  const wildcardIndex = candidate.search(/[*?[\]]/);
  if (
    wildcardIndex !== -1 &&
    (!candidate.endsWith("/**") ||
      candidate.slice(0, -3).search(/[*?[\]]/) !== -1)
  ) {
    throw new AutonomyError(
      `${field} supports only an exact path or a trailing /** subtree`,
      "INVALID_PATH",
      candidate,
    );
  }

  return candidate;
}

export function pathMatchesPattern(filePath, pattern) {
  const normalizedPath = normalizeRepositoryRelativePattern(
    filePath,
    "changed path",
  );
  const normalizedPattern = normalizeRepositoryRelativePattern(
    pattern,
    "contract path",
  );
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }
  return normalizedPath === normalizedPattern;
}

function patternsOverlap(left, right) {
  const sampleLeft = left.endsWith("/**") ? left.slice(0, -3) : left;
  const sampleRight = right.endsWith("/**") ? right.slice(0, -3) : right;
  return (
    pathMatchesPattern(sampleLeft, right) ||
    pathMatchesPattern(sampleRight, left)
  );
}

function validateBranch(branch, baseBranch) {
  if (
    branch === "main" ||
    branch === baseBranch ||
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
      "branch must be a valid non-main feature branch",
      "INVALID_BRANCH",
      branch,
    );
  }
}

function validateWorktreePath(worktreePath) {
  if (
    !path.isAbsolute(worktreePath) ||
    path.parse(worktreePath).root === path.resolve(worktreePath) ||
    worktreePath.includes("\0")
  ) {
    throw new AutonomyError(
      "externalWorktree must be a non-root absolute path",
      "INVALID_WORKTREE",
      worktreePath,
    );
  }
}

function validateProjectLeadAuthorization(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.approved !== true ||
    value.authorizedBy !== "ChatGPT Project Lead"
  ) {
    throw new AutonomyError(
      "Class C local contracts require approved ChatGPT Project Lead authorization",
      "MISSING_CLASS_C_AUTHORIZATION",
    );
  }
  return {
    approved: true,
    authorizedBy: "ChatGPT Project Lead",
    concerns: requireStringArray(
      value.concerns,
      "projectLeadAuthorization.concerns",
    ),
  };
}

function validateClassCAuthorizationCompatibility(contract) {
  const authorizationText = [
    ...contract.classCAuthorizations,
    ...(contract.projectLeadAuthorization?.concerns ?? []),
  ]
    .join(" ")
    .toLowerCase();

  for (const allowedPath of contract.allowedPaths) {
    const concern = CLASS_C_PATH_CONCERNS.find(({ matches }) =>
      matches(allowedPath),
    );
    const explicitlyNamesPath = authorizationText.includes(
      allowedPath.toLowerCase(),
    );
    if (
      !explicitlyNamesPath &&
      (!concern ||
        !concern.keywords.some((keyword) =>
          authorizationText.includes(keyword),
        ))
    ) {
      throw new AutonomyError(
        `Class C authorization is not compatible with allowed path ${allowedPath}`,
        "INCOMPATIBLE_CLASS_C_AUTHORIZATION",
      );
    }
  }
}

function requireClassCForSensitivePaths(riskClass, allowedPaths) {
  if (riskClass === "Class C") {
    return;
  }

  const sensitivePath = allowedPaths.find((allowedPath) =>
    CLASS_C_PATH_PATTERNS.some((sensitivePattern) =>
      patternsOverlap(allowedPath, sensitivePattern),
    ),
  );
  if (sensitivePath) {
    throw new AutonomyError(
      `${sensitivePath} requires a Class C contract`,
      "CLASS_C_PATH_REQUIRES_AUTHORIZATION",
    );
  }
}

function validateExecutionPolicy(rawContract, policy, focusedTestArgs) {
  const executionLevel = requireNonEmptyString(
    rawContract.executionLevel,
    "executionLevel",
  );
  const level = policy.executionLevels[executionLevel];
  if (!level) {
    throw new AutonomyError(
      `unknown execution level: ${executionLevel}`,
      "UNKNOWN_EXECUTION_LEVEL",
    );
  }
  const builderProfile = requireNonEmptyString(
    rawContract.builderProfile,
    "builderProfile",
  );
  if (!level.allowedBuilderProfiles.includes(builderProfile)) {
    throw new AutonomyError(
      `profile ${builderProfile} is not permitted for ${executionLevel}`,
      "PROFILE_ROLE_MISMATCH",
    );
  }
  const expectedBuilderRole = ["E0", "E1"].includes(executionLevel)
    ? "scan"
    : "builder";
  resolveRuntimeProfile(policy, builderProfile, expectedBuilderRole);

  const reviewerProfile = requireNonEmptyString(
    rawContract.reviewerProfile,
    "reviewerProfile",
  );
  const reviewer = resolveRuntimeProfile(
    policy,
    reviewerProfile,
    "reviewer",
  );
  if (reviewer.sandbox !== "read-only") {
    throw new AutonomyError(
      "Reviewer profile must be read-only",
      "PROFILE_ROLE_MISMATCH",
    );
  }

  const contextBudget = requireNonEmptyString(
    rawContract.contextBudget,
    "contextBudget",
  );
  const tokenPosture = requireNonEmptyString(
    rawContract.tokenPosture,
    "tokenPosture",
  );
  const validationDepth = requireNonEmptyString(
    rawContract.validationDepth,
    "validationDepth",
  );
  const gitPermission = requireNonEmptyString(
    rawContract.gitPermission,
    "gitPermission",
  );
  if (!(contextBudget in policy.contextBudgets)) {
    throw new AutonomyError(
      `unknown context budget: ${contextBudget}`,
      "UNKNOWN_POLICY_VALUE",
    );
  }
  if (!(tokenPosture in policy.tokenPostures)) {
    throw new AutonomyError(
      `unknown token posture: ${tokenPosture}`,
      "UNKNOWN_POLICY_VALUE",
    );
  }
  if (
    validationDepth !== level.validationDepth ||
    gitPermission !== level.gitPermission
  ) {
    throw new AutonomyError(
      `${executionLevel} permissions conflict with the trusted policy`,
      "EXECUTION_PERMISSION_MISMATCH",
    );
  }
  if (
    policy.validationDepths[validationDepth].includes("focused-tests") &&
    focusedTestArgs.length === 0
  ) {
    throw new AutonomyError(
      `${executionLevel} requires at least one focused test argument`,
      "FOCUSED_VALIDATION_REQUIRED",
    );
  }
  return {
    executionLevel,
    builderProfile,
    reviewerProfile,
    contextBudget,
    tokenPosture,
    validationDepth,
    gitPermission,
  };
}

export function validateContract(
  rawContract,
  {
    sourceKind = "local",
    policy = loadOrchestratorPolicy(process.cwd()),
  } = {},
) {
  if (
    rawContract === null ||
    typeof rawContract !== "object" ||
    Array.isArray(rawContract)
  ) {
    throw new AutonomyError(
      "task contract must be one JSON object",
      "INVALID_CONTRACT",
    );
  }

  for (const field of REQUIRED_CONTRACT_FIELDS) {
    if (!(field in rawContract)) {
      throw new AutonomyError(
        `task contract is missing ${field}`,
        "INVALID_CONTRACT",
      );
    }
  }

  const knownFields = new Set([
    ...REQUIRED_CONTRACT_FIELDS,
    ...OPTIONAL_CONTRACT_FIELDS,
  ]);
  const unknownFields = Object.keys(rawContract).filter(
    (field) => !knownFields.has(field),
  );
  if (unknownFields.length > 0) {
    throw new AutonomyError(
      `task contract contains unknown fields: ${unknownFields.join(", ")}`,
      "INVALID_CONTRACT",
    );
  }

  const baseBranch = requireNonEmptyString(
    rawContract.baseBranch,
    "baseBranch",
  );
  if (baseBranch !== "main") {
    throw new AutonomyError(
      "baseBranch must be main",
      "INVALID_BASE_BRANCH",
    );
  }

  const riskClass = requireNonEmptyString(rawContract.riskClass, "riskClass");
  if (riskClass === "Class D") {
    throw new AutonomyError(
      "Class D tasks are prohibited",
      "CLASS_D_PROHIBITED",
    );
  }
  if (!["Class A", "Class B", "Class C"].includes(riskClass)) {
    throw new AutonomyError(
      `unknown riskClass: ${riskClass}`,
      "INVALID_RISK_CLASS",
    );
  }

  const repository = requireNonEmptyString(
    rawContract.repository,
    "repository",
  );
  if (repository === PRODUCTION_REPOSITORY) {
    throw new AutonomyError(
      "production repository access is prohibited",
      "PRODUCTION_REPOSITORY_PROHIBITED",
    );
  }
  if (repository !== EXPECTED_REPOSITORY) {
    throw new AutonomyError(
      `repository must be ${EXPECTED_REPOSITORY}`,
      "REPOSITORY_MISMATCH",
    );
  }

  const allowedPaths = requireStringArray(
    rawContract.allowedPaths,
    "allowedPaths",
  ).map((value, index) =>
    normalizeRepositoryRelativePattern(value, `allowedPaths[${index}]`),
  );
  const protectedPaths = requireStringArray(
    rawContract.protectedPaths,
    "protectedPaths",
  ).map((value, index) =>
    normalizeRepositoryRelativePattern(value, `protectedPaths[${index}]`),
  );

  for (const allowedPath of allowedPaths) {
    for (const protectedPath of protectedPaths) {
      if (patternsOverlap(allowedPath, protectedPath)) {
        throw new AutonomyError(
          `allowed and protected paths overlap: ${allowedPath} / ${protectedPath}`,
          "OVERLAPPING_PATHS",
        );
      }
    }
  }

  const branch = requireNonEmptyString(rawContract.branch, "branch");
  validateBranch(branch, baseBranch);
  const externalWorktree = requireNonEmptyString(
    rawContract.externalWorktree,
    "externalWorktree",
  );
  validateWorktreePath(externalWorktree);

  const baseSha = requireNonEmptyString(rawContract.baseSha, "baseSha");
  if (!/^[0-9a-f]{40}$/.test(baseSha)) {
    throw new AutonomyError(
      "baseSha must be a full lowercase 40-character SHA",
      "INVALID_BASE_SHA",
    );
  }

  const focusedTestArgs = requireStringArray(
    rawContract.focusedTestArgs,
    "focusedTestArgs",
    { allowEmpty: true },
  );
  const unsafeFocusedArgument = focusedTestArgs.find(
    (argument) =>
      argument.includes("\0") ||
      /^(--config|--root|--dir|--setupFiles|--globalSetup|--environment|--pool)(=|$)/.test(
        argument,
      ),
  );
  if (unsafeFocusedArgument) {
    throw new AutonomyError(
      `focusedTestArgs contains a prohibited test-runtime option: ${unsafeFocusedArgument}`,
      "INVALID_FOCUSED_TEST_ARGS",
    );
  }

  const maxRepairCycles =
    rawContract.maxRepairCycles === undefined
      ? DEFAULT_REPAIR_CYCLES
      : rawContract.maxRepairCycles;
  if (
    !Number.isInteger(maxRepairCycles) ||
    maxRepairCycles < 0 ||
    maxRepairCycles > DEFAULT_REPAIR_CYCLES
  ) {
    throw new AutonomyError(
      `maxRepairCycles must be an integer from 0 to ${DEFAULT_REPAIR_CYCLES}`,
      "INVALID_REPAIR_LIMIT",
    );
  }

  const classCAuthorizations = requireStringArray(
    rawContract.classCAuthorizations,
    "classCAuthorizations",
    { allowEmpty: riskClass !== "Class C" },
  );

  requireClassCForSensitivePaths(riskClass, allowedPaths);
  const executionPolicy = validateExecutionPolicy(
    rawContract,
    policy,
    focusedTestArgs,
  );

  const contract = {
    taskId: requireNonEmptyString(rawContract.taskId, "taskId"),
    objective: requireNonEmptyString(rawContract.objective, "objective"),
    repository,
    baseBranch,
    baseSha,
    riskClass,
    ...executionPolicy,
    branch,
    externalWorktree: path.resolve(externalWorktree),
    allowedPaths,
    protectedPaths,
    acceptanceCriteria: requireStringArray(
      rawContract.acceptanceCriteria,
      "acceptanceCriteria",
    ),
    classCAuthorizations,
    focusedTestArgs,
    commitMessage: requireNonEmptyString(
      rawContract.commitMessage,
      "commitMessage",
    ),
    prTitle: requireNonEmptyString(rawContract.prTitle, "prTitle"),
    prBody: requireNonEmptyString(rawContract.prBody, "prBody"),
    maxRepairCycles,
  };

  if (riskClass === "Class C" && sourceKind === "local") {
    contract.projectLeadAuthorization = validateProjectLeadAuthorization(
      rawContract.projectLeadAuthorization,
    );
  } else if (rawContract.projectLeadAuthorization !== undefined) {
    contract.projectLeadAuthorization = validateProjectLeadAuthorization(
      rawContract.projectLeadAuthorization,
    );
  }

  if (riskClass === "Class C") {
    validateClassCAuthorizationCompatibility(contract);
  }

  return Object.freeze(contract);
}

export function loadLocalContract(contractPath, policy) {
  const absolutePath = path.resolve(contractPath);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new AutonomyError(
      `unable to parse contract JSON: ${error.message}`,
      "MALFORMED_CONTRACT",
    );
  }
  return validateContract(parsed, { sourceKind: "local", policy });
}

export function extractIssueContract(issueBody, policy) {
  if (typeof issueBody !== "string") {
    throw new AutonomyError(
      "GitHub issue body is missing",
      "MALFORMED_ISSUE_CONTRACT",
    );
  }

  const blockPattern =
    /^```autonomy-task\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm;
  const matches = [...issueBody.matchAll(blockPattern)];
  const openingFenceCount = (
    issueBody.match(/^```autonomy-task[ \t]*$/gm) ?? []
  ).length;
  if (matches.length !== 1 || openingFenceCount !== 1) {
    throw new AutonomyError(
      "issue body must contain exactly one autonomy-task fenced block",
      "MALFORMED_ISSUE_CONTRACT",
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch (error) {
    throw new AutonomyError(
      `autonomy-task block is not valid JSON: ${error.message}`,
      "MALFORMED_ISSUE_CONTRACT",
    );
  }
  return validateContract(parsed, { sourceKind: "issue", policy });
}

export function verifyIssueGates(issue, contract) {
  if (issue.state !== "OPEN") {
    throw new AutonomyError(
      "GitHub issue must be open",
      "ISSUE_NOT_OPEN",
    );
  }
  const labels = new Set(
    (issue.labels ?? []).map((label) =>
      typeof label === "string" ? label : label.name,
    ),
  );
  if (!labels.has("READY")) {
    throw new AutonomyError(
      "GitHub issue must have the READY label",
      "TASK_NOT_READY",
    );
  }
  if (contract.riskClass === "Class C" && !labels.has("class-c-approved")) {
    throw new AutonomyError(
      "Class C GitHub issues require class-c-approved",
      "MISSING_CLASS_C_AUTHORIZATION",
    );
  }
}

function readRoadmapSection(roadmapText, taskId) {
  const escapedTaskId = taskId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = roadmapText.match(
    new RegExp(`^###\\s+${escapedTaskId}(?:\\s|—|-)`, "m"),
  );
  if (!heading || heading.index === undefined) {
    throw new AutonomyError(
      `task ${taskId} is not present in ROADMAP.md`,
      "TASK_NOT_IN_ROADMAP",
    );
  }
  const remainder = roadmapText.slice(heading.index);
  const nextHeading = remainder.slice(1).search(/^###\s+/m);
  const section =
    nextHeading === -1 ? remainder : remainder.slice(0, nextHeading + 1);
  return section;
}

export function readRoadmapState(roadmapText, taskId) {
  const section = readRoadmapSection(roadmapText, taskId);
  const stateMatch = section.match(/^- State:\s+`([A-Z_]+)`\./m);
  if (!stateMatch) {
    throw new AutonomyError(
      `task ${taskId} has no readable roadmap state`,
      "INVALID_ROADMAP",
    );
  }
  return stateMatch[1];
}

export function requireRoadmapReady(roadmapText, taskId) {
  const state = readRoadmapState(roadmapText, taskId);
  if (state !== "READY") {
    throw new AutonomyError(
      `task ${taskId} is ${state}, not READY`,
      "TASK_NOT_READY",
    );
  }
}

export function requireRoadmapRiskClass(roadmapText, taskId, riskClass) {
  const section = readRoadmapSection(roadmapText, taskId);
  const riskClassMatch = section.match(/^- Risk class:\s+(Class [ABC])(?:[.;]|\s|$)/m);
  if (!riskClassMatch) {
    throw new AutonomyError(
      `task ${taskId} has no readable roadmap risk class`,
      "INVALID_ROADMAP",
    );
  }
  if (riskClassMatch[1] !== riskClass) {
    throw new AutonomyError(
      `task ${taskId} has roadmap risk class ${riskClassMatch[1]}, not ${riskClass}`,
      "RISK_CLASS_MISMATCH",
    );
  }
}

export function assertExternalWorktree(canonicalRoot, externalWorktree) {
  const canonical = path.resolve(canonicalRoot);
  const worktree = path.resolve(externalWorktree);
  const relative = path.relative(canonical, worktree);
  if (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  ) {
    throw new AutonomyError(
      "external worktree must be outside the canonical repository",
      "WORKTREE_INSIDE_CANONICAL",
    );
  }
}

export function assertChangedPaths(paths, contract) {
  const normalizedPaths = [...new Set(paths)].map((value) =>
    normalizeRepositoryRelativePattern(value, "changed path"),
  );
  for (const changedPath of normalizedPaths) {
    if (changedPath === "package-lock.json") {
      throw new AutonomyError(
        "package-lock.json must never change",
        "PROTECTED_PATH_CHANGED",
      );
    }
    if (
      !contract.allowedPaths.some((pattern) =>
        pathMatchesPattern(changedPath, pattern),
      )
    ) {
      throw new AutonomyError(
        `unexpected changed path: ${changedPath}`,
        "UNEXPECTED_CHANGED_PATH",
      );
    }
    if (
      contract.protectedPaths.some((pattern) =>
        pathMatchesPattern(changedPath, pattern),
      )
    ) {
      throw new AutonomyError(
        `protected path changed: ${changedPath}`,
        "PROTECTED_PATH_CHANGED",
      );
    }
  }
  return normalizedPaths.sort();
}

export function parseReviewerResult(output) {
  if (typeof output !== "string") {
    throw new AutonomyError(
      "Reviewer output is missing",
      "MALFORMED_REVIEWER_RESULT",
    );
  }
  const startCount = output.split(REVIEW_RESULT_START).length - 1;
  const endCount = output.split(REVIEW_RESULT_END).length - 1;
  if (startCount !== 1 || endCount !== 1) {
    throw new AutonomyError(
      "Reviewer output must contain exactly one marked result",
      "MALFORMED_REVIEWER_RESULT",
    );
  }
  const start = output.indexOf(REVIEW_RESULT_START) + REVIEW_RESULT_START.length;
  const end = output.indexOf(REVIEW_RESULT_END, start);
  if (end <= start) {
    throw new AutonomyError(
      "Reviewer result markers are out of order",
      "MALFORMED_REVIEWER_RESULT",
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(output.slice(start, end).trim());
  } catch (error) {
    throw new AutonomyError(
      `Reviewer result is not valid JSON: ${error.message}`,
      "MALFORMED_REVIEWER_RESULT",
    );
  }

  if (!["PASS", "FAIL"].includes(parsed.verdict)) {
    throw new AutonomyError(
      "Reviewer verdict must be PASS or FAIL",
      "MALFORMED_REVIEWER_RESULT",
    );
  }
  if (
    parsed.qualityScores === null ||
    typeof parsed.qualityScores !== "object" ||
    Array.isArray(parsed.qualityScores)
  ) {
    throw new AutonomyError(
      "Reviewer qualityScores are missing",
      "MALFORMED_REVIEWER_RESULT",
    );
  }
  for (const key of SCORE_KEYS) {
    if (
      !Number.isInteger(parsed.qualityScores[key]) ||
      parsed.qualityScores[key] < 0 ||
      parsed.qualityScores[key] > 2
    ) {
      throw new AutonomyError(
        `Reviewer quality score ${key} must be 0, 1, or 2`,
        "MALFORMED_REVIEWER_RESULT",
      );
    }
  }
  if (Object.keys(parsed.qualityScores).some((key) => !SCORE_KEYS.includes(key))) {
    throw new AutonomyError(
      "Reviewer qualityScores contain unknown categories",
      "MALFORMED_REVIEWER_RESULT",
    );
  }
  const calculatedTotal = SCORE_KEYS.reduce(
    (total, key) => total + parsed.qualityScores[key],
    0,
  );
  if (parsed.totalScore !== calculatedTotal) {
    throw new AutonomyError(
      "Reviewer totalScore does not equal the category sum",
      "MALFORMED_REVIEWER_RESULT",
    );
  }
  if (
    parsed.findings === null ||
    typeof parsed.findings !== "object" ||
    Array.isArray(parsed.findings)
  ) {
    throw new AutonomyError(
      "Reviewer findings are missing",
      "MALFORMED_REVIEWER_RESULT",
    );
  }
  for (const severity of SEVERITIES) {
    requireStringArray(parsed.findings[severity], `findings.${severity}`, {
      allowEmpty: true,
    });
  }
  if (Object.keys(parsed.findings).some((key) => !SEVERITIES.includes(key))) {
    throw new AutonomyError(
      "Reviewer findings contain unknown severities",
      "MALFORMED_REVIEWER_RESULT",
    );
  }
  if (
    !Array.isArray(parsed.notes) ||
    parsed.notes.some((note) => typeof note !== "string")
  ) {
    throw new AutonomyError(
      "Reviewer notes must be an array of strings",
      "MALFORMED_REVIEWER_RESULT",
    );
  }

  const findingCount = SEVERITIES.reduce(
    (count, severity) => count + parsed.findings[severity].length,
    0,
  );
  const qualifiesForPass =
    calculatedTotal >= 8 &&
    SCORE_KEYS.every((key) => parsed.qualityScores[key] > 0) &&
    findingCount === 0;
  if (
    (parsed.verdict === "PASS" && !qualifiesForPass) ||
    (parsed.verdict === "FAIL" && qualifiesForPass)
  ) {
    throw new AutonomyError(
      "Reviewer verdict conflicts with scores or findings",
      "MALFORMED_REVIEWER_RESULT",
    );
  }

  return Object.freeze({
    verdict: parsed.verdict,
    qualityScores: Object.freeze({ ...parsed.qualityScores }),
    totalScore: calculatedTotal,
    findings: Object.freeze(
      Object.fromEntries(
        SEVERITIES.map((severity) => [
          severity,
          Object.freeze([...parsed.findings[severity]]),
        ]),
      ),
    ),
    notes: Object.freeze([...parsed.notes]),
  });
}

export async function runReviewRepairLoop({
  maxRepairCycles = DEFAULT_REPAIR_CYCLES,
  review,
  repair,
  validate,
}) {
  let result = await review();
  let repairCycles = 0;
  while (result.verdict !== "PASS" && repairCycles < maxRepairCycles) {
    repairCycles += 1;
    await repair(result, repairCycles);
    await validate(repairCycles);
    result = await review(repairCycles);
  }
  if (result.verdict !== "PASS") {
    throw new AutonomyError(
      `Reviewer findings remain after ${repairCycles} repair cycles`,
      "REPAIR_LIMIT_EXHAUSTED",
      result,
    );
  }
  return { result, repairCycles };
}

export function defaultStateRoot() {
  return path.join(homedir(), "Dock Scheduling", "autonomy-runs");
}

export function repositoryLockPath(stateRoot, canonicalRoot) {
  const repositoryKey = createHash("sha256")
    .update(path.resolve(canonicalRoot).toLowerCase())
    .digest("hex")
    .slice(0, 20);
  return path.join(stateRoot, "locks", `${repositoryKey}.lock`);
}

export function acquireRepositoryLock(stateRoot, canonicalRoot, taskId) {
  const lockPath = repositoryLockPath(stateRoot, canonicalRoot);
  mkdirSync(path.dirname(lockPath), { recursive: true });
  let descriptor;
  try {
    descriptor = openSync(lockPath, "wx");
    writeFileSync(
      descriptor,
      JSON.stringify({
        taskId,
        pid: process.pid,
        acquiredAt: new Date().toISOString(),
      }),
    );
    closeSync(descriptor);
  } catch (error) {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    if (error.code === "EEXIST") {
      throw new AutonomyError(
        "another autonomy run already holds the repository lock",
        "REPOSITORY_LOCKED",
      );
    }
    throw error;
  }
  return {
    path: lockPath,
    release() {
      rmSync(lockPath, { force: true });
    },
  };
}

export function createExternalRunDirectory(stateRoot, taskId) {
  const safeTaskId = taskId.replace(/[^A-Za-z0-9._-]/g, "_");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runsDirectory = path.join(stateRoot, "runs");
  mkdirSync(runsDirectory, { recursive: true });
  const runDirectory = path.join(runsDirectory, `${timestamp}-${safeTaskId}`);
  mkdirSync(runDirectory, { recursive: false });
  return runDirectory;
}

export function assertStateOutsideRepository(stateRoot, canonicalRoot) {
  assertExternalWorktree(canonicalRoot, stateRoot);
}

export function removeGeneratedDist(worktree) {
  const root = path.resolve(worktree);
  const dist = path.resolve(root, "dist");
  const relative = path.relative(root, dist);
  if (relative !== "dist") {
    throw new AutonomyError(
      "refusing unexpected dist cleanup target",
      "INVALID_CLEANUP_TARGET",
    );
  }
  rmSync(dist, { recursive: true, force: true });
  if (existsSync(dist)) {
    throw new AutonomyError(
      "dist cleanup did not complete",
      "GENERATED_OUTPUT_REMAINS",
    );
  }
}

export const REVIEW_SCORE_KEYS = Object.freeze([...SCORE_KEYS]);
export const REVIEW_SEVERITIES = Object.freeze([...SEVERITIES]);

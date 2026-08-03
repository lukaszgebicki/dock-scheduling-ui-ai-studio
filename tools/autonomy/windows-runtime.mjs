import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { AutonomyError } from "./autonomy-core.mjs";
import {
  SafeCommandRunner,
  discoverTools,
  runProcess,
} from "./autonomy-runtime.mjs";

const GLOBAL_EXEC_OPTIONS = new Set([
  "--model",
  "--config",
  "--sandbox",
  "--cd",
]);
const WRITE_PROBE_MARKER = "AUTONOMY_WRITE_PROBE_PASS";
const WRITE_PROBE_FILE = ".autonomy-write-probe.tmp";

function isFile(filePath) {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isDirectory(directoryPath) {
  try {
    return existsSync(directoryPath) && statSync(directoryPath).isDirectory();
  } catch {
    return false;
  }
}

function findFileRecursively(root, fileName) {
  if (!isDirectory(root)) {
    return undefined;
  }
  const stack = [root];
  while (stack.length > 0) {
    const directory = stack.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        stack.push(candidate);
      } else if (entry.isFile() && entry.name === fileName) {
        return candidate;
      }
    }
  }
  return undefined;
}

function valueAfter(args, option) {
  const index = args.indexOf(option);
  if (index === -1 || index === args.length - 1) {
    return undefined;
  }
  return args[index + 1];
}

function sameExecutable(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

export function normalizeCodexExecArguments(args) {
  if (
    !Array.isArray(args) ||
    args.some((argument) => typeof argument !== "string")
  ) {
    throw new AutonomyError(
      "Codex arguments must be an array of strings",
      "INVALID_PROCESS_INVOCATION",
    );
  }
  const execIndex = args.indexOf("exec");
  if (execIndex === -1) {
    return [...args];
  }

  const beforeExec = args.slice(0, execIndex);
  const afterExec = args.slice(execIndex + 1);
  const globalOptions = [];
  const execOptions = [];
  for (let index = 0; index < afterExec.length; index += 1) {
    const argument = afterExec[index];
    if (GLOBAL_EXEC_OPTIONS.has(argument)) {
      const value = afterExec[index + 1];
      if (value === undefined) {
        throw new AutonomyError(
          `Codex option ${argument} is missing its value`,
          "INVALID_PROCESS_INVOCATION",
        );
      }
      globalOptions.push(argument, value);
      index += 1;
    } else {
      execOptions.push(argument);
    }
  }
  return [...beforeExec, ...globalOptions, "exec", ...execOptions];
}

export function augmentInitialBuilderPrompt(prompt, baseSha) {
  if (typeof prompt !== "string" || !prompt.startsWith("Implement task ")) {
    return prompt;
  }
  if (!/^[0-9a-f]{40}$/.test(baseSha)) {
    throw new AutonomyError(
      "Builder phase requires an exact lowercase base SHA",
      "INVALID_BASE_SHA",
    );
  }
  return [
    "BUILDER PHASE AUTHORIZATION",
    "",
    `- The orchestrator already validated the complete task contract at exact HEAD ${baseSha}.`,
    `- Keep HEAD unchanged at ${baseSha}.`,
    "- This is the implementation phase: edit the required uncommitted files inside the validated workspace-write worktree and allowed paths.",
    "- Do not retrieve the issue contract from the network; the validated contract is included below.",
    "- Do not stage, commit, push or create/update a pull request. The orchestrator performs those later, only after validation and independent review.",
    "- Any acceptance criterion mentioning commit, push or a pull request describes the later orchestrator phase and is not a conflict with the Builder prohibition.",
    "- Do not stop merely because publication is prohibited for this phase; implement the approved source changes now.",
    "",
    prompt,
  ].join("\n");
}

export function resolveWindowsCodexRuntime({
  platform = process.platform,
  architecture = process.arch,
  appData = process.env.APPDATA,
  userHome = homedir(),
} = {}) {
  if (platform !== "win32") {
    return undefined;
  }
  const roamingRoot = appData ?? path.join(userHome, "AppData", "Roaming");
  const architecturePackage =
    architecture === "arm64" ? "codex-win32-arm64" : "codex-win32-x64";
  const codexPackageRoot = path.join(
    roamingRoot,
    "npm",
    "node_modules",
    "@openai",
    "codex",
  );
  const launcher = path.join(codexPackageRoot, "bin", "codex.js");
  const platformRoot = path.join(
    codexPackageRoot,
    "node_modules",
    "@openai",
    architecturePackage,
  );
  const nativeExecutable = findFileRecursively(platformRoot, "codex.exe");
  const helper = findFileRecursively(
    platformRoot,
    "codex-windows-sandbox-setup.exe",
  );
  if (!isFile(launcher) || !isFile(nativeExecutable) || !isFile(helper)) {
    throw new AutonomyError(
      "complete global npm Codex Windows runtime was not found",
      "MISSING_WINDOWS_CODEX_RUNTIME",
      { codexPackageRoot, launcher, platformRoot, nativeExecutable, helper },
    );
  }
  return Object.freeze({
    launcher,
    nativeExecutable,
    helper,
    codexPackageRoot,
    platformRoot,
  });
}

function replaceOptionValue(args, option, replacement) {
  const copy = [...args];
  const index = copy.indexOf(option);
  if (index === -1 || index === copy.length - 1) {
    throw new AutonomyError(
      `Codex invocation is missing ${option}`,
      "INVALID_PROCESS_INVOCATION",
    );
  }
  copy[index + 1] = replacement;
  return copy;
}

async function runWorkspaceWriteProbe({ args, options, runCodex }) {
  const outputFile = valueAfter(args, "--output-last-message");
  if (!outputFile || !options.cwd) {
    throw new AutonomyError(
      "workspace-write probe requires a worktree and external output file",
      "INVALID_PROCESS_INVOCATION",
    );
  }
  const probeOutput = `${outputFile}.workspace-write-probe`;
  const probePath = path.join(options.cwd, WRITE_PROBE_FILE);
  rmSync(probeOutput, { force: true });
  if (existsSync(probePath)) {
    throw new AutonomyError(
      "workspace-write probe path already exists",
      "CODEX_WRITE_PROBE_PATH_CONFLICT",
      { probePath },
    );
  }
  const probeArgs = replaceOptionValue(
    args,
    "--output-last-message",
    probeOutput,
  );
  const probePrompt = [
    "Perform exactly one bounded workspace-write diagnostic.",
    "Use shell execution only. Do not use apply_patch.",
    `Inside the current workspace create ${WRITE_PROBE_FILE} containing exactly OK, read and verify it, delete it, and verify it no longer exists.`,
    "Do not use Git, access the network, or modify any other file.",
    `Return exactly ${WRITE_PROBE_MARKER} on success.`,
  ].join("\n");

  try {
    await runCodex(probeArgs, {
      ...options,
      input: probePrompt,
      onOutput: undefined,
    });
    const output = isFile(probeOutput)
      ? readFileSync(probeOutput, "utf8").trim()
      : "";
    if (output !== WRITE_PROBE_MARKER || existsSync(probePath)) {
      throw new AutonomyError(
        "Codex workspace-write probe did not pass cleanly",
        "CODEX_WORKSPACE_WRITE_UNAVAILABLE",
        { output, probePathExists: existsSync(probePath) },
      );
    }
  } catch (error) {
    if (
      error instanceof AutonomyError &&
      error.code === "CODEX_WORKSPACE_WRITE_UNAVAILABLE"
    ) {
      throw error;
    }
    throw new AutonomyError(
      `Codex workspace-write probe failed: ${error.message}`,
      "CODEX_WORKSPACE_WRITE_UNAVAILABLE",
      error.details,
    );
  } finally {
    rmSync(probeOutput, { force: true });
    rmSync(probePath, { force: true });
  }
}

export function createRuntimeProcessRunner(
  tools,
  { processRunner = runProcess } = {},
) {
  return async (executable, args, options = {}) => {
    if (!sameExecutable(executable, tools.codex)) {
      return processRunner(executable, args, options);
    }

    const runCodex = (codexArgs, codexOptions) =>
      tools.codexNodeLauncher
        ? processRunner(
            tools.node,
            [tools.codexNodeLauncher, ...codexArgs],
            codexOptions,
          )
        : processRunner(executable, codexArgs, codexOptions);
    if (!args.includes("exec")) {
      return runCodex(args, options);
    }

    const normalizedArgs = normalizeCodexExecArguments(args);
    const initialBuilder =
      typeof options.input === "string" &&
      options.input.startsWith("Implement task ");
    if (!initialBuilder) {
      return runCodex(normalizedArgs, options);
    }

    await runWorkspaceWriteProbe({
      args: normalizedArgs,
      options,
      runCodex,
    });
    const head = await processRunner(tools.git, ["rev-parse", "HEAD"], {
      ...options,
      input: undefined,
      onOutput: undefined,
    });
    const baseSha = head.stdout.trim();
    return runCodex(normalizedArgs, {
      ...options,
      input: augmentInitialBuilderPrompt(options.input, baseSha),
    });
  };
}

export function createDefaultCommandRunner({
  platform = process.platform,
  architecture = process.arch,
  appData = process.env.APPDATA,
  userHome = homedir(),
  processRunner = runProcess,
} = {}) {
  let tools;
  if (platform === "win32") {
    const runtime = resolveWindowsCodexRuntime({
      platform,
      architecture,
      appData,
      userHome,
    });
    tools = Object.freeze({
      ...discoverTools({ codex: runtime.launcher }),
      codexNodeLauncher: runtime.launcher,
      codexNativeExecutable: runtime.nativeExecutable,
      codexSandboxHelper: runtime.helper,
    });
  } else {
    tools = discoverTools();
  }
  return new SafeCommandRunner({
    tools,
    processRunner: createRuntimeProcessRunner(tools, { processRunner }),
  });
}

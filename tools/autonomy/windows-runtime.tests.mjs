import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  augmentInitialBuilderPrompt,
  createRuntimeProcessRunner,
  normalizeCodexExecArguments,
  resolveWindowsCodexRuntime,
} from "./windows-runtime.mjs";

const SHA = "a".repeat(40);

function codexArgs(outputFile) {
  return [
    "--ask-for-approval",
    "never",
    "exec",
    "--strict-config",
    "--model",
    "gpt-5.6-sol",
    "--config",
    'model_reasoning_effort="high"',
    "--sandbox",
    "workspace-write",
    "--cd",
    "C:\\worktree",
    "--ephemeral",
    "--ignore-user-config",
    "--output-last-message",
    outputFile,
    "-",
  ];
}

function optionValue(args, option) {
  const index = args.indexOf(option);
  return index === -1 ? undefined : args[index + 1];
}

test("Codex global exec options are normalized before exec", () => {
  const normalized = normalizeCodexExecArguments(codexArgs("C:\\out.txt"));
  const execIndex = normalized.indexOf("exec");
  for (const option of ["--model", "--config", "--sandbox", "--cd"]) {
    assert.ok(normalized.indexOf(option) < execIndex);
  }
  for (const option of [
    "--strict-config",
    "--ephemeral",
    "--ignore-user-config",
    "--output-last-message",
  ]) {
    assert.ok(normalized.indexOf(option) > execIndex);
  }
  assert.equal(normalized.at(-1), "-");
});

test("Windows runtime requires the native executable and sandbox helper", () => {
  const appData = mkdtempSync(path.join(tmpdir(), "codex-appdata-"));
  const codexPackage = path.join(
    appData,
    "npm",
    "node_modules",
    "@openai",
    "codex",
  );
  const vendor = path.join(
    codexPackage,
    "node_modules",
    "@openai",
    "codex-win32-x64",
    "vendor",
    "x86_64-pc-windows-msvc",
  );
  mkdirSync(path.join(codexPackage, "bin"), { recursive: true });
  mkdirSync(path.join(vendor, "codex-resources"), { recursive: true });
  writeFileSync(path.join(codexPackage, "bin", "codex.js"), "");
  writeFileSync(path.join(vendor, "codex.exe"), "");
  writeFileSync(
    path.join(vendor, "codex-resources", "codex-windows-sandbox-setup.exe"),
    "",
  );

  const runtime = resolveWindowsCodexRuntime({
    platform: "win32",
    architecture: "x64",
    appData,
  });
  assert.equal(runtime.launcher, path.join(codexPackage, "bin", "codex.js"));
  assert.equal(runtime.nativeExecutable, path.join(vendor, "codex.exe"));
  assert.equal(
    runtime.helper,
    path.join(vendor, "codex-resources", "codex-windows-sandbox-setup.exe"),
  );

  const missingHelperAppData = mkdtempSync(
    path.join(tmpdir(), "codex-appdata-missing-helper-"),
  );
  const missingCodexPackage = path.join(
    missingHelperAppData,
    "npm",
    "node_modules",
    "@openai",
    "codex",
  );
  const missingHelperRoot = path.join(
    missingCodexPackage,
    "node_modules",
    "@openai",
    "codex-win32-x64",
  );
  mkdirSync(path.join(missingCodexPackage, "bin"), { recursive: true });
  mkdirSync(missingHelperRoot, { recursive: true });
  writeFileSync(path.join(missingCodexPackage, "bin", "codex.js"), "");
  writeFileSync(path.join(missingHelperRoot, "codex.exe"), "");
  assert.throws(
    () =>
      resolveWindowsCodexRuntime({
        platform: "win32",
        architecture: "x64",
        appData: missingHelperAppData,
      }),
    { code: "MISSING_WINDOWS_CODEX_RUNTIME" },
  );
});

test("initial Builder prompt binds the exact SHA and separates publication", () => {
  const prompt = augmentInitialBuilderPrompt(
    "Implement task AUTONOMY-WINDOWS-RUNTIME-1",
    SHA,
  );
  assert.match(prompt, new RegExp(SHA));
  assert.match(prompt, /edit the required uncommitted files/);
  assert.match(prompt, /orchestrator performs those later/);
  assert.match(prompt, /not a conflict/);
});

test("all Codex commands use the complete Node launcher", async () => {
  const calls = [];
  const tools = {
    node: "C:\\node.exe",
    codex: "C:\\global\\codex.js",
    codexNodeLauncher: "C:\\global\\codex.js",
    git: "C:\\git.exe",
  };
  const processRunner = async (executable, args) => {
    calls.push({ executable, args: [...args] });
    return { code: 0, stdout: "codex-cli 0.146.0\n", stderr: "" };
  };
  const runner = createRuntimeProcessRunner(tools, { processRunner });
  await runner(tools.codex, ["--version"]);
  assert.deepEqual(calls, [
    {
      executable: tools.node,
      args: [tools.codexNodeLauncher, "--version"],
    },
  ]);
});

test("initial Builder runs a clean write probe and receives the phase preamble", async () => {
  const worktree = mkdtempSync(path.join(tmpdir(), "autonomy-worktree-"));
  const outputFile = path.join(tmpdir(), `builder-${Date.now()}.txt`);
  const calls = [];
  const tools = { codex: "C:\\codex.exe", git: "C:\\git.exe" };
  const processRunner = async (executable, args, options = {}) => {
    calls.push({ executable, args: [...args], input: options.input });
    if (executable === tools.git) {
      return { code: 0, stdout: `${SHA}\n`, stderr: "" };
    }
    const currentOutput = optionValue(args, "--output-last-message");
    if (currentOutput.endsWith(".workspace-write-probe")) {
      writeFileSync(currentOutput, "AUTONOMY_WRITE_PROBE_PASS\n");
    }
    return { code: 0, stdout: "", stderr: "" };
  };
  const runner = createRuntimeProcessRunner(tools, { processRunner });
  await runner(tools.codex, codexArgs(outputFile), {
    cwd: worktree,
    input: "Implement task AUTONOMY-WINDOWS-RUNTIME-1",
  });

  assert.equal(calls.length, 3);
  assert.match(calls[0].input, /Use shell execution only/);
  assert.deepEqual(calls[1].args, ["rev-parse", "HEAD"]);
  assert.match(calls[2].input, new RegExp(SHA));
  assert.ok(calls[2].args.indexOf("--sandbox") < calls[2].args.indexOf("exec"));
});

test("failed write probe stops before HEAD inspection and Builder", async () => {
  const worktree = mkdtempSync(path.join(tmpdir(), "autonomy-worktree-"));
  const outputFile = path.join(tmpdir(), `builder-fail-${Date.now()}.txt`);
  const calls = [];
  const tools = { codex: "C:\\codex.exe", git: "C:\\git.exe" };
  const processRunner = async (executable, args) => {
    calls.push({ executable, args: [...args] });
    if (executable === tools.codex) {
      writeFileSync(
        optionValue(args, "--output-last-message"),
        "AUTONOMY_WRITE_PROBE_FAIL\n",
      );
    }
    return { code: 0, stdout: "", stderr: "" };
  };
  const runner = createRuntimeProcessRunner(tools, { processRunner });
  await assert.rejects(
    runner(tools.codex, codexArgs(outputFile), {
      cwd: worktree,
      input: "Implement task AUTONOMY-WINDOWS-RUNTIME-1",
    }),
    { code: "CODEX_WORKSPACE_WRITE_UNAVAILABLE" },
  );
  assert.equal(calls.length, 1);
});

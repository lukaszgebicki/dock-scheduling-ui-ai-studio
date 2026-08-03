#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  AutonomyError,
  loadOrchestratorPolicy,
} from "./autonomy-core.mjs";
import {
  executeTask,
  loadTaskSource,
  plannedLifecycle,
  runDoctor,
  sanitizeLog,
  verifyRoadmapGate,
} from "./autonomy-runtime.mjs";
import { createDefaultCommandRunner } from "./windows-runtime.mjs";

const HELP = `Dock Scheduling bounded autonomy runner

Usage:
  npm run autonomy -- doctor
  npm run autonomy -- plan --contract <file>
  npm run autonomy -- plan --issue <number>
  npm run autonomy -- execute --contract <file>
  npm run autonomy -- execute --issue <number>

Commands:
  doctor   Verify tools, authentication, Codex safety controls, and repository identity.
  plan     Validate an approved task and print the lifecycle without mutation.
  execute  Run the bounded lifecycle through CI observation, then stop before merge.

The default invocation and --help are non-mutating. Contracts cannot supply
arbitrary commands. The runner never performs a merge operation.`;

export function parseArguments(argv) {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    return { command: "help" };
  }

  const [command, ...options] = argv;
  if (!["doctor", "plan", "execute"].includes(command)) {
    throw new AutonomyError(
      `unknown command: ${command}`,
      "INVALID_ARGUMENT",
    );
  }
  if (command === "doctor") {
    if (options.length !== 0) {
      throw new AutonomyError(
        "doctor accepts no options",
        "INVALID_ARGUMENT",
      );
    }
    return { command };
  }

  if (options.length !== 2 || !["--contract", "--issue"].includes(options[0])) {
    throw new AutonomyError(
      `${command} requires exactly one --contract <file> or --issue <number>`,
      "INVALID_ARGUMENT",
    );
  }
  return {
    command,
    contractPath: options[0] === "--contract" ? options[1] : undefined,
    issueNumber: options[0] === "--issue" ? options[1] : undefined,
  };
}

export async function main(
  argv = process.argv.slice(2),
  {
    canonicalRoot = process.cwd(),
    output = (value) => process.stdout.write(`${value}\n`),
    errorOutput = (value) => process.stderr.write(`${value}\n`),
    commandRunner,
    commandRunnerFactory = createDefaultCommandRunner,
  } = {},
) {
  try {
    const parsed = parseArguments(argv);
    if (parsed.command === "help") {
      output(HELP);
      return 0;
    }
    const activeCommandRunner = commandRunner ?? commandRunnerFactory();

    if (parsed.command === "doctor") {
      const policy = loadOrchestratorPolicy(canonicalRoot);
      const result = await runDoctor({
        canonicalRoot,
        commandRunner: activeCommandRunner,
        policy,
      });
      output(JSON.stringify(result, null, 2));
      return 0;
    }

    if (parsed.command === "plan") {
      const policy = loadOrchestratorPolicy(canonicalRoot);
      await runDoctor({
        canonicalRoot,
        commandRunner: activeCommandRunner,
        policy,
      });
      const source = await loadTaskSource({
        contractPath: parsed.contractPath,
        issueNumber: parsed.issueNumber,
        canonicalRoot,
        commandRunner: activeCommandRunner,
        policy,
      });
      verifyRoadmapGate(canonicalRoot, source.contract);
      output(plannedLifecycle(source.contract).join("\n"));
      return 0;
    }

    const result = await executeTask({
      canonicalRoot,
      contractPath: parsed.contractPath,
      issueNumber: parsed.issueNumber,
      commandRunner: activeCommandRunner,
    });
    output(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    const code =
      error instanceof AutonomyError
        ? error.code
        : "UNEXPECTED_ERROR";
    errorOutput(`${code}: ${sanitizeLog(error.message)}`);
    return 1;
  }
}

const isDirectInvocation =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectInvocation) {
  process.exitCode = await main();
}

export { HELP };

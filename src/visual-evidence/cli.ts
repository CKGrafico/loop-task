/**
 * cli.ts — Visual evidence capture CLI.
 *
 * Usage:
 *   pnpm visual-evidence --change <id>
 *   pnpm visual-evidence --input <path.json>
 *
 * Exit codes: 0 = passed/skipped, 1 = failed, 2 = blocked, 3 = invalid input
 *
 * Capture never commits or pushes.
 */

import { readFileSync, existsSync } from "node:fs";
import { runEvidence } from "./run.js";

interface CliInput {
  changeId?: string;
  changedFiles?: string[];
  proposal?: string;
}

function parseArgs(args: string[]): { changeId?: string; inputPath?: string } {
  const result: { changeId?: string; inputPath?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--change" && args[i + 1]) {
      result.changeId = args[++i];
    } else if (args[i] === "--input" && args[i + 1]) {
      result.inputPath = args[++i];
    }
  }

  return result;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (!parsed.changeId && !parsed.inputPath) {
    console.error("Usage: visual-evidence --change <id> | --input <path.json>");
    return 3;
  }

  let changeId: string;

  if (parsed.inputPath) {
    if (!existsSync(parsed.inputPath)) {
      console.error(`Input file not found: ${parsed.inputPath}`);
      return 3;
    }

    const input: CliInput = JSON.parse(readFileSync(parsed.inputPath, "utf-8"));

    if (!input.changeId) {
      console.error("Input JSON missing 'changeId'");
      return 3;
    }

    changeId = input.changeId;
  } else {
    changeId = parsed.changeId!;
  }

  console.log(`🔍 Running evidence capture for change: ${changeId}`);

  const result = await runEvidence(changeId);

  const emoji: Record<string, string> = {
    passed: "✅",
    skipped: "⏭️",
    failed: "❌",
    blocked: "🚫",
  };

  console.log(`${emoji[result.status] ?? ""} Status: ${result.status}`);

  if (result.reason) {
    console.log(`   Reason: ${result.reason}`);
  }

  if (result.failedStep) {
    console.log(`   Failed step: ${result.failedStep}`);
  }

  if (result.manifestPath) {
    console.log(`   Manifest: ${result.manifestPath}`);
  }

  // Exit codes
  switch (result.status) {
    case "passed":
    case "skipped":
      return 0;
    case "failed":
      return 1;
    case "blocked":
      return 2;
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });

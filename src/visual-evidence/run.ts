/**
 * run.ts — Orchestrator: resolve change → decide required → run scenario → capture → manifest.
 *
 * On failure after launch: keep temp failure artifacts under .tmp/ (gitignored),
 * promote nothing to evidence/. Return structured result.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isEvidenceRequired } from "./evidence-required.js";
import { resolveChange } from "./openspec-resolver.js";
import { writeManifest, type EvidenceManifest, type EvidenceStatus } from "./manifest.js";
import { launch } from "./launch.js";
import { captureOutput } from "./capture.js";
import { runScenario } from "./scenario-registry.js";

export interface RunResult {
  status: EvidenceStatus;
  changeId: string;
  reason?: string;
  failedStep?: string;
  manifestPath?: string;
}

export async function runEvidence(changeId: string): Promise<RunResult> {
  // 1. Resolve the change
  let proposal: string;
  let affectedFiles: string[];

  try {
    const ctx = resolveChange(changeId);
    void ctx.changeDir;
    proposal = ctx.proposal;
    affectedFiles = ctx.affectedFiles;
  } catch (err: unknown) {
    return {
      status: "blocked",
      changeId,
      reason: `Cannot resolve change: ${err}`,
    };
  }

  // 2. Decide if evidence is required
  const decision = isEvidenceRequired({ changedFiles: affectedFiles, proposal });

  if (!decision.required) {
    const manifest: EvidenceManifest = {
      version: 1,
      changeId,
      required: false,
      status: "skipped",
      assets: [],
      reason: decision.reason,
    };
    writeManifest(manifest);
    return { status: "skipped", changeId, reason: decision.reason };
  }

  // 3. Launch CLI
  const cli = launch();

  try {
    // 4. Run scenario
    const result = await runScenario(changeId, cli);

    if (result.status === "blocked") {
      const manifest: EvidenceManifest = {
        version: 1,
        changeId,
        required: true,
        status: "blocked",
        assets: [],
        reason: "No scenario registered for this change ID",
      };
      writeManifest(manifest);
      return { status: "blocked", changeId, reason: "No scenario registered" };
    }

    // 5. Capture output
    const assets = captureOutput(changeId, result.checkpoints);

    if (result.status === "failed") {
      // Keep failure artifacts in .tmp/ for debugging
      writeFailureArtifact(changeId, result.checkpoints);

      const manifest: EvidenceManifest = {
        version: 1,
        changeId,
        required: true,
        status: "failed",
        assets,
        failedStep: result.failedStep,
      };
      writeManifest(manifest);
      return {
        status: "failed",
        changeId,
        failedStep: result.failedStep,
      };
    }

    // 6. Success — write manifest
    const manifest: EvidenceManifest = {
      version: 1,
      changeId,
      required: true,
      status: "passed",
      assets,
    };
    const manifestPath = writeManifest(manifest);
    return { status: "passed", changeId, manifestPath };
  } catch (err: unknown) {
    // Unexpected error after launch
    writeFailureArtifact(changeId, [{ label: "error", stdout: "", stderr: String(err), exitCode: 1 }]);

    const manifest: EvidenceManifest = {
      version: 1,
      changeId,
      required: true,
      status: "failed",
      assets: [],
      failedStep: "unexpected error",
      reason: String(err),
    };
    writeManifest(manifest);
    return { status: "failed", changeId, failedStep: "unexpected error" };
  } finally {
    cli.cleanup();
  }
}

function writeFailureArtifact(
  changeId: string,
  checkpoints: import("./capture.ts").CaptureCheckpoint[],
): void {
  const tmpDir = join(".tmp", "visual-evidence", changeId);
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  for (const cp of checkpoints) {
    writeFileSync(
      join(tmpDir, `failure-${cp.label.replace(/\s+/g, "-").toLowerCase()}.txt`),
      `Exit: ${cp.exitCode}\n\nstdout:\n${cp.stdout}\n\nstderr:\n${cp.stderr}`,
      "utf-8",
    );
  }
}

/**
 * capture.ts — Capture CLI output as evidence assets.
 *
 * For a CLI app, evidence is text-based (stdout/stderr captured to .txt files),
 * not browser screenshots. Each capture checkpoint writes a numbered .txt file.
 */

import { writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { EvidenceAsset } from "./manifest.ts";

/** Max bytes per capture file (1 MB) */
const MAX_CAPTURE_BYTES = 1_024_000;

export interface CaptureCheckpoint {
  label: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Write capture files and return asset descriptors.
 * Files go to openspec/changes/<changeId>/evidence/NN-label.txt
 */
export function captureOutput(
  changeId: string,
  checkpoints: CaptureCheckpoint[],
): EvidenceAsset[] {
  const evidenceDir = join("openspec", "changes", changeId, "evidence");

  if (!existsSync(evidenceDir)) {
    mkdirSync(evidenceDir, { recursive: true });
  }

  return checkpoints.map((cp, i) => {
    const num = String(i + 1).padStart(2, "0");
    const filename = `${num}-${cp.label.replace(/\s+/g, "-").toLowerCase()}.txt`;
    const filepath = join(evidenceDir, filename);

    const content = [
      `# ${cp.label}`,
      `# Exit code: ${cp.exitCode}`,
      "",
      "## stdout",
      truncate(cp.stdout, MAX_CAPTURE_BYTES),
      "",
      "## stderr",
      truncate(cp.stderr, MAX_CAPTURE_BYTES),
    ].join("\n");

    writeFileSync(filepath, content, "utf-8");

    const bytes = statSync(filepath).size;

    return {
      type: "text-capture" as const,
      path: filepath,
      caption: cp.label,
      bytes,
      format: "txt" as const,
    };
  });
}

function truncate(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, "utf-8");
  if (buf.length <= maxBytes) return text;
  return (
    buf.subarray(0, maxBytes).toString("utf-8") +
    `\n... [truncated, ${buf.length} bytes total]`
  );
}

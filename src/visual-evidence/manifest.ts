/**
 * manifest.ts — Write evidence.json following the v1 contract.
 *
 * Evidence lives at openspec/changes/<id>/evidence/evidence.json
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type EvidenceStatus = "passed" | "skipped" | "failed" | "blocked";

export interface EvidenceAsset {
  type: "screenshot" | "text-capture" | "gif";
  path: string;
  caption: string;
  bytes: number;
  format: "png" | "txt" | "gif";
}

export interface EvidenceManifest {
  version: 1;
  changeId: string;
  required: boolean;
  status: EvidenceStatus;
  assets: EvidenceAsset[];
  reason?: string;
  failedStep?: string;
  prMarkdown?: string;
}

export function writeManifest(manifest: EvidenceManifest): string {
  const evidenceDir = join(
    "openspec",
    "changes",
    manifest.changeId,
    "evidence",
  );

  if (!existsSync(evidenceDir)) {
    mkdirSync(evidenceDir, { recursive: true });
  }

  const manifestPath = join(evidenceDir, "evidence.json");

  // Generate PR markdown
  const statusEmoji: Record<EvidenceStatus, string> = {
    passed: "✅",
    skipped: "⏭️",
    failed: "❌",
    blocked: "🚫",
  };

  manifest.prMarkdown = [
    `## Evidence ${statusEmoji[manifest.status]} ${manifest.status}`,
    "",
    manifest.reason ? `> ${manifest.reason}` : "",
    "",
    ...manifest.assets.map(
      (a) => `- **${a.caption}** (${a.format}, ${a.bytes} bytes)`,
    ),
  ]
    .filter(Boolean)
    .join("\n");

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  return manifestPath;
}

/**
 * publish.ts — Publish evidence to GitHub issue + PR as idempotent comments.
 *
 * After the branch is pushed, verify each asset exists on the remote,
 * then upsert one marked, idempotent comment on both the issue and the PR.
 * Publish failure blocks shipping.
 *
 * Usage:
 *   pnpm visual-evidence:publish --change <id> [--pr <n>] [--issue <n>]
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import type { EvidenceManifest } from "./manifest.js";

function parseArgs(args: string[]): {
  changeId?: string;
  pr?: number;
  issue?: number;
} {
  const result: { changeId?: string; pr?: number; issue?: number } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--change" && args[i + 1]) {
      result.changeId = args[++i];
    } else if (args[i] === "--pr" && args[i + 1]) {
      result.pr = Number(args[++i]);
    } else if (args[i] === "--issue" && args[i + 1]) {
      result.issue = Number(args[++i]);
    }
  }

  return result;
}

function getRepoSlug(): string {
  const remoteUrl = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
  // Handle both HTTPS and SSH URLs
  const match = remoteUrl.match(/[:/]([^/]+\/[^/.]+)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot parse repo slug from remote: ${remoteUrl}`);
  return match[1];
}

function getCurrentSha(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
}

function verifyAssetOnRemote(
  repo: string,
  sha: string,
  assetPath: string,
): boolean {
  try {
    execSync(
      `gh api repos/${repo}/contents/${assetPath}?ref=${sha} --jq .size`,
      { encoding: "utf-8", stdio: "pipe" },
    );
    return true;
  } catch {
    return false;
  }
}

function upsertComment(
  repo: string,
  kind: "issue" | "pr",
  number: number,
  marker: string,
  body: string,
): void {
  const fullBody = `<!-- ${marker} -->\n\n${body}`;
  const listCmd = `gh api repos/${repo}/${kind === "pr" ? "issues" : "issues"}/${number}/comments --jq '.[] | select(.body | startswith("<!-- ${marker} -->")) | .id'`;

  let existingId: string | undefined;
  try {
    existingId = execSync(listCmd, { encoding: "utf-8", stdio: "pipe" }).trim().split("\n")[0];
  } catch {
    // No comments or no match — will create new
  }

  if (existingId) {
    // PATCH existing
    execSync(
      `gh api repos/${repo}/issues/comments/${existingId} -f body="${Buffer.from(fullBody).toString("base64")}" --input -`,
      {
        encoding: "utf-8",
        input: JSON.stringify({ body: fullBody }),
      },
    );
    console.log(`   Updated ${kind} #${number} comment`);
  } else {
    // POST new
    execSync(
      `gh api repos/${repo}/${kind === "pr" ? "issues" : "issues"}/${number}/comments -f body="${Buffer.from(fullBody).toString("base64")}" --input -`,
      {
        encoding: "utf-8",
        input: JSON.stringify({ body: fullBody }),
      },
    );
    console.log(`   Created ${kind} #${number} comment`);
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (!parsed.changeId) {
    console.error("Usage: visual-evidence:publish --change <id> [--pr <n>] [--issue <n>]");
    return 3;
  }

  const { changeId } = parsed;

  // Read manifest
  const manifestPath = join(
    "openspec",
    "changes",
    changeId,
    "evidence",
    "evidence.json",
  );

  if (!existsSync(manifestPath)) {
    console.error(`No evidence manifest found at ${manifestPath}`);
    return 1;
  }

  const manifest: EvidenceManifest = JSON.parse(
    readFileSync(manifestPath, "utf-8"),
  );

  console.log(`📤 Publishing evidence for change: ${changeId} (${manifest.status})`);

  // Verify assets on remote
  const repo = getRepoSlug();
  const sha = getCurrentSha();

  for (const asset of manifest.assets) {
    const relativePath = asset.path.replace(/\\/g, "/");
    const onRemote = verifyAssetOnRemote(repo, sha, relativePath);
    if (!onRemote) {
      console.error(`   ❌ Asset not on remote: ${relativePath}`);
      return 1;
    }
    console.log(`   ✅ Asset verified: ${relativePath}`);
  }

  // Publish comment
  const marker = `ob-visual-evidence:${changeId}`;
  const body = manifest.prMarkdown ?? `Evidence: ${manifest.status}`;

  if (parsed.pr) {
    upsertComment(repo, "pr", parsed.pr, marker, body);
  }

  if (parsed.issue) {
    upsertComment(repo, "issue", parsed.issue, marker, body);
  }

  if (!parsed.pr && !parsed.issue) {
    console.warn("   ⚠️  No --pr or --issue specified, comments not posted");
  }

  console.log("✅ Publish complete");
  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error("Publish error:", err);
    process.exit(1);
  });

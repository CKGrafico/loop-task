# Skill: visual-evidence

CLI-adapted visual evidence harness for loop-task. Captures CLI stdout/stderr as deterministic, asserted evidence — not screenshots.

## When to use

- After implementing a change that touches user-visible CLI output or the TUI board
- When the `ob-ops-evidence` skill asks you to capture evidence
- When you need to verify a CLI change works and produce auditable proof

## Harness location

`src/visual-evidence/` — 9 modules:

| Module | File | What it does |
|---|---|---|
| evidence-required | `evidence-required.ts` | Decides if a change needs evidence (checks file paths + proposal) |
| openspec-resolver | `openspec-resolver.ts` | Locates `openspec/changes/<id>/` or archived change |
| manifest | `manifest.ts` | Writes `evidence.json` (v1 contract) |
| launch | `launch.ts` | Starts CLI in isolated temp LOOP_CLI_HOME via execa + tsx |
| capture | `capture.ts` | Captures stdout/stderr as numbered .txt files |
| scenario-registry | `scenario-registry.ts` | Maps change IDs to CLI scenarios with assertions |
| run | `run.ts` | Orchestrator: resolve → decide → launch → assert → capture → manifest |
| cli | `cli.ts` | CLI entry point (`--change <id>` / `--input <path.json>`) |
| publish | `publish.ts` | Verifies assets on remote, upserts idempotent comment on issue/PR |

## Evidence type

This is a **CLI app**, not a web app. Evidence is **text captures** (stdout + stderr + exit code in `.txt` files), not browser screenshots.

## How to capture evidence

```bash
pnpm visual-evidence --change <change-id>
pnpm visual-evidence --input path/to/input.json
```

Exit codes: `0` = passed/skipped, `1` = failed, `2` = blocked, `3` = invalid input.

## How to publish evidence

After pushing the branch:

```bash
pnpm visual-evidence:publish --change <change-id> --pr 42
```

Verifies each asset exists on the remote, then posts/updates an idempotent comment (`<!-- ob-visual-evidence:<id> -->`) on the PR and/or issue.

## How to register a scenario

In `src/visual-evidence/scenario-registry.ts`, add:

```typescript
import { register } from "./scenario-registry.ts";
import type { CliHandle } from "./launch.ts";

register("your-change-id", async (cli) => ({
  changeId: "your-change-id",
  steps: [
    {
      args: ["some-command", "--flag"],
      label: "Some command runs correctly",
      assert: (r) => {
        if (r.exitCode !== 0) throw new Error(`Expected 0, got ${r.exitCode}`);
        if (!r.stdout.includes("expected text")) throw new Error("Missing expected output");
      },
    },
  ],
}));
```

Key rules:
- Use accessible assertions (check exit code, output text) — no DOM selectors
- Throw from `assert` to mark a step as failed
- Name steps descriptively — they become checkpoint labels in evidence
- `register` is idempotent — safe to call multiple times for the same ID

## Evidence output

- Captures: `openspec/changes/<id>/evidence/01-label.txt`, `02-label.txt`, ...
- Manifest: `openspec/changes/<id>/evidence/evidence.json`
- Failure artifacts: `.tmp/visual-evidence/<id>/` (gitignored, never promoted)

## When evidence is required

Files that trigger `required = true`:
- `src/cli.ts`, `src/client/commands.ts`
- FSD UI layers: `src/app/`, `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/ui/`, `src/shared/i18n/`
- Core loop/daemon HTTP: `src/core/loop/`, `src/daemon/http/`
- Any `.tsx?` file

Files that are **non-UI** (tests, config, docs, CI) → `required = false` unless mixed with UI files.

Tune the patterns in `evidence-required.ts` → `UI_PATTERNS` / `NON_UI_PATTERNS` constants.

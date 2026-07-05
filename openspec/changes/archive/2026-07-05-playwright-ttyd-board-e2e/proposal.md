## Why

The board is an interactive TUI that cannot be exercised by ordinary unit tests — it renders through a real terminal, reacts to OS keyboard events (Enter, arrows, Ctrl+chords, Tab), and its only verifiable surface from outside a shell is the pixel buffer ttyd paints via xterm.js. Today there is no automated regression net for it: every visual, navigation, command, and interaction is verified by hand, so visual polish, keyboard shortcuts, and command-bar flows break silently between changes. We need a reproducible, scriptable E2E harness that drives the real board the way a human does — typing commands, sending keystrokes, scrolling run logs, opening modals — and reads the rendered output back, so the whole app can be regression-tested on every change.

## What Changes

- Add a **Playwright + ttyd E2E test harness** that boots the board against an isolated `LOOP_CLI_HOME`, serves it over HTTP with ttyd, and drives it with real keyboard events through a headless Chromium.
- Add a **terminal-page driver** that wraps ttyd's xterm.js canvas: focuses the helper textarea, sends key sequences (printable chars, Enter, Escape, arrows, Tab, Ctrl+chords, paste), and captures screenshots/OCR-readable snapshots for assertions.
- Add an **isolated fixture runtime** that spawns ttyd + the dev board per test run with a clean `LOOP_CLI_HOME`, streams logs to a per-run trace dir, and tears everything down on exit or failure.
- Add **test suites covering every board surface**: Loops tab, Tasks tab, Projects tab, command bar, help/all-commands modal, confirm dialogs, search, filters, sort, run-log modal, export modal, API toast, debug panel, keyboard shortcuts, tab/nav arrows, narrow/wide breakpoints.
- Add **bug-registry artifacts**: `bugs.md` (issues found during testing) and `MANUAL-TEST.md` (repeatable human-runnable steps) generated/maintained alongside the harness.
- Add npm scripts (`test:e2e`, `test:e2e:gen`) and CI wiring so the harness runs on every push.
- **BREAKING (dev-only)**: none — the harness is test-only and does not change shipped runtime behavior, IPC contract, or persisted state shape.

## Non-goals

- Not rewriting the board to be DOM-based or to expose accessibility nodes — the harness must work with the unmodified ttyd/xterm.js canvas surface.
- Not replacing Vitest unit tests — the harness covers TUI interactions only; unit/integration coverage stays on Vitest.
- Not testing the HTTP API or CLI shells through the browser — those are covered by curl/Vitest; the browser harness is for board interactions only.
- Not shipping Playwright or ttyd as runtime dependencies of `loop-task` — both are dev-only.

## Capabilities

### New Capabilities
- `board-e2e-harness`: Playwright + ttyd test runtime that boots an isolated board, drives xterm.js with real keyboard events, captures screenshots, and asserts on rendered output. Provides the driver, fixture lifecycle, and npm scripts consumed by all board E2E suites.
- `board-e2e-suites`: The actual test suites exercising every board surface — Loops CRUD, Tasks CRUD, Projects CRUD, command bar, modal overlays, keyboard navigation, run-log viewer, export modal, and breakpoint behavior. Produces `bugs.md`/`MANUAL-TEST.md` artifacts as part of the suite output.

### Modified Capabilities
<!-- None — this change adds a test harness, no shipped runtime requirement changes. -->

## Impact

- **Added files**: `tests/e2e/` driver, fixtures, suites, helpers, `bugs.md`, `MANUAL-TEST.md`; `tests/e2e/playwright.config.ts`; `tests/e2e/.gitignore` for traces/screenshots.
- **`package.json`**: dev-dependencies `playwright`, `@playwright/test`; scripts `test:e2e`, `test:e2e:gen`, `test:e2e:debug`. Locked to dev only (not in `files`/`dependencies`).
- **`.github/workflows`**: new job installing ttyd binary and running `test:e2e` on Windows + Linux; ttyd path passed via env.
- **No changes to**: `src/types.ts` (IPC contract), `LoopMeta` shape, persisted state, daemon, or CLI — the harness drives the existing board end-to-end and must not require runtime changes to pass.
- **External dependency**: ttyd binary must be present on the runner (`winget install tsl0922.ttyd` / `brew install ttyd` / `apt install ttyd`). CI will install it; local dev docs will list it.
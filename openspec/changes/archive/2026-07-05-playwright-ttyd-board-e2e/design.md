## Context

Today, every board interaction is verified by hand. `ink-testing-library` covers pure React render output but cannot exercise OS-level keyboard interaction with xterm.js, ctrl-chords, paste semantics, terminal width breakpoints, or the actual ttyd/xterm.js rendering pipeline. The board is the primary user surface, so it has the largest regression surface and the weakest automated coverage.

The board runs as a child of ttyd over HTTP; xterm.js renders the canonical terminal stream onto a `<canvas>`. Playwright can drive Chromium with synthetic OS-level keyboard events that xterm.js's helper textarea interprets exactly like a human's keystrokes, and capture canvas screenshots for visual regression. The harness wraps this pipeline so test suites can `type`, `press`, `paste`, scroll, navigate, and assert on rendered output without ever touching production data.

## Goals / Non-Goals

**Goals:**
- One command (`pnpm test:e2e`) boots a clean board, runs every board E2E suite, fails on regressions, and tears down.
- Suites cover every shipped board surface: Loops, Tasks, Projects tabs; command bar (all listed commands); modals (help/all-commands/run-log/export/context-help); keyboard chords (Ctrl+arrows, Ctrl+s/o/t/e/d/n/p/r/c, Ctrl+A→x, Ctrl+F→s/o/t); tab/panel navigation; breakpoints (narrow/wide); and the bug-registry documents (`bugs.md`, `MANUAL-TEST.md`).
- Runs are hermetic: isolated `LOOP_CLI_HOME`, isolated port for ttyd, deterministic fixtures, trace dir per run.
- State assertions read the ttyd canvas (screenshots), never DOM text, because ttyd renders on a `<canvas>` with no accessibility tree.

**Non-Goals:**
- Not rewriting the board to expose DOM/a11y nodes.
- Not driving HTTP API or CLI shells through the browser.
- Not running in CI without ttyd installed, CI must install ttyd binary per job.
- Not generating pixel-exact image diffs (flaky across drivers); assertions OCR/state-sniff the canvas via a documented helper.
- Not re-implementing ink-testing-library; existing unit coverage stays.

## Decisions

### 1. Use Playwright (not Puppeteer, not browser-MCP, not manual).
**Decision**: Playwright via `@playwright/test`.
**Why**: Single API for Chromium/Firefox/WebKit, robust `page.keyboard` with chord/hold/sequence, `page.screenshot`, tracing, retries, fixtures, and native TS/ESM support that matches the strict-ESM repo. Puppeteer lacks `@playwright/test`'s runner; browser-MCP plugins broker out-of-process and can't script commands reliably; manual testing is the problem we're solving.
**Alternatives**: Puppeteer (weaker runner/fixture story); tap into xterm.js's `term.write` programmatically (bypasses real input → can't catch keyboard regressions); keep manual (status quo, no regression net).

### 2. Drive xterm.js via the helper textarea + OS keyboard events.
**Decision**: Harness focuses `.xterm-helper-textarea`, then uses `page.keyboard.type` for printable input, `page.keyboard.press('Enter')`, `page.keyboard.press('ArrowUp')`, `page.keyboard.down('Control')` + `page.keyboard.press('f')` + `page.keyboard.up('Control')` for chords, and `page.evaluate` to dispatch a `paste` event for multi-line paste. We never set textarea value directly, xterm.js ignores `value` mutations; it only reacts to real input/keydown events Playwright synthesizes.
**Why**: xterm.js listens to `keydown`/`input`/`paste` on the helper textarea; Playwright `page.keyboard` produces the same browser events a human typing generates, so the board receives Enter/Tab/arrows/Ctrl exactly as in production.
**Alternatives**: WebSocket-level ttyd injection (breaks the "real keyboard" guarantee); paste the final command as one field write (xterm.js drops it).

### 3. Assert state from canvas screenshots (no DOM text).
**Decision**: A `TerminalPage` helper exposes `snapshot() -> PNG`, `screenshotPath`, and `readText()` that pulls extracted text via xterm.js's buffer API (`page.evaluate(() => term.buffer.active.getLine(n)?.translateToString(true))`) when reachable, falling back to OCR (`tesseract.js`, vendored as needed) if buffer introspection fails. We also persist full-run screencasts for human review.
**Why**: ttyd renders on a `<canvas>` whose pixels are the source of truth; DOM text is empty or unstable. Buffer introspection is precise and fast where available; OCR is the documented fallback.
**Trade-off**: Buffer introspection requires reaching the `term` instance, exposed via a `window.__term` hook the harness adds through ttyd config or a tiny `--enable-undefined` injection. If ttyd doesn't expose it, OCR-only mode is documented and suites degrade gracefully.
**Alternatives**: Non-existent a11y tree (snapshot/query return empty); pixel diff only (flaky); require a runtime hook in production code (rejected, Non-goal).

### 4. Hermetic fixture lifecycle.
**Decision**: A global Playwright fixture creates a temp `LOOP_CLI_HOME`, picks an ephemeral ttyd port, spawns `ttyd -W -w <repo> -p <port> pnpm run dev` with `LOOP_CLI_HOME` in its env, polls `http://127.0.0.1:<port>` until xterm connects, yields a `TerminalPage`, and `afterAll` kills both processes + cleans the temp dir. A per-run trace dir under `tests/e2e/.runs/<ts>/` stores stdout/stderr/screenshots/trace.zip.
**Why**: Reusing `~/.loop-cli` would corrupt user data; per-run isolation makes tests order-independent and CI-safe.
**Alternatives**: shared board across suites (state pollution); docker-only (slow, Windows-unfriendly).

### 5. Find bugs as test cases, not a manual`bugs.md` dump.
**Decision**: Every test that detects a real regression records it via a `recordBug({area, symptom, steps, expected, actual})` helper that appends to `tests/e2e/bugs.md` with an ID, then **marks the test `test.fixme`** so the suite stays green while the bug is tracked. `MANUAL-TEST.md` is generated from the suite descriptions (`test.info('…')` blocks) so it stays in sync with what's automated, no manual duplication.
**Why**: Keeps `bugs.md`/`MANUAL-TEST.md` honest about the harness's own output; failing tests would block CI on the very bugs we're discovering, `fixme` keeps signal without breaking the pipeline.
**Trade-off**: A `fixme` test that starts passing again (bug fixed) fails the run, that's the desired signal to remove the `fixme` and close the bug.
**Alternatives**: `test.fail` (asserts it still fails, wrong, bug may be fixed); skip (invisible).

### 6. ttyd binary as a CI prerequisite, installed per-job.
**Decision**: `.github/workflows` adds a `e2e` job that installs ttyd (`winget` on Windows, `brew` on macOS, `apt` on Ubuntu), installs Playwright browsers (`pnpm exec playwright install --with-deps chromium`), and runs `pnpm test:e2e`. Local dev doc README section lists ttyd as a dev prereq.
**Why**: ttyd is a single binary; per-job install avoids packaging it in the repo and matches the existing README installation guidance.
**Alternatives**: Bundle ttyd binary in repo (license + platform matrix bloated).

### 7. File layout under `tests/e2e/`.
```
tests/e2e/
  playwright.config.ts          # config, projects, webServer hook
  fixtures/
    board.ts                     # ttyd+board fixture, env isolation, port picker
    terminal-page.ts             # TerminalPage driver (type/press/paste/snapshot/readText)
    data.ts                      # seed/reset helpers (loops, tasks, projects via IPC writes)
  suites/
    loops-crud.spec.ts           # create/edit/pause/stop/play/trigger/delete/clone
    tasks-crud.spec.ts           # create/edit/delete/chains
    projects-crud.spec.ts        # create/edit/delete/color/filter
    command-bar.spec.ts          # all commands, search, filters, sort, help
    modals.spec.ts               # help, all-commands, run-log, export, context-help
    keyboard-shortcuts.spec.ts   # Ctrl chords, tab/panel nav, 1/2/3, arrows
    breakpoints.spec.ts           # narrow vs wide rendering
  helpers/
    bugs.ts                      # recordBug() -> bugs.md, fixme wrapper
    assertions.ts                # expectTerminalText, expectVisible
  bugs.md                        # generated/maintained by suites
  MANUAL-TEST.md                 # generated from test.info() blocks
  .runs/                         # per-run traces + screenshots (gitignored)
  .gitignore
```
**Why**: Mirrors existing `tests/` layout; one suite per board surface; separation lets `/ob-apply` run tasks per-suite.
**Alternatives**: flat `*.spec.ts` (hard to assign engineers); group by user tab only (loses command-bar/shortcut coverage).

## Risks / Trade-offs

- **ttyd binary missing on a dev machine** → `pnpm test:e2e` fails fast with a printed install hint before any test starts; CI job installs it explicitly.
- **xterm.js buffer not reachable from Playwright** → `readText()` degrades from introspection to OCR; OCR adds latency and may miss styling, so suites assert on coarse substrings and key glyphs, not exact ANSI sequences. Risk is partially mitigated by shipping a ttyd `--url-arg` patch or a tiny preload to expose `window.__term` (documented fallback).
- **Canvas rendering timing is non-deterministic** → TerminalPage polls until xterm reports data length > 0 (poll interval 50ms, timeout 10s) before asserting; screenshots are taken after a settle delay.
- **Ctrl+letter chords collide with browser shortcuts** → Chromium launched with `--disable-extensions` and intercept nothing; Ctrl+F/P/S all reach xterm through the focused helper textarea. Confirmed: xterm.js grants focus before keydown; verified in the initial browser session.
- **Long suites block CI** → split into `test:e2e:loops`, `:tasks`, `:projects`, `:commands`, `:modals`, `:shortcuts`, `:breakpoints`; CI shards by suite.
- **`bugs.md`/`MANUAL-TEST.md` drift from suites** → `recordBug` writes atomically at suite teardown; `MANUAL-TEST.md` regenerated from `test.info()` via `pnpm test:e2e:gen` so the doc is a function of the suites.
- **Windows ConPTY under ttyd** → ttyd must be launched from an interactive terminal; CI runs ttyd as a service-style background process which on Windows can crash ConPTY. Mitigated by the documented Windows note in README (`-w` required) and a fixture health check that respawns ttyd on first-render failure with an error logged to the trace dir.

## Migration Plan

1. Add dev-only deps + scripts; no runtime users affected.
2. Land harness + one suite (`loops-crud`) as proof-of-concept; wire CI `e2e` job as `continue-on-error` first.
3. Land remaining suites incrementally; remove `continue-on-error` once green on main.
4. Promote `bugs.md` entries to issues; archive fixed bugs (helper closes line + removes `test.fixme`).
5. Rollback: delete `tests/e2e/`, remove scripts/deps/workflow, zero runtime impact.

## Open Questions

- Should we expose `window.__term` via a tiny ttyd-side patch to make buffer introspection reliable, or stick with OCR-only and accept coarse assertions? (Default: try buffer-introspection; if unreachable on a relay ttyd build, OCR-only mode is the documented fallback.)
- Do we run Firefox/WebKit in CI or just Chromium? (Default: Chromium only; the board has no browser-specific behavior, and adding more drivers triples CI minutes for no extra coverage signal.)
- Should the harness also smoke-test the `loop-task status --json`, `export`, and `import` CLI shells via a separate Vitest suite, or keep E2E strictly browser-only? (Default: keep browser-only here; CLI shells already have unit coverage and the proposal declares them Non-goals for `tests:e2e`.)
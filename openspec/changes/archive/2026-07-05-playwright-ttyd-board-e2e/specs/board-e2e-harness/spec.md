## ADDED Requirements

### Requirement: Isolated board runtime per test run

The harness SHALL boot a single board instance against an ephemeral `LOOP_CLI_HOME` directory under the OS temp dir, an ephemeral ttyd port, and an ephemeral daemon socket path derived from that home. The harness MUST NOT reuse `~/.loop-cli`. The harness MUST delete the temp `LOOP_CLI_HOME` on test teardown (success or failure).

#### Scenario: Clean state on every run
- **WHEN** a Playwright global fixture initialises a new run
- **THEN** it creates an empty temp `LOOP_CLI_HOME`, ensures no `loops.json`/`tasks.json`/`projects.json` exist before the suite starts, and resets `currentProjectId` to `all` (the board's default)

#### Scenario: No pollution of user data
- **WHEN** the suite writes seed loops/tasks/projects
- **THEN** all files land under the temp `LOOP_CLI_HOME`, and `~/.loop-cli` is never opened by any test path

#### Scenario: Teardown cleans up
- **WHEN** the run finishes or any test in the run fails
- **THEN** the harness kills the ttyd process and the board child process, removes the temp `LOOP_CLI_HOME` dir, and prints the location of the persisted trace dir

### Requirement: ttyd serves the board on localhost HTTP

The harness SHALL launch `ttyd -W -w <repo> -p <port> pnpm run dev` (or `node dist/entry.js` for the built variant) with `LOOP_CLI_HOME` exported to the child environment. The harness MUST pass `-w` with an absolute repo path on Windows to avoid ConPTY failure (`CreateProcessW failed with error 267`).

#### Scenario: ttyd starts and serves xterm.js
- **WHEN** the fixture spawns ttyd
- **THEN** polling `GET http://127.0.0.1:<port>` returns 200 within 10s, and the page contains a `.xterm` element and a `.xterm-helper-textarea` element

#### Scenario: ttyd missing on the host
- **WHEN** the harness cannot find a `ttyd` executable on `PATH`
- **THEN** the run fails fast with a non-test error that prints install hints (`winget install tsl0920.ttyd` / `brew install ttyd` / `apt install ttyd`) and exits before any test executes

#### Scenario: ttyd fails to start
- **WHEN** ttyd exits non-zero before xterm connects
- **THEN** the harness retries up to 2 times, captures ttyd stdout/stderr to the trace dir, and fails the run if all attempts fail

### Requirement: TerminalPage keyboard driver

The harness SHALL expose a `TerminalPage` driver that focuses `.xterm-helper-textarea`, then sends real OS keyboard events through Playwright's `page.keyboard`. The driver MUST cover: printable typing, Enter, Escape, Backspace, ArrowUp/Down/Left/Right, Tab, Shift+Tab, Ctrl+letter chords (down-hold/press/up-release sequence), and multi-line paste (dispatch a `paste` event with the payload). The driver MUST NEVER mutate the textarea's `value` property directly, xterm.js ignores such mutations.

#### Scenario: Type and submit a command
- **WHEN** the driver types `help` and presses Enter
- **THEN** the board receives the printable chars plus a CR, the command-bar dispatches the `help` handler, and the all-commands modal opens

#### Scenario: Ctrl chord reaches xterm.js
- **WHEN** the driver holds Control, presses `f`, releases Control, then presses `s`
- **THEN** the board enters `ctrl+f` chord state and then executes the `search` command

#### Scenario: Paste preserves multi-line content
- **WHEN** the driver pastes a 3-line command
- **THEN** xterm.js collapses it to a single line in the command bar per the existing paste semantics

### Requirement: State read-back from the ttyd canvas

The `TerminalPage` driver SHALL expose `readText()` that returns the current board text. It MUST first attempt xterm.js buffer introspection via `page.evaluate` on the `term` instance; if the buffer is unreachable, it MUST fall back to OCR on a fresh screenshot. The driver MUST expose `snapshot()` returning a PNG for human review and regression traces.

#### Scenario: readText via buffer introspection
- **WHEN** the xterm.js `term` instance is reachable from page context
- **THEN** `readText()` joins per-line `buffer.active.getLine(n).translateToString(true)` output and returns the visible board text without invoking OCR

#### Scenario: readText falls back to OCR
- **WHEN** the `term` instance is not reachable from page context
- **THEN** `readText()` captures a screenshot and runs OCR over it, returning coarse text (style/colour information is lost; substring search still works)

#### Scenario: snapshot persists for review
- **WHEN** any test calls `page.snapshot()`
- **THEN** the resulting PNG is written to `<traceDir>/shot-<suite>-<test>-<seq>.png` and the path is appended to the run's trace index

### Requirement: Hermetic trace dir per run

The harness SHALL create a per-run trace directory at `tests/e2e/.runs/<ISO8601>-<rand>/` containing: ttyd stdout/stderr, board stdout/stderr, per-suite screenshots, Playwright `trace.zip`, and an `index.json` listing every artefact. The directory MUST be gitignored. On a run failure, the harness MUST keep the trace dir and print its absolute path.

#### Scenario: trace dir contents
- **WHEN** a run completes (pass or fail)
- **THEN** `<traceDir>` contains `ttyd.log`, `board.log`, `index.json`, and at least one `.png`; if Playwright tracing is enabled (default in CI), `trace.zip` is also present

#### Scenario: gitignored artefacts
- **WHEN** `git status` runs after `pnpm test:e2e`
- **THEN** no files under `tests/e2e/.runs/` are listed; only `bugs.md` and `MANUAL-TEST.md` surface as changes

### Requirement: npm scripts and CI wiring

The repo SHALL add `test:e2e` (run all board E2E suites), `test:e2e:gen` (regenerate `MANUAL-TEST.md` from suite `test.info()` blocks), and per-suite shims (`test:e2e:loops`, `:tasks`, `:projects`, `:commands`, `:modals`, `:shortcuts`, `:breakpoints`). A new CI job `e2e` installs ttyd + Playwright browsers and runs `test:e2e` on Windows-2022 and ubuntu-latest. The Playwright `webServer` hook MUST own ttyd lifecycle to avoid double-spawn.

#### Scenario: one command runs everything
- **WHEN** a contributor runs `pnpm test:e2e`
- **THEN** every board E2E suite executes against a fresh isolated board, and the command exits 0 only if no non-`fixme` test failed

#### Scenario: CI installs prerequisites
- **WHEN** the `e2e` job runs in CI
- **THEN** ttyd is installed (`winget` on Windows runner, `apt` on Ubuntu runner), `playwright install --with-deps chromium` runs, and `pnpm test:e2e` exits 0 on green suites

### Requirement: Bug registry artifacts

The harness SHALL maintain `tests/e2e/bugs.md` and `tests/e2e/MANUAL-TEST.md`. Discovered regressions MUST be recorded via a `recordBug({area,symptom,steps,expected,actual})` helper that appends a numbered entry to `bugs.md` and marks the offending test with `test.fixme`. `MANUAL-TEST.md` MUST be auto-generated from `test.info('…')` blocks via `pnpm test:e2e:gen` so the human-runnable steps are always in sync with what's automated.

#### Scenario: discovered bug is tracked, not failing
- **WHEN** a test detects a regression that the team has confirmed
- **THEN** the suite calls `test.fixme` with the failing assertion body and `recordBug` writes a new numbered entry to `bugs.md` with `Status: open`

#### Scenario: fixed bug flips the fixme
- **WHEN** a `test.fixme`'d test starts passing (its body now succeeds)
- **THEN** the suite fails with "expected to fail but passed", prompting the team to remove the `fixme`, update `bugs.md` to `Status: closed`, and delete the entry's open line

#### Scenario: MANUAL-TEST reflects the suites
- **WHEN** `pnpm test:e2e:gen` runs
- **THEN** `MANUAL-TEST.md` is rewritten so every section corresponds to a suite and every step corresponds to a `test.info()` block, with no manual duplication
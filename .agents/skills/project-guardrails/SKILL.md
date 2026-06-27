---
name: project-guardrails
description: Project-specific guardrails for loop-task (the loop-cli repo). Covers the Node/Bun/TypeScript toolchain, the required verification gates, daemon/IPC and board conventions, i18n and constants rules, and known test quirks. Load when implementing or reviewing any change in this repository.
license: MIT
---

## Toolchain

- CLI and daemon run under **Node (>=20)**. The board requires **Bun (>=1.2)** for OpenTUI native FFI.
- TypeScript **strict mode**, **ESM only**. Use `.js` import specifiers for local TS modules (e.g. `./logger.js`) — `allowImportingTsExtensions` resolution maps them in dev.
- Build step: `tsc -p tsconfig.build.json` emits `dist/` for npm distribution. `tsconfig.json` (noEmit) stays for type checking during dev.
- `src/entry.js` registers the ESM loader then imports `cli.js`. `src/esm-loader.js` fixes upstream extensionless imports from `@opentui/react`.
- Prefix every CLI command with `rtk` (see AGENTS.md). Light read-only commands (`cat`, `ls`, `Get-Content`) are exempt.

## Verification gates (in order)

Always run before claiming done:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src/ tests/
npm run test        # vitest run
npm run build       # tsc -p tsconfig.build.json + copy entry.js/esm-loader.js
```

Gate order is `typecheck` → `lint` → `test` → `build`. The board TUI cannot be verified headless — rely on the gates plus unit tests that assert exact output strings.

## Known test quirks (do NOT "fix" by editing assertions blindly)

- `tests/cli.test.ts`: version assertion (`1.1.0`) is out of sync with `package.json` (`1.2.0`) — pre-existing.
- `tests/background-cli.test.ts`: daemon IPC timeouts on Windows — pre-existing, green on other platforms.
- Confirm a failure is genuinely yours before touching it (compare against pristine `HEAD`).
- Coverage threshold is 90% (v8); excludes `cli.ts`, `types.ts`, `daemon/index.ts`, `tui/**`.

## Code conventions

- **No comments** unless strictly necessary; follow existing patterns.
- Feature folders, small files, reuse shared helpers in `src/shared/` (`sleep`, `tail`, `writeFileAtomic`, `removeIfExists`).
- **No user-facing string literals.** All strings live in `src/i18n/en.json`, accessed via `t(key, params?)`. Keys are typed (`I18nKey`); typecheck enforces validity.
- **No inline magic numbers.** Add to `src/config/constants.ts` (POLL_MS, TOAST_TIMEOUT, etc.) and import.
- **No nested if/else chains for dispatch.** When code branches on a string or enum value (view, status, key name, panel, action), use a dictionary/map lookup instead of stacked `if`/`else if` or `switch`/`case`. This applies to keybinding handlers, view routing, status-to-color mappings, cycle transitions, and action resolution. Nesting a second conditional inside a first (e.g. `if (view === "x") { if (key === "escape") { … } }`) is an anti-pattern — use `Record<Key, Handler>` dicts instead. Linear guard clauses (early returns with no nesting) are fine.

## Board keyboard navigation conventions

- **Tab/Shift+Tab is the ONLY way to move between focusable elements** (fields, buttons, panels). Arrow keys (up/down/left/right) are NEVER used for element-to-element navigation.
- **Up/down arrows** are ONLY for navigating within a list (e.g., Navigator items, project list, task list) or within a SearchSelect's filtered options.
- **Left/right arrows** are ONLY for cursor movement inside text inputs, or for cycling horizontal lists (e.g., the color picker). They are never used for panel navigation.
- **useTabNav hook** (`src/board/hooks/useTabNav.ts`): all forms and modals MUST use this hook for Tab/Shift+Tab cycling. Do NOT register a separate `useKeyboard` handler for Tab in any form or modal. The hook handles `preventDefault` internally.
- **SearchSelect** manages its own keyboard state (up/down, Enter, Escape, Backspace, typing) via its own `useKeyboard`. Parent forms must NOT intercept these keys when a SearchSelect is focused — the SearchSelect calls `preventDefault` + `stopPropagation`.
- **Header navigation**: the board-level `useBoardKeybindings` handles Tab cycling within the 3 header buttons (`header-tasks`, `header-projects`, `header-new`). At the boundaries, it calls `onExitHeader` to hand focus back to the active view. Forms/modals must NOT handle Tab when `headerFocused` is true.

## Product / architecture rules

- **Board-first.** Prefer adding management actions to the OpenTUI board over new top-level CLI commands. CLI exposes only `start` (background daemon) and `run` (foreground); no-arg opens the board.
- Daemon state writes are **atomic** (`writeFileAtomic` = temp-then-rename). Keep them synchronous to preserve immediate-disk-state-on-pause semantics.
- Respect the daemon single-flight guard: socket binds before `manager.init`; losing racers `exit(0)` cleanly.
- "No UX change" means same screens, keybindings, CLI output, and behavior — verify via the exact-output unit tests.
- Use `LOOP_CLI_HOME` to isolate daemon state in tests; never write to the real state dir from tests.

## Git & safety

- NEVER commit or push to main; NEVER force push; NEVER merge PRs (human-only).
- Feature branches only: `feature/*` or `bugfix/*`.
- Only commit when explicitly asked. Never commit secrets; never read or output `.env` files.
- Keep changes small and focused; report blockers immediately.

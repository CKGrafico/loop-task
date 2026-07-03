## 1. Tokens and formatters (foundation)

- [x] 1.1 `statusColor("waiting")` returns `text.muted`; update `DESIGN.md` status mapping and `tests` that assert the old blue. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/format.ts, src/tui/theme.ts, DESIGN.md] -->
- [x] 1.2 Add `formatDate(iso)` (single human format, e.g. `Jul 3 11:40`) and reuse `formatRunDuration` for the run-history average (kill raw `avg:526194ms`). <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: [src/tui/format.ts, src/tui/components/RunHistory.tsx] -->
- [x] 1.3 Display-unescape command strings in lists (`\"` shown as `"`). <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: [src/tui/format.ts, src/tui/components/Navigator.tsx] -->

## 2. Failure visibility + focus-aware selection

- [x] 2.1 Navigator row: when `lastExitCode` is non-zero, render a red `✗` indicator and danger-colored status label. <!-- agent: frontend-engineer.build, depends_on: [1.3], touches: [src/tui/components/Navigator.tsx] -->
- [x] 2.2 Selection background derives from panel focus: `bg.active` focused, `bg.hover` unfocused — Navigator, RunHistory, FocusableList, TaskBrowser. <!-- agent: frontend-engineer.build, depends_on: [2.1], touches: [src/tui/components/Navigator.tsx, src/tui/components/RunHistory.tsx, src/tui/components/FocusableList.tsx, src/tui/components/TaskBrowser.tsx] -->

## 3. Header + filter consolidation

- [x] 3.1 Header: single row `loop-task ● connected` + TabBar; drop tagline row; counts strip shows only non-zero states. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/components/Header.tsx] -->
- [x] 3.2 Replace the two duplicated filter lines above the navigator with one chip line (`project · status · sort`, only non-default values highlighted). <!-- agent: frontend-engineer.build, depends_on: [2.2], touches: [src/tui/components/LeftPanel.tsx, src/tui/components/Navigator.tsx, src/i18n/en.json] -->

## 4. Inspector reorder + dedupe

- [x] 4.1 Reorder fields: Status / Last exit / Last run / Next run / Runs, then Interval / Dir, then muted ID / Task / PID; drop Command when identical to Desc. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/components/Inspector.tsx] -->
- [x] 4.2 Run History header: "(Enter to view log)"; failure stat (`streak / last fail`) moves to its own line right-aligned. <!-- agent: frontend-engineer.build, depends_on: [2.2], touches: [src/tui/components/RunHistory.tsx, src/i18n/en.json] -->

## 5. Tables and names

- [x] 5.1 Right-align numeric columns (RUNS, SKIP); rename `SKP` → `SKIP`. <!-- agent: frontend-engineer.fast, depends_on: [3.2], touches: [src/tui/components/Navigator.tsx, src/i18n/en.json] -->
- [x] 5.2 Chain references resolve task names: inspector `Chain: on ✓ → say by`, tasks CHAINS column same notation. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/components/RightPanel.tsx, src/tui/components/TaskBrowser.tsx] -->
- [x] 5.3 Projects list: add `NAME · LOOPS · CREATED` headers; reconcile per-project loop counts with the header total (loops with unknown projectId count under Default). <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/components/ProjectsPage.tsx] -->

## 6. Confirm, log modal, hints, copy

- [x] 6.1 Confirm mode: prompt first, options below as inline `❯ yes   cancel`; danger accent bar while confirming. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/components/CommandInput.tsx] -->
- [x] 6.2 Log modal: label the duration (`duration 99ms`), replace `[Follow]` with `f follow` key hint, header date via `formatDate`. <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: [src/tui/components/LogModal.tsx] -->
- [x] 6.3 Hint bar adds `ctrl+←→ tabs`; palette empty state styled like the dropdown; placeholder → "Type a command, or help". <!-- agent: frontend-engineer.fast, depends_on: [6.1], touches: [src/tui/components/CommandInput.tsx, src/i18n/en.json] -->

## 7. Verification

- [x] 7.1 Update/extend component tests for: failing-row indicator, muted waiting, dim unfocused selection, humanized avg, project headers. <!-- agent: frontend-engineer.build, depends_on: [2.2, 5.3], touches: [tests/tui-components.test.tsx] -->
- [x] 7.2 Manual ttyd screenshot pass comparing before/after on: loops list with a failing loop, both panels focused/unfocused, confirm prompt, log modal. <!-- agent: basic-engineer.fast, depends_on: [3.1, 4.1, 4.2, 5.1, 5.2, 6.2, 6.3, 7.1], touches: [] -->
- [x] 7.3 Run `npx tsc --noEmit` -> `pnpm lint` -> `pnpm test`. <!-- agent: basic-engineer.fast, depends_on: [7.2], touches: [] -->

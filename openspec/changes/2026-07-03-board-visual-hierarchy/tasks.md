## 1. Tokens and formatters (foundation)

- [ ] 1.1 `statusColor("waiting")` returns `text.muted`; update `DESIGN.md` status mapping and `tests` that assert the old blue. <!-- touches: src/tui/format.ts, src/tui/theme.ts, DESIGN.md -->
- [ ] 1.2 Add `formatDate(iso)` (single human format, e.g. `Jul 3 11:40`) and reuse `formatRunDuration` for the run-history average (kill raw `avg:526194ms`). <!-- touches: src/tui/format.ts, src/tui/components/RunHistory.tsx -->
- [ ] 1.3 Display-unescape command strings in lists (`\"` shown as `"`). <!-- touches: src/tui/format.ts, src/tui/components/Navigator.tsx -->

## 2. Failure visibility + focus-aware selection

- [ ] 2.1 Navigator row: when `lastExitCode` is non-zero, render a red `✗` indicator and danger-colored status label. <!-- touches: src/tui/components/Navigator.tsx -->
- [ ] 2.2 Selection background derives from panel focus: `bg.active` focused, `bg.hover` unfocused — Navigator, RunHistory, FocusableList, TaskBrowser. <!-- touches: src/tui/components/Navigator.tsx, src/tui/components/RunHistory.tsx, src/tui/components/FocusableList.tsx, src/tui/components/TaskBrowser.tsx -->

## 3. Header + filter consolidation

- [ ] 3.1 Header: single row `loop-task ● connected` + TabBar; drop tagline row; counts strip shows only non-zero states. <!-- touches: src/tui/components/Header.tsx -->
- [ ] 3.2 Replace the two duplicated filter lines above the navigator with one chip line (`project · status · sort`, only non-default values highlighted). <!-- touches: src/tui/components/LeftPanel.tsx, src/tui/components/Navigator.tsx, src/i18n/en.json -->

## 4. Inspector reorder + dedupe

- [ ] 4.1 Reorder fields: Status / Last exit / Last run / Next run / Runs, then Interval / Dir, then muted ID / Task / PID; drop Command when identical to Desc. <!-- touches: src/tui/components/Inspector.tsx -->
- [ ] 4.2 Run History header: "(Enter to view log)"; failure stat (`streak / last fail`) moves to its own line right-aligned. <!-- touches: src/tui/components/RunHistory.tsx, src/i18n/en.json -->

## 5. Tables and names

- [ ] 5.1 Right-align numeric columns (RUNS, SKIP); rename `SKP` → `SKIP`. <!-- touches: src/tui/components/Navigator.tsx, src/i18n/en.json -->
- [ ] 5.2 Chain references resolve task names: inspector `Chain: on ✓ → say by`, tasks CHAINS column same notation. <!-- touches: src/tui/components/RightPanel.tsx, src/tui/components/TaskBrowser.tsx -->
- [ ] 5.3 Projects list: add `NAME · LOOPS · CREATED` headers; reconcile per-project loop counts with the header total (loops with unknown projectId count under Default). <!-- touches: src/tui/components/ProjectsPage.tsx -->

## 6. Confirm, log modal, hints, copy

- [ ] 6.1 Confirm mode: prompt first, options below as inline `❯ yes   cancel`; danger accent bar while confirming. <!-- touches: src/tui/components/CommandInput.tsx -->
- [ ] 6.2 Log modal: label the duration (`duration 99ms`), replace `[Follow]` with `f follow` key hint, header date via `formatDate`. <!-- touches: src/tui/components/LogModal.tsx -->
- [ ] 6.3 Hint bar adds `ctrl+←→ tabs`; palette empty state styled like the dropdown; placeholder → "Type a command, or help". <!-- touches: src/tui/components/CommandInput.tsx, src/i18n/en.json -->

## 7. Verification

- [ ] 7.1 Update/extend component tests for: failing-row indicator, muted waiting, dim unfocused selection, humanized avg, project headers. <!-- touches: tests/tui-components.test.tsx -->
- [ ] 7.2 Manual ttyd screenshot pass comparing before/after on: loops list with a failing loop, both panels focused/unfocused, confirm prompt, log modal. <!-- touches: [] -->
- [ ] 7.3 Run `npx tsc --noEmit` -> `pnpm lint` -> `pnpm test`. <!-- touches: [] -->

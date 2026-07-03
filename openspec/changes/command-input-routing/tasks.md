## 1. Input owner resolution

- [x] 1.1 Define an `InputOwner` type (`"modal" | "commandBar" | "panel"`) and a pure `resolveInputOwner(state)` function in `src/tui/state.ts` implementing the priority rule (modal > command bar with text/dropdown > panel nav keys > command bar printable). Unit-test the matrix. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/state.ts, tests/board-state.test.ts] -->
- [x] 1.2 Thread the resolved owner from `App.tsx` into `CommandInput` (`navOwner` prop) and the panel components (`isFocused` becomes owner-driven). <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: [src/tui/App.tsx, src/tui/components/CommandInput.tsx] -->
- [x] 1.3 In `CommandMode`, when the bar is empty and the dropdown closed, return early for `j`, `k`, arrows (panels own them); keep Enter→onPanelAction behavior. <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: [src/tui/components/CommandInput.tsx] -->
- [x] 1.4 In `Navigator`/`RunHistory`/`TaskBrowser`/`FocusableList`, gate `useInput` on owner === "panel" so list navigation never runs while the bar has text or a dropdown is open. <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: [src/tui/components/Navigator.tsx, src/tui/components/RunHistory.tsx, src/tui/components/TaskBrowser.tsx, src/tui/components/FocusableList.tsx] -->

## 2. Escape layer stack

- [x] 2.1 Add `popLayer()` in `App.tsx`: closes exactly one of (dropdown, help/context modal, export modal, commands browser, log modal, form view, quit prompt) per call, topmost first; returns whether it consumed. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/App.tsx] -->
- [x] 2.2 Route all Escape handling (global useInput + CommandInput modes) through `popLayer()`; delete per-surface esc branches that can double-fire. Log modal must close on Esc (parity with `q`). <!-- agent: frontend-engineer.build, depends_on: [2.1], touches: [src/tui/App.tsx, src/tui/components/CommandInput.tsx, src/tui/components/LogModal.tsx] -->
- [x] 2.3 Esc that closes the dropdown also clears `inputValue` (reuse the Ctrl+U clear path). <!-- agent: frontend-engineer.build, depends_on: [2.2], touches: [src/tui/components/CommandInput.tsx] -->

## 3. Exact-match-first ranking

- [x] 3.1 Pre-rank palette options: exact value/label match first, then prefix matches, then fuzzy subsequence results in existing order; stable within groups. Implement as a wrapper around the ink-combobox filter output. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/components/CommandInput.tsx, src/tui/commands.ts] -->
- [x] 3.2 Test: input "delete" focuses "Delete selected loop" above "Edit selected loop"; input "ed" focuses Edit. <!-- agent: frontend-engineer.build, depends_on: [3.1], touches: [tests/tui-components.test.tsx] -->

## 4. Safe confirm defaults

- [x] 4.1 Confirm mode focuses **cancel** by default; Enter with no navigation cancels. Applies to quit, delete, stop prompts. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/components/CommandInput.tsx] -->
- [x] 4.2 Test: Esc→Enter from the board does not exit the app. <!-- agent: frontend-engineer.build, depends_on: [4.1, 2.2], touches: [tests/tui-components.test.tsx] -->

## 5. Verification

- [x] 5.1 Component tests for double-handling regressions: with an empty bar, `j` moves list only and leaves the bar empty; with text in the bar, `Down` moves dropdown focus only. <!-- agent: frontend-engineer.build, depends_on: [1.3, 1.4], touches: [tests/tui-components.test.tsx] -->
- [x] 5.2 Manual ttyd pass (per AGENTS.md "Testing the board in a browser"): reproduce each of the four original defects and confirm fixed. <!-- agent: basic-engineer.fast, depends_on: [2.3, 3.2, 4.2, 5.1], touches: [] -->
- [x] 5.3 Run `npx tsc --noEmit` -> `pnpm lint` -> `pnpm test`. <!-- agent: basic-engineer.fast, depends_on: [5.2], touches: [] -->

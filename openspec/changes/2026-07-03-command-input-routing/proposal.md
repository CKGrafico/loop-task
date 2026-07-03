## Why

A browser-driven walkthrough of the board (via ttyd) surfaced four correctness defects in how keystrokes are routed between the always-focused command bar, the panels, and modal layers. These are the highest-severity UX issues in the app because they make single keypresses do two things, or the wrong thing:

1. **Double-handling**: pressing `j`/`k`/arrows moves the panel list selection AND types into / navigates the command bar simultaneously (observed: `j` moved the list and left "No commands match" in the bar; `Down` moved the dropdown focus and the list selection at once).
2. **Fuzzy Enter executes the wrong command**: typing the exact word `delete` and pressing Enter ran **Edit selected loop**, because "delete" is a fuzzy subsequence of "E**d**it s**ele**c**te**d loop" and that option held focus. In the reverse direction this could execute a destructive command from a benign query.
3. **Escape is inconsistent per surface**: the log modal ignores Esc (`q` works); the edit form swallowed the first Esc (twice) so subsequent typing corrupted a field; closing the commands browser with Esc also fell through to the board and opened the quit prompt.
4. **Stale input after Escape**: Esc closes the dropdown but leaves the typed text in the bar, silently breaking the next interaction. Additionally, the quit confirm focuses **yes** by default, so a reflexive Esc-then-Enter exits the app.

## What Changes

- **Single event owner per keypress.** Introduce an explicit input-priority rule evaluated once per keypress: (1) topmost modal layer, else (2) command bar IF it has text or an open dropdown, else (3) the focused panel for navigation keys (`↑↓`, `j/k`, Enter), else (4) the command bar for printable characters. A keystroke consumed by one owner never reaches another.
- **Escape layer stack.** One central handler pops exactly one layer per Esc press, in order: dropdown → modal (log/commands/export/help) → form/view → quit prompt. Every modal closes on Esc (parity with `q` where `q` exists). Esc that closes a dropdown also clears the typed text.
- **Exact-match-first ranking.** In the command palette, an exact or prefix match on a command's value/label always ranks above subsequence fuzzy matches. Enter with a non-exact top match requires the dropdown to be open and the match visibly highlighted (unchanged), but ranking guarantees `delete` ⇒ Delete.
- **Safe confirm defaults.** Confirm prompts (quit, delete, stop) focus **cancel** by default; explicit navigation is required to reach yes.

### Non-goals

- No new keybindings and no changes to chord shortcuts (`ctrl+f+*`, `ctrl+a+*`).
- No visual redesign of the confirm prompt (reading order/colors are covered by `2026-07-03-board-visual-hierarchy`).
- No changes to search mode behavior.
- No mouse support.

## Capabilities

### New Capabilities
- `input-routing`: deterministic single-owner keypress routing and a central Escape layer stack for the board.

### Modified Capabilities
- Command palette matching: exact/prefix matches rank above fuzzy subsequence matches.

## Impact

- **`src/tui/App.tsx`**: global `useInput` gains the layer/owner gate; quit/delete/stop confirm default focus flips to cancel; Escape handling consolidated into a `popLayer()` helper.
- **`src/tui/components/CommandInput.tsx`**: CommandMode ignores `j/k`/arrows/Enter when `inputValue` is empty and the dropdown is closed (panels own them); Esc clears `inputValue`; no longer relies on `isOpen` heuristics that overlap with panel handlers.
- **`src/tui/components/Navigator.tsx` / `RunHistory.tsx` / `TaskBrowser.tsx` / `FocusableList.tsx`**: navigation `useInput` hooks activate only when their panel is the resolved owner (prop-driven), removing the parallel-handling paths.
- **`src/tui/commands.ts` or ink-combobox integration**: ranking hook for exact/prefix priority (if `ink-combobox` does not expose sort control, wrap its filter with a stable pre-sort).
- **`src/i18n/en.json`**: confirm option order/labels if needed.
- **IPC contract (src/types.ts)**: no change. **Persisted state**: no change. **Cross-platform**: pure TUI logic; behavior identical on Windows/macOS/Linux terminals; also fixes reproduce under ttyd.

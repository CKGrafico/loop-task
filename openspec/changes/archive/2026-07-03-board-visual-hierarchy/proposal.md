## Why

A screenshot-driven design review of the board (via ttyd, real terminal rendering) found that the color system and entity theming are strong, but **visual hierarchy and state encoding** underperform. Concrete observations:

- A loop with a **25-failure streak** renders as a calm blue `waiting` row, failures are invisible exactly where triage happens (the navigator).
- Two full-width bright selection bars (navigator + run history) look identical regardless of which panel has focus; users open the wrong thing (observed repeatedly during the walkthrough).
- Blue means four things at once on the Loops tab: entity accent, `waiting` status, selection background, sparkline, so nothing blue stands out.
- Five rows of chrome precede content (brand+tagline, counts strip with zero-heavy stats, tab bar, then the same filter state printed twice), while the Inspector leads with debug identity (ID, Desc, Command, Task-hash, Dir) and buries Status/Last exit/Next run at positions 7–11, with Desc and Command duplicated for inline-task loops.
- Assorted truth-telling gaps: `avg:526194ms` unhumanized; three date formats coexist (ISO, `03/07/2026`, `Jul 1 22:45`); numeric columns left-aligned; `SKP` header cryptic; chain references shown as raw IDs (`→ 6037fbad`) and `✓:✓ X:-` notation; projects list has no column headers and its loop counts disagree with the header total; confirm prompt renders the focused option **above** the question; log modal shows an unlabeled `99ms` and a `[Follow]` pseudo-button with no key hint; run-history header still says "(Ctrl+Enter to view log)" though plain Enter now works.

## What Changes

User-visible behavior after this change:

- **Failure visibility**: navigator rows with a non-zero last exit render a danger indicator (red `✗` replacing the status dot color or a red status label). A failing loop is identifiable at a glance in the list.
- **Focus-aware selection**: the focused panel's selected row uses `bg.active`; unfocused panels' selection dims to `bg.hover`. Panel focus becomes visible without extra chrome.
- **Status color rebalance**: `waiting` renders `text.muted` (neutral state); blue is reserved for the loop entity accent. `running` stays green, `paused` yellow, `idle` orange, failures red.
- **Header consolidation**: one brand/status row (`loop-task ● connected` + tabs with counts), zero-count stats dropped, tagline removed from the always-visible header; one filter-chip line replaces the duplicated filter text.
- **Inspector reorder**: state block first (Status, Last exit, Last/Next run, Runs), schedule block second (Interval, Dir), identity block last and muted (ID, Task, PID); Desc/Command deduplicated when identical.
- **Data formatting**: durations humanized everywhere (`8m 46s`, never raw ms); one date format across list, inspector, and log modal; numeric columns right-aligned; `SKP` → `SKIP`; command strings unescaped for display.
- **Names over IDs**: chain references show task names (`on ✓ → say by`); the tasks CHAINS column uses the same notation; projects list gains column headers (`NAME · LOOPS · CREATED`) and its counts are reconciled with the header total.
- **Confirm prompt reading order**: question first, options below as compact inline choices; danger-red accent bar in confirm mode (per DESIGN.md, currently not applied).
- **Hint completeness**: hint bar advertises `ctrl+←→ tabs`; run-history header mentions Enter; log modal labels the duration and shows `f follow` instead of `[Follow]`; palette empty-state ("No commands match") styled like the dropdown surface; input placeholder reworded to "Type a command, or help".

### Non-goals

- No keystroke routing changes (covered by `2026-07-03-command-input-routing`).
- No form redesign (covered by `2026-07-03-loop-form-fidelity`).
- No new panels, views, or data (e.g. no inline log preview / activity feed, future work).
- No light-theme work beyond keeping token parity.

## Capabilities

### New Capabilities
- `board-visual-hierarchy`: focus-aware selection styling, failure-state visibility in lists, and consistent data formatting across the board.

### Modified Capabilities
- Navigator row rendering, Inspector field order, Header/TabBar composition, confirm-mode layout, log modal header, projects/tasks list columns.

## Impact

- **`src/tui/theme.ts` / `src/tui/format.ts`**: `statusColor("waiting")` → muted; shared `formatDurationMs` used by RunHistory avg; single `formatDate` helper.
- **`src/tui/components/Navigator.tsx`**: failure indicator, right-aligned numeric columns, `SKIP` header, display-unescaping via `commandLine` formatting.
- **`src/tui/components/RightPanel.tsx` / `Inspector.tsx` / `RunHistory.tsx`**: field reorder + dedupe, focus-aware selection (`bg.hover` when unfocused), humanized avg, header hint text.
- **`src/tui/components/Header.tsx` / `TabBar.tsx` / `App.tsx`**: consolidated header, filter-chip line, non-zero-only stats.
- **`src/tui/components/CommandInput.tsx`**: confirm layout order + danger accent, hint additions, placeholder copy, styled empty dropdown state.
- **`src/tui/components/TaskBrowser.tsx` / `ProjectsPage.tsx` / `LogModal.tsx`**: name-resolved chains, project column headers + count reconciliation, log header labels.
- **`src/i18n/en.json`**: new/changed strings (placeholder, headers, hints); **`src/config/constants.ts`**: none expected; **`DESIGN.md`**: update status-color mapping section.
- **IPC contract**: no change. **Persisted state**: no change. **Cross-platform**: rendering-only.

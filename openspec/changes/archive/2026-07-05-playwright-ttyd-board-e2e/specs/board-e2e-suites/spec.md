## ADDED Requirements

### Requirement: Loops CRUD and lifecycle E2E

The `loops-crud.spec.ts` suite SHALL exercise the full create/read/update/delete + lifecycle cycle of a loop in the board: create new loop via `n`, edit via `e`, pause/resume via `p`, stop/play via `s`, trigger (force run) via `t`, clone via the `clone` command, delete via `d` with confirm, and open the run-log modal via `o`/`logs`.

#### Scenario: Create a loop end-to-end
- **WHEN** the user opens the board (Loops tab) and types `new` (or presses Ctrl+A then `n`)
- **THEN** the New Loop form appears, the user fills Interval, Inline command, Description, Run-now toggle, presses Ctrl+S, and the new loop appears in the navigator with status waiting/running and a toast "Started"

#### Scenario: Edit pauses the loop and saves changes
- **WHEN** the user selects a loop and presses `e`
- **THEN** the Edit Loop form opens prefilled, changing the interval and saving shows a `Updated (paused)` toast and the loop's status is `paused`

#### Scenario: Pause then resume
- **WHEN** the user selects a running loop and presses `p`
- **THEN** a confirm dialog appears, confirming it pauses the loop with toast "Paused", and pressing `p` again resumes it with toast "Resumed"

#### Scenario: Stop then play resets the schedule
- **WHEN** the user selects a loop and stops it with `s`, then plays it with `p`
- **THEN** the stop confirm says the schedule will reset, and after play the loop's next-run starts a fresh interval from now (not the original schedule time)

#### Scenario: Force run triggers an immediate execution
- **WHEN** the user triggers the selected loop with `t`
- **THEN** a confirm dialog appears, confirming it runs the command immediately and a run appears in Run History

#### Scenario: Clone creates a copy
- **WHEN** the user clones the selected loop via the `clone` command
- **THEN** a New Loop form opens pre-filled with the source loop's values (new ID expected on save), and saving creates a second loop with a different ID

#### Scenario: Delete with confirm
- **WHEN** the user presses `d` on a selected loop and types `yes`
- **THEN** the loop is removed from the navigator, a "Deleted" toast appears, and the store no longer contains its file

#### Scenario: Open run log modal
- **WHEN** the user selects a loop with at least one run and presses `o` (or `logs`)
- **THEN** the run-log modal opens showing the latest run's output, `/` enables in-modal search, `c` copies the log, `Esc` closes

### Requirement: Tasks CRUD and chains E2E

The `tasks-crud.spec.ts` suite SHALL exercise the Tasks tab: switch via `2` or Ctrl+→, create a new task with `n`, define inline command + on-success/on-failure chains, edit a task, delete a task, and verify the task inspector displays name/command/chain summary.

#### Scenario: Switch to Tasks tab
- **WHEN** the user presses `2` or Ctrl+→ from the Loops tab
- **THEN** the Tasks tab is active, the navigator shows tasks (or "No tasks defined yet"), and the inspector panel reflects task context

#### Scenario: Create a task with a chain
- **WHEN** the user opens the new task form (`n` on Tasks tab) and fills Name, Command, selects an On-success task that already exists
- **THEN** on save the new task appears in the list, its chain summary shows `✓:<name>`, and the inspector confirms the chain

#### Scenario: Edit a task
- **WHEN** the user selects a task and presses `e`
- **THEN** the Edit Task form opens prefilled, editing Command and saving shows a "Task updated" toast and the inspector reflects the new command

#### Scenario: Delete a task with confirm
- **WHEN** the user selects a task and deletes it (typing `yes`)
- **THEN** the task disappears from the list, a "Deleted task" toast appears, and the store no longer contains its file

### Requirement: Projects CRUD and filters E2E

The `projects-crud.spec.ts` suite SHALL exercise the Projects tab: switch via `3`, create a project with `n` and color selection, edit with `e`, delete with `d` (loops move to Default), change color, and cycle the loops/created/sort/has-loops/is-system filters.

#### Scenario: Switch to Projects tab
- **WHEN** the user presses `3` from any tab
- **THEN** the Projects tab is active and the Default project is visible as a system project

#### Scenario: Create a project with a color
- **WHEN** the user opens new project form (`n`) and fills name + picks a color
- **THEN** the project appears in the navigator with the chosen color bullet, and the create toast names the project

#### Scenario: Edit a project (non-system only)
- **WHEN** the user selects a non-system project and presses `e`
- **THEN** the Edit Project form opens prefilled, and editing name/color saves with an "updated" toast

#### Scenario: Cannot edit or delete the Default project
- **WHEN** the user selects the Default project
- **THEN** `e` is a no-op (no edit form) and `d` is a no-op (no delete confirm)

#### Scenario: Delete project moves loops to Default
- **WHEN** the user deletes a project that has loops assigned (typing `yes` in the confirm)
- **THEN** the project's loops are reassigned to Default, the project disappears from the list, and the Loops tab shows those loops under Default

#### Scenario: Cycle projects filters
- **WHEN** the user cycles the has-loops filter ('r'), the is-system filter ('t'), and the sort mode ('o')
- **THEN** the navigator title reflects the new filter state and the visible projects set updates accordingly

### Requirement: Command bar E2E

The `command-bar.spec.ts` suite SHALL exercise the command bar across all tabs: every command in `commandHandlers` (`edit`, `clone`, `delete`, `pause`, `play`, `stop`, `trigger`, `new-loop`, `new-task`, `new-project`, `project-filter-loops`, `project-filter-type`, `project-sort`, `all-commands`, `help`, `search`, `filter-status`, `sort`, `filter-project`, `debug`, `logs`, `select`, `api`, `status`, `export`, `import`), fuzzy matching of typed prefixes, and unknown-command toast.

#### Scenario: Every command dispatches
- **WHEN** the user types each command key and presses Enter
- **THEN** the matching handler runs (verified by resulting toast, modal, or navigator state), no command returns "Unknown command"

#### Scenario: Unknown command shows toast
- **WHEN** the user types `xyz` and presses Enter
- **THEN** an error toast "Unknown command: xyz" appears

#### Scenario: Fuzzy/prefix matching
- **WHEN** the user types a partial prefix that matches exactly one command
- **THEN** the dropdown shows that command as the top match and Enter dispatches it

### Requirement: Modals E2E

The `modals.spec.ts` suite SHALL exercise every overlay surface: help/all-commands (`help`, `all-commands`, Ctrl+H), run-log modal (open/search/copy/close), export modal (Ctrl+X) including copy + path display, context-help (Ctrl+? / command), API toast (Ctrl+G or `api`), and the confirm dialog (yes/cancel paths).

#### Scenario: Help modal opens and closes
- **WHEN** the user types `help` and presses Enter
- **THEN** the all-commands modal opens showing the All Commands browser, arrow keys navigate it, Enter executes the highlighted command, and Esc closes without dispatching

#### Scenario: Run-log modal search and copy
- **WHEN** the run-log modal is open
- **THEN** `/` activates in-modal search, typing filters, `c` copies the log to the clipboard (toast), and Esc closes

#### Scenario: Export modal displays JSON and offers copy
- **WHEN** the user triggers export (Ctrl+X or `export`)
- **THEN** the export modal opens, displays the JSON preview (truncated at `EXPORT_MAX_PREVIEW_LINES`), prints the saved file path, and `c` copies the full JSON to the clipboard

### Requirement: Keyboard shortcuts E2E

The `keyboard-shortcuts.spec.ts` suite SHALL verify every documented shortcut: 1/2/3 tab switch, Tab/Shift+Tab panel swap, ←/→ panel focus, Ctrl+←/→ cycle tabs, Ctrl+A then letter action chords (n/e/d/p/r/s/t/c/o), Ctrl+F then letter filter chords (s/t/o/p), Ctrl+B debug, Ctrl+G api, Ctrl+X export, Ctrl+I import, Ctrl+Y status, Ctrl+Enter contextual action (left=edit, right=open log).

#### Scenario: Ctrl+A chord then letter
- **WHEN** the user holds Ctrl, presses `a`, releases Ctrl, then presses `n` on the Loops tab
- **THEN** the New Loop form opens (same as typing `new`)

#### Scenario: Ctrl+F filter chord
- **WHEN** the user holds Ctrl, presses `f`, releases Ctrl, then presses `s`
- **THEN** search mode activates (same as typing `search`)

#### Scenario: Ctrl+Enter contextual action depends on focus
- **WHEN** the user focuses the left panel and presses Ctrl+Enter
- **THEN** the selected loop/task/project opens in its edit form
- **WHEN** the user focuses the right panel (Loops tab) and presses Ctrl+Enter
- **THEN** the selected loop's latest run log opens (or the edit form opens if there are no runs)

### Requirement: Breakpoints E2E

The `breakpoints.spec.ts` suite SHALL verify the board renders correctly at narrow (< `BOARD_BREAKPOINT_WIDTH`) vs wide widths: narrow stacks left/right panels vertically, wide places them side-by-side, the header collapses compact summary below `HEADER_COMPACT_WIDTH`, and the command bar stays usable in both.

#### Scenario: Wide layout renders side-by-side
- **WHEN** the viewport is 120 columns wide
- **THEN** the left navigator and right inspector render on the same row, the header shows full counts, and all shortcuts work

#### Scenario: Narrow layout stacks panels
- **WHEN** the viewport is 70 columns wide
- **THEN** the left navigator and right inspector render stacked vertically, Tab still swaps focused panel, and the command bar receives keystrokes normally

### Requirement: Empty-state welcome

The `loops-crud.spec.ts` suite SHALL verify the board's first-run empty state when no loops/tasks exist: a welcome screen or clear empty-state message renders, the "No loops match the current view" / "No tasks defined yet" / "Select a loop to view details" hints appear, and a `new` typed command opens the create form from that state.

#### Scenario: Board boots to empty state
- **WHEN** the board starts against a clean `LOOP_CLI_HOME`
- **THEN** the Loops tab shows the empty hint, the inspector shows "Select a loop to view details", and typing `new` opens the New Loop form so the first loop can be created
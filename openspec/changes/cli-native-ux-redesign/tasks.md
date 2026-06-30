## 1. Dependencies and Types

- [x] 1.1 Install ink-combobox, ink-spinner, ink-scroll-list and add to package.json dependencies <!-- agent: frontend-engineer.fast, depends_on: [], touches: [package.json, pnpm-lock.yaml] -->
- [x] 1.2 Add activeTab, focusedPanel, confirmInput, and command registry types to src/tui/types.ts <!-- agent: frontend-engineer.fast, depends_on: [1.1], touches: [src/tui/types.ts] -->
- [x] 1.3 Add new i18n keys for command labels, wizard step prompts, confirm messages, and api help text to src/i18n/en.json <!-- agent: frontend-engineer.fast, depends_on: [], touches: [src/i18n/en.json] -->
- [x] 1.4 Add new constants (wizard step count, command tiers, confirm keywords) to src/config/constants.ts <!-- agent: frontend-engineer.fast, depends_on: [], touches: [src/config/constants.ts] -->

## 2. Command Registry

- [x] 2.1 Create src/tui/commands.ts — buildCommands(context) pure function returning context-aware Command[] with label, value, hint, tier fields <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: [src/tui/commands.ts] -->
- [x] 2.2 Create src/tui/components/CommandInput.tsx — always-focused command palette using ink-combobox headless hooks, confirm mode state machine, Ctrl+E/Ctrl+D bypass handlers <!-- agent: frontend-engineer.build, depends_on: [2.1], touches: [src/tui/components/CommandInput.tsx] -->

## 3. Header and Tab Bar

- [x] 3.1 Create src/tui/components/TabBar.tsx — three-tab bar (Loops / Tasks / Projects) with active tab highlight, receives activeTab prop and onTabChange callback <!-- agent: frontend-engineer.build, depends_on: [1.2, 1.3], touches: [src/tui/components/TabBar.tsx] -->
- [x] 3.2 Rewrite src/tui/components/Header.tsx — replace three FocusableButton nav buttons with TabBar component; keep daemon status row and separator <!-- agent: frontend-engineer.build, depends_on: [3.1], touches: [src/tui/components/Header.tsx] -->

## 4. Left Panel

- [x] 4.1 Create src/tui/components/LeftPanel.tsx — container that renders loop list, task list, or project list based on activeTab prop; includes inline filter input at top; receives isFocused prop <!-- agent: frontend-engineer.build, depends_on: [1.2, 3.1], touches: [src/tui/components/LeftPanel.tsx] -->
- [x] 4.2 Migrate Navigator.tsx to use ink-scroll-list instead of FocusableList; accept isFocused prop instead of useFocus() <!-- agent: frontend-engineer.build, depends_on: [4.1], touches: [src/tui/components/Navigator.tsx] -->
- [x] 4.3 Migrate TaskNavigator (TaskBrowser.tsx) to use ink-scroll-list; accept isFocused prop <!-- agent: frontend-engineer.build, depends_on: [4.1], touches: [src/tui/components/TaskBrowser.tsx] -->
- [x] 4.4 Add ink-spinner inline to Navigator list rows for loops with status "running" <!-- agent: frontend-engineer.build, depends_on: [4.2], touches: [src/tui/components/Navigator.tsx] -->
- [x] 4.5 Relocate FilterBar logic into LeftPanel inline filter input; remove FilterBar.tsx as top-level rendered component <!-- agent: frontend-engineer.build, depends_on: [4.1], touches: [src/tui/components/LeftPanel.tsx, src/tui/components/FilterBar.tsx] -->

## 5. Right Panel

- [x] 5.1 Create src/tui/components/RightPanel.tsx — container stacking Inspector above RunHistory; receives isFocused prop; passes focus to RunHistory when focused <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: [src/tui/components/RightPanel.tsx] -->
- [x] 5.2 Migrate RunHistory.tsx to accept isFocused prop instead of useFocus(); use ink-scroll-list for run rows <!-- agent: frontend-engineer.build, depends_on: [5.1], touches: [src/tui/components/RunHistory.tsx] -->
- [x] 5.3 Remove borders from Inspector.tsx panel; render as plain labeled table with divider separators <!-- agent: frontend-engineer.build, depends_on: [5.1], touches: [src/tui/components/Inspector.tsx] -->

## 6. Wizard Create Form

- [x] 6.1 Create src/tui/components/WizardForm.tsx — multi-step wizard engine: StepConfig array, currentStep state, breadcrumb line, Ctrl+S skip-to-save, Esc to go back one step <!-- agent: frontend-engineer.build, depends_on: [1.2, 1.3, 2.2], touches: [src/tui/components/WizardForm.tsx] -->
- [x] 6.2 Rewrite src/tui/components/CreateForm.tsx — replace all-fields form with WizardForm steps for loop creation (interval, command/task, run-now, optional: cwd, description, max-runs, project) <!-- agent: frontend-engineer.build, depends_on: [6.1], touches: [src/tui/components/CreateForm.tsx] -->
- [x] 6.3 Rewrite src/tui/components/TaskForm.tsx (create mode) — replace all-fields form with WizardForm steps (command, name, optional: onSuccess chain, onFailure chain) <!-- agent: frontend-engineer.build, depends_on: [6.1], touches: [src/tui/components/TaskForm.tsx] -->

## 7. Patch Edit Form

- [x] 7.1 Create src/tui/components/PatchEditForm.tsx — read-only labeled table of all field values, staged-change tracking, pending-changes count in header, save/cancel via command input <!-- agent: frontend-engineer.build, depends_on: [2.2, 1.2], touches: [src/tui/components/PatchEditForm.tsx] -->
- [x] 7.2 Wire PatchEditForm into CreateForm.tsx edit mode — when mode="edit", render PatchEditForm instead of WizardForm <!-- agent: frontend-engineer.build, depends_on: [7.1, 6.2], touches: [src/tui/components/CreateForm.tsx] -->
- [x] 7.3 Wire PatchEditForm into TaskForm.tsx edit mode — when mode="edit", render PatchEditForm <!-- agent: frontend-engineer.build, depends_on: [7.1, 6.3], touches: [src/tui/components/TaskForm.tsx] -->

## 8. App.tsx Rewire

- [x] 8.1 Add activeTab state and tab-switching logic to App.tsx; remove push("task-list") and push("projects") router calls; fold tasks and projects into activeTab <!-- agent: frontend-engineer.build, depends_on: [3.2, 4.1, 5.1, 2.2], touches: [src/tui/App.tsx] -->
- [x] 8.2 Add focusedPanel state to App.tsx; intercept Tab key to cycle left/right panels; pass isFocused props to LeftPanel and RightPanel <!-- agent: frontend-engineer.build, depends_on: [8.1], touches: [src/tui/App.tsx] -->
- [x] 8.3 Wire CommandInput into App.tsx bottom slot; connect command dispatch to action handlers; connect confirm mode to destructive actions (delete loop, delete task, delete project, stop loop) <!-- agent: frontend-engineer.build, depends_on: [8.2, 2.2], touches: [src/tui/App.tsx] -->
- [x] 8.4 Remove ConfirmModal, ActionButtons, and Footer from App.tsx render tree; remove their import references <!-- agent: frontend-engineer.fast, depends_on: [8.3], touches: [src/tui/App.tsx] -->

## 9. Router and Type Cleanup

- [x] 9.1 Remove "task-list" and "projects" from View union in src/tui/types.ts; add "confirm-input" to Mode; add activeTab type <!-- agent: frontend-engineer.fast, depends_on: [8.4], touches: [src/tui/types.ts, src/tui/router.ts] -->
- [x] 9.2 Delete src/tui/components/ConfirmModal.tsx, src/tui/components/ActionButtons.tsx, src/tui/components/Footer.tsx; delete src/tui/components/FocusableSearchSelect.tsx <!-- agent: frontend-engineer.fast, depends_on: [9.1], touches: [src/tui/components/ConfirmModal.tsx, src/tui/components/ActionButtons.tsx, src/tui/components/Footer.tsx, src/tui/components/FocusableSearchSelect.tsx] -->
- [x] 9.3 Replace all remaining FocusableSearchSelect usage in ProjectsPage.tsx with ink-combobox headless hooks <!-- agent: frontend-engineer.build, depends_on: [9.2], touches: [src/tui/components/ProjectsPage.tsx] -->

## 10. Verification

- [x] 10.1 Run rtk pnpm build and fix all TypeScript errors <!-- agent: basic-engineer.fast, depends_on: [9.1, 9.2, 9.3], touches: [] -->
- [x] 10.2 Run rtk pnpm lint and fix all lint errors <!-- agent: basic-engineer.fast, depends_on: [10.1], touches: [] -->
- [x] 10.3 Run rtk pnpm test and fix any broken tests; update test snapshots for renamed/removed components <!-- agent: basic-engineer.fast, depends_on: [10.2], touches: [tests/**] -->

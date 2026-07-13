## 1. Consolidate shared infrastructure

- [ ] 1.1 Move `src/hooks/useLoopFormValidation.ts` → `src/shared/hooks/useLoopFormValidation.ts` and update all imports
- [ ] 1.2 Move `src/tui/utils/paste.ts`, `syntax.ts`, `validation.ts` → `src/shared/utils/` and update all imports
- [ ] 1.3 Move `src/tui/format.ts` → `src/shared/ui/format.ts` (merge with existing) and update imports
- [ ] 1.4 Move `src/tui/theme.ts` → `src/shared/ui/theme.ts` and update all imports
- [ ] 1.5 Move `src/tui/hooks/useLoopPolling.ts`, `useLogStream.ts`, `useHoverState.ts`, `useBreakpoint.ts` → `src/shared/hooks/` and update imports
- [ ] 1.6 Move `src/shared/clipboard.ts`, `sleep.ts`, `tail.ts`, `fs-utils.ts`, `useUndoRedo.ts` into `src/shared/utils/` and `src/shared/hooks/` respectively, update imports
- [ ] 1.7 Move `src/config/constants.ts`, `paths.ts` → `src/shared/config/` and update all imports
- [ ] 1.8 Move `src/i18n/` → `src/shared/i18n/` and update all imports
- [ ] 1.9 Verify: `rtk npx tsc --noEmit` passes, `rtk pnpm test` passes

## 2. Create entity layers

- [ ] 2.1 Create `src/entities/loops/`, extract LoopMeta types, loop filters, loop sort functions from `src/tui/state.ts` and `src/tui/types.ts`
- [ ] 2.2 Create `src/entities/tasks/`, extract TaskDefinition types, task filters from `src/tui/state.ts` and `src/tui/types.ts`
- [ ] 2.3 Create `src/entities/projects/`, extract Project types, project filters from `src/tui/state.ts` and `src/tui/types.ts`
- [ ] 2.4 Update all imports referencing loop/task/project types to use entity layer paths
- [ ] 2.5 Verify: `rtk npx tsc --noEmit` passes, `rtk pnpm test` passes

## 3. Create feature layers

- [ ] 3.1 Create `src/features/commands/`, move command handlers and shortcuts from `src/tui/commands.ts` and `src/tui/features/commands/`, `src/tui/features/shortcuts/`
- [ ] 3.2 Create `src/features/overlays/`, move modal/confirm/search overlay stack from `src/tui/features/overlays/`
- [ ] 3.3 Create `src/features/forms/`, move form routing + validation from `src/tui/features/forms/`
- [ ] 3.4 Create `src/features/code-editor/`, move CodeEditorModal + Preview from `src/tui/components/CodeEditorModal.tsx`, `CodeEditorPreview.tsx`
- [ ] 3.5 Move `src/tui/features/actions/`, `src/tui/features/state/` to appropriate feature/entity locations
- [ ] 3.6 Update all imports to use new feature layer paths
- [ ] 3.7 Verify: `rtk npx tsc --noEmit` passes, `rtk pnpm test` passes

## 4. Create widget layers

- [ ] 4.1 Create `src/widgets/header/`, move Header.tsx, TabBar.tsx
- [ ] 4.2 Create `src/widgets/left-panel/`, move LeftPanel.tsx, Navigator.tsx
- [ ] 4.3 Create `src/widgets/right-panel/`, move RightPanel.tsx, Inspector.tsx
- [ ] 4.4 Create `src/widgets/command-input/`, move CommandInput.tsx, FocusableInput.tsx
- [ ] 4.5 Create `src/widgets/log-modal/`, move LogModal.tsx
- [ ] 4.6 Create `src/widgets/task-form/`, move TaskForm.tsx, TaskBrowser.tsx, TaskPickerModal.tsx
- [ ] 4.7 Create `src/widgets/loop-form/`, move CreateForm.tsx, WizardForm.tsx
- [ ] 4.8 Create `src/widgets/project-form/`, move ProjectForm.tsx, ProjectsModal.tsx, ProjectsPage.tsx
- [ ] 4.9 Create `src/widgets/commands-browser/`, move CommandsBrowserModal.tsx
- [ ] 4.10 Move remaining TUI components: Button, ChainEditor, DebugPanel, ExportModal, FocusableButton, FocusableList, HelpGuideModal, HelpModal, Modal, RunHistory, SelectModal, Toast, WelcomeScreen, ContextHelpModal to appropriate widget/feature locations
- [ ] 4.11 Update all imports to use new widget paths
- [ ] 4.12 Verify: `rtk npx tsc --noEmit` passes, `rtk pnpm test` passes

## 5. Create app layer

- [ ] 5.1 Create `src/app/providers/`, move InversifyProvider from `src/shared/providers/`
- [ ] 5.2 Create `src/app/router/`, move `src/tui/router.ts`
- [ ] 5.3 Move App composition root (`src/tui/App.tsx`, `src/tui/index.tsx`) → `src/app/`
- [ ] 5.4 Update entry point imports (package.json bin, tsconfig) to point to new `src/app/`
- [ ] 5.5 Update all imports to use new app layer paths
- [ ] 5.6 Verify: `rtk npx tsc --noEmit` passes, `rtk pnpm test` passes

## 6. Reorganize daemon

- [ ] 6.1 Create `src/daemon/server/`, move IPC server (`server.ts`) to `src/daemon/server/`
- [ ] 6.2 Create `src/daemon/state/`, move state persistence (`state.ts`) to `src/daemon/state/`
- [ ] 6.3 Create `src/daemon/managers/`, move `manager.ts`, `projects.ts`, `task-manager.ts` to `src/daemon/managers/`
- [ ] 6.4 Create `src/daemon/watcher/`, move `file-watcher.ts` to `src/daemon/watcher/`
- [ ] 6.5 Create `src/daemon/spawner/`, move `spawner.ts` to `src/daemon/spawner/`
- [ ] 6.6 Create `src/daemon/http/`, split `http-server.ts` into route handler files by domain (loops, tasks, projects, config/health) + shared server setup; each file ≤300 lines
- [ ] 6.7 Update `src/daemon/index.ts` to re-export from new subdirectories
- [ ] 6.8 Update all daemon imports throughout the codebase
- [ ] 6.9 Verify: `rtk npx tsc --noEmit` passes, `rtk pnpm test` passes

## 7. Reorganize core

- [ ] 7.1 Create `src/core/loop/`, split `loop-controller.ts` into orchestration, chain execution, and state management modules; each ≤300 lines
- [ ] 7.2 Create `src/core/command/`, move `command-runner.ts`
- [ ] 7.3 Create `src/core/context/`, move `context-parser.ts`, `template.ts`
- [ ] 7.4 Create `src/core/scheduling/`, move `scheduling.ts`
- [ ] 7.5 Create `src/core/logging/`, move `log-rotator.ts`, `log-parser.ts`
- [ ] 7.6 Create `src/core/foreground/`, move `foreground-loop.ts`
- [ ] 7.7 Move `resolve-cwd.ts` to `src/core/command/` (used by command runner)
- [ ] 7.8 Update all core imports throughout the codebase
- [ ] 7.9 Verify: `rtk npx tsc --noEmit` passes, `rtk pnpm test` passes

## 8. Clean up and remove old directories

- [ ] 8.1 Remove `src/tui/` directory (verify all files moved out)
- [ ] 8.2 Remove `src/hooks/` directory (verify all files moved out)
- [ ] 8.3 Remove empty `src/config/` directory (moved to `src/shared/config/`)
- [ ] 8.4 Remove empty `src/i18n/` directory (moved to `src/shared/i18n/`)
- [ ] 8.5 Remove any leftover empty directories from moves
- [ ] 8.6 Verify: `rtk npx tsc --noEmit` passes, `rtk pnpm test` passes, `rtk pnpm build` passes

## 9. Update project guardrails

- [ ] 9.1 Update project-guardrails skill with new FSD directory structure and dependency rules
- [ ] 9.2 Document FSD layer import conventions (relative paths to `../shared/`, `../entities/`, etc.)
- [ ] 9.3 Document file size limits (≤300 lines in widgets/features/entities)
- [ ] 9.4 Document DI container usage patterns in new structure

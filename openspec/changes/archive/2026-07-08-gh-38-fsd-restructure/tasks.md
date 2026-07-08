## 1. Shared Utilities Consolidation

- [ ] 1.1 Move `src/hooks/useLoopFormValidation.ts` to `src/shared/hooks/useLoopFormValidation.ts` and update all imports
- [ ] 1.2 Move `src/tui/utils/paste.ts` to `src/shared/utils/paste.ts` and update all imports
- [ ] 1.3 Move `src/tui/utils/syntax.ts` to `src/shared/utils/syntax.ts` and update all imports
- [ ] 1.4 Move `src/tui/utils/validation.ts` to `src/shared/utils/validation.ts` and update all imports
- [ ] 1.5 Move `src/tui/format.ts` to `src/shared/ui/format.ts` and update all imports
- [ ] 1.6 Move `src/tui/theme.ts` to `src/shared/ui/theme.ts` and update all imports
- [ ] 1.7 Move `src/tui/hooks/useLoopPolling.ts` to `src/shared/hooks/useLoopPolling.ts` and update all imports
- [ ] 1.8 Move `src/tui/hooks/useLogStream.ts` to `src/shared/hooks/useLogStream.ts` and update all imports
- [ ] 1.9 Move `src/tui/hooks/useHoverState.ts` to `src/shared/hooks/useHoverState.ts` and update all imports
- [ ] 1.10 Move `src/tui/hooks/useBreakpoint.ts` to `src/shared/hooks/useBreakpoint.ts` and update all imports
- [ ] 1.11 Move `src/shared/useUndoRedo.ts` to `src/shared/hooks/useUndoRedo.ts` and update all imports
- [ ] 1.12 Move `src/shared/clipboard.ts` to `src/shared/utils/clipboard.ts` and update all imports
- [ ] 1.13 Move `src/shared/sleep.ts` to `src/shared/utils/sleep.ts` and update all imports
- [ ] 1.14 Move `src/shared/tail.ts` to `src/shared/utils/tail.ts` and update all imports
- [ ] 1.15 Move `src/shared/fs-utils.ts` to `src/shared/utils/fs-utils.ts` and update all imports
- [ ] 1.16 Move `src/config/constants.ts` to `src/shared/config/constants.ts` and update all imports
- [ ] 1.17 Move `src/config/paths.ts` to `src/shared/config/paths.ts` and update all imports
- [ ] 1.18 Move `src/i18n/` to `src/shared/i18n/` and update all imports

## 2. Entity Layer Creation

- [ ] 2.1 Create `src/entities/loops/` with index.ts exporting loop filters, sort, and domain types extracted from `src/tui/state.ts`
- [ ] 2.2 Create `src/entities/tasks/` with index.ts exporting task filters, sort, and domain types extracted from `src/tui/state.ts`
- [ ] 2.3 Create `src/entities/projects/` with index.ts exporting project filters, sort, and domain types extracted from `src/tui/state.ts`

## 3. Widget Layer Creation

- [ ] 3.1 Create `src/widgets/header/` - move `src/tui/components/Header.tsx` + `src/tui/components/TabBar.tsx`
- [ ] 3.2 Create `src/widgets/left-panel/` - move `src/tui/components/LeftPanel.tsx`, `Navigator.tsx`, `FocusableList.tsx`, `FocusableButton.tsx`, `FocusableInput.tsx`
- [ ] 3.3 Create `src/widgets/right-panel/` - move `src/tui/components/RightPanel.tsx`, `Inspector.tsx`
- [ ] 3.4 Create `src/widgets/command-input/` - move `src/tui/components/CommandInput.tsx`, `Button.tsx`
- [ ] 3.5 Create `src/widgets/log-modal/` - move `src/tui/components/LogModal.tsx`, `RunHistory.tsx`
- [ ] 3.6 Create `src/widgets/task-form/` - move `src/tui/components/TaskForm.tsx`, `TaskBrowser.tsx`, `TaskPickerModal.tsx`
- [ ] 3.7 Create `src/widgets/loop-form/` - move `src/tui/components/CreateForm.tsx`, `WizardForm.tsx`
- [ ] 3.8 Create `src/widgets/project-form/` - move `src/tui/components/ProjectForm.tsx`, `ProjectsModal.tsx`, `ProjectsPage.tsx`
- [ ] 3.9 Create `src/widgets/commands-browser/` - move `src/tui/components/CommandsBrowserModal.tsx`
- [ ] 3.10 Create `src/widgets/code-editor/` - move `src/tui/components/CodeEditorModal.tsx`, `CodeEditorPreview.tsx`, `ChainEditor.tsx`
- [ ] 3.11 Create `src/widgets/overlays/` - move `src/tui/components/Modal.tsx`, `SelectModal.tsx`, `ExportModal.tsx`, `ContextHelpModal.tsx`, `HelpModal.tsx`, `HelpGuideModal.tsx`, `WelcomeScreen.tsx`, `Toast.tsx`, `DebugPanel.tsx`

## 4. Feature Layer Creation

- [ ] 4.1 Create `src/features/commands/` - move `src/tui/commands.ts` (command dispatch handlers + shortcuts)
- [ ] 4.2 Create `src/features/overlays/` - move overlay/confirm/search stack logic from App.tsx
- [ ] 4.3 Create `src/features/forms/` - move form routing + validation logic from App.tsx and state.ts
- [ ] 4.4 Create `src/features/code-editor/` - move code editor feature logic
- [ ] 4.5 Create `src/features/chain-editor/` - move chain editor feature logic

## 5. App Layer Creation

- [ ] 5.1 Create `src/app/providers/` - move `src/shared/providers/InversifyProvider.tsx`
- [ ] 5.2 Create `src/app/router/` - move `src/tui/router.ts` as `useRouter` hook
- [ ] 5.3 Create `src/app/index.tsx` - move `src/tui/index.tsx` as composition root, move `src/tui/App.tsx` -> `src/app/App.tsx`

## 6. Daemon Reorganization

- [ ] 6.1 Create `src/daemon/server/` - move `server.ts` (IPC server) + `daemon-log.ts`
- [ ] 6.2 Create `src/daemon/watcher/` - move `file-watcher.ts`
- [ ] 6.3 Create `src/daemon/spawner/` - move `spawner.ts`
- [ ] 6.4 Create `src/daemon/state/` - move `state.ts` (persistence)
- [ ] 6.5 Create `src/daemon/managers/` - move `manager.ts`, `task-manager.ts`, `projects.ts`
- [ ] 6.6 Split `http-server.ts` (672 lines): create `src/daemon/http/server.ts` (server setup) and `src/daemon/http/routes/` with route handler files (loops.ts, tasks.ts, projects.ts, health.ts, ws.ts)
- [ ] 6.7 Update `src/daemon/index.ts` imports for new paths

## 7. Core Reorganization

- [ ] 7.1 Create `src/core/command/` - move `command-runner.ts` + `resolve-cwd.ts`
- [ ] 7.2 Create `src/core/scheduling/` - move `scheduling.ts`
- [ ] 7.3 Create `src/core/logging/` - move `log-rotator.ts` + `log-parser.ts`
- [ ] 7.4 Create `src/core/context/` - move `context-parser.ts` + `template.ts`
- [ ] 7.5 Create `src/core/foreground/` - move `foreground-loop.ts`
- [ ] 7.6 Split `loop-controller.ts` (599 lines): create `src/core/loop/controller.ts`, `src/core/loop/chain-executor.ts`, `src/core/loop/state-manager.ts` with preserved public API

## 8. Client Reorganization

- [ ] 8.1 Create `src/client/ipc/` - move `src/client/ipc.ts`
- [ ] 8.2 Create `src/client/commands/` - move `src/client/commands.ts`
- [ ] 8.3 Move `src/ipc/` into `src/client/ipc/` (handlers + send.ts)

## 9. Cleanup and Verification

- [ ] 9.1 Remove empty `src/tui/` directory tree
- [ ] 9.2 Remove empty `src/hooks/` directory
- [ ] 9.3 Remove empty `src/config/` directory
- [ ] 9.4 Remove empty `src/i18n/` directory
- [ ] 9.5 Run `rtk pnpm run typecheck` - verify zero errors
- [ ] 9.6 Run `rtk pnpm run lint` - verify zero errors
- [ ] 9.7 Run `rtk pnpm run test` - verify all tests pass
- [ ] 9.8 Run `rtk pnpm run build` - verify build succeeds

## 10. Guardrails Update

- [ ] 10.1 Update `project-guardrails` skill with new directory structure, FSD layer dependency rules, import conventions, 300-line file limit

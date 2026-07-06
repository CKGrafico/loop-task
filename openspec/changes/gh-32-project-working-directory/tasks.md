## 1. Types & Core Resolution

- [ ] 1.1 Add `directory?: string` to `Project` interface in `src/types.ts`
- [ ] 1.2 Add `directory?: string` to `project-create` and `project-update` IPC payload types in `src/types.ts`
- [ ] 1.3 Create `src/core/resolve-cwd.ts` with `resolveEffectiveCwd(loopCwd: string, projectDirectory: string | undefined): string` — empty inherits, relative concatenates, absolute overrides
- [ ] 1.4 Add unit tests for `resolveEffectiveCwd` in `src/core/__tests__/resolve-cwd.test.ts`

## 2. Daemon — Project Persistence & IPC

- [ ] 2.1 Update `ProjectManager.createProject()` in `src/daemon/projects.ts` to accept and store `directory`
- [ ] 2.2 Update `ProjectManager.updateProject()` in `src/daemon/projects.ts` to accept and update `directory`
- [ ] 2.3 Update `ProjectManager.createDefaultProject()` in `src/daemon/projects.ts` to set `directory: ""`
- [ ] 2.4 Update `project-create` RPC handler in `src/daemon/server.ts` to pass `directory` from payload
- [ ] 2.5 Update `project-update` RPC handler in `src/daemon/server.ts` to pass `directory` from payload

## 3. Loop Execution — CWD Resolution

- [ ] 3.1 Update `LoopController.run()` in `src/core/loop-controller.ts` to resolve effective cwd via `resolveEffectiveCwd()` before calling `executeCommand()`
- [ ] 3.2 Update chain execution in `LoopController` to use resolved cwd
- [ ] 3.3 Ensure `LoopController` has access to project directory (via manager lookup)

## 4. TUI — Project Form & Inspector

- [ ] 4.1 Add `directory` step to `ProjectForm` wizard in `src/tui/components/ProjectForm.tsx` (auto-filled with `process.cwd()` on create)
- [ ] 4.2 Update `ProjectInspector` in `src/tui/components/RightPanel.tsx` to display project directory
- [ ] 4.3 Update `ProjectsPage` detail panel in `src/tui/components/ProjectsPage.tsx` to show project directory
- [ ] 4.4 Update `Inspector` in `src/tui/components/Inspector.tsx` to show effective directory using `resolveEffectiveCwd()`

## 5. Board — Project Form & Inspector

- [ ] 5.1 Add directory input to board project create/edit form
- [ ] 5.2 Update board `Inspector.tsx` to show effective directory using `resolveEffectiveCwd()`

## 6. i18n & Validation

- [ ] 6.1 Add i18n strings for project directory label, hint, and inherit text to `src/i18n/en.json`
- [ ] 6.2 Update loop form cwd hint to indicate project inheritance
- [ ] 6.3 Update `useLoopFormValidation` cwd validation to allow empty (inherit from project)

## 7. Verification

- [ ] 7.1 Run `rtk npx tsc --noEmit` and fix any type errors
- [ ] 7.2 Run `rtk pnpm lint` and fix any lint errors
- [ ] 7.3 Run `rtk pnpm test` and ensure all tests pass

## 1. Shared validation hook

- [x] 1.1 Create `useLoopFormValidation` hook in `src/hooks/` wrapping `buildLoopOptions()`, `parseDuration()`, `parseMaxRuns()` with per-field error extraction <!-- agent: frontend-engineer.build, depends_on: , touches: src/hooks/useLoopFormValidation.ts -->

## 2. Board CreateForm, validation + mode toggle + copy

- [x] 2.1 Add per-field validation errors to board CreateForm, render error texts below fields on blur/submit <!-- agent: frontend-engineer.build, depends_on: 1.1, touches: src/board/components/CreateForm.tsx -->
- [x] 2.2 Add task mode toggle (inline command vs existing task) with field reset logic <!-- agent: frontend-engineer.build, depends_on: 2.1, touches: src/board/components/CreateForm.tsx -->
- [x] 2.3 Add clipboard copy buttons for command and cwd fields in edit mode <!-- agent: frontend-engineer.build, depends_on: 2.2, touches: src/board/components/CreateForm.tsx -->

## 3. TUI WizardForm, validation + CWD default

- [x] 3.1 Add per-field validation errors to TUI WizardForm using the shared hook <!-- agent: frontend-engineer.build, depends_on: 1.1, touches: src/tui/components/WizardForm.tsx -->
- [x] 3.2 Add smart CWD default (`process.cwd()`) as editable value in TUI create mode <!-- agent: frontend-engineer.build, depends_on: 3.1, touches: src/tui/components/WizardForm.tsx,src/tui/components/CreateForm.tsx -->

## 4. Board edit navigation

- [x] 4.1 Bypass DetailView for direct edit navigation, board edit action goes straight to CreateForm in edit mode <!-- agent: frontend-engineer.build, depends_on: , touches: src/board/App.tsx,src/board/focus-context.tsx -->

## 5. Verify

- [x] 5.1 Run `rtk npx tsc --noEmit` -> `rtk pnpm lint` -> `rtk pnpm test` to verify all changes <!-- agent: frontend-engineer.build, depends_on: 2.3,3.2,4.1, touches: -->

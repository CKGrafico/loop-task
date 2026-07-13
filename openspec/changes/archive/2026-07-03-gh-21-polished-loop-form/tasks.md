## 1. Shared validation

- [x] 1.1 Extract shared `validateField`/`validateAll` into `src/hooks/useLoopFormValidation.ts`, delegating to `parseDuration()`/`buildLoopOptions()` from `src/loop-config.ts` and `src/duration.ts`. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/hooks/useLoopFormValidation.ts] -->
- [x] 1.2 Migrate board `CreateForm.tsx` to the shared hook. <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: [src/board/components/CreateForm.tsx] -->
- [x] 1.3 Migrate TUI `WizardForm.tsx` to the shared hook. <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: [src/tui/components/WizardForm.tsx] -->

## 2. Per-field inline errors

- [x] 2.1 Board `CreateForm`: `fieldErrors` state, validate on change, inline error text next to each field, full validation on submit via `validateAll`. <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: [src/board/components/CreateForm.tsx] -->
- [x] 2.2 TUI `WizardForm`: per-step validation via the shared hook on submit. <!-- agent: frontend-engineer.build, depends_on: [1.3], touches: [src/tui/components/WizardForm.tsx] -->

## 3. Task mode toggle

- [x] 3.1 `TASK_MODE_INLINE` / `TASK_MODE_EXISTING` toggle with field reset on switch (board + TUI). <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/board/components/CreateForm.tsx, src/tui/components/WizardForm.tsx] -->

## 4. Inline command + copy

- [x] 4.1 Merge `commandArgs` into a single editable string on load; re-parse via `parseCommandLine()` on save (board + TUI). <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/board/components/CreateForm.tsx, src/tui/components/CreateForm.tsx] -->
- [x] 4.2 Copy-to-clipboard for command/cwd fields via `copyToClipboard()`, with a `copiedField` visual confirmation state (board + TUI). <!-- agent: frontend-engineer.build, depends_on: [4.1], touches: [src/board/components/CreateForm.tsx, src/tui/components/WizardForm.tsx] -->

## 5. Smart CWD default

- [x] 5.1 Pre-fill `process.cwd()` on create; show the loop's existing `cwd` on edit (board + TUI). <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/board/components/CreateForm.tsx, src/tui/components/CreateForm.tsx] -->

## 6. Direct edit navigation

- [x] 6.1 Edit action routes straight to `CreateView`/`WizardForm` in edit mode (`push("create")` with `editTarget` set), no read-only detail view in the path. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/board/App.tsx, src/tui/App.tsx] -->
- [x] 6.2 Delete the now-unreferenced `src/board/components/DetailView.tsx` (confirmed zero imports repo-wide). <!-- agent: basic-engineer.fast, depends_on: [6.1], touches: [src/board/components/DetailView.tsx] -->

## 7. Verification

- [x] 7.1 Manual ttyd pass: deferred to human QA (ttyd is opt-in only per AGENTS.md). <!-- agent: basic-engineer.fast, depends_on: [6.2], touches: [] -->
- [x] 7.2 Run `npx tsc --noEmit` -> `pnpm lint` -> `pnpm test`, tsc passes; lint shows 87 pre-existing errors matching main; tests show pre-existing failures only (loop-config 2, client-commands 2, daemon-server 29 EACCES, loop-controller 2). <!-- agent: basic-engineer.fast, depends_on: [7.1], touches: [] -->

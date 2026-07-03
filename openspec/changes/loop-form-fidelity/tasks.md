## 1. Shared paste utility

- [ ] 1.1 Extract `sanitizePaste` from `CommandInput.tsx` into `src/tui/utils/paste.ts`; re-export from CommandInput for existing tests. <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/utils/paste.ts, src/tui/components/CommandInput.tsx] -->
- [ ] 1.2 In the form text-input path (`FocusableInput` / form field handlers), treat multi-char printable input and bracketed-paste chunks as a paste: sanitize and insert whole. <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: [src/tui/components/FocusableInput.tsx, src/tui/components/CreateForm.tsx] -->
- [ ] 1.3 Test: pasting `npm run build && echo done` into the command field yields the full string. <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: [tests/tui-components.test.tsx] -->

## 2. Prefill on edit

- [ ] 2.1 When opening the edit form for a loop with `taskId`, resolve the task name and prefill the task selector display (`<name> (<short id>)`); an untouched selector preserves the binding on save. <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: [src/tui/components/CreateForm.tsx] -->
- [ ] 2.2 Test: edit + immediate save leaves `taskId` unchanged. <!-- agent: frontend-engineer.build, depends_on: [2.1], touches: [tests/tui-components.test.tsx] -->

## 3. Select affordance

- [ ] 3.1 Render enumerated fields (task mode, run-immediately, project) as `‹ value ›` with focused styling consistent with bordered inputs and a `←/→ change` hint. <!-- agent: frontend-engineer.build, depends_on: [2.1], touches: [src/tui/components/CreateForm.tsx, src/i18n/en.json] -->

## 4. Verification

- [ ] 4.1 Manual ttyd pass: edit `sds`-like loop → task shown; paste a full command into a field; toggle a select with arrows. <!-- agent: basic-engineer.fast, depends_on: [1.3, 2.2, 3.1], touches: [] -->
- [ ] 4.2 Run `npx tsc --noEmit` -> `pnpm lint` -> `pnpm test`. <!-- agent: basic-engineer.fast, depends_on: [4.1], touches: [] -->

> Coordination note: rebase/schedule after the in-flight `gh-21-polished-loop-form` change archives — it owns these files.

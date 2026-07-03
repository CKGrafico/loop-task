## 1. Shared paste utility

- [ ] 1.1 Extract `sanitizePaste` from `CommandInput.tsx` into `src/tui/utils/paste.ts`; re-export from CommandInput for existing tests. <!-- touches: src/tui/utils/paste.ts, src/tui/components/CommandInput.tsx -->
- [ ] 1.2 In the form text-input path (`FocusableInput` / form field handlers), treat multi-char printable input and bracketed-paste chunks as a paste: sanitize and insert whole. <!-- touches: src/tui/components/FocusableInput.tsx, src/tui/components/CreateForm.tsx -->
- [ ] 1.3 Test: pasting `npm run build && echo done` into the command field yields the full string. <!-- touches: tests/tui-components.test.tsx -->

## 2. Prefill on edit

- [ ] 2.1 When opening the edit form for a loop with `taskId`, resolve the task name and prefill the task selector display (`<name> (<short id>)`); an untouched selector preserves the binding on save. <!-- touches: src/tui/components/CreateForm.tsx -->
- [ ] 2.2 Test: edit + immediate save leaves `taskId` unchanged. <!-- touches: tests/tui-components.test.tsx -->

## 3. Select affordance

- [ ] 3.1 Render enumerated fields (task mode, run-immediately, project) as `‹ value ›` with focused styling consistent with bordered inputs and a `←/→ change` hint. <!-- touches: src/tui/components/CreateForm.tsx, src/i18n/en.json -->

## 4. Verification

- [ ] 4.1 Manual ttyd pass: edit `sds`-like loop → task shown; paste a full command into a field; toggle a select with arrows. <!-- touches: [] -->
- [ ] 4.2 Run `npx tsc --noEmit` -> `pnpm lint` -> `pnpm test`. <!-- touches: [] -->

> Coordination note: rebase/schedule after the in-flight `gh-21-polished-loop-create-edit-form` change archives — it owns these files.

## 1. Foundation

- [x] 1.1 Add `SEARCH_SELECT_HEIGHT = 6` to `src/config/constants.ts` <!-- agent: development-engineer, depends_on: [], touches: src/config/constants.ts -->
- [x] 1.2 Add i18n key `board.searchSelectPlaceholder` to `src/i18n/en.json` <!-- agent: development-engineer, depends_on: [], touches: src/i18n/en.json -->

## 2. SearchSelect Component

- [x] 2.1 Create `src/board/components/SearchSelect.tsx`: props interface (options, value, onChange, focused, placeholder, height), filter input, filtered list rendering, current selection indicator <!-- agent: development-engineer, depends_on: [1.1, 1.2], touches: src/board/components/SearchSelect.tsx -->
- [x] 2.2 Implement internal keyboard handling in SearchSelect: typing filters, up/down navigates filtered list (wrapping), Enter selects, Backspace deletes filter char, Escape clears filter, all handled keys call `key.preventDefault()` + `key.stopPropagation()`, Tab is NOT handled (propagates to parent) <!-- agent: development-engineer, depends_on: [2.1], touches: src/board/components/SearchSelect.tsx -->
- [x] 2.3 Implement filter logic: case-insensitive substring match on option name and value <!-- agent: development-engineer, depends_on: [2.1], touches: src/board/components/SearchSelect.tsx -->

## 3. Integrate SearchSelect in TaskForm

- [x] 3.1 Replace the OpenTUI `<select>` in `TaskForm.tsx` (onSuccessTaskId field) with `<SearchSelect>` <!-- agent: development-engineer, depends_on: [2.3], touches: src/board/components/TaskForm.tsx -->
- [x] 3.2 Replace the OpenTUI `<select>` in `TaskForm.tsx` (onFailureTaskId field) with `<SearchSelect>` <!-- agent: development-engineer, depends_on: [2.3], touches: src/board/components/TaskForm.tsx -->
- [x] 3.3 Remove the select-specific up/down cycling from TaskForm's `useKeyboard` handler (up/down should only move focusIndex for non-select fields) <!-- agent: development-engineer, depends_on: [3.1, 3.2], touches: src/board/components/TaskForm.tsx -->

## 4. Integrate SearchSelect in CreateForm

- [x] 4.1 Replace the hand-rolled project pill row in `CreateForm.tsx` with `<SearchSelect>` <!-- agent: development-engineer, depends_on: [2.3], touches: src/board/components/CreateForm.tsx -->
- [x] 4.2 Remove the project-specific up/down cycling from CreateForm's `useKeyboard` handler <!-- agent: development-engineer, depends_on: [4.1], touches: src/board/components/CreateForm.tsx -->

## 5. Verification

- [x] 5.1 Run `rtk npx tsc --noEmit` -> `rtk npm run lint` -> `rtk npm run test` -> `rtk npm run build` <!-- agent: development-engineer, depends_on: [3.3, 4.2], touches: [] -->

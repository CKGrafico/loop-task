## 1. Reusable Focus Components

- [ ] 1.1 Create `src/tui/components/FocusableButton.tsx`: bordered button with useFocus() + useInput({ isActive: isFocused }) for Enter, visual focus indicator (accent border + active bg) <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/FocusableButton.tsx -->
- [ ] 1.2 Create `src/tui/components/FocusableList.tsx`: selectable list with useFocus() + useInput({ isActive }) for up/down/j/k with wrapping + Enter to select. Pattern from ink-select-input: accept items, renderItem, onSelect, selectedIndex, isFocused, limit. Selected item gets bg.active background. <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/FocusableList.tsx -->
- [ ] 1.3 Create `src/tui/components/FocusableInput.tsx`: text input with useFocus() + ink-text-input TextInput with focus={isFocused} + showCursor. Border accent when focused. <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/FocusableInput.tsx -->
- [ ] 1.4 Create `src/tui/components/FocusableSearchSelect.tsx`: filterable dropdown with useFocus() + useInput({ isActive }) for typing/up/down/enter/escape/backspace. No stale closures (Ink useInput is fresh). Accepts options, value, onChange, isFocused, placeholder. <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/FocusableSearchSelect.tsx -->
- [ ] 1.5 Create `src/tui/components/Modal.tsx`: overlay container with position="absolute", borderStyle="round", borderColor=accent.focus, backgroundColor=bg.elevated. useInput for Escape to close. <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/Modal.tsx -->

## 2. Refactor Header + FilterBar + Footer

- [ ] 2.1 Refactor `src/tui/components/Header.tsx` to use FocusableButton for all 3 header buttons. Each button calls useFocus() internally. Pass focusedButton prop only if parent needs to show focus (optional). <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: src/tui/components/Header.tsx -->
- [ ] 2.2 Refactor `src/tui/components/FilterBar.tsx` to use FocusableButton for filter badges + FocusableInput for search box. <!-- agent: frontend-engineer.build, depends_on: [1.1, 1.3], touches: src/tui/components/FilterBar.tsx -->
- [ ] 2.3 Update `src/tui/components/Footer.tsx` to show current focus hint (which panel is focused) in the footer hints. <!-- agent: frontend-engineer.fast, depends_on: [2.1, 2.2], touches: src/tui/components/Footer.tsx -->

## 3. Refactor Board View Components

- [ ] 3.1 Refactor `src/tui/components/Navigator.tsx` to use FocusableList. Remove internal useInput, rely on FocusableList's built-in up/down/enter handling. Items are loop metadata rows. <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: src/tui/components/Navigator.tsx -->
- [ ] 3.2 Refactor `src/tui/components/RunHistory.tsx` to use FocusableList. Remove internal useInput. Items are run records. <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: src/tui/components/RunHistory.tsx -->
- [ ] 3.3 Refactor `src/tui/components/ActionButtons.tsx` to use FocusableButton for each action button. Remove internal useInput. Each action button is its own focusable element. <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: src/tui/components/ActionButtons.tsx -->
- [ ] 3.4 Remove old `src/tui/components/SearchSelect.tsx` (replaced by FocusableSearchSelect). Update any imports. <!-- agent: frontend-engineer.fast, depends_on: [1.4, 3.5, 3.6], touches: src/tui/components/SearchSelect.tsx -->

## 4. Refactor Task View Components

- [ ] 4.1 Refactor `src/tui/components/TaskBrowser.tsx` (TaskNavigator, TaskActionButtons) to use FocusableList and FocusableButton. <!-- agent: frontend-engineer.build, depends_on: [1.1, 1.2], touches: src/tui/components/TaskBrowser.tsx -->
- [ ] 4.2 Refactor `src/tui/components/TaskForm.tsx` to use FocusableInput for text fields + FocusableSearchSelect for chain selectors. Remove internal focus index state, use useFocus() per field. <!-- agent: frontend-engineer.build, depends_on: [1.3, 1.4], touches: src/tui/components/TaskForm.tsx -->
- [ ] 4.3 Refactor `src/tui/components/TaskFilterBar.tsx` to use FocusableInput. <!-- agent: frontend-engineer.fast, depends_on: [1.3], touches: src/tui/components/TaskFilterBar.tsx -->

## 5. Refactor Other Views

- [ ] 5.1 Refactor `src/tui/components/CreateForm.tsx` to use FocusableInput + FocusableSearchSelect + FocusableButton. Remove internal focus index state. <!-- agent: frontend-engineer.build, depends_on: [1.1, 1.3, 1.4], touches: src/tui/components/CreateForm.tsx -->
- [ ] 5.2 Refactor `src/tui/components/ProjectsPage.tsx` to use FocusableList (projects) + FocusableButton (edit/delete) + Modal (create/edit/delete sub-modals). <!-- agent: frontend-engineer.build, depends_on: [1.1, 1.2, 1.5], touches: src/tui/components/ProjectsPage.tsx -->

## 6. Refactor Modals

- [ ] 6.1 Refactor `src/tui/components/ConfirmModal.tsx` to use Modal + FocusableButton. <!-- agent: frontend-engineer.fast, depends_on: [1.1, 1.5], touches: src/tui/components/ConfirmModal.tsx -->
- [ ] 6.2 Refactor `src/tui/components/LogModal.tsx` to use Modal. Keep existing search/filter/fold logic but wrap in Modal. <!-- agent: frontend-engineer.build, depends_on: [1.5], touches: src/tui/components/LogModal.tsx -->
- [ ] 6.3 Refactor `src/tui/components/HelpModal.tsx` to use Modal. <!-- agent: frontend-engineer.fast, depends_on: [1.5], touches: src/tui/components/HelpModal.tsx -->
- [ ] 6.4 Refactor `src/tui/components/ContextHelpModal.tsx` to use Modal. <!-- agent: frontend-engineer.fast, depends_on: [1.5], touches: src/tui/components/ContextHelpModal.tsx -->

## 7. Refactor App.tsx

- [ ] 7.1 Remove manual panelFocus state from `src/tui/App.tsx`. Remove Tab handling from useInput (Ink handles Tab via useFocusManager). Keep only global shortcuts (Ctrl+C, Escape, h/e/d/c/p/s/f/r/n/t/). <!-- agent: frontend-engineer.build, depends_on: [2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2], touches: src/tui/App.tsx -->

## 8. Verification

- [ ] 8.1 Run `rtk npx tsc --noEmit` -> `rtk npm run build` <!-- agent: frontend-engineer.fast, depends_on: [7.1], touches: [] -->

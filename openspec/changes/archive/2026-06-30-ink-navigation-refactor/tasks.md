## 1. Reusable Focus Components

- [x] 1.1 Create `src/tui/components/FocusableButton.tsx` <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/FocusableButton.tsx -->
- [x] 1.2 Create `src/tui/components/FocusableList.tsx` <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/FocusableList.tsx -->
- [x] 1.3 Create `src/tui/components/FocusableInput.tsx` <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/FocusableInput.tsx -->
- [x] 1.4 Create `src/tui/components/FocusableSearchSelect.tsx` <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/FocusableSearchSelect.tsx -->
- [x] 1.5 Create `src/tui/components/Modal.tsx` <!-- agent: frontend-engineer.build, depends_on: [], touches: src/tui/components/Modal.tsx -->

## 2. Refactor Header + FilterBar + Footer

- [x] 2.1 Refactor `src/tui/components/Header.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: src/tui/components/Header.tsx -->
- [x] 2.2 Refactor `src/tui/components/FilterBar.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.1, 1.3], touches: src/tui/components/FilterBar.tsx -->
- [~] 2.3 Update `src/tui/components/Footer.tsx` (skipped - minor) <!-- agent: frontend-engineer.fast, depends_on: [2.1, 2.2], touches: src/tui/components/Footer.tsx -->

## 3. Refactor Board View Components

- [x] 3.1 Refactor `src/tui/components/Navigator.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: src/tui/components/Navigator.tsx -->
- [x] 3.2 Refactor `src/tui/components/RunHistory.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.2], touches: src/tui/components/RunHistory.tsx -->
- [x] 3.3 Refactor `src/tui/components/ActionButtons.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: src/tui/components/ActionButtons.tsx -->
- [x] 3.4 Remove old `src/tui/components/SearchSelect.tsx` <!-- agent: frontend-engineer.fast, depends_on: [1.4], touches: src/tui/components/SearchSelect.tsx -->

## 4. Refactor Task View Components

- [x] 4.1 Refactor `src/tui/components/TaskBrowser.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.1, 1.2], touches: src/tui/components/TaskBrowser.tsx -->
- [x] 4.2 Refactor `src/tui/components/TaskForm.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.3, 1.4], touches: src/tui/components/TaskForm.tsx -->
- [x] 4.3 Refactor `src/tui/components/TaskFilterBar.tsx` <!-- agent: frontend-engineer.fast, depends_on: [1.3], touches: src/tui/components/TaskFilterBar.tsx -->

## 5. Refactor Other Views

- [x] 5.1 Refactor `src/tui/components/CreateForm.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.1, 1.3, 1.4], touches: src/tui/components/CreateForm.tsx -->
- [x] 5.2 Refactor `src/tui/components/ProjectsPage.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.1, 1.2, 1.5], touches: src/tui/components/ProjectsPage.tsx -->

## 6. Refactor Modals

- [x] 6.1 Refactor `src/tui/components/ConfirmModal.tsx` <!-- agent: frontend-engineer.fast, depends_on: [1.1, 1.5], touches: src/tui/components/ConfirmModal.tsx -->
- [x] 6.2 Refactor `src/tui/components/LogModal.tsx` <!-- agent: frontend-engineer.build, depends_on: [1.5], touches: src/tui/components/LogModal.tsx -->
- [x] 6.3 Refactor `src/tui/components/HelpModal.tsx` <!-- agent: frontend-engineer.fast, depends_on: [1.5], touches: src/tui/components/HelpModal.tsx -->
- [x] 6.4 Refactor `src/tui/components/ContextHelpModal.tsx` <!-- agent: frontend-engineer.fast, depends_on: [1.5], touches: src/tui/components/ContextHelpModal.tsx -->

## 7. Refactor App.tsx

- [x] 7.1 Remove manual panelFocus state from `src/tui/App.tsx`. <!-- agent: frontend-engineer.build, depends_on: [2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2], touches: src/tui/App.tsx -->

## 8. Verification

- [x] 8.1 Run `rtk npx tsc --noEmit` -> `rtk npm run build` <!-- agent: frontend-engineer.fast, depends_on: [7.1], touches: [] -->

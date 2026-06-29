## 1. i18n

- [x] 1.1 Add i18n keys `board.copyCommand` (button label) and `board.toastCopied` (toast message) to `src/i18n/en.json` <!-- agent: development-engineer, depends_on: [], touches: src/i18n/en.json -->

## 2. Copy Button in TaskInspector

- [x] 2.1 Add copy button next to command display in `TaskInspector` in `src/board/components/TaskBrowser.tsx`. Use `copyToClipboard` from `../../shared/clipboard.js`. Add `onCopy` callback prop to trigger toast in parent. <!-- agent: development-engineer, depends_on: [1.1], touches: src/board/components/TaskBrowser.tsx -->

## 3. Copy Button in TaskForm

- [x] 3.1 Add copy button next to command input in `TaskFormRow` in `src/board/components/TaskForm.tsx`. Copy the current command value from the input. <!-- agent: development-engineer, depends_on: [1.1], touches: src/board/components/TaskForm.tsx -->

## 4. Wire toast callbacks

- [x] 4.1 Pass `onCopy` callback from App.tsx to TaskInspector and TaskForm that triggers a toast notification <!-- agent: development-engineer, depends_on: [2.1, 3.1], touches: src/board/App.tsx -->

## 5. Verification

- [x] 5.1 Run `rtk npx tsc --noEmit` -> `rtk npm run build` <!-- agent: development-engineer, depends_on: [4.1], touches: [] -->

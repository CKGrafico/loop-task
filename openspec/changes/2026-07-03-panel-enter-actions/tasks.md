## 1. Extract contextual action in App

- [x] 1.1 In `src/tui/App.tsx`, extract the Ctrl+Enter handler body (the `ctrlEnterHandlers` dictionary dispatch) into a `triggerContextualAction()` callback that reads `activeTab`, `focusedPanel`, and the current selection. <!-- touches: src/tui/App.tsx -->
- [x] 1.2 Call `triggerContextualAction()` from the existing Ctrl+Enter branch (no behavior change). <!-- touches: src/tui/App.tsx -->

## 2. Wire plain Enter through CommandInput

- [x] 2.1 Add an optional `onPanelAction?: () => void` prop to `CommandInput` and thread it to `CommandMode`. <!-- touches: src/tui/components/CommandInput.tsx -->
- [x] 2.2 In `CommandMode`'s `key.return` handler, when the dropdown is not actionable (closed or no filtered options) AND `state.inputValue` is empty, call `onPanelAction?.()` and return. Preserve existing command-submit behavior otherwise. <!-- touches: src/tui/components/CommandInput.tsx -->
- [x] 2.3 Pass `onPanelAction={triggerContextualAction}` from `App` to `CommandInput`. <!-- touches: src/tui/App.tsx -->

## 3. Hint + i18n

- [x] 3.1 Update the command-mode hint bar to show `enter edit/logs` alongside the existing hints; add/adjust i18n keys in `src/i18n/en.json`. <!-- touches: src/tui/components/CommandInput.tsx, src/i18n/en.json -->

## 4. Verification

- [x] 4.1 Add a `tui-components` test asserting that Enter with an empty command bar invokes `onPanelAction`, and that Enter with a typed value / open dropdown does not. <!-- touches: tests/tui-components.test.tsx -->
- [x] 4.2 Run `npx tsc --noEmit` -> `pnpm lint` -> `pnpm test`. <!-- touches: [] -->

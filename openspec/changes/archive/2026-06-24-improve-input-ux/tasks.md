# Tasks

## 1. Remove left/right field navigation from CreateForm
- [ ] 1.1 Remove the left/right arrow handler block (lines 115-140) from CreateForm useKeyboard <!-- agent: development-engineer, depends_on: none, touches: src/board/components/CreateForm.tsx -->
- [ ] 1.2 Keep Tab/Shift+Tab but add wraparound (Save -> Cancel -> field 0) <!-- agent: development-engineer, depends_on: 1.1, touches: src/board/components/CreateForm.tsx -->
- [ ] 1.3 Keep Enter/Space activation for buttons and toggles intact <!-- agent: development-engineer, depends_on: 1.1, touches: src/board/components/CreateForm.tsx -->

## 2. Remove left/right field navigation from TaskForm
- [ ] 2.1 Remove the left/right arrow handler block from TaskForm useKeyboard <!-- agent: development-engineer, depends_on: none, touches: src/board/components/TaskForm.tsx -->
- [ ] 2.2 Keep Tab/Shift+Tab but add wraparound <!-- agent: development-engineer, depends_on: 2.1, touches: src/board/components/TaskForm.tsx -->

## 3. Replace board search fake input with native input
- [ ] 3.1 Create a SearchInput component using native `<input>` with overlay positioning <!-- agent: development-engineer, depends_on: none, touches: src/board/components/SearchInput.tsx -->
- [ ] 3.2 Wire board search to use the native SearchInput instead of character-append state machine <!-- agent: development-engineer, depends_on: 3.1, touches: src/board/App.tsx, src/board/components/FilterBar.tsx, src/board/hooks/useBoardKeybindings.ts -->

## 4. Replace task-list search fake input with native input
- [ ] 4.1 Wire task-list search to use the SearchInput component <!-- agent: development-engineer, depends_on: 3.1, touches: src/board/App.tsx, src/board/components/TaskFilterBar.tsx, src/board/hooks/useTaskKeybindings.ts -->

## 5. Verify
- [ ] 5.1 Run typecheck and fix any errors <!-- agent: development-engineer, depends_on: 1.2,2.2,3.2,4.1, touches: -->

# Tasks

## 1. Guard useBoardKeybindings left/right behind view check
- [ ] 1.1 Move the left/right panel navigation block AFTER the view guard so it only runs when view === "board" <!-- agent: development-engineer, depends_on: none, touches: src/board/hooks/useBoardKeybindings.ts -->

## 2. Add Tab/Shift+Tab panel navigation to board view
- [ ] 2.1 Add Tab/Shift+Tab handler to useBoardKeybindings that moves focusedPanel left/right (same as left/right does today) <!-- agent: development-engineer, depends_on: 1.1, touches: src/board/hooks/useBoardKeybindings.ts -->

## 3. Add up/down field navigation to CreateForm
- [ ] 3.1 Add up/down handler to CreateForm useKeyboard that moves focusIndex up/down between fields <!-- agent: development-engineer, depends_on: none, touches: src/board/components/CreateForm.tsx -->

## 4. Add up/down field navigation to TaskForm
- [ ] 4.1 Add up/down handler to TaskForm useKeyboard that moves focusIndex up/down between fields <!-- agent: development-engineer, depends_on: none, touches: src/board/components/TaskForm.tsx -->

## 5. Add key.preventDefault() to all useKeyboard handlers
- [ ] 5.1 Add key.preventDefault() calls in useBoardKeybindings for all handled keys <!-- agent: development-engineer, depends_on: 1.1,2.1, touches: src/board/hooks/useBoardKeybindings.ts -->
- [ ] 5.2 Add key.preventDefault() calls in useTaskKeybindings for all handled keys <!-- agent: development-engineer, depends_on: none, touches: src/board/hooks/useTaskKeybindings.ts -->
- [ ] 5.3 Add key.preventDefault() calls in CreateForm useKeyboard for all handled keys <!-- agent: development-engineer, depends_on: 3.1, touches: src/board/components/CreateForm.tsx -->
- [ ] 5.4 Add key.preventDefault() calls in TaskForm useKeyboard for all handled keys <!-- agent: development-engineer, depends_on: 4.1, touches: src/board/components/TaskForm.tsx -->

## 6. Add ProjectsPage Tab navigation
- [ ] 6.1 Add Tab/Shift+Tab to ProjectsPage to toggle between list and actions panels <!-- agent: development-engineer, depends_on: none, touches: src/board/components/ProjectsPage.tsx -->

## 7. Verify
- [ ] 7.1 Run typecheck and fix any errors <!-- agent: development-engineer, depends_on: 1.1,2.1,3.1,4.1,5.1,5.2,5.3,5.4,6.1, touches: -->

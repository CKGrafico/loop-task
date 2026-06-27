## 1. useTabNav Hook

- [x] 1.1 Create `src/board/hooks/useTabNav.tsx`: generic `useTabNav<T>(items: T[], options?: { initialIndex?: number; onCycleOut?: (dir: "left" | "right") => void })` returning `{ focusIndex, setFocusIndex, focusedItem, isFocused }`. Registers `useKeyboard` for Tab/Shift+Tab with `key.preventDefault()`. `useEffect` to clamp `focusIndex` when `items.length` changes. Wraps by default; calls `onCycleOut` when provided. <!-- agent: development-engineer, depends_on: [], touches: src/board/hooks/useTabNav.ts -->

## 2. Refactor TaskForm

- [x] 2.1 Replace manual `focusIndex` state + `useKeyboard` Tab/arrow handler in `TaskForm.tsx` with `useTabNav`. Items: `[...taskFields, "save", "cancel"]`. Remove the up/down/left/right handler for field navigation (arrows are now blocked, SearchSelect handles its own). Keep Enter handler for save/cancel. <!-- agent: development-engineer, depends_on: [1.1], touches: src/board/components/TaskForm.tsx -->

## 3. Refactor CreateForm

- [x] 3.1 Replace manual `focusIndex` state + `useKeyboard` Tab/arrow handler in `CreateForm.tsx` with `useTabNav`. Items: `[...filteredFields, "save", "cancel"]` (dynamic). Remove the project-specific up/down early-return (SearchSelect handles it). Keep Enter/Space handler for taskMode/runNow/save/cancel/chooseTask. <!-- agent: development-engineer, depends_on: [1.1], touches: src/board/components/CreateForm.tsx -->

## 4. Refactor Project Modals

- [x] 4.1 Replace manual `focusField` state + `useKeyboard` Tab handler in `EditProjectModal.tsx` with `useTabNav`. Items: `["name", "color", "save", "cancel"]`. Remove the manual Tab handler. Keep left/right handler for color picker. <!-- agent: development-engineer, depends_on: [1.1], touches: src/board/components/EditProjectModal.tsx -->
- [x] 4.2 Replace manual `focusField` state + `useKeyboard` Tab handler in `CreateProjectModal.tsx` with `useTabNav`. Same items. Same pattern. <!-- agent: development-engineer, depends_on: [1.1], touches: src/board/components/CreateProjectModal.tsx -->

## 5. Refactor ProjectsPage

- [x] 5.1 Replace manual `focusedPanel` + `useKeyboard` Tab handler in `ProjectsPage.tsx` with `useTabNav`. Items: `["list", "edit", "delete"]` with `onCycleOut` calling `onEnterHeader`. Keep up/down handler for list navigation, Enter for activate, `headerFocused` early return. <!-- agent: development-engineer, depends_on: [1.1], touches: src/board/components/ProjectsPage.tsx -->

## 6. Verification

- [x] 6.1 Run `rtk npx tsc --noEmit` -> `rtk npm run lint` -> `rtk npm run test` -> `rtk npm run build` <!-- agent: development-engineer, depends_on: [2.1, 3.1, 4.1, 4.2, 5.1], touches: [] -->

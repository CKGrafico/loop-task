# Tasks

- [x] 1.1 Create `useClipboardWatcher` hook in `src/tui/hooks/useClipboardWatcher.ts` that polls `readFromClipboard()` on a 2s interval, tracks last known value (null on init = no false positive), calls `onChange(text)` when it changes, and cleans up on unmount <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/hooks/useClipboardWatcher.ts] -->
- [x] 1.2 Add `suppressNextClipboardToast` flag to `src/shared/clipboard.ts` that `copyToClipboard()` sets before writing, so the watcher can skip the next change <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/shared/clipboard.ts] -->
- [x] 2.1 Add i18n key `board.toastTextCopied` with value "Text Copied" in `src/i18n/en.json` <!-- agent: frontend-engineer.fast, depends_on: [], touches: [src/i18n/en.json] -->
- [x] 3.1 Wire `useClipboardWatcher` in `App.tsx` to push a toast when clipboard changes externally (respects suppress flag) <!-- agent: frontend-engineer.build, depends_on: [1.1, 1.2, 2.1], touches: [src/tui/App.tsx] -->
- [x] 4.1 Run typecheck and fix any errors <!-- agent: basic-engineer.fast, depends_on: [1.1, 1.2, 2.1, 3.1], touches: [] -->
- [x] 5.1 Add Ctrl+Shift=C shortcut: guard Ctrl+C quit with `!key.shift`, add `copy` command handler that shows toast, add to global shortcuts with shift guard <!-- agent: frontend-engineer.build, depends_on: [3.1], touches: [src/tui/App.tsx] -->
- [x] 5.2 Add `cmd.copy` i18n key, add copy command to `globalCommands()` in `commands.ts` with `ctrl+shift+c` shortcut, show shortcut in CommandInput hint bar <!-- agent: frontend-engineer.fast, depends_on: [5.1], touches: [src/i18n/en.json, src/tui/commands.ts, src/tui/components/CommandInput.tsx] -->

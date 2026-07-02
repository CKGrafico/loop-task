# Tasks

- [x] 1.1 Remove Shift+C handler from App.tsx global useInput, remove the `copy` command handler from commandHandlers dictionary, remove `readFromClipboard`/`copyToClipboard` imports if no longer used <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/tui/App.tsx] -->
- [x] 1.2 Add contextual `c` key copy handler in App.tsx board view: on loops tab copies selected loop's full command, on tasks tab copies selected task's command, on projects tab copies project name, shows "Text Copied" toast, no-op when nothing selected <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: [src/tui/App.tsx] -->
- [x] 1.3 Remove `cmd.copy` command from `globalCommands()` in commands.ts and remove `cmd.copy` i18n key from en.json, update CommandInput hint bar to show `c` key "copy" hint instead of `shift+c` <!-- agent: frontend-engineer.fast, depends_on: [1.1], touches: [src/tui/commands.ts, src/i18n/en.json, src/tui/components/CommandInput.tsx] -->
- [x] 2.1 Run typecheck and fix any errors <!-- agent: basic-engineer.fast, depends_on: [1.1, 1.2, 1.3], touches: [] -->

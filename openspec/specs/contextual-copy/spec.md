# contextual-copy Specification

## Purpose
TBD - created by archiving change contextual-smart-copy. Update Purpose after archive.
## Requirements
### Requirement: Contextual copy with `c` key

Pressing `c` (without ctrl, shift, or meta) on the board view copies the most useful text for the currently selected entity to the system clipboard and shows a "Text Copied" toast.

#### Scenario: Copy loop command

- **WHEN** on the loops tab with a loop selected and the user presses `c`
- **THEN** the loop's full command (`command commandArgs` joined) is copied to the clipboard
- **AND** a "Text Copied" toast is shown

#### Scenario: Copy task command

- **WHEN** on the tasks tab with a task selected and the user presses `c`
- **THEN** the task's full command is copied to the clipboard
- **AND** a "Text Copied" toast is shown

#### Scenario: Copy project name

- **WHEN** on the projects tab with a project selected and the user presses `c`
- **THEN** the project name is copied to the clipboard
- **AND** a "Text Copied" toast is shown

#### Scenario: No selection

- **WHEN** no entity is selected and the user presses `c`
- **THEN** nothing is copied and no toast is shown

### Requirement: Remove Shift+C and clipboard watcher

The Shift+C handler, `useClipboardWatcher` hook, `isClipboardToastSuppressed` flag, and the `copy` global command are removed. The only copy mechanism is the contextual `c` key.

### Requirement: Guard `c` key in CommandInput

The CommandInput's `useInput` hooks in command, confirm, and search modes must not insert `c` when it is handled as a copy shortcut on the board view. The `c` key is only intercepted as copy when on the board view with a selected entity.


# copy-command Specification

## Purpose
Provide clipboard copy for command and working directory values in the board edit form.
## Requirements
### Requirement: Copy command to clipboard
The CodeEditor modal SHALL provide a visible Copy button and a Ctrl+Y keyboard shortcut to copy the full command string (including args, as authored in the editor) to the clipboard. The copy action SHALL target the raw multiline command text.

#### Scenario: Copy command via button
- **WHEN** the user clicks the Copy button in the CodeEditor modal
- **THEN** the full raw command text (multiline) SHALL be copied to the clipboard

#### Scenario: Copy command via shortcut
- **WHEN** the user presses Ctrl+Y in the CodeEditor modal
- **THEN** the full raw command text (multiline) SHALL be copied to the clipboard

#### Scenario: Copy command from edit form (board)
- **WHEN** the user is in the board edit form and opens the CodeEditor modal for the command field
- **THEN** the Copy button SHALL be available inside the modal, replacing the previous inline copy button on the input field

### Requirement: Copy CWD to clipboard
The edit form SHALL provide a way for the user to copy the working directory path to the clipboard.

#### Scenario: Copy CWD in edit form (board)
- **WHEN** the user hovers or clicks the cwd field in the board edit form
- **THEN** a copy button SHALL appear and clicking it copies the cwd to the clipboard

### Requirement: Copy feedback
After copying, the UI SHALL display brief feedback ("Copied!") to confirm the action.

#### Scenario: Copy confirmation shown
- **WHEN** the user copies a value
- **THEN** a brief "Copied!" indicator SHALL appear for 1-2 seconds


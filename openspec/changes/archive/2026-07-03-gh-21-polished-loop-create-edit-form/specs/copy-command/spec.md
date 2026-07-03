## ADDED Requirements

### Requirement: Copy command to clipboard

The edit form SHALL provide a way for the user to copy the full command string (including args) to the clipboard.

#### Scenario: Copy command in edit form (board)

- **WHEN** the user hovers or clicks the command field in the board edit form
- **THEN** a copy button SHALL appear and clicking it copies the full command to the clipboard

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

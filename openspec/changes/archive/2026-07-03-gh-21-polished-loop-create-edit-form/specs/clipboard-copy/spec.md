## MODIFIED Requirements

### Requirement: Copy command field to clipboard

In the board CreateForm (edit mode), when the user hovers over the command field, a copy button SHALL appear. Clicking it copies the full command string (including args) to the clipboard via `copyToClipboard()`. A toast SHALL confirm the action.

#### Scenario: Copy command in board edit form

- **WHEN** user hovers over the command field in the board edit form
- **THEN** a copy button appears and clicking it copies the command to the clipboard with a "Copied!" toast

### Requirement: Copy CWD field to clipboard

In the board CreateForm (edit mode), when the user hovers over the cwd field, a copy button SHALL appear. Clicking it copies the working directory to the clipboard.

#### Scenario: Copy CWD in board edit form

- **WHEN** user hovers over the cwd field in the board edit form
- **THEN** a copy button appears and clicking it copies the cwd to the clipboard with a "Copied!" toast

### Requirement: Command field shows merged command+args

In the board CreateForm (edit mode), the command field SHALL display the merged `command` + `commandArgs` as a single string. When saving, the form SHALL re-parse the merged string via `parseCommandLine()`.

#### Scenario: Edit shows merged command

- **WHEN** user edits a loop with command="npm" and commandArgs=["test", "--watch"]
- **THEN** the command field shows "npm test --watch"

#### Scenario: Save re-parses merged command

- **WHEN** user edits the command field to "npm run build -- --watch" and saves
- **THEN** parseCommandLine splits it into command="npm" and commandArgs=["run", "build", "--", "--watch"]

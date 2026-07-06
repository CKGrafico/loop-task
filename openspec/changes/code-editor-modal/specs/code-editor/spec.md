## ADDED Requirements

### Requirement: CodeEditor modal opens from command field
The system SHALL provide a full-screen modal code editor that opens when the user activates the command field in loop or task creation/editing forms, in both the Ink 7 (tui) and OpenTUI board layers.

#### Scenario: Open editor from Ink wizard
- **WHEN** the user is on the command step of a WizardForm and presses Enter on the preview field
- **THEN** the CodeEditor modal opens with the current command text loaded and cursor at the end

#### Scenario: Open editor from board form
- **WHEN** the user clicks or presses Enter on the command preview field in a board form
- **THEN** the CodeEditor modal opens with the current command text loaded and cursor at the end

#### Scenario: Open editor with empty command
- **WHEN** the command field is empty and the user opens the editor
- **THEN** the modal opens with a single empty line and cursor at position 0,0

### Requirement: CodeEditor modal supports multiline editing
The CodeEditor modal SHALL support multiline text editing with line numbers, a visible cursor, and vertical scrolling.

#### Scenario: Type and navigate multiline text
- **WHEN** the user types text, presses Enter for new lines, and uses arrow keys to navigate
- **THEN** line numbers SHALL be displayed, the cursor SHALL be visible at the correct position, and lines beyond the visible area SHALL scroll into view

#### Scenario: Edit existing multiline command
- **WHEN** the modal opens with an existing multiline commandRaw
- **THEN** all lines SHALL be displayed with line numbers and the cursor positioned at the end of the last line

### Requirement: CodeEditor modal has visible action buttons
The CodeEditor modal SHALL display visible Copy, Paste, and Clear buttons that perform clipboard and text operations without requiring keyboard shortcuts.

#### Scenario: Copy full command
- **WHEN** the user clicks the Copy button (or presses Ctrl+Y)
- **THEN** the full command text SHALL be copied to the clipboard and brief visual feedback SHALL confirm the copy

#### Scenario: Paste from clipboard
- **WHEN** the user clicks the Paste button (or presses Ctrl+V)
- **THEN** the clipboard contents SHALL be inserted at the cursor position, sanitized to remove control characters

#### Scenario: Clear all text
- **WHEN** the user clicks the Clear button
- **THEN** all text in the editor SHALL be removed, leaving a single empty line, and the cursor SHALL reset to position 0,0

### Requirement: CodeEditor modal has syntax highlighting
The CodeEditor modal SHALL apply syntax highlighting to command tokens using a lightweight inline tokenizer with no external dependencies.

#### Scenario: Flags are highlighted
- **WHEN** a line contains tokens starting with `--` or `-` followed by a flag name
- **THEN** those tokens SHALL be rendered in a distinct color (flag color)

#### Scenario: Quoted strings are highlighted
- **WHEN** a line contains text within double or single quotes
- **THEN** the quoted content (including quotes) SHALL be rendered in a distinct color (string color)

#### Scenario: Operators are highlighted
- **WHEN** a line contains shell operators (`|`, `&&`, `||`, `;`, `>`, `>>`, `<`)
- **WHEN** those tokens SHALL be rendered in a distinct color (operator color)

### Requirement: CodeEditor modal has undo/redo
The CodeEditor modal SHALL support undo and redo operations via a history stack with a configurable maximum size.

#### Scenario: Undo a change
- **WHEN** the user presses Ctrl+Z after making a change (typing, paste, clear, backspace)
- **THEN** the editor SHALL revert to the previous state in the history stack

#### Scenario: Redo an undone change
- **WHEN** the user presses Ctrl+Shift+Z (or Ctrl+Y on Windows) after undoing
- **THEN** the editor SHALL re-apply the undone change

#### Scenario: History cap
- **WHEN** the history stack reaches the configured maximum size (CODE_EDITOR_UNDO_LIMIT)
- **THEN** the oldest entry SHALL be removed when a new entry is pushed

### Requirement: CodeEditor modal shows live single-line preview
The CodeEditor modal SHALL display a live preview of the joined single-line command at the bottom of the modal, updating as the user types.

#### Scenario: Preview updates on edit
- **WHEN** the user types, pastes, or deletes text in the editor
- **THEN** the footer SHALL display the joined single-line result (truncated to modal width) prefixed with a label indicating what will execute

#### Scenario: Preview shows backslash continuation
- **WHEN** a line ends with `\` (backslash)
- **THEN** the preview SHALL join that line to the next with no space, consuming the backslash

### Requirement: CodeEditor preview field in forms
The system SHALL replace inline command editors with a compact preview field that displays a snippet of the command and opens the CodeEditor modal on activation.

#### Scenario: Preview shows command snippet
- **WHEN** the command field has text and is not active
- **THEN** the preview field SHALL display the first 1-2 lines of the command text, truncated if longer

#### Scenario: Preview shows hint when empty
- **WHEN** the command field is empty and is not active
- **THEN** the preview field SHALL display a placeholder hint

#### Scenario: Preview shows open hint when active
- **WHEN** the command preview field is the active field in the form
- **THEN** a hint SHALL appear indicating the user can press Enter to open the editor

### Requirement: Backslash-continuation line joining
The system SHALL join multiline command text into a single line using backslash-continuation semantics before parsing into command and args.

#### Scenario: Lines without backslash join with space
- **WHEN** a line does not end with `\`
- **THEN** it SHALL join to the next line with a single space separator

#### Scenario: Lines with trailing backslash join without space
- **WHEN** a line ends with `\`
- **THEN** the backslash SHALL be removed and the line SHALL join to the next line with no space separator

#### Scenario: Empty lines are dropped
- **WHEN** a line is empty or contains only whitespace
- **THEN** it SHALL be omitted from the joined result

#### Scenario: Quoted newlines preserved
- **WHEN** a newline appears inside a quoted string (not at end of line with backslash)
- **THEN** the newline SHALL be preserved as a literal newline in the joined result, and parseCommandLine SHALL handle it during tokenization

### Requirement: CodeEditor stores raw multiline and executes joined
The system SHALL store the raw multiline text in commandRaw and execute using the joined single-line command and parsed args.

#### Scenario: Save from modal
- **WHEN** the user saves (Ctrl+S or clicks Save) in the CodeEditor modal
- **THEN** the raw multiline text SHALL be stored in commandRaw, and joinCommandLines SHALL produce the single-line command, which parseCommandLine SHALL split into command and commandArgs

#### Scenario: Round-trip edit
- **WHEN** a loop or task with existing commandRaw is edited
- **THEN** the modal SHALL load the stored commandRaw verbatim, preserving the user's original line breaks

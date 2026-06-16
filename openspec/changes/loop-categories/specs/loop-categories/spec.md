## ADDED Requirements

### Requirement: Categories field on LoopOptions and LoopMeta
Both `LoopOptions` and `LoopMeta` SHALL include a `categories: string[]` field. When absent in persisted data, it SHALL default to an empty array `[]`.

#### Scenario: New loop created with categories
- **WHEN** a loop is created with `categories: ["deploy", "staging"]`
- **THEN** the persisted `LoopMeta` SHALL contain `categories: ["deploy", "staging"]`

#### Scenario: Existing loop file without categories field
- **WHEN** a loop JSON file has no `categories` field
- **THEN** the loaded `LoopMeta` SHALL have `categories: []`

### Requirement: List categories IPC operation
The daemon SHALL support a `list-categories` IPC request that returns all unique category names across all loops, sorted alphabetically.

#### Scenario: Multiple loops with overlapping categories
- **WHEN** loops have categories `["deploy"]`, `["deploy", "staging"]`, `["monitoring"]`
- **THEN** `list-categories` SHALL return `["deploy", "monitoring", "staging"]`

#### Scenario: No loops have categories
- **WHEN** all loops have empty `categories: []`
- **THEN** `list-categories` SHALL return `[]`

### Requirement: Rename category IPC operation
The daemon SHALL support a `rename-category` IPC request with `oldName` and `newName` fields. It SHALL replace all occurrences of `oldName` across all loops' categories with `newName`.

#### Scenario: Rename a category used by multiple loops
- **WHEN** `rename-category` is called with `oldName: "staging"` and `newName: "qa"` and two loops have `"staging"` in their categories
- **THEN** both loops SHALL have `"staging"` replaced with `"qa"` and changes SHALL be persisted

#### Scenario: Rename to an existing category name
- **WHEN** `rename-category` merges `"staging"` into `"deploy"` and a loop already has both
- **THEN** the loop SHALL end up with a single `"deploy"` entry (no duplicates)

### Requirement: Delete category IPC operation
The daemon SHALL support a `delete-category` IPC request with a `name` field. It SHALL remove that category from all loops' categories arrays.

#### Scenario: Delete a category used by multiple loops
- **WHEN** `delete-category` is called with `name: "staging"` and two loops have `"staging"` in their categories
- **THEN** both loops SHALL have `"staging"` removed and changes SHALL be persisted

### Requirement: Category filter in FilterBar
The FilterBar SHALL display a category filter badge showing the active category filter (or "all"). The user SHALL be able to cycle through available categories via the `c` key or mouse click.

#### Scenario: Filter by category
- **WHEN** the user cycles the category filter to "deploy"
- **THEN** only loops with "deploy" in their `categories` array SHALL be visible

#### Scenario: Category filter set to "all"
- **WHEN** the category filter is "all"
- **THEN** all loops SHALL be visible regardless of categories

### Requirement: Category sort mode
The `SortMode` type SHALL include a `"category"` option. When sorting by category, loops SHALL be sorted by their first category name alphabetically, with uncategorized loops last.

#### Scenario: Sort by category
- **WHEN** sort mode is "category" and loops have categories `["deploy"]`, `[]`, `["monitoring"]`
- **THEN** loops SHALL appear in order: deploy, monitoring, then uncategorized

### Requirement: Category badges in Navigator
Navigator rows SHALL display category badges before the description column. Badges SHALL be truncated to fit the available width.

#### Scenario: Loop with two categories
- **WHEN** a loop has categories `["deploy", "staging"]`
- **THEN** the Navigator row SHALL display `[deploy,staging]` before the description text

#### Scenario: Loop with no categories
- **WHEN** a loop has `categories: []`
- **THEN** the Navigator row SHALL display no category badges

### Requirement: Categories field in CreateForm
The CreateForm SHALL include a `categories` input field accepting comma-separated category names. On submit, the value SHALL be parsed into a `string[]` by splitting on commas, trimming whitespace, and removing empty strings and duplicates.

#### Scenario: Create loop with categories
- **WHEN** the user enters `"deploy, staging, deploy"` in the categories field
- **THEN** the loop SHALL be created with `categories: ["deploy", "staging"]`

#### Scenario: Create loop with empty categories
- **WHEN** the user leaves the categories field blank
- **THEN** the loop SHALL be created with `categories: []`

### Requirement: Categories in DetailView
DetailView SHALL display the categories for the selected loop.

#### Scenario: Loop with categories in detail view
- **WHEN** the selected loop has `categories: ["deploy", "staging"]`
- **THEN** DetailView SHALL display the categories as a comma-separated list

### Requirement: Categories in text search
The text search filter SHALL include category names in its search haystack.

#### Scenario: Search for a category name
- **WHEN** the user types "deploy" in the search box and a loop has `"deploy"` in its categories
- **THEN** that loop SHALL appear in the filtered results

### Requirement: Categories page
The board SHALL include a categories page accessible via a keyboard shortcut (`g`). The page SHALL list all categories with their loop counts and provide actions to rename and delete categories.

#### Scenario: Navigate to categories page
- **WHEN** the user presses `g` on the board view
- **THEN** the categories page SHALL be displayed

#### Scenario: Rename a category from categories page
- **WHEN** the user selects a category and chooses rename
- **THEN** an input SHALL appear for the new name and the daemon SHALL rename the category across all loops

#### Scenario: Delete a category from categories page
- **WHEN** the user selects a category and chooses delete
- **THEN** a confirmation SHALL appear and on confirm the daemon SHALL remove the category from all loops

#### Scenario: Return to board from categories page
- **WHEN** the user presses Escape on the categories page
- **THEN** the board SHALL return to the previous view

## ADDED Requirements

### Requirement: Atomic store writes
The `import` command SHALL write all three store files (`loops.json`, `tasks.json`, `projects.json`) using `writeFileAtomic` (write to temp file, then `rename`). No partial or half-written files SHALL be visible to the daemon.

#### Scenario: Successful write
- **WHEN** validation passes and all three writes succeed
- **THEN** each store file is written atomically, the daemon detects the changes via FileWatcher, and reconcile/reload occurs without restart

### Requirement: Backup and rollback on partial failure
Before writing any store file, the `import` command SHALL create backup copies (`.bak`) of the existing store files. If writing any store file fails (e.g. permissions error), the command SHALL restore all previously-written stores from their backups, exit with a non-zero code, and print a diagnostic message.

#### Scenario: All writes succeed
- **WHEN** all three store files are written successfully
- **THEN** the `.bak` files are deleted, and the command exits with code 0

#### Scenario: Second write fails
- **WHEN** `loops.json` is written successfully but writing `tasks.json` fails with EACCES
- **THEN** `loops.json` is restored from its `.bak` copy, the command exits with code 1, and stderr includes `"Failed to write store: tasks.json"` with the OS error

#### Scenario: No existing store files
- **WHEN** a store file does not exist before import (fresh install)
- **THEN** no backup is created for that file, and on rollback it is deleted if it was already written

### Requirement: Help text documents import as inverse of export
The `import` command description in `--help` SHALL explicitly state it is the inverse of `loop-task export`.

#### Scenario: Help output
- **WHEN** a user runs `loop-task import --help`
- **THEN** the description includes wording that import restores a previously exported state file

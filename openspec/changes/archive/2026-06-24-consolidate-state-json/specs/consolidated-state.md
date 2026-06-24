# Consolidated State Spec

## ADDED Requirements

### Single-file persistence

- **Req**: All loops are persisted to a single `~/.loop-cli/loops.json` file containing a JSON array of `LoopMeta` objects.
- **Req**: All tasks are persisted to a single `~/.loop-cli/tasks.json` file containing a JSON array of `TaskDefinition` objects.
- **Req**: All projects are persisted to a single `~/.loop-cli/projects.json` file containing a JSON array of `Project` objects.
- **Req**: Writes are atomic (write-to-temp + rename).

### Migration

- **Req**: On daemon init, if `loops.json` does not exist but `loops/` directory contains `.json` files, consolidate them into `loops.json`.
- **Req**: On daemon init, if `tasks.json` does not exist but `tasks/` directory contains `.json` files, consolidate them into `tasks.json`.
- **Req**: On project manager init, if `projects.json` does not exist but `projects/` directory contains `.json` files, consolidate them into `projects.json`.
- **Req**: Old individual files are not deleted after migration.

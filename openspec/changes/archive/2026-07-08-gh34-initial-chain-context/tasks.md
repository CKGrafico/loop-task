# Tasks: Initial Context for Chained Tasks

- [x] Add `context?: Record<string, unknown>` to TaskDefinition and LoopOptions
- [x] Seed chainContext with provided context in run-executor.ts
- [x] Add context to LoopCommandOptionsInput and buildLoopOptions
- [x] Add --context/-C CLI flag to new and run commands
- [x] Add HTTP API context validation in route-loops.ts and route-tasks.ts
- [x] Update OpenAPI spec with context property
- [x] Add context step to TaskForm (after onFailure)
- [x] Add context step to loop creation wizard (useCreateSteps)
- [x] Add validate/validationError support to WizardStepConfig
- [x] Add i18n strings for context prompts and errors
- [x] Write tests for initial context seeding and validation
- [x] Verify typecheck, lint, build, and tests pass

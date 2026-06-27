## 1. Types and Constants

- [ ] 1.1 Add `stdout?: string` field to `ExecutionResult` in `src/types.ts` <!-- agent: development-engineer, depends_on: [], touches: src/types.ts -->
- [ ] 1.2 Add `MAX_CONTEXT_STDOUT_BYTES = 1024 * 1024` to `src/config/constants.ts` <!-- agent: development-engineer, depends_on: [], touches: src/config/constants.ts -->

## 2. Context Parsing Utility

- [ ] 2.1 Create `src/core/context-parser.ts` with `parseStdout(raw: string): Record<string, unknown> | null` implementing the parse algorithm (empty -> null, JSON object -> entries, JSON primitive -> `{ output: String }`, JSONL -> merged entries, fallback -> `{ output: raw }`) <!-- agent: development-engineer, depends_on: [1.1, 1.2], touches: src/core/context-parser.ts -->
- [ ] 2.2 Create `src/core/template.ts` with `interpolate(input: string, context: Record<string, unknown>): string` using `/{{(\w+)}}/g` regex, missing keys -> empty string <!-- agent: development-engineer, depends_on: [], touches: src/core/template.ts -->
- [ ] 2.3 Add i18n keys for context truncation warning to `src/i18n/en.json` <!-- agent: development-engineer, depends_on: [], touches: src/i18n/en.json -->

## 3. Stdout Capture in executeCommand

- [ ] 3.1 Add `captureStdout: boolean` parameter to `executeCommand` in `src/core/command-runner.ts` <!-- agent: development-engineer, depends_on: [1.1, 1.2, 2.3], touches: src/core/command-runner.ts -->
- [ ] 3.2 When `captureStdout` is true, tee stdout to both `logStream` and a string buffer (capped at `MAX_CONTEXT_STDOUT_BYTES`); write truncation warning to log if exceeded <!-- agent: development-engineer, depends_on: [3.1], touches: src/core/command-runner.ts -->
- [ ] 3.3 Return captured stdout string in `ExecutionResult.stdout` <!-- agent: development-engineer, depends_on: [3.1], touches: src/core/command-runner.ts -->

## 4. Chain Context in LoopController

- [ ] 4.1 Initialize `chainContext: Record<string, unknown> = {}` at the top of `LoopController.run()` iteration (before primary task) <!-- agent: development-engineer, depends_on: [2.1, 2.2, 3.3], touches: src/core/loop-controller.ts -->
- [ ] 4.2 Pass `captureStdout: true` to `executeCommand` for the primary task when chain tasks exist (onSuccessTaskId or onFailureTaskId is non-null); pass `false` for standalone loops <!-- agent: development-engineer, depends_on: [4.1], touches: src/core/loop-controller.ts -->
- [ ] 4.3 After primary task: call `parseStdout(result.stdout)` and `Object.assign(chainContext, parsed)` if non-null <!-- agent: development-engineer, depends_on: [4.1], touches: src/core/loop-controller.ts -->
- [ ] 4.4 Before each chain task: interpolate `command` and each entry in `commandArgs` using `interpolate(str, chainContext)` <!-- agent: development-engineer, depends_on: [4.1], touches: src/core/loop-controller.ts -->
- [ ] 4.5 Pass `captureStdout: true` to `executeCommand` for chain tasks <!-- agent: development-engineer, depends_on: [4.1], touches: src/core/loop-controller.ts -->
- [ ] 4.6 After each chain task: parse stdout and merge into `chainContext` <!-- agent: development-engineer, depends_on: [4.1], touches: src/core/loop-controller.ts -->

## 5. User Documentation

- [ ] 5.1 Add README section "Chain Context Sharing" explaining the contract (JSON merge, JSONL, plain text `output` key, `{{key}}` interpolation, the clobbering caveat, `jq` tip) <!-- agent: development-engineer, depends_on: [], touches: README.md -->
- [ ] 5.2 Add i18n keys for context help modal text to `src/i18n/en.json` <!-- agent: development-engineer, depends_on: [], touches: src/i18n/en.json -->

## 6. Context Help Modal

- [ ] 6.1 Create `src/board/components/ContextHelpModal.tsx` showing the context contract (parse rules, template syntax, output clobbering caveat, jq tip example) <!-- agent: development-engineer, depends_on: [5.2], touches: src/board/components/ContextHelpModal.tsx -->
- [ ] 6.2 Wire `?` key or help button in `TaskForm.tsx` and `TaskBrowser.tsx` to open `ContextHelpModal` <!-- agent: development-engineer, depends_on: [6.1], touches: src/board/components/TaskForm.tsx,src/board/components/TaskBrowser.tsx -->
- [ ] 6.3 Add `ContextHelpModal` to the board view rendering and navigation <!-- agent: development-engineer, depends_on: [6.1], touches: src/board/App.tsx -->

## 7. Verification

- [ ] 7.1 Write unit tests for `parseStdout` covering all branches (empty, JSON object, JSON primitive, JSONL, plain text, multi-line non-JSON) <!-- agent: development-engineer, depends_on: [2.1], touches: tests/context-parser.test.ts -->
- [ ] 7.2 Write unit tests for `interpolate` covering existing key, missing key, multiple keys in one string, no patterns present <!-- agent: development-engineer, depends_on: [2.2], touches: tests/template.test.ts -->
- [ ] 7.3 Run `rtk npx tsc --noEmit` -> `rtk pnpm lint` -> `rtk pnpm test` -> `rtk pnpm build` <!-- agent: development-engineer, depends_on: [4.6, 6.3, 7.1, 7.2], touches: [] -->

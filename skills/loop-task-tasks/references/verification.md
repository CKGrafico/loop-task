# Verification Gates

Verification proves that a Task produced the expected repository state. It is concrete, deterministic, and independent from an AI Task's summary.

## Contract

A verification Task must:

- exit `0` only when every check passes;
- exit non-zero when output is malformed, schema is unexpected, work remains, lint fails, or types fail;
- run after the work Task and before finalization;
- route failure to recovery instead of finalization;
- use named JSON fields and semantic predicates, never serialized JSON string comparison;
- declare shell-specific dependencies when it cannot use a portable command.

## OpenSpec completion check

`openspec list --json` returns an object:

```json
{ "changes": [] }
```

Use a shell Task on POSIX systems. Keep the whole pipeline inside `sh -c`:

```sh
sh -c 'openspec list --json | jq -e ''(.changes | length) == 0'' >/dev/null'
```

Do not store `openspec list --json | jq ...` as one ordinary command. Loop Task passes command arguments directly unless the Task explicitly invokes a shell. On Windows, use the PowerShell equivalent or a project script supplied by the repository.

## Verification levels

Quick gate for code changes:

```sh
sh -c 'openspec list --json | jq -e ''(.changes | length) == 0'' >/dev/null && pnpm exec eslint --max-warnings 0 src/ tests/ && pnpm exec tsc --noEmit'
```

Full repository gate:

```sh
sh -c 'openspec list --json | jq -e ''(.changes | length) == 0'' >/dev/null && pnpm exec eslint --max-warnings 0 src/ tests/ && pnpm exec tsc --noEmit && pnpm run test && pnpm run build'
```

Prefer existing `package.json` scripts when they express the required check. Do not add `npx` to a canonical command when the repository declares another package manager.

## Chain placement

```text
work → verify → finalize
  └── failure → recover
```

An AI Task exiting `0` means only that the runner completed. It does not prove that the requested change is correct.

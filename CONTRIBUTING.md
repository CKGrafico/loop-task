# Contributing to loop-task

Thanks for your interest in contributing!

## Getting started

```bash
git clone https://github.com/your-username/loop-task.git
cd loop-task
pnpm install
```

## Development

```bash
pnpm run dev          # Watch mode build
pnpm run test:watch   # Watch mode tests
pnpm run lint         # Lint source and tests
pnpm run typecheck    # Type check without emitting
```

## Running the CLI locally

```bash
pnpm run build
node dist/cli.js 30m "echo hello" --now --max-runs 1
```

## Testing

```bash
pnpm run test             # Run tests
pnpm run test:coverage    # Run tests with coverage
```

Target: >=90% coverage.

## Publishing (maintainers)

```bash
pnpm run release:dry   # Dry run
pnpm run release       # Build and publish to npm
```

## Code style

- TypeScript strict mode
- ESM only
- No comments unless necessary
- Follow existing conventions

## Pull requests

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Ensure `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test` pass
5. Open a PR

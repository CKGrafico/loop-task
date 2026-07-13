## 1. Create shared layer structure

- [ ] 1.1 Create `src/shared/format.ts` with format functions extracted from `src/tui/format.ts` (or `src/board/format.ts`): `describeLoop`, `statusLabel`, `commandLine`, `formatCmd`, `truncate`, `quoteArg`, `unescapeCommand`
- [ ] 1.2 Create `src/shared/ui/state.ts`, move `src/tui/state.ts` content (identical to board)
- [ ] 1.3 Create `src/shared/ui/router.ts`, move `src/tui/router.ts` content
- [ ] 1.4 Create `src/shared/ui/hooks/useBreakpoint.ts`, move from `src/tui/hooks/useBreakpoint.ts`
- [ ] 1.5 Create `src/shared/ui/hooks/useHoverState.ts`, move from `src/tui/hooks/useHoverState.ts`
- [ ] 1.6 Create `src/shared/ui/hooks/useLogStream.ts`, move from `src/tui/hooks/useLogStream.ts`
- [ ] 1.7 Create `src/shared/ui/hooks/useLoopPolling.ts`, move from `src/tui/hooks/useLoopPolling.ts`

## 2. Update TUI imports to shared layer

- [ ] 2.1 Update all `src/tui/` files that import from `./format` or `./format.js` to import from `@/shared/format` or `../shared/format`
- [ ] 2.2 Update all `src/tui/` files that import from `./state` to import from `@/shared/ui/state`
- [ ] 2.3 Update all `src/tui/` files that import from `./router` to import from `@/shared/ui/router`
- [ ] 2.4 Update all `src/tui/` files that import from `./hooks/useBreakpoint` to import from `@/shared/ui/hooks/useBreakpoint`
- [ ] 2.5 Update all `src/tui/` files that import from `./hooks/useHoverState` to import from `@/shared/ui/hooks/useHoverState`
- [ ] 2.6 Update all `src/tui/` files that import from `./hooks/useLogStream` to import from `@/shared/ui/hooks/useLogStream`
- [ ] 2.7 Update all `src/tui/` files that import from `./hooks/useLoopPolling` to import from `@/shared/ui/hooks/useLoopPolling`
- [ ] 2.8 Delete the now-redundant `src/tui/format.ts`, `src/tui/state.ts`, `src/tui/router.ts`, and moved hooks from `src/tui/hooks/`

## 3. Fix CLI import

- [ ] 3.1 Update `src/cli.ts` to import from `./shared/format.js` instead of `./board/format.js`

## 4. Delete board directory and clean up

- [ ] 4.1 Delete `src/board/` directory entirely
- [ ] 4.2 Remove `src/board` from `exclude` in `tsconfig.json` and `tsconfig.build.json`
- [ ] 4.3 Update project guardrails skill to remove "board is dead code" section
- [ ] 4.4 Search for any remaining references to `board/` in source files and fix

## 5. Verify

- [ ] 5.1 Run `rtk npx tsc --noEmit`, must pass
- [ ] 5.2 Run `rtk pnpm lint`, must pass
- [ ] 5.3 Run `rtk pnpm test`, must pass
- [ ] 5.4 Run `rtk pnpm build`, must pass

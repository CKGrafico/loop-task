# Change: gh-20-comprehensive-test-suites

## Problem

The v2 rewrite replaced the entire architecture (client-daemon IPC, Ink 7 TUI, filesystem-backed persistence, chain execution). The existing test suite has 11 pre-existing failures, no tests for daemon/client/shared modules, and the 90% coverage gate is unreliable.

## User-Facing Behavior Change

Developers will have confidence that regressions are caught by a comprehensive, passing test suite. CI will enforce a trustworthy 90% coverage gate across lines/functions/branches/statements.

## Non-goals

- TUI component tests (`src/tui/**`), remains manual
- `src/board/`, stale, excluded from build
- Performance / load testing
- Integration tests involving a real daemon process

## Impact

- No IPC contract changes (src/types.ts untouched)
- No persisted state shape changes (LoopMeta untouched)
- No cross-platform behavior changes
- Test-only change: no production code modifications except bug fixes for pre-existing test failures

## Tasks Summary

1. Fix pre-existing test failures (cli.test.ts, loop-controller.test.ts, projects.test.ts)
2. Add core module tests (scheduling, log-rotator, log-parser, loop-controller stabilization)
3. Add daemon module tests (server, manager, state, spawner, file-watcher, task-manager, projects)
4. Add client & IPC tests (ipc.ts, commands.ts)
5. Add shared utility tests (fs-utils, sleep, tail)
6. Verify 90% coverage gate passes

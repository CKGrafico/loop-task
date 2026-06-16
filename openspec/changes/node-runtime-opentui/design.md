## Context

The original runtime depended on Bun for direct execution of TypeScript entrypoints, `bun`-specific scripts, and local development flow. That prevented standard npm global installs and `npx loop-task` from working for users who only had Node installed. The migration replaced Bun-specific runtime assumptions with Node-compatible equivalents, while keeping Bun as a required dependency for the board (OpenTUI native FFI).

## Goals / Non-Goals

**Goals:**
- Make the CLI executable from a standard Node/npm environment
- Preserve the OpenTUI dashboard behavior and overall UX under the new runtime
- Keep the existing IPC contract and persisted loop state unchanged
- Support standard npm packaging, global install, and `npx loop-task`
- Minimize application logic changes by isolating runtime/tooling migration work

**Non-Goals:**
- Rewriting the board away from OpenTUI
- Changing the core loop execution model, persistence model, or daemon protocol
- Solving upstream native runtime bugs in Bun or OpenTUI beyond migrating off the Bun runtime requirement
- Reworking all developer tooling in one step if some Bun-based dev helpers remain temporarily optional

## Decisions

### 1. Introduce a Node-first runtime path instead of dual first-class runtimes

The project should choose Node as the canonical runtime for CLI execution and npm distribution rather than attempting to support Bun and Node equally at runtime.

**Why:** npm and `npx` portability require Node compatibility. A single runtime target keeps packaging, bug reports, and support simpler.

**Alternative considered:** Maintain Bun and Node as equal runtime targets. Rejected because it increases support and testing complexity while solving a problem the user does not need.

### 2. Add a build step for distributable artifacts

The package should stop shipping raw `src/` TypeScript as the runtime artifact and instead emit Node-executable JavaScript plus type declarations where useful.

**Why:** Node cannot run the current raw TypeScript entrypoint directly in a standard npm installation. A build step gives deterministic runtime artifacts and avoids depending on tsx/ts-node at user runtime.

**Alternative considered:** Ship a runtime loader such as tsx. Rejected because it adds end-user runtime dependency and weakens npm portability.

### 3. Preserve the IPC contract and state format as-is

The migration should not change `src/types.ts` request/response contracts or the persisted `LoopMeta` shape on disk.

**Why:** This reduces migration risk and keeps upgrades safe for existing users.

**Alternative considered:** Fold runtime migration together with protocol cleanup. Rejected because it broadens the blast radius unnecessarily.

### 4. Treat OpenTUI compatibility as a runtime verification concern

The board entrypoint should be adapted only as much as needed for Node runtime compatibility, with explicit verification on Windows and POSIX.

**Why:** The product requirement is to keep the OpenTUI board working perfectly, not to redesign the UI stack.

**Alternative considered:** Replace OpenTUI with another renderer. Rejected because it is out of scope and would dramatically expand the change.

## Risks / Trade-offs

- **[Runtime incompatibilities in OpenTUI under Node]** → Mitigation: isolate runtime bootstrap changes, add targeted board smoke verification, validate Windows and POSIX early
- **[Distribution/build complexity increases]** → Mitigation: keep one small build pipeline that outputs only runtime artifacts needed by npm consumers
- **[Developer workflow churn]** → Mitigation: document old vs new commands and keep local scripts ergonomic
- **[Packaging regressions for daemon/socket paths]** → Mitigation: keep path logic unchanged and regression-test daemon spawn/list/log flows

## Migration Plan

1. Identify Bun-only runtime assumptions in CLI, daemon startup, board bootstrap, and package scripts
2. Introduce a Node-compatible build/distribution path and wire npm bin entrypoints to built output
3. Replace or isolate Bun-only APIs and workflow assumptions
4. Verify CLI start/run/board flows under Node on Windows and POSIX
5. Update docs to present npm/Node as the standard install path

## Open Questions

- Does the current OpenTUI version require any runtime flags or package layout changes under Node on Windows?
- Should Bun remain as an optional development tool, or should all scripts move fully to npm/Node for consistency?
- Is a standalone binary release still desirable after npm portability is in place?

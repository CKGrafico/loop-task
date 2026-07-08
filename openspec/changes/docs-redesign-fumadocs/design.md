## Context

### Current state

The `docs/` folder currently contains a single static HTML landing page (index.html + styles.css + script.js) deployed to GitHub Pages at loop.ckgrafico.com. The page has a dark theme using DESIGN.md tokens but looks AI-generated: uniform 6-card grid, typewriter terminal animation, marketing-speak copy, no real documentation content.

### Codebase to document

The project has a rich codebase with extensive functionality and zero public documentation. The following was discovered via codegraph exploration:

**Project identity**: loop-task — cross-platform CLI tool for "loop engineering" (run any shell command on a cadence). TypeScript 5.8 (ESM-only), Node.js 20+, Commander 13 CLI, Ink 7 + React 19 TUI, InversifyJS DI, execa 9.6 subprocess spawning, native HTTP server. Published to npm as `loop-task` (MIT, loop.ckgrafico.com).

**Architecture**: client-daemon over local IPC (Unix socket on POSIX, named pipe on Windows). Filesystem persistence under `~/.loop-cli/` — no database, no network listener beyond localhost HTTP API.

```
┌──────────────────────────────────────────────────────────┐
│                    ARCHITECTURE OVERVIEW                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  CLI (src/cli.ts)                                        │
│  ├── loop-task → launchBoard() (src/app/index.tsx)       │
│  ├── loop-task start → ensureDaemon()                   │
│  ├── loop-task new → IPC start → daemon                  │
│  └── loop-task run → foreground loop (src/core/fg)       │
│                                                          │
│  TUI Board (Ink 7 + React 19, FSD architecture)          │
│  ├── src/app/ — composition root                        │
│  ├── src/widgets/ — header, panels, forms, modals        │
│  ├── src/features/ — commands, state, shortcuts         │
│  ├── src/entities/ — loops, tasks, projects             │
│  └── src/shared/ — DI, config, i18n, utils              │
│                                                          │
│  Daemon (src/daemon/)                                   │
│  ├── index.ts — entry, wires managers + servers          │
│  ├── server/ — IpcServer (JSON-lines over socket)        │
│  ├── http/ — HttpApiServer (REST + SSE, port 8845)       │
│  │   ├── route-loops.ts — CRUD, pause/resume/trigger     │
│  │   ├── route-tasks.ts — CRUD                           │
│  │   ├── route-projects.ts — CRUD                        │
│  │   ├── route-misc.ts — OpenAPI, Swagger, SSE events    │
│  │   └── openapi.ts — OpenAPI 3.0 spec + Swagger HTML    │
│  ├── managers/ — LoopManager, TaskManager, ProjectManager│
│  ├── state/ — persistence (JSON stores, PID, signature)  │
│  ├── spawner/ — ensureDaemon() (spawn, verify, restart) │
│  └── watcher/ — FileWatcher (fs.watch + debounce + SHA-1)│
│                                                          │
│  Core runtime (src/core/)                               │
│  ├── loop/ — LoopController (state machine),             │
│  │           loop-runner (main loop),                   │
│  │           run-executor (single run),                  │
│  │           chain-executor (task chaining)              │
│  ├── command/ — command-runner (execa subprocess)       │
│  ├── context/ — context-parser (JSON/JSONL/text),        │
│  │              template ({{key}} interpolation)          │
│  ├── logging/ — log-rotator (1MB x 3 gens)              │
│  ├── scheduling/ — computePhase (hash-based spread)      │
│  └── foreground/ — runLoop() (blocking foreground)       │
│                                                          │
│  Data stores (~/.loop-cli/)                             │
│  ├── loops.json — LoopMeta[]                            │
│  ├── tasks.json — TaskDefinition[]                       │
│  ├── projects.json — Project[]                          │
│  ├── logs/{id}.log — per-loop logs (rotated)             │
│  ├── daemon.pid — process ID                           │
│  ├── daemon.sig — code signature (SHA-1)                │
│  └── daemon.log — diagnostic log                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Key features to document**:

| Feature | Source files | Details |
|---------|-------------|---------|
| 15 CLI commands | `src/cli.ts`, `src/loop-config.ts` | loop-task, start, new, run, stop, restart, status, export, import, api, project list/new/rename/color/delete |
| 9 CLI flags | `src/loop-config.ts` | --now, --max-runs, --cwd, --project, --offset, --description, -C/--context, --verbose, --json |
| 25+ HTTP REST endpoints | `src/daemon/http/route-*.ts` | Loops CRUD, pause/resume/trigger/stop, logs, tasks CRUD, projects CRUD, stop-all |
| 2 SSE streams | `route-loops.ts`, `route-misc.ts` | `/api/loops/:id/logs/stream`, `/api/events` |
| Swagger UI + OpenAPI 3.0 | `src/daemon/http/openapi.ts` | `127.0.0.1:8845/api/docs`, `/api/openapi.json` |
| Task chaining | `src/core/loop/chain-executor.ts` | onSuccessTaskId/onFailureTaskId chains |
| Context sharing | `src/core/context/context-parser.ts` | JSON/JSONL/plain-text stdout parsing |
| Template interpolation | `src/core/context/template.ts` | `{{key}}` Mustache with shell escaping |
| Loop state machine | `src/core/loop/loop-controller.ts` | 5 states: running, waiting, paused, idle, stopped |
| Spread scheduling | `src/core/scheduling/index.ts` | `hash(loopId) % interval` — avoids thundering herd |
| Hot-reload | `src/daemon/watcher/index.ts` | fs.watch + debounce 300ms + SHA-1 hash, mtime polling on Windows |
| Log rotation | `src/core/logging/log-rotator.ts` | 1MB x 3 generations |
| Filesystem persistence | `src/daemon/state/index.ts` | Atomic writes (temp-then-rename), JSON stores, PID file, code signature |
| Daemon lifecycle | `src/daemon/spawner/index.ts` | ensureDaemon(), code-signature verification, detached spawn, graceful SIGINT/SIGTERM |
| Configuration | `src/shared/config/constants.ts`, `src/shared/config/paths.ts` | LOOP_CLI_HOME, LOOP_CLI_HTTP_PORT, all paths, all magic numbers |
| Duration parsing | `src/duration.ts` | 10s, 5m, 1h, 1d, 1w, manual (interval=0) |
| Projects | `src/daemon/managers/project-manager.ts` | 6 named colors, default project permanent, --project scoping |
| Export/Import | `src/client/commands.ts` | Versioned JSON format, triggers hot-reload on import |
| Docker support | `Dockerfile` | node:20-slim, volume-mounted state |
| Agent workflows | (usage patterns) | Schedule `opencode run`, Claude Code, or Codex on a cadence |
| TUI board commands | `src/features/commands/commands.ts` | Fuzzy autocomplete, keyboard navigation, command-first input |
| Code editor modal | `src/features/code-editor/` | Multi-line editor with undo/redo, syntax highlighting |
| Chain editor | `src/features/` | Visual editing of task success/failure chains |

**Diátaxis mapping** (using `@documentation-writer` skill):

```
                      LEARNING                    │  DOING
                    (tutorials)                (how-to guides)
                                                  │
         ┌─────────────────────┐  ┌──────────────────────────┐
         │ Getting Started     │  │ Task Chaining            │
         │ Loop Engineering 101 │  │ Agent Workflows          │
         │ (install, first loop │  │ Docker Usage              │
         │  open board, verify) │  │ (practical, step-by-step) │
         └─────────────────────┘  └──────────────────────────┘
         ┌─────────────────────┐  ┌──────────────────────────┐
         │ Architecture &      │  │ CLI Reference             │
         │ Design (explanation)│  │ HTTP API Reference        │
         │ Daemon lifecycle    │  │ Configuration             │
         │ State persistence   │  │ Troubleshooting/FAQ       │
         │ Spread scheduling   │  │ (reference, factual)      │
         └─────────────────────┘  └──────────────────────────┘
```

### Stack match

The project's TUI uses React 19 (Ink 7) and TypeScript 5.8. Fumadocs (Next.js 15 + React 19 + Tailwind CSS 4) matches this stack and provides MDX content authoring, built-in search, and full component control for the landing redesign.

## Goals / Non-Goals

**Goals:**
- Migrate `docs/` from static HTML to Fumadocs (Next.js 15 static export)
- Redesign landing page to look premium and non-templated using DESIGN.md dark tokens
- Write 9 MDX documentation pages covering the full Diátaxis spectrum, with all content derived from the actual codebase source files listed above
- Update GitHub Actions to build and deploy the Fumadocs static export
- Keep CNAME (loop.ckgrafico.com) and demo.gif
- Leverage Fumadocs-specific skills: `@fumadocs-component-docs` for component patterns, `@fumadocs-mdx-structure` for MDX file structure conventions

**Non-Goals:**
- No application source code changes (`src/`)
- No i18n for docs (English only)
- No backend or API changes
- No analytics, CMS, or auth
- No light mode — dark-only theme matching the terminal product identity

## Decisions

### D1: Fumadocs over Starlight / VitePress

**Choice:** Fumadocs (Next.js 15 + React 19 + Tailwind CSS 4)
**Why:** Matches the project's React 19 + TypeScript stack. Provides MDX content authoring, full component control for the landing redesign, and modern premium UI. Starlight was considered (simpler, zero-JS) but lacks the component flexibility needed for the de-AI-ified landing redesign. Fumadocs also has `@fumadocs-component-docs` and `@fumadocs-mdx-structure` skills available to guide implementation.
**Alternative considered:** Astro Starlight — simpler setup but less control over landing page components; VitePress — Vue-based, doesn't match stack.

### D2: Dark theme only, no light mode

**Choice:** Dark-only theme using DESIGN.md tokens
**Why:** The app itself is a terminal tool with a dark theme. DESIGN.md defines a full dark palette (bg.base #0a0e14, brand amber #fbbf24, loop blue #38bdf8, task purple #a78bfa, project green #34d399, success #4ade80, warning #facc15, danger #f87171, idle #fb923c). Keeping dark-only avoids maintaining a light token set and matches the product identity.
**Alternative considered:** Dark + light toggle — more maintenance, and the landing already established dark as the brand.

### D3: Next.js static export (output: export)

**Choice:** Configure Next.js with `output: 'export'` for fully static HTML output
**Why:** GitHub Pages serves static files only. Fumadocs supports static export. The `out/` directory becomes the deploy artifact. No server-side rendering needed.
**Alternative considered:** Vercel deployment — but the project already uses GitHub Pages with a custom domain via CNAME.

### D4: pnpm workspace for docs

**Choice:** Create `docs/` as a self-contained pnpm workspace with its own `package.json`
**Why:** Keeps docs dependencies (Next.js, Fumadocs, Tailwind) separate from the main app. The root `pnpm-workspace.yaml` already exists; adding `docs` as a workspace member keeps install unified.
**Alternative considered:** Monorepo root install — pollutes main app deps.

### D5: Diátaxis content structure

**Choice:** Organize documentation into Diátaxis quadrants:
- Tutorials: Getting Started (install, first loop, open board, verify)
- How-to Guides: Task Chaining, Agent Workflows, Docker, (HTTP API usage is covered in reference)
- Reference: CLI Reference (15 commands + 9 flags from `src/cli.ts` + `src/loop-config.ts`), HTTP API Reference (25+ endpoints + 2 SSE streams from `src/daemon/http/`), Configuration (env vars, paths, constants)
- Explanation: Architecture (daemon, IPC, state machine, hot-reload, scheduling), Troubleshooting/FAQ
**Why:** The `@documentation-writer` skill is a Diátaxis expert. The framework provides clear separation of doc types and scales well.

### D6: Landing redesign strategy

**Choice:** Replace uniform card grid with asymmetric bento layout, kill typewriter animation, humanize all copy with `@humanize` skill
**Why:** The current 6-equal-card grid is the biggest AI tell. `@design-taste-frontend` (anti-slop), `@high-end-visual-design` (premium spacing/shadows/typography), `@humanize` (de-AI-ify copy), `@web-design-guidelines` (accessibility), and `@fumadocs-component-docs` + `@fumadocs-mdx-structure` (Fumadocs patterns) skills are all available to the docs-ui-engineer agent.
**Key changes:**
- Hero becomes confident and clean (no typewriter animation)
- Features use varying scales and asymmetry (not uniform grid)
- Board recreation section stays (it's a genuine product screenshot)
- Copy rewritten to sound human via `@humanize`
- Nav links to both landing sections and docs pages

### D7: Tailwind CSS 4 with DESIGN.md tokens

**Choice:** Use Tailwind CSS 4 with custom theme mapping DESIGN.md tokens to Tailwind utility classes
**Why:** Fumadocs uses Tailwind. DESIGN.md tokens map directly:
- `--color-brand: #fbbf24` → `bg-brand`, `text-brand`, `border-brand`
- `--color-loop: #38bdf8` → `text-loop`, `bg-loop`
- `--color-task: #a78bfa` → `text-task`, `border-task`
- `--color-project: #34d399` → `text-project`, `bg-project`
- `--color-success: #4ade80`, `--color-warning: #facc15`, `--color-danger: #f87171`, `--color-idle: #fb923c`
- Background scale: `--color-base: #0a0e14`, `--color-surface: #111827`, `--color-elevated: #1e293b`, `--color-input: #0f172a`
- Text: `--color-text: #e5e7eb`, `--color-text-sec: #9ca3af`, `--color-text-muted: #6b7280`
- Borders: `--color-border: #1e293b`, `--color-border-dim: #374151`
Enables consistent dark theme across landing and docs pages.

### D8: Content sourced from actual source files

**Choice:** All documentation content is authored from the actual codebase
**Why:** The codegraph exploration identified exact source files for every feature to document:
- CLI commands → `src/cli.ts`, `src/loop-config.ts`
- HTTP API → `src/daemon/http/route-loops.ts`, `route-tasks.ts`, `route-projects.ts`, `route-misc.ts`, `openapi.ts`
- Architecture → `src/daemon/index.ts`, `src/core/loop/loop-controller.ts`, `loop-runner.ts`, `chain-executor.ts`
- Configuration → `src/shared/config/constants.ts`, `src/shared/config/paths.ts`
- Duration → `src/duration.ts`
- Persistence → `src/daemon/state/index.ts`
- Hot-reload → `src/daemon/watcher/index.ts`
- Daemon lifecycle → `src/daemon/spawner/index.ts`
This ensures factual accuracy — every command, endpoint, and behavior in the docs can be traced back to a specific source file.

## Risks / Trade-offs

- **[Next.js build complexity in CI]** → Mitigation: static export means build runs in CI only; no runtime server. Build step is `pnpm --filter docs build` producing `docs/out/`.
- **[Fumadocs learning curve]** → Mitigation: docs-ui-engineer has `@design-taste-frontend`, `@web-design-guidelines`, `@fumadocs-component-docs`, and `@fumadocs-mdx-structure` skills.
- **[Larger docs/ directory]** → Mitigation: self-contained workspace, doesn't affect main app build.
- **[Content accuracy]** → Mitigation: all content authored from codegraph survey identifying exact source files; `@documentation-writer` ensures Diátaxis compliance.
- **[Static export limitations]** → Mitigation: Fumadocs search works client-side with static export (OG `search` route); no dynamic routes needed since all 9 docs pages are known at build time.
- **[Tailwind 4 + Fumadocs compatibility]** → Mitigation: Fumadocs officially supports Tailwind CSS; DESIGN.md tokens map cleanly to CSS custom properties that Tailwind 4 can consume.

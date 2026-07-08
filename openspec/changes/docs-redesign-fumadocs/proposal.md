## Why

The `docs/` folder is a single hand-written HTML landing page that looks AI-generated (uniform 6-card grid, typewriter terminal animation, marketing-speak copy) and contains zero documentation content — no guides, no API reference, no architecture docs.

The project has a rich codebase with extensive functionality that deserves real documentation:

- **15 CLI commands** (`loop-task`, `start`, `new`, `run`, `stop`, `restart`, `status`, `export`, `import`, `api`, `project list/new/rename/color/delete`) with 9 flags (`--now`, `--max-runs`, `--cwd`, `--project`, `--offset`, `--description`, `-C/--context`, `--verbose`, `--json`)
- **25+ HTTP API REST endpoints** on `127.0.0.1:8845` (loops CRUD, pause/resume/trigger/stop, logs, tasks CRUD, projects CRUD, stop-all) plus 2 SSE streams (`/api/events`, `/api/loops/:id/logs/stream`), Swagger UI, and OpenAPI 3.0 spec
- **Task chaining** with `onSuccessTaskId`/`onFailureTaskId`, context sharing via stdout parsing (JSON/JSONL/plain-text), and `{{key}}` Mustache template interpolation
- **Daemon architecture**: client-daemon over IPC (Unix socket / Windows named pipe), filesystem persistence under `~/.loop-cli/` (no database), hot-reload via `FileWatcher` (fs.watch + debounce + SHA-1), code signature verification, graceful shutdown
- **Loop controller state machine** with 5 states (running, waiting, paused, idle, stopped), spread scheduling via `hash(loopId) % interval`, abortable chunked sleep, overrun detection
- **Log rotation** (1MB x 3 generations), **projects** with 6 color codes, **export/import** for config portability, **Docker** support, **agent automation** workflows
- **Cross-platform** (macOS/Linux/Windows), **ESM-only** TypeScript 5.8, **Ink 7 + React 19** TUI board with **Feature-Sliced Design** architecture

None of this is documented. We need to migrate to a modern docs framework (Fumadocs), redesign the landing to look premium and non-templated, and write real documentation content covering the full Diátaxis spectrum from the actual source code.

## What Changes

- **Replace** the static `docs/` (index.html + styles.css + script.js) with a Fumadocs (Next.js 15 + React 19 + Tailwind CSS 4) documentation site
- **Redesign** the landing page using DESIGN.md dark tokens — kill the uniform card grid, typewriter animation, and AI-generated feel; apply asymmetric layout, composition variety, humanized copy
- **Write** 9 MDX documentation pages covering the full Diátaxis spectrum, all content derived from the actual codebase:
  - **Getting Started** (tutorial): `npm install -g loop-task`, Node.js 20+, first loop, opening the board, verifying runs
  - **CLI Reference** (reference): all 15 commands from `src/cli.ts` + all 9 flags from `src/loop-config.ts` + exit codes
  - **HTTP API Reference** (reference): all REST endpoints from `src/daemon/http/route-*.ts`, SSE streams, envelope format `{ok, data}`, Swagger UI at `/api/docs`, OpenAPI spec
  - **Architecture** (explanation): client-daemon model, IPC over socket/named pipe, `LoopController` state machine, `LoopManager`, filesystem state persistence, `FileWatcher` hot-reload, spread scheduling, daemon lifecycle
  - **Task Chaining** (how-to): `onSuccessTaskId`/`onFailureTaskId` chains, context parsing (`context-parser.ts`), `{{key}}` template interpolation (`template.ts`), multi-step pipeline examples
  - **Agent Workflows** (how-to): AI coding agents on a cadence, scheduling `opencode run` / Claude Code / Codex prompts
  - **Configuration** (reference): `LOOP_CLI_HOME`, `LOOP_CLI_HTTP_PORT` env vars, `~/.loop-cli/` data directory structure, paths from `src/shared/config/paths.ts`, constants from `src/shared/config/constants.ts`, interval syntax from `src/duration.ts`
  - **Docker** (how-to): `node:20-slim`, volume-mounted state, running the board from a container
  - **Troubleshooting** (explanation): daemon not starting, socket conflicts, Windows named pipes, log permissions, `daemon.log`, `--verbose` mode, `status --json`
- **Structure** docs using the Diátaxis framework (tutorials, how-to guides, reference, explanation)
- **Update** GitHub Actions workflow to build Next.js static export and deploy to GitHub Pages
- **Preserve** CNAME (loop.ckgrafico.com) and demo.gif asset
- **Run** all content through `@humanize` to ensure copy sounds natural, not LLM-generated
- **Leverage** `@fumadocs-component-docs` and `@fumadocs-mdx-structure` skills for proper Fumadocs MDX patterns

## Capabilities

### New Capabilities

- `docs-site`: Fumadocs-based documentation website with dark theme from DESIGN.md tokens, redesigned landing page, and nine MDX documentation pages covering the full Diátaxis spectrum

### Modified Capabilities

(none — no existing specs to modify)

## Non-goals

- No changes to the application source code (`src/`)
- No i18n for the docs site (English only, matching the app's current single locale)
- No backend or API changes to support docs
- No authentication, analytics, or CMS integration on the docs site
- No migration of README.md content — docs content is authored fresh from the codebase
- No light mode — dark-only theme matching the terminal product identity

## Impact

### Files replaced
- **docs/index.html** (263 lines) — → `docs/app/page.tsx` (Next.js landing)
- **docs/styles.css** (501 lines) — → `docs/app/global.css` + `docs/tailwind.config.ts`
- **docs/script.js** (138 lines) — → removed (no more typewriter/terminal animation)
- **docs/CNAME** — moved to `docs/public/CNAME`

### Files created
- `docs/package.json`, `docs/next.config.mjs`, `docs/tsconfig.json`, `docs/tailwind.config.ts`, `docs/postcss.config.mjs`, `docs/source.config.ts` — Fumadocs project scaffold
- `docs/app/layout.tsx`, `docs/app/global.css`, `docs/app/page.tsx`, `docs/app/source.ts` — Next.js app
- `docs/app/[[...slug]]/page.tsx`, `docs/app/api/search/route.ts` — Fumadocs docs template + search
- `docs/components/landing/**` — redesigned landing components (navbar, footer, copy button, code block)
- `docs/components/docs/**` — custom MDX components (Callout, CodeBlock, Steps, Tabs)
- `docs/content/*.mdx` — 9 documentation pages

### Files modified
- **.github/workflows/pages.yml** — add pnpm setup, Node.js 20, build step, change artifact path from `docs` to `docs/out`
- **pnpm-workspace.yaml** — add `docs` as workspace member (if not already glob-matching)

### No impact on
- IPC contract (`src/types.ts`), persisted state shape (`LoopMeta`), cross-platform behavior, application runtime
- Root `package.json` — docs deps are isolated in the docs workspace

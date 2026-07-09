## 1. Project scaffolding

- [x] 1.1 Replace docs/ with Fumadocs project scaffold: docs/package.json, docs/next.config.mjs, docs/tsconfig.json, docs/tailwind.config.ts, docs/postcss.config.mjs, docs/source.config.ts, docs/.gitignore. Move CNAME and assets/demo.gif into docs/public/. Remove old index.html, styles.css, script.js. <!-- agent: docs-ui-engineer.build, depends_on: [], touches: [docs/package.json, docs/next.config.mjs, docs/tsconfig.json, docs/tailwind.config.ts, docs/postcss.config.mjs, docs/source.config.ts, docs/.gitignore, docs/public/**] -->
- [x] 1.2 Configure Fumadocs: docs/app/layout.tsx (root layout with dark theme, fonts, Fumadocs providers), docs/app/global.css (Tailwind imports + DESIGN.md dark tokens mapped to CSS variables), docs/source.config.ts (content source config for MDX), docs/app/[[...slug]]/page.tsx (docs template with Fumadocs Layout), docs/app/api/search/route.ts (search endpoint). <!-- agent: docs-ui-engineer.build, depends_on: [1.1], touches: [docs/app/layout.tsx, docs/app/global.css, docs/source.config.ts, docs/app/[[...slug]]/page.tsx, docs/app/api/search/route.ts] -->
- [x] 1.3 Configure Tailwind CSS 4 with DESIGN.md tokens: map all colors (brand amber #fbbf24, loop blue #38bdf8, task purple #a78bfa, project green #34d399, bg.base #0a0e14, bg.surface #111827, bg.elevated #1e293b, semantic success/warning/danger/idle) to Tailwind utility classes. Define typography, spacing, border-radius tokens from DESIGN.md. No light mode. <!-- agent: docs-ui-engineer.build, depends_on: [1.1], touches: [docs/tailwind.config.ts, docs/app/global.css] -->

## 2. Landing page redesign

- [x] 2.1 Build redesigned landing page (docs/app/page.tsx) with asymmetric hero (no typewriter, confident copy), feature bento with varying scales and composition (not uniform grid), terminal demo section, examples code window, commands preview, CTA. Apply @design-taste-frontend anti-slop patterns, @high-end-visual-design premium spacing/shadows/typography, @humanize on all copy. Use DESIGN.md dark tokens throughout. Include demo.gif and npm badges. <!-- agent: docs-ui-engineer.build, depends_on: [1.2, 1.3, 2.2], touches: [docs/app/page.tsx, docs/components/landing/**] -->
- [x] 2.2 Build shared landing components (docs/components/landing/): navbar with brand mark and links (board, features, docs, GitHub, npm), footer with brand and links, copy-to-clipboard button component, code block component with syntax highlighting. Wire nav links to both landing sections (/#features) and docs pages (/getting-started). <!-- agent: docs-ui-engineer.build, depends_on: [1.2, 1.3], touches: [docs/components/landing/**] -->

## 3. Documentation content — Tutorials

- [x] 3.1 Write docs/content/getting-started.mdx: Installation (npm install -g loop-task, Node.js 20+ requirement), first loop (loop-task new 30m -- npm test), opening the board (loop-task), verifying it runs (loop-task status). Include code examples. Use Diátaxis tutorial style (learning-oriented, step-by-step, beginner-friendly). <!-- agent: docs-ui-engineer.fast, depends_on: [1.2], touches: [docs/content/getting-started.mdx] -->

## 4. Documentation content — How-to guides

- [x] 4.1 Write docs/content/task-chaining.mdx: How to chain tasks with onSuccessTaskId/onFailureTaskId, context sharing (JSON/JSONL/plain-text stdout parsing), {{key}} template interpolation, multi-step pipeline examples (find issue → mark in-progress → AI rewrite → relabel). How-to guide style (problem-oriented, practical steps). <!-- agent: docs-ui-engineer.fast, depends_on: [1.2], touches: [docs/content/task-chaining.mdx] -->
- [x] 4.2 Write docs/content/agent-workflows.mdx: How to automate with AI coding agents (Claude Code, Codex, OpenCode), scheduling agent prompts on a cadence, practical examples (translate missing strings every 30m, process backlog items). How-to guide style. <!-- agent: docs-ui-engineer.fast, depends_on: [1.2], touches: [docs/content/agent-workflows.mdx] -->
- [x] 4.3 Write docs/content/docker.mdx: How to run loop-task in Docker (node:20-slim image), volume-mounted state directory, running the board from a container, managing loops. How-to guide style. <!-- agent: docs-ui-engineer.fast, depends_on: [1.2], touches: [docs/content/docker.mdx] -->

## 5. Documentation content — Reference

- [x] 5.1 Write docs/content/cli-reference.mdx: Complete CLI reference — all 15 commands (loop-task, start, new, run, stop, restart, status, export, import, api, project list/new/rename/color/delete) with all flags (--now, --max-runs, --cwd, --project, --offset, --description, -C/--context, --verbose, --json, --help, --version). Include syntax, examples, and exit codes. Reference style (information-oriented, complete, precise). <!-- agent: docs-ui-engineer.fast, depends_on: [1.2], touches: [docs/content/cli-reference.mdx] -->
- [x] 5.2 Write docs/content/http-api.mdx: Complete HTTP API reference — all REST endpoints (loops CRUD, pause/resume/trigger/stop, logs, tasks CRUD, projects CRUD, stop-all) and SSE streams (/api/events, /api/loops/:id/logs/stream). Document request/response envelope format, Swagger UI location (127.0.0.1:8845/api/docs), OpenAPI spec endpoint. Reference style. <!-- agent: docs-ui-engineer.fast, depends_on: [1.2], touches: [docs/content/http-api.mdx] -->
- [x] 5.3 Write docs/content/configuration.mdx: Configuration reference — environment variables (LOOP_CLI_HOME, LOOP_CLI_HTTP_PORT), data directory structure (~/.loop-cli/ with loops.json, tasks.json, projects.json, logs/, daemon.pid, daemon.sig, daemon.log), project colors, interval syntax (10s/5m/1h/1d/1w/manual). Reference style. <!-- agent: docs-ui-engineer.fast, depends_on: [1.2], touches: [docs/content/configuration.mdx] -->

## 6. Documentation content — Explanation

- [x] 6.1 Write docs/content/architecture.mdx: Architecture explanation — client-daemon model, IPC over Unix socket/named pipe, filesystem persistence (no database), loop controller state machine (running/waiting/paused/idle/stopped), hot-reload via FileWatcher, log rotation, spread scheduling (hash-based phase distribution), daemon lifecycle (spawn, signature verification, graceful shutdown). Explanation style (understanding-oriented, background, design decisions). <!-- agent: docs-ui-engineer.fast, depends_on: [1.2], touches: [docs/content/architecture.mdx] -->
- [x] 6.2 Write docs/content/troubleshooting.mdx: Troubleshooting guide — common issues (daemon not starting, socket conflicts, Windows named pipe issues, loop not running, log file permissions), FAQ (how to reset state, how to debug, how to inspect logs), debugging tips (loop-task status --json, daemon.log, verbose mode). Explanation style. <!-- agent: docs-ui-engineer.fast, depends_on: [1.2], touches: [docs/content/troubleshooting.mdx] -->

## 7. Docs navigation and MDX components

- [x] 7.1 Configure Fumadocs sidebar navigation in docs/app/source.ts: define docs tree structure mapping all 9 MDX pages into navigation groups (Getting Started, Guides, Reference, Explanation). Configure Fumadocs docs layout options (sidebar, search, breadcrumbs, table of contents). Add custom MDX components in docs/components/docs/ (Callout, CodeBlock with copy button, Steps, Tabs) for use across docs pages. <!-- agent: docs-ui-engineer.build, depends_on: [3.1, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2], touches: [docs/app/source.ts, docs/components/docs/**] -->

## 8. CI workflow update

- [x] 8.1 Update .github/workflows/pages.yml: add pnpm setup (pnpm/action-setup), Node.js 20 setup (actions/setup-node with pnpm cache), build step (pnpm install --filter docs, pnpm --filter docs build), change upload artifact path from `docs` to `docs/out`. Keep CNAME deployment, keep triggers (push to main on docs/** paths). <!-- agent: docs-ui-engineer.fast, depends_on: [1.1], touches: [.github/workflows/pages.yml] -->

## 9. Build verification

- [x] 9.1 Verify the full docs site builds locally: run `rtk pnpm install` at root, `rtk pnpm --filter docs build`, confirm static export output in docs/out/, verify CNAME is in docs/public/ and copied to docs/out/, verify all 9 MDX pages render as HTML, verify landing page has no typewriter animation and no uniform card grid, verify dark theme tokens applied. Fix any build errors. <!-- agent: docs-ui-engineer.build, depends_on: [2.1, 7.1, 8.1], touches: [] -->

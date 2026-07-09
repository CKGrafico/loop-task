## ADDED Requirements

### Requirement: Fumadocs documentation site
The system SHALL provide a Fumadocs-based documentation site under `docs/` using Next.js 15 static export, React 19, and Tailwind CSS 4, replacing the previous static HTML landing page.

#### Scenario: Static export builds successfully
- **WHEN** `pnpm --filter docs build` is run in CI
- **THEN** Next.js produces a static export in `docs/out/` containing HTML, CSS, JS, and assets

#### Scenario: CNAME preserved
- **WHEN** the docs site is deployed
- **THEN** `docs/CNAME` containing `loop.ckgrafico.com` is present in the build output

### Requirement: Dark theme from DESIGN.md tokens
The documentation site SHALL use a dark-only theme derived from DESIGN.md color tokens (bg.base #0a0e14, brand amber #fbbf24, loop blue #38bdf8, task purple #a78bfa, project green #34d399, and semantic colors for success/warning/danger/idle).

#### Scenario: Token mapping to Tailwind
- **WHEN** the Tailwind config is loaded
- **THEN** DESIGN.md tokens are mapped to Tailwind utility classes (e.g. `bg-base`, `text-brand`, `text-loop`, `border-task`)

#### Scenario: Consistent dark theme across pages
- **WHEN** any page (landing or docs) is viewed
- **THEN** the background, text, borders, and accents use the DESIGN.md dark palette with no light-mode variant

### Requirement: Redesigned landing page
The landing page SHALL replace the AI-generated uniform card grid with a premium, non-templated design featuring asymmetric layout, composition variety, confident hero (no typewriter animation), and humanized copy.

#### Scenario: No uniform card grid
- **WHEN** the landing page features section is rendered
- **THEN** feature blocks use varying sizes, scales, and positions (not a uniform grid of identical cards)

#### Scenario: No typewriter animation
- **WHEN** the landing page hero section is rendered
- **THEN** there is no character-by-character typewriter animation effect

#### Scenario: Humanized copy
- **WHEN** the landing page text content is read
- **THEN** copy sounds natural and human-written, free of generic marketing phrases

### Requirement: Documentation content in Diátaxis structure
The docs site SHALL include MDX documentation pages organized into the four Diátaxis quadrants: tutorials, how-to guides, reference, and explanation.

#### Scenario: Tutorial pages exist
- **WHEN** a user navigates to the docs
- **THEN** tutorial pages (getting-started) are available covering installation and first loop creation

#### Scenario: Reference pages exist
- **WHEN** a user navigates to the docs
- **THEN** reference pages (cli-reference, http-api, configuration) are available with complete command and endpoint listings

#### Scenario: How-to guide pages exist
- **WHEN** a user navigates to the docs
- **THEN** how-to guide pages (task-chaining, agent-workflows, docker) are available with step-by-step instructions

#### Scenario: Explanation pages exist
- **WHEN** a user navigates to the docs
- **THEN** explanation pages (architecture, troubleshooting) are available covering internal design and common issues

### Requirement: Content accuracy from codebase
All documentation content SHALL be derived from the actual codebase (CLI commands, HTTP API endpoints, architecture, configuration) ensuring factual accuracy.

#### Scenario: CLI reference matches actual commands
- **WHEN** a user reads the CLI reference page
- **THEN** all 15 CLI commands and their flags match the implementation in `src/cli.ts`

#### Scenario: HTTP API reference matches actual endpoints
- **WHEN** a user reads the HTTP API reference page
- **THEN** all REST endpoints and SSE streams match the implementation in `src/daemon/http/`

### Requirement: GitHub Actions workflow update
The GitHub Actions workflow SHALL build the Fumadocs static export and deploy it to GitHub Pages.

#### Scenario: CI builds docs
- **WHEN** a push to `main` touches `docs/**` or the workflow file
- **THEN** the workflow installs pnpm, builds the Next.js static export, and deploys `docs/out/` to GitHub Pages

#### Scenario: Workflow uses pnpm
- **WHEN** the CI workflow runs
- **THEN** it uses pnpm (not npm or yarn) for installation and build, consistent with the project's package manager

### Requirement: Docs as pnpm workspace
The `docs/` directory SHALL be a self-contained pnpm workspace with its own `package.json`, keeping Next.js and Fumadocs dependencies separate from the main application.

#### Scenario: Independent dependencies
- **WHEN** `pnpm install` is run at the root
- **THEN** docs dependencies (next, fumadocs, tailwind) are installed in the docs workspace without polluting the main app's `node_modules`

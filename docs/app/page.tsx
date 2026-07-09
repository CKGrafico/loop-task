import Link from 'next/link';
import { Navbar, Footer, CodeBlock, CopyButton } from '@/components/landing';

/* ────────────────────────────────────────────
   Data
   ──────────────────────────────────────────── */

const terminalCode = `# Run the test suite every 30 minutes
loop-task new 30m -- npm test

# Poll a deploy every 10 seconds
loop-task new 10s -- curl -sf https://example.com/health

# Have a coding agent chip away at a backlog every 30 minutes
loop-task new 30m -- opencode run "find missing translations, 3 max"`;

const examples = [
  {
    label: 'Health check',
    cmd: 'loop-task new 10s -- curl -sf https://api.example.com/health',
  },
  {
    label: 'Test runner',
    cmd: 'loop-task new 5m -- npm test',
  },
  {
    label: 'Agent loop',
    cmd: 'loop-task new 30m -- opencode run "fix lint warnings, 5 max"',
  },
  {
    label: 'Data sync',
    cmd: 'loop-task new 1h --project etl -- ./scripts/sync.sh',
  },
  {
    label: 'Deploy poll',
    cmd: 'loop-task new 15s -- curl -sf https://app.example.com/deploy-status',
  },
  {
    label: 'Foreground run',
    cmd: 'loop-task run --now 5m -- npm run build',
  },
];

const features = [
  {
    title: 'Background daemon',
    description:
      'Loops run in a background process that survives terminal exits. Start it once, close your laptop, come back tomorrow — your loops are still running.',
    icon: '◉',
    span: 'col-span-2',
    accent: 'text-brand',
  },
  {
    title: 'Task chaining',
    description:
      'Tasks can chain to other tasks on success or failure. Build pipelines that react to exit codes without wrapping everything in shell scripts.',
    icon: '→',
    span: '',
    accent: 'text-task',
  },
  {
    title: 'Projects',
    description:
      'Organize loops into projects with colored labels. Switch context on the board with a single keypress.',
    icon: '◆',
    span: '',
    accent: 'text-project',
  },
  {
    title: 'Human intervals',
    description:
      'Write 30s, 5m, 1h, 1d, 1w — no cron expressions, no mental math. Intervals are just that: how long between runs.',
    icon: '⏱',
    span: 'row-span-2',
    accent: 'text-idle',
    tall: true,
  },
  {
    title: 'HTTP API',
    description:
      'Every loop is queryable and controllable over HTTP. Build dashboards, wire up webhooks, or just curl the status endpoint.',
    icon: '⚡',
    span: '',
    accent: 'text-warning',
  },
  {
    title: 'Agent-ready',
    description:
      "AI agents can create and manage loops through the CLI or API. Give an agent a cadence and let it iterate on a backlog, review PRs, or chase down flaky tests — all without babysitting.",
    icon: '⊹',
    span: 'col-span-2',
    accent: 'text-loop',
  },
];

const commands = [
  { cmd: 'loop-task', desc: 'Open the interactive board' },
  { cmd: 'loop-task start', desc: 'Start the daemon, restore persisted loops' },
  { cmd: 'loop-task new <interval> -- <cmd>', desc: 'Create a background loop' },
  { cmd: 'loop-task run <interval> -- <cmd>', desc: 'Run a loop in the foreground' },
  { cmd: 'loop-task stop <id>', desc: 'Stop a loop and kill its child process' },
  { cmd: 'loop-task status [--json]', desc: 'Show status of all loops' },
  { cmd: 'loop-task api', desc: 'Show HTTP API endpoints' },
  { cmd: 'loop-task project list', desc: 'List all projects' },
];

/* ────────────────────────────────────────────
   Page
   ──────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base text-text">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Subtle radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-brand/5 blur-[120px]"
        />

        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-24 sm:px-6 lg:grid-cols-5 lg:gap-16 lg:pt-32">
          {/* Left — headline */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Run anything{' '}
              <span className="text-brand">on a cadence</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-text-sec">
              loop-task is a cross-platform CLI that runs shell commands at
              human-readable intervals. Create loops in the background, manage
              them from an interactive board, or run them in the foreground.
            </p>
          </div>

          {/* Right — install box + badges */}
          <div className="lg:col-span-2 flex flex-col items-start justify-center gap-4">
            <InstallBox />

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <img
                src="https://img.shields.io/npm/v/loop-task?style=flat-square&color=1e293b&labelColor=0f172a&label=npm"
                alt="npm version"
                height={22}
              />
              <img
                src="https://img.shields.io/npm/dm/loop-task?style=flat-square&color=1e293b&labelColor=0f172a&label=downloads"
                alt="npm downloads"
                height={22}
              />
              <img
                src="https://img.shields.io/npm/l/loop-task?style=flat-square&color=1e293b&labelColor=0f172a&label=license"
                alt="license"
                height={22}
              />
            </div>

            <p className="text-sm text-text-muted">
              macOS · Linux · Windows — loops survive reboots
            </p>
          </div>
        </div>
      </section>

      {/* ── Terminal demo ── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <CodeBlock code={terminalCode} language="bash" />
        </div>
      </section>

      {/* ── What is loop engineering ── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            What is loop engineering?
          </h2>
          <p className="mt-5 text-text-sec leading-relaxed">
            <strong className="text-text">Loop engineering</strong> is designing
            systems that run work on a cadence instead of triggering each run
            yourself. A loop is a recurring goal: you define a purpose, give it
            an interval, and let it iterate. It applies to ordinary engineering
            work just as much as to AI agents — health checks, sync jobs, test
            watches, data pulls, deploy polls, and report generation are all
            loops.
          </p>
          <p className="mt-4">
            <a
              href="https://addyosmani.com/blog/loop-engineering/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-soft underline underline-offset-4 transition-colors"
            >
              Read Addy Osmani&apos;s post on loop engineering →
            </a>
          </p>
        </div>
      </section>

      {/* ── Features — bento grid ── */}
      <section id="features" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-10">
            Built for cadence-driven work
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-dim ${f.span}`}
              >
                <span
                  className={`text-2xl leading-none ${f.accent}`}
                  aria-hidden
                >
                  {f.icon}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p
                  className={`mt-2 text-sm leading-relaxed text-text-sec ${
                    f.tall ? '' : 'line-clamp-3'
                  }`}
                >
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Examples ── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-10">
            Practical loops for everyday work
          </h2>

          <div className="rounded-xl border border-border-dim bg-input overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-1.5 border-b border-border-dim px-4 py-2.5 overflow-x-auto">
              <span className="h-3 w-3 rounded-full bg-danger/80 shrink-0" />
              <span className="h-3 w-3 rounded-full bg-warning/80 shrink-0" />
              <span className="h-3 w-3 rounded-full bg-success/80 shrink-0" />
              <div className="ml-4 flex gap-1">
                {examples.map((ex, i) => (
                  <span
                    key={ex.label}
                    className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      i === 0
                        ? 'bg-elevated text-text'
                        : 'text-text-muted hover:text-text-sec'
                    }`}
                  >
                    {ex.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Commands */}
            <div className="divide-y divide-border-dim">
              {examples.map((ex) => (
                <div
                  key={ex.label}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  <code className="shrink-0 rounded-md bg-elevated px-2 py-0.5 text-xs text-text-muted">
                    {ex.label}
                  </code>
                  <code className="text-sm text-text-sec font-mono truncate">
                    {ex.cmd}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Commands preview ── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-10">
            The commands you&apos;ll use
          </h2>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-5 py-3 font-medium text-text-sec">
                    Command
                  </th>
                  <th className="px-5 py-3 font-medium text-text-sec">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {commands.map((c) => (
                  <tr key={c.cmd} className="hover:bg-surface/60 transition-colors">
                    <td className="px-5 py-3">
                      <code className="font-mono text-brand-soft text-xs">
                        {c.cmd}
                      </code>
                    </td>
                    <td className="px-5 py-3 text-text-sec">{c.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-text-muted">
            Full reference at{' '}
            <Link
              href="/docs/cli-reference"
              className="text-brand hover:text-brand-soft underline underline-offset-4 transition-colors"
            >
              CLI Reference →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Board recreation ── */}
      <section id="board" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-10">
            The board
          </h2>
          <p className="mb-8 max-w-xl text-text-sec">
            An interactive TUI to view, create, and control your loops — all
            keyboard-driven. No mouse required.
          </p>

          {/* Live demo GIF */}
          <div className="mb-8 overflow-hidden rounded-xl border border-border-dim">
            <img
              src="/demo.gif"
              alt="loop-task terminal board demo"
              className="w-full"
              loading="lazy"
            />
          </div>

          <p className="mb-2 text-sm text-text-muted">Or here's a static recreation of the board layout:</p>

          <BoardMockup />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Start looping
          </h2>
          <p className="mt-4 text-text-sec">
            Install it, create your first loop, and let it run.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <InstallBox />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/ckgrafico/loop-task"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border-dim bg-surface px-5 py-2.5 text-sm font-medium text-text-sec hover:text-text hover:border-border transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Star on GitHub
              </a>
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/10 px-5 py-2.5 text-sm font-medium text-brand hover:bg-brand/15 hover:border-brand/40 transition-colors"
              >
                Read the docs →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────
   Install box (reused in hero + CTA)
   ──────────────────────────────────────────── */

function InstallBox() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-dim bg-input px-5 py-3.5">
      <span className="text-text-muted select-none">$</span>
      <code className="text-sm font-mono text-text">npm install -g loop-task</code>
      <CopyButton text="npm install -g loop-task" />
    </div>
  );
}

/* ────────────────────────────────────────────
   Board mockup
   ──────────────────────────────────────────── */

function BoardMockup() {
  const loops = [
    { id: '1', name: 'npm test', interval: '30m', status: 'running', ran: '2m ago', project: 'Default', color: 'text-text-sec' },
    { id: '2', name: 'curl health', interval: '10s', status: 'running', ran: '4s ago', project: 'infra', color: 'text-loop' },
    { id: '3', name: 'sync.sh', interval: '1h', status: 'idle', ran: '23m ago', project: 'etl', color: 'text-project' },
    { id: '4', name: 'opencode run "fix…"', interval: '30m', status: 'idle', ran: '18m ago', project: 'agents', color: 'text-idle' },
    { id: '5', name: 'deploy status', interval: '15s', status: 'stopped', ran: '3d ago', project: 'infra', color: 'text-loop' },
  ];

  const selected = loops[1];

  return (
    <div className="rounded-xl border border-border-dim bg-input overflow-hidden font-mono text-xs">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 border-b border-border-dim px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-danger/80" />
        <span className="h-3 w-3 rounded-full bg-warning/80" />
        <span className="h-3 w-3 rounded-full bg-success/80" />
        <span className="ml-3 text-text-muted">loop-task board</span>
      </div>

      <div className="flex min-h-[340px]">
        {/* Loop list */}
        <div className="w-1/2 border-r border-border-dim">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-dim px-4 py-2 text-text-muted">
            <span>Loops</span>
            <span className="text-[10px]">n: new · q: quit</span>
          </div>

          {loops.map((loop) => (
            <div
              key={loop.id}
              className={`flex items-center gap-3 border-b border-border-dim/50 px-4 py-2.5 ${
                loop.id === selected.id ? 'bg-elevated' : ''
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  loop.status === 'running'
                    ? 'bg-success'
                    : loop.status === 'idle'
                      ? 'bg-idle'
                      : 'bg-text-muted'
                }`}
              />
              <span className={`w-1.5 h-1.5 rounded-full ${loop.color}`} />
              <span className="flex-1 truncate text-text">{loop.name}</span>
              <span className="text-text-muted">{loop.interval}</span>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="flex-1 p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text font-semibold">{selected.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  selected.status === 'running'
                    ? 'bg-success/15 text-success'
                    : 'bg-idle/15 text-idle'
                }`}
              >
                {selected.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-text-sec">
              <div>
                <span className="text-text-muted">Interval</span>
                <p>{selected.interval}</p>
              </div>
              <div>
                <span className="text-text-muted">Last run</span>
                <p>{selected.ran}</p>
              </div>
              <div>
                <span className="text-text-muted">Project</span>
                <p>{selected.project}</p>
              </div>
              <div>
                <span className="text-text-muted">Max runs</span>
                <p>∞</p>
              </div>
            </div>

            <div className="border-t border-border-dim pt-3">
              <span className="text-text-muted">Command</span>
              <p className="mt-1 rounded-md bg-elevated px-3 py-2 text-text-sec">
                curl -sf https://example.com/health
              </p>
            </div>

            <div className="border-t border-border-dim pt-3">
              <span className="text-text-muted">Run history</span>
              <div className="mt-1 flex gap-1.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-4 w-2 rounded-sm ${
                      i < 8
                        ? 'bg-success/60'
                        : i < 10
                          ? 'bg-danger/60'
                          : 'bg-idle/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-border-dim px-4 py-2 text-text-muted">
        <span className="shrink-0">❯</span>
        <span className="opacity-40">Type a command or press n for new loop…</span>
      </div>
    </div>
  );
}

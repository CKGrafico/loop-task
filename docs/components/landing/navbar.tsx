'use client';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-base/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <a href="/" className="flex items-center gap-2 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-lg">
            🧵
          </span>
          <span className="font-semibold text-text tracking-tight text-sm">
            loop-task
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <a
            href="#board"
            className="text-text-sec hover:text-text transition-colors"
          >
            Board
          </a>
          <a
            href="#features"
            className="text-text-sec hover:text-text transition-colors"
          >
            Features
          </a>
          <a
            href="/getting-started"
            className="text-text-sec hover:text-text transition-colors"
          >
            Docs
          </a>
          <a
            href="https://github.com/ckgrafico/loop-task"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-text-sec hover:text-text transition-colors"
          >
            GitHub
            <ExternalLinkIcon />
          </a>
          <a
            href="https://www.npmjs.com/package/loop-task"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-text-sec hover:text-text transition-colors"
          >
            npm
            <ExternalLinkIcon />
          </a>
        </div>

        {/* Mobile: brand + GitHub only */}
        <a
          href="https://github.com/ckgrafico/loop-task"
          target="_blank"
          rel="noopener noreferrer"
          className="md:hidden inline-flex items-center gap-1.5 text-text-sec hover:text-text transition-colors text-sm"
        >
          GitHub
          <ExternalLinkIcon />
        </a>
      </nav>
    </header>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M9.5 2.5L4.5 7.5M9.5 2.5H6M9.5 2.5V6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 9H3V3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

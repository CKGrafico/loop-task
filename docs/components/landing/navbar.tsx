'use client';

import { GithubLogo, Repeat } from '@phosphor-icons/react/dist/ssr';

const LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#compare', label: 'vs cron' },
  { href: '/docs', label: 'Docs' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-base/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <a href="/" className="group flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-brand transition-colors group-hover:bg-brand/20">
            <Repeat size={15} weight="bold" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-tight text-text">
            loop-task
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 text-sm md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-text-sec transition-colors hover:text-text"
            >
              {l.label}
            </a>
          ))}
          <span className="h-4 w-px bg-border-dim" aria-hidden />
          <a
            href="https://github.com/ckgrafico/loop-task"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="text-text-sec transition-colors hover:text-text"
          >
            <GithubLogo size={18} />
          </a>
          <a
            href="https://www.npmjs.com/package/loop-task"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-text-sec transition-colors hover:text-text"
          >
            npm
          </a>
        </div>

        {/* Mobile: docs + GitHub only */}
        <div className="flex items-center gap-4 md:hidden">
          <a href="/docs" className="text-sm text-text-sec transition-colors hover:text-text">
            Docs
          </a>
          <a
            href="https://github.com/ckgrafico/loop-task"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="text-text-sec transition-colors hover:text-text"
          >
            <GithubLogo size={18} />
          </a>
        </div>
      </nav>
    </header>
  );
}

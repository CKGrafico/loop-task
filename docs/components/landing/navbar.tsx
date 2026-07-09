'use client';

import { GithubLogoIcon, RepeatIcon } from '@phosphor-icons/react/dist/ssr';

const LINKS = [
  { href: '/#loops', label: 'Loop engineering' },
  { href: '/#features', label: 'Features' },
  { href: '/#compare', label: 'Crons' },
  { href: '/#examples', label: 'Examples' },
  { href: '/docs', label: 'See Docs' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-base/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <a href="/" className="group flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-brand transition-colors group-hover:bg-brand/20">
            <RepeatIcon size={15} weight="bold" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-tight text-text">
            loop-task
          </span>
        </a>

        {/* Nav links */}
        <div className="flex items-center gap-6 text-sm">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-text-sec transition-colors hover:text-text sm:inline"
            >
              {l.label}
            </a>
          ))}
          <span className="hidden h-4 w-px bg-border-dim sm:inline" aria-hidden />
          <a
            href="https://github.com/ckgrafico/loop-task"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="text-text-sec transition-colors hover:text-text"
          >
            <GithubLogoIcon size={18} />
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
      </nav>
    </header>
  );
}

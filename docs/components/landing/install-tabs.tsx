'use client';

import { useState } from 'react';
import { CopyButton } from './copy-button';

const MANAGERS = [
  { id: 'npm', cmd: 'npm install -g loop-task' },
  { id: 'pnpm', cmd: 'pnpm add -g loop-task' },
  { id: 'yarn', cmd: 'yarn global add loop-task' },
  { id: 'bun', cmd: 'bun add -g loop-task' },
] as const;

export function InstallTabs({ className }: { className?: string }) {
  const [active, setActive] = useState<(typeof MANAGERS)[number]['id']>('npm');
  const current = MANAGERS.find((m) => m.id === active)!;

  return (
    <div
      className={`w-full max-w-md overflow-hidden rounded-xl border border-border-dim bg-input text-left ${className ?? ''}`}
    >
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-dim px-2">
        {MANAGERS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActive(m.id)}
            className={`relative px-3 py-2 font-mono text-xs transition-colors ${
              m.id === active
                ? 'text-brand'
                : 'text-text-muted hover:text-text-sec'
            }`}
          >
            {m.id}
            {m.id === active && (
              <span className="absolute inset-x-2 -bottom-px h-px bg-brand" />
            )}
          </button>
        ))}
      </div>

      {/* Command */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="select-none font-mono text-sm text-text-muted">$</span>
        <code className="flex-1 truncate font-mono text-sm text-text">
          {current.cmd}
        </code>
        <CopyButton text={current.cmd} />
      </div>
    </div>
  );
}

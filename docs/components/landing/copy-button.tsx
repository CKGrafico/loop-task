'use client';

import { useState, useCallback } from 'react';
import { Check, Copy } from '@phosphor-icons/react/dist/ssr';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors border border-border-dim hover:border-brand hover:text-brand text-text-muted ${className ?? ''}`}
    >
      {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
    </button>
  );
}

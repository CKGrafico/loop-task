import { CopyButton } from './copy-button';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <div className="rounded-xl border border-border-dim bg-input overflow-hidden">
      {/* Terminal title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-dim">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-danger/80" />
          <span className="h-3 w-3 rounded-full bg-warning/80" />
          <span className="h-3 w-3 rounded-full bg-success/80" />
        </div>
        {language && (
          <span className="text-xs text-text-muted font-mono">{language}</span>
        )}
        <CopyButton text={code} />
      </div>

      {/* Code content */}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono text-text-sec">{code}</code>
      </pre>
    </div>
  );
}

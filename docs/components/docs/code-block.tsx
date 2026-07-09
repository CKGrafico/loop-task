import { CopyButton } from '@/components/landing/copy-button'

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border-dim bg-input">
      {/* Terminal title bar */}
      <div className="flex items-center justify-between border-b border-border-dim px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-danger/80" />
          <span className="h-3 w-3 rounded-full bg-warning/80" />
          <span className="h-3 w-3 rounded-full bg-success/80" />
        </div>
        {language && (
          <span className="font-mono text-xs text-text-muted">{language}</span>
        )}
        <CopyButton text={code} />
      </div>

      {/* Code content */}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-text-sec">{code}</code>
      </pre>
    </div>
  )
}

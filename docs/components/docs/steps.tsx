import type { ReactNode } from 'react'

interface StepsProps {
  children: ReactNode
}

export function Steps({ children }: StepsProps) {
  return (
    <ol className="my-4 list-none space-y-6 pl-0">
      {Array.isArray(children)
        ? children.map((child, i) => (
            <li key={i} className="relative pl-10">
              {/* Numbered circle */}
              <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-brand bg-brand/10 text-xs font-semibold text-brand">
                {i + 1}
              </span>
              <div className="text-sm leading-relaxed text-text-sec [&>p]:mb-1 [&>p:first-child]:mt-0.5">
                {child}
              </div>
            </li>
          ))
        : children}
    </ol>
  )
}

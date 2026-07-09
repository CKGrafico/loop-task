'use client'

import { useState } from 'react'

interface TabItem {
  label: string
  content: React.ReactNode
}

interface TabsProps {
  items: TabItem[]
}

export function Tabs({ items }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="my-4">
      {/* Tab buttons */}
      <div className="flex gap-0 border-b border-border-dim">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              i === activeIndex
                ? 'text-brand'
                : 'text-text-muted hover:text-text-sec'
            }`}
          >
            {item.label}
            {/* Active indicator */}
            {i === activeIndex && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-b-lg border border-t-0 border-border-dim bg-surface p-4 text-sm leading-relaxed text-text-sec">
        {items[activeIndex]?.content}
      </div>
    </div>
  )
}

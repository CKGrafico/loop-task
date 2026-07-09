'use client'

import type { ReactNode } from 'react'

type CalloutType = 'info' | 'warning' | 'danger' | 'success'

interface CalloutProps {
  type?: CalloutType
  title?: string
  children: ReactNode
}

const accentMap: Record<CalloutType, string> = {
  info: 'border-l-loop bg-loop/5',
  warning: 'border-l-warning bg-warning/5',
  danger: 'border-l-danger bg-danger/5',
  success: 'border-l-success bg-success/5',
}

const iconColorMap: Record<CalloutType, string> = {
  info: 'text-loop',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
}

const labelMap: Record<CalloutType, string> = {
  info: 'Info',
  warning: 'Warning',
  danger: 'Danger',
  success: 'Success',
}

function CalloutIcon({ type }: { type: CalloutType }) {
  const cls = iconColorMap[type]
  switch (type) {
    case 'info':
      return (
        <svg className={cls} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 5V5.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 8V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'warning':
      return (
        <svg className={cls} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 2L16.5 15H1.5L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 7V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 12.5V12.51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'danger':
      return (
        <svg className={cls} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 6L12 12M12 6L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'success':
      return (
        <svg className={cls} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 9.5L8 12L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  return (
    <div
      className={`my-4 rounded-lg border-l-4 border border-border-dim p-4 ${accentMap[type]}`}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0">
          <CalloutIcon type={type} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm font-semibold text-text">
            {title ?? labelMap[type]}
          </p>
          <div className="text-sm leading-relaxed text-text-sec [&>p]:my-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import { RootProvider } from 'fumadocs-ui/provider'
import './global.css'

export const metadata: Metadata = {
  title: 'loop-task — Run anything on a cadence',
  description:
    'A command-first terminal application for running tasks on a cadence. Manage loops, tasks, and projects with keyboard-only navigation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <RootProvider
          theme={{
            enabled: true,
            defaultTheme: 'dark',
            forcedTheme: 'dark',
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}

import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { source } from '@/app/source'

export default function DocsLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'loop-task',
        enabled: true,
      }}
    >
      {children}
    </DocsLayout>
  )
}

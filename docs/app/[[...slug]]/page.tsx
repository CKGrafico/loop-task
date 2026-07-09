import { source } from '@/app/source'
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page'
import { notFound } from 'next/navigation'
import defaultMdxComponents from 'fumadocs-ui/mdx'

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  const page = source.getPage(slug)

  if (!page) {
    notFound()
  }

  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && (
        <DocsDescription>{page.data.description}</DocsDescription>
      )}
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams().map((param) => ({
    slug: param.slug,
  }))
}

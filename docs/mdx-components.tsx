import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { Callout, CodeBlock, Steps, Tabs } from '@/components/docs'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Callout,
    CodeBlock,
    Steps,
    Tabs,
    ...components,
  }
}

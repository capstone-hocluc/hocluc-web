import type { Element as HastElement, ElementContent } from 'hast'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { insertChoiceGrids } from './exam-html'
import { PAGE_BREAK_COMMENT } from './export-text'

interface MarkdownNode {
  type: string
  value?: string
  children?: MarkdownNode[]
  position?: { start: { offset?: number } }
}

const PAGE_BREAK = /^<!--\s*pagebreak\s*-->$/i
const LINE_BREAK = /^<br\s*\/?>$/i

function isPageBreak(node: MarkdownNode): boolean {
  if (node.type === 'html') return PAGE_BREAK.test(node.value?.trim() ?? '')
  // LaTeX's \newpage on a line of its own, as some exam sources write it.
  const only = node.type === 'paragraph' && node.children?.length === 1 ? node.children[0] : null
  return only?.type === 'text' && only.value?.trim() === '\\newpage'
}

/** Page-break markers at the top level; the rule written just before one (as the export writes it) belongs to it. */
function remarkPageBreaks() {
  return (tree: MarkdownNode) => {
    const children: MarkdownNode[] = []
    for (const node of tree.children ?? []) {
      if (!isPageBreak(node)) {
        children.push(node)
        continue
      }
      if (children[children.length - 1]?.type === 'thematicBreak') children.pop()
      children.push({ type: 'html', value: PAGE_BREAK_COMMENT })
    }
    tree.children = children
  }
}

const element = (tagName: string, properties: Record<string, string> = {}, children: ElementContent[] = []): HastElement => ({
  type: 'element',
  tagName,
  properties,
  children,
})

const formula = (latex: string, display: boolean) =>
  element('span', { dataMath: '', dataLatex: latex, dataDisplay: String(display) })

/**
 * Markdown (GFM, `$…$` / `$$…$$` formulas) as the editor's HTML: formulas as math spans, the page-break marker as a
 * page break, "A. …" option lines as choice grids. Raw HTML is dropped, except <br> and the page-break marker.
 */
export function markdownToElement(markdown: string): HTMLElement {
  const html = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkPageBreaks)
    .use(remarkRehype, {
      handlers: {
        html: (_state, node: MarkdownNode) => {
          const value = node.value?.trim() ?? ''
          if (PAGE_BREAK.test(value)) return element('div', { dataPageBreak: '' })
          return LINE_BREAK.test(value) ? element('br') : undefined
        },
        // `$$…$$` inside a line of text is a display formula too (remark-math reads it as inline math).
        inlineMath: (_state, node: MarkdownNode) => {
          const offset = node.position?.start.offset
          return formula(node.value ?? '', typeof offset === 'number' && markdown.startsWith('$$', offset))
        },
        math: (_state, node: MarkdownNode) => element('p', {}, [formula(node.value ?? '', true)]),
      },
    })
    .use(rehypeStringify)
    .processSync(markdown)
    .toString()
  const body = new DOMParser().parseFromString(html, 'text/html').body
  insertChoiceGrids(body)
  return body
}

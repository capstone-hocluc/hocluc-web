import type { Editor, JSONContent } from '@tiptap/core'
import { normalizeLinkHref } from '../link-url'
import { CHOICE_LABELS } from '../nodes/choice-grid'
import { downloadBlob, fileNameFor, plainText } from './file-name'

/** The envelope of a JSON export; an import also takes a bare Tiptap document. */
export const DOC_FORMAT = 'hocluc-exam-doc'
export const DOC_FORMAT_VERSION = 1

/** Marker of a page break in Markdown: a rule followed by this comment (a rule alone stays a rule). */
export const PAGE_BREAK_COMMENT = '<!-- pagebreak -->'

/* ---------- Inline ---------- */

type InlineMark = { type: 'link'; href: string } | { type: 'bold' | 'italic' | 'strike' }

const DELIMITERS = { bold: '**', italic: '*', strike: '~~' } as const

/** Markdown marks of a node, outermost first. Underline, colours, sizes, boxes, sub/superscript have no Markdown. */
function markdownMarks(node: JSONContent): InlineMark[] {
  const marks: InlineMark[] = []
  // Only addresses the editor would allow today; an unsafe stored one (e.g. `javascript:`) becomes plain text.
  const stored = node.marks?.find((mark) => mark.type === 'link')?.attrs?.href
  const href = typeof stored === 'string' && stored ? normalizeLinkHref(stored) : null
  if (href) marks.push({ type: 'link', href })
  for (const type of ['bold', 'italic', 'strike'] as const) {
    if (node.marks?.some((mark) => mark.type === type)) marks.push({ type })
  }
  return marks
}

const sameMark = (a: InlineMark, b: InlineMark) => a.type === b.type && (a.type !== 'link' || (b.type === 'link' && a.href === b.href))

function escapeText(text: string, table: boolean): string {
  const escaped = text.replace(/[\\`*_~[\]$<>]/g, '\\$&')
  return table ? escaped.replace(/\|/g, '\\|') : escaped
}

function linkTarget(href: string): string {
  return /[\s()<>]/.test(href) ? `<${href.replace(/[<>]/g, encodeURIComponent)}>` : href
}

/** Characters that would start a heading, a list or a rule when they open a line of text. */
function escapeLineStart(line: string): string {
  const text = line.replace(/^\s+/, '')
  if (/^(#{1,6}|[-+])(\s|$)/.test(text) || /^(=+|-+)\s*$/.test(text)) return `\\${text}`
  const ordered = /^(\d{1,9})([.)])(\s|$)/.exec(text)
  return ordered ? `${ordered[1]}\\${text.slice(ordered[1].length)}` : text
}

const formulaMarkdown = (latex: string, display: boolean) => (display ? `$$${latex}$$` : `$${latex}$`)

/**
 * A formula for a table cell, where "|" splits cells and a "\|" escape would stay in the LaTeX: the same bars
 * written as commands ("\\" line breaks are kept as they are).
 */
function withoutPipes(latex: string): string {
  return latex.replace(/\\\\|\\\||\|/g, (match) => (match === '\\\\' ? match : match === '\\|' ? '\\Vert ' : '\\vert '))
}

/** Inline content as Markdown; hard breaks become "\n" (the caller turns them into Markdown line breaks). */
function inlineMarkdown(nodes: JSONContent[] = [], table = false): string {
  let out = ''
  const open: InlineMark[] = []
  // Whitespace never sits just inside a delimiter ("** a**" is not bold): it moves outside on close.
  const closeTo = (keep: number) => {
    while (open.length > keep) {
      const mark = open.pop() as InlineMark
      const spaces = /\s*$/.exec(out)?.[0] ?? ''
      out = out.slice(0, out.length - spaces.length)
      out += mark.type === 'link' ? `](${linkTarget(mark.href)})` : DELIMITERS[mark.type]
      out += spaces
    }
  }
  let afterFormula = false
  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      closeTo(0)
      out += '\n'
      afterFormula = false
      continue
    }
    const wanted = markdownMarks(node)
    let keep = 0
    while (keep < open.length && keep < wanted.length && sameMark(open[keep], wanted[keep])) keep += 1
    closeTo(keep)
    let body: string
    if (node.type === 'math') {
      const latex = String(node.attrs?.latex ?? '')
      body = formulaMarkdown(table ? withoutPipes(latex) : latex, Boolean(node.attrs?.display))
      // "$a$$b$" would read as one formula; an empty comment (dropped on import) keeps two formulas apart.
      if (afterFormula) out += '<!-- -->'
      afterFormula = true
    } else if (node.type === 'text') {
      const text = node.text ?? ''
      const leading = /^\s*/.exec(text)?.[0] ?? ''
      afterFormula = false
      if (leading.length === text.length) {
        out += text
        continue
      }
      if (open.length < wanted.length) out += leading
      body = escapeText(open.length < wanted.length ? text.slice(leading.length) : text, table)
    } else {
      body = escapeText(plainText(node), table)
      afterFormula = false
    }
    for (const mark of wanted.slice(open.length)) {
      out += mark.type === 'link' ? '[' : DELIMITERS[mark.type]
      open.push(mark)
    }
    out += body
  }
  closeTo(0)
  return out
}

/** A paragraph's lines: Markdown hard breaks (a backslash at the end of the line) between them. */
function lines(nodes: JSONContent[] = []): string {
  return inlineMarkdown(nodes)
    .split('\n')
    .map(escapeLineStart)
    .join('\\\n')
}

/* ---------- Blocks ---------- */

function displayFormulaOnly(node: JSONContent): string | null {
  const content = node.content ?? []
  return content.length === 1 && content[0].type === 'math' && content[0].attrs?.display ? String(content[0].attrs.latex ?? '') : null
}

function indentLines(text: string, indent: string): string {
  return text
    .split('\n')
    .map((line, index) => (index === 0 || !line ? line : indent + line))
    .join('\n')
}

function listMarkdown(node: JSONContent, ordered: boolean): string {
  const start = Math.max(1, Math.round(Number(node.attrs?.start) || 1))
  return (node.content ?? [])
    .map((item, index) => {
      const marker = ordered ? `${start + index}. ` : '- '
      // A nested list follows its line directly; other blocks of the item are paragraphs of their own.
      let body = ''
      for (const child of item.content ?? []) {
        const text = blockMarkdown(child).join('\n\n')
        if (text) body += body ? (/List$/.test(child.type ?? '') ? '\n' : '\n\n') + text : text
      }
      return marker + indentLines(body, ' '.repeat(marker.length))
    })
    .join('\n')
}

/** A cell as one table line: its blocks' text joined by <br>. */
function cellMarkdown(cell: JSONContent): string {
  const parts: string[] = []
  const visit = (block: JSONContent) => {
    if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'choiceCell') {
      const text = inlineMarkdown(block.content, true).replace(/\n/g, '<br>')
      if (text) parts.push(text)
    } else if (block.type === 'image') {
      parts.push(`![${escapeText(String(block.attrs?.alt ?? ''), true)}](${linkTarget(String(block.attrs?.src ?? ''))})`)
    } else {
      block.content?.forEach(visit)
    }
  }
  cell.content?.forEach(visit)
  return parts.join('<br>') || ' '
}

/** A GFM table; its first row is the header row. Merged cells are written once, followed by empty cells. */
function tableMarkdown(node: JSONContent): string {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).flatMap((cell) => {
      const span = Math.max(1, Number(cell.attrs?.colspan) || 1)
      return [cellMarkdown(cell), ...Array<string>(span - 1).fill(' ')]
    })
  )
  const count = Math.max(1, ...rows.map((row) => row.length))
  const line = (cells: string[]) => `| ${[...cells, ...Array<string>(count - cells.length).fill(' ')].join(' | ')} |`
  const [header = [], ...body] = rows
  return [line(header), line(Array<string>(count).fill('---')), ...body.map(line)].join('\n')
}

function blockMarkdown(node: JSONContent): string[] {
  switch (node.type) {
    case 'paragraph': {
      const display = displayFormulaOnly(node)
      if (display !== null) return [`$$\n${display}\n$$`]
      const text = lines(node.content)
      return text.trim() ? [text] : []
    }
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1))
      return [`${'#'.repeat(level)} ${inlineMarkdown(node.content).replace(/\n/g, ' ').trim()}`]
    }
    case 'bulletList':
      return [listMarkdown(node, false)]
    case 'orderedList':
      return [listMarkdown(node, true)]
    case 'table':
      return [tableMarkdown(node)]
    case 'image':
      return [`![${escapeText(String(node.attrs?.alt ?? ''), false)}](${linkTarget(String(node.attrs?.src ?? ''))})`]
    case 'horizontalRule':
      return ['---']
    case 'pageBreak':
      return ['---', PAGE_BREAK_COMMENT]
    case 'choiceGrid':
      // One option per paragraph, "A." in bold, as the options read on paper.
      return (node.content ?? []).map((cell, index) => {
        const label = String(cell.attrs?.label ?? CHOICE_LABELS[index] ?? index + 1)
        return `**${label}.** ${lines(cell.content)}`.trimEnd()
      })
    case 'examHeader':
      // Each column as one paragraph of lines, left (school) then right (exam).
      return (node.content ?? [])
        .map((column) => (column.content ?? []).map((line) => lines(line.content)).filter(Boolean).join('\\\n'))
        .filter(Boolean)
    default:
      return blocksMarkdown(node.content)
  }
}

function blocksMarkdown(nodes: JSONContent[] = []): string[] {
  return nodes.flatMap(blockMarkdown)
}

/** The document as Markdown (GFM tables, `$…$` / `$$…$$` formulas). */
export function docToMarkdown(doc: JSONContent): string {
  return `${blocksMarkdown(doc.content).join('\n\n')}\n`
}

/** Downloads the editor's document (the original, or the variant `code` being viewed) as Markdown. */
export function exportMarkdown(editor: Editor, code: string | null = null) {
  const doc = editor.getJSON()
  downloadBlob(new Blob([docToMarkdown(doc)], { type: 'text/markdown;charset=utf-8' }), fileNameFor(doc, 'md', code))
}

/** Downloads the editor's document as JSON in the `hocluc-exam-doc` envelope, which "Mở file" reads back as it was. */
export function exportJson(editor: Editor, code: string | null = null) {
  const doc = editor.getJSON()
  const text = JSON.stringify({ format: DOC_FORMAT, version: DOC_FORMAT_VERSION, content: doc }, null, 2)
  downloadBlob(new Blob([text], { type: 'application/json;charset=utf-8' }), fileNameFor(doc, 'json', code))
}

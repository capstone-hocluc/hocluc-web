import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { END_LINE } from './exam-lines'

/*
 * The exam as the sheet shows it, read as plain text for the AI assistant: what "câu 5" says now (the teacher may have
 * typed or edited it), the passage above it, and an outline of the whole paper. Formulas are written $latex$, so the
 * model reads them as the teacher wrote them.
 */

const QUESTION_LINE = /^\s*Câu\s+(\d{1,3})\s*[.:]/u
const OPTION_LINE = /^\s*[A-H]\s*[.)]/u
const LABELS = 'ABCDEFGH'
/** The most of the passage above a question sent with it. */
const MAX_CONTEXT = 3000

/** A textblock's words: text runs, formulas as $…$, line breaks; pictures and charts as a placeholder. */
export function inlineText(node: ProseMirrorNode): string {
  let out = ''
  node.forEach((child) => {
    if (child.isText) out += child.text ?? ''
    else if (child.type.name === 'math') {
      const latex = String(child.attrs.latex ?? '')
      out += child.attrs.display ? `$$${latex}$$` : `$${latex}$`
    } else if (child.type.name === 'hardBreak') out += '\n'
    else if (child.type.name === 'image') out += '[hình]'
    else out += child.isTextblock ? inlineText(child) : child.textContent
  })
  return out
}

/** One block as text: options as "A. …" lines, a table as "| a | b |" rows, lists as "- …" lines. */
export function blockText(node: ProseMirrorNode): string {
  switch (node.type.name) {
    case 'choiceGrid': {
      const lines: string[] = []
      node.forEach((cell, _offset, index) => {
        const label = String(cell.attrs.label ?? LABELS[index] ?? '')
        lines.push(`${label}. ${cell.isTextblock ? inlineText(cell) : childrenText(cell)}`.trim())
      })
      return lines.join('\n')
    }
    case 'table': {
      const rows: string[] = []
      node.forEach((row) => {
        const cells: string[] = []
        row.forEach((cell) => cells.push(childrenText(cell).replace(/\n/g, ' ')))
        rows.push(`| ${cells.join(' | ')} |`)
      })
      return rows.join('\n')
    }
    case 'image':
      return '[hình]'
    case 'chart':
      return '[biểu đồ]'
    case 'bulletList':
    case 'orderedList': {
      const lines: string[] = []
      node.forEach((item) => lines.push(`- ${childrenText(item)}`))
      return lines.join('\n')
    }
    default:
      return node.isTextblock ? inlineText(node) : childrenText(node)
  }
}

function childrenText(node: ProseMirrorNode): string {
  const parts: string[] = []
  node.forEach((child) => parts.push(child.isTextblock ? inlineText(child) : blockText(child)))
  return parts.filter(Boolean).join('\n')
}

/** A question as the sheet prints it. */
export interface SheetQuestion {
  number: number
  /** Start of its "Câu n." line and end of its last block. */
  from: number
  to: number
  /** The draft item it came from, when the AI wrote it. */
  itemId: string | null
  /** Its stem and options as text. */
  text: string
  /** The passage or lead above it (shared by the questions under it), or null. */
  context: string | null
}

/** A block that starts something other than the question before it: a part, a passage lead, the end, the key. */
function isBoundary(node: ProseMirrorNode) {
  const { attrs } = node
  if (attrs.examGroup || attrs.examPart || attrs.examKey) return true
  if (node.type.name === 'heading' || node.type.name === 'pageBreak') return true
  return node.type.name === 'paragraph' && END_LINE.test(node.textContent.trim())
}

const questionNumber = (node: ProseMirrorNode) =>
  node.type.name === 'paragraph' && !node.attrs.examKey ? Number(QUESTION_LINE.exec(node.textContent)?.[1] ?? 0) : 0

/**
 * Every "Câu n." question on the sheet before the answer key, in order: its blocks run from its line to the next
 * question, part, passage lead or end line, or stop after its options (so a passage typed below them belongs to the
 * next question). Each carries the passage above it: the blocks after the last part heading or after the questions
 * of the previous passage.
 */
export function sheetQuestions(doc: ProseMirrorNode): SheetQuestion[] {
  const blocks: Array<{ node: ProseMirrorNode; pos: number }> = []
  doc.forEach((node, pos) => blocks.push({ node, pos }))
  const questions: SheetQuestion[] = []
  let context: string[] = []
  let afterQuestion = false
  let index = 0
  while (index < blocks.length) {
    const { node, pos } = blocks[index]
    if (node.attrs.examKey) break
    const number = questionNumber(node)
    if (number === 0) {
      if (isBoundary(node)) {
        context = node.attrs.examGroup ? [blockText(node)] : []
        afterQuestion = false
      } else {
        if (afterQuestion) context = []
        afterQuestion = false
        const text = blockText(node).trim()
        if (text) context.push(text)
      }
      index++
      continue
    }
    const lines = [blockText(node)]
    let end = index + 1
    let options = 0
    while (end < blocks.length && !isBoundary(blocks[end].node) && questionNumber(blocks[end].node) === 0) {
      const next = blocks[end].node
      const text = blockText(next)
      lines.push(text)
      end++
      if (next.type.name === 'choiceGrid') break
      if (next.type.name === 'paragraph' && OPTION_LINE.test(text) && ++options >= 4) break
    }
    const last = blocks[end - 1]
    const passage = context.join('\n').trim()
    questions.push({
      number,
      from: pos,
      to: last.pos + last.node.nodeSize,
      itemId: node.attrs.examItem ? String(node.attrs.examItem) : null,
      text: lines.filter((line) => line.trim()).join('\n'),
      context: passage ? passage.slice(0, MAX_CONTEXT) : null,
    })
    afterQuestion = true
    index = end
  }
  return questions
}

/**
 * The question the teacher means by `number`: the AI's when the sheet prints the number twice (a template's empty
 * "Câu 1." above the AI's), else the first.
 */
export function sheetQuestion(questions: SheetQuestion[], number: number): SheetQuestion | null {
  const found = questions.filter((question) => question.number === number)
  return found.find((question) => question.itemId) ?? found.find((question) => !/Viết câu dẫn\.?$/u.test(question.text.split('\n')[0])) ?? found[0] ?? null
}

/** The exam on the sheet for the assistant: its outline and each question's words (with the passage above it). */
export function sheetDocument(doc: ProseMirrorNode): { outline: string; questions: Array<{ number: number; text: string }> } {
  return {
    outline: sheetOutline(doc),
    questions: sheetQuestions(doc).map((question) => ({
      number: question.number,
      text: question.context ? `${question.context}\n\n${question.text}` : question.text,
    })),
  }
}

/** The paper in a few lines: its headings and each question's first words, for the assistant to find its way. */
export function sheetOutline(doc: ProseMirrorNode): string {
  const lines: string[] = []
  let ended = false
  doc.forEach((node) => {
    if (ended || node.attrs.examKey) {
      ended = true
      return
    }
    if (node.type.name === 'heading') lines.push(`## ${node.textContent.trim()}`)
    else if (questionNumber(node) > 0) {
      const text = inlineText(node).replace(/\s+/g, ' ').trim()
      lines.push(text.length > 90 ? `${text.slice(0, 89)}…` : text)
    }
  })
  return lines.join('\n')
}

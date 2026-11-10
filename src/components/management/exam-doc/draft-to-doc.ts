import type { JSONContent } from '@tiptap/react'
import { hasMarkTags, MarkReader, splitText as split } from '../../ui/math-split'
import {
  questionNumbers,
  type ExamPaper,
  type ExamPaperGroup,
  type ExamPaperPart,
  type ExamPaperQuestion,
} from '../ai-assistant/exam-format'
import { chartBlock } from './chart-data'
import { CHOICE_LABELS, choiceGridContent } from './nodes/choice-grid'

/**
 * Plain text with `$…$` formulas as editor inline content: text runs and math nodes, line breaks kept. Words the text
 * underlines (`<u>…</u>`) or sets bold (`<b>…</b>`, `**…**`) carry the editor's underline and bold marks.
 */
export function inlineContent(text: string, marks?: JSONContent['marks']): JSONContent[] {
  const content: JSONContent[] = []
  for (const piece of split(text)) {
    if ('formula' in piece) {
      content.push({ type: 'math', attrs: { latex: piece.formula, display: piece.display } })
      continue
    }
    const runMarks = [...(marks ?? [])]
    for (const mark of piece.marks ?? []) {
      if (!runMarks.some((existing) => existing.type === mark)) runMarks.push({ type: mark })
    }
    piece.text.split('\n').forEach((line, index) => {
      if (index > 0) content.push({ type: 'hardBreak' })
      if (line) content.push({ type: 'text', text: line, ...(runMarks.length ? { marks: runMarks } : {}) })
    })
  }
  return content
}

/**
 * A sheet saved before its words' `<u>…</u>`, `<b>…</b>` and `**…**` were read still holds them as text: each
 * textblock's tags become the underline and bold they stand for. A sheet without such tags comes back as it is.
 */
export function markTags(doc: JSONContent): JSONContent {
  return hasMarkTags(JSON.stringify(doc)) ? markBlock(doc) : doc
}

function markBlock(node: JSONContent): JSONContent {
  if (!node.content) return node
  const runs = node.content.flatMap((child) => (child.type === 'text' ? [child.text ?? ''] : []))
  let content = node.content
  if (runs.some(hasMarkTags)) {
    const reader = new MarkReader(runs)
    content = content.flatMap((child) => {
      if (child.type !== 'text') return [child]
      return reader.read(child.text ?? '').map((run) => {
        const marks = [...(child.marks ?? [])]
        for (const mark of run.marks ?? []) {
          if (!marks.some((existing) => existing.type === mark)) marks.push({ type: mark })
        }
        return { ...child, text: run.text, ...(marks.length ? { marks } : {}) }
      })
    })
  }
  return { ...node, content: content.map(markBlock) }
}

const paragraph = (content: JSONContent[], attrs?: Record<string, unknown>): JSONContent => ({
  type: 'paragraph',
  ...(attrs ? { attrs } : {}),
  ...(content.length ? { content } : {}),
})

const heading = (level: 1 | 2 | 3, text: string, attrs: Record<string, unknown> = {}): JSONContent => ({
  type: 'heading',
  attrs: { level, textAlign: 'left', ...attrs },
  content: inlineContent(text),
})

const image = (src: string | null, alt: string): JSONContent[] => (src ? [{ type: 'image', attrs: { src, alt } }] : [])

const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_RULE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/

/** The cells of a `| a | b |` row; a `|` inside a `$…$` formula (an absolute value) does not split a cell. */
function tableCells(row: string): string[] {
  const inner = row.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  let inMath = false
  for (const char of inner) {
    if (char === '$') inMath = !inMath
    if (char === '|' && !inMath) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function tableBlock(header: string[], body: string[][]): JSONContent {
  const width = header.length
  const row = (values: string[], type: 'tableHeader' | 'tableCell'): JSONContent => ({
    type: 'tableRow',
    content: Array.from({ length: width }, (_, column) => ({
      type,
      content: [paragraph(inlineContent(values[column] ?? ''))],
    })),
  })
  return { type: 'table', content: [row(header, 'tableHeader'), ...body.map((values) => row(values, 'tableCell'))] }
}

/**
 * Text as editor blocks: Markdown pipe tables (a header row, a `|---|` rule, then rows) become tables; the text
 * between them stays one paragraph each, with its line breaks.
 */
export function textBlocks(text: string): JSONContent[] {
  const blocks: JSONContent[] = []
  let lines: string[] = []
  const flush = () => {
    const kept = lines.join('\n').replace(/^\s*\n|\n\s*$/g, '')
    if (kept.trim()) blocks.push(paragraph(inlineContent(kept)))
    lines = []
  }
  const rows = text.split('\n')
  for (let index = 0; index < rows.length; index++) {
    if (TABLE_ROW.test(rows[index]) && TABLE_RULE.test(rows[index + 1] ?? '')) {
      flush()
      const header = tableCells(rows[index])
      const body: string[][] = []
      index += 2
      while (index < rows.length && TABLE_ROW.test(rows[index])) body.push(tableCells(rows[index++]))
      index--
      blocks.push(tableBlock(header, body))
      continue
    }
    lines.push(rows[index])
  }
  flush()
  return blocks
}

/**
 * A shared passage: its lead line (tagged with the group), the passage and its figure. The lead names the question
 * range only when every question of the group is known (`numbers`); questions that arrive one by one get a lead
 * without numbers, since a wrong range would also mislead the exam-variant builder that reads it.
 */
function groupBlocks(group: ExamPaperGroup, numbers: number[] | null): JSONContent[] {
  const range = numbers && numbers.length > 0
    ? `câu ${numbers[0]}${numbers.length > 1 ? `–${numbers[numbers.length - 1]}` : ''}`
    : null
  const title = group.instruction?.trim() ||
    (range ? `Dựa vào thông tin dưới đây để trả lời ${range}` : 'Dựa vào thông tin dưới đây để trả lời các câu hỏi sau')
  return [
    paragraph(inlineContent(title, [{ type: 'bold' }, { type: 'italic' }]), { examGroup: group.id }),
    ...(group.passage ? textBlocks(group.passage) : []),
    ...image(group.passageImageUrl, range ? `Hình minh hoạ ngữ liệu ${range}` : 'Hình minh hoạ ngữ liệu'),
    ...(group.chart ? [chartBlock(group.chart)] : []),
  ]
}

/**
 * Options lettered A, B, C… in order become a choice grid (it lays them out 4, 2 or 1 per row and keeps the letters
 * in order); other labels (a), b)…) stay one indented line each.
 */
function optionBlocks(options: ExamPaperQuestion['options']): JSONContent[] {
  if (options.length === 0) return []
  if (options.length <= CHOICE_LABELS.length && options.every((option, index) => option.label === CHOICE_LABELS[index])) {
    return [choiceGridContent(options.map((option) => inlineContent(option.text)))]
  }
  return options.map((option) => paragraph([
    { type: 'text', text: `${option.label}. `, marks: [{ type: 'bold' }] },
    ...inlineContent(option.text),
  ], { indent: 1 }))
}

function questionBlocks(question: ExamPaperQuestion, number: number): JSONContent[] {
  // The number leads the first paragraph of the stem; a stem that opens with a table gets a line of its own.
  const [first, ...rest] = textBlocks(question.prompt)
  const opening = first?.type === 'paragraph' ? (first.content ?? []) : []
  return [
    paragraph([{ type: 'text', text: `Câu ${number}. `, marks: [{ type: 'bold' }] }, ...opening], {
      examItem: question.id,
    }),
    ...(first && first.type !== 'paragraph' ? [first] : []),
    ...rest,
    ...image(question.imageUrl, `Hình minh hoạ câu ${number}`),
    ...(question.chart ? [chartBlock(question.chart)] : []),
    ...optionBlocks(question.options),
  ]
}

/**
 * Blocks for draft questions, numbered as on the paper. A shared passage is written once: before the first of its
 * questions here, and not at all when `shownGroups` says the document already has it. `complete` means these are all
 * the questions of their groups (a whole draft), so passage leads may name their question range.
 */
export function questionsToBlocks(
  paper: ExamPaper,
  questions: ExamPaperQuestion[],
  { shownGroups = new Set<string>(), complete = false }: { shownGroups?: ReadonlySet<string>; complete?: boolean } = {}
): JSONContent[] {
  const numbers = questionNumbers(paper)
  const groups = new Map(paper.groups.map((group) => [group.id, group]))
  const shown = new Set(shownGroups)
  const blocks: JSONContent[] = []
  for (const question of questions) {
    const group = question.groupId ? groups.get(question.groupId) : undefined
    if (group && !shown.has(group.id)) {
      shown.add(group.id)
      const groupNumbers = complete
        ? questions.filter((item) => item.groupId === group.id).map((item) => numbers.get(item.id) ?? 1)
        : null
      blocks.push(...groupBlocks(group, groupNumbers))
    }
    blocks.push(...questionBlocks(question, numbers.get(question.id) ?? 1))
  }
  return blocks
}

/** The heading of the larger section a sub-part belongs to ("PHẦN 1. SỬ DỤNG NGÔN NGỮ"). */
export const parentHeadingText = (part: ExamPaperPart) => part.parentTitle?.toUpperCase() ?? null

/**
 * A part's heading (tagged with the part), preceded by its section heading unless `parentShown` says the document
 * already has that one.
 */
export function partHeadings(part: ExamPaperPart, parentShown: boolean): JSONContent[] {
  const parentText = parentHeadingText(part)
  if (parentText === null) return [heading(2, part.title.toUpperCase(), { examPart: part.id })]
  return [
    ...(parentShown ? [] : [heading(2, parentText)]),
    heading(3, part.code ? `${part.code}. ${part.title}` : part.title, { examPart: part.id }),
  ]
}

/**
 * The AI draft as a first editor document: title, time line, part headings (tagged with their part), passages and
 * numbered questions (tagged with their draft item), and the list of items it already holds.
 */
export function draftToDoc(paper: ExamPaper): JSONContent {
  const content: JSONContent[] = [heading(1, paper.title.toUpperCase(), { textAlign: 'center' })]
  if (paper.durationMinutes) {
    content.push(
      paragraph(inlineContent(`Thời gian làm bài: ${paper.durationMinutes} phút`, [{ type: 'italic' }]), {
        textAlign: 'center',
      })
    )
  }

  // Only parts that hold questions get a heading; a part the AI writes into later gets its heading then.
  let parent: string | null = null
  for (const part of paper.parts) {
    const questions = paper.questions.filter((question) => question.partId === part.id)
    if (questions.length === 0) continue
    content.push(...partHeadings(part, part.parentTitle !== null && part.parentTitle === parent))
    parent = part.parentTitle
    content.push(...questionsToBlocks(paper, questions, { complete: true }))
  }
  content.push(paragraph([{ type: 'text', text: '--- HẾT ---', marks: [{ type: 'bold' }] }], { textAlign: 'center' }))
  return { type: 'doc', attrs: { deliveredItems: paper.questions.map((question) => question.id) }, content }
}

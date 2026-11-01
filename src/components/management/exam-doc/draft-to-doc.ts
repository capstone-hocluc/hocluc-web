import type { JSONContent } from '@tiptap/react'
import { splitFormulas as split } from '../../ui/math-split'
import { questionNumbers, type ExamPaper, type ExamPaperGroup, type ExamPaperQuestion } from '../ai-assistant/exam-format'
import { CHOICE_LABELS, choiceGridContent } from './nodes/choice-grid'

/** Plain text with `$…$` formulas as editor inline content: text runs and math nodes, line breaks kept. */
export function inlineContent(text: string, marks?: JSONContent['marks']): JSONContent[] {
  const content: JSONContent[] = []
  for (const piece of split(text)) {
    if ('formula' in piece) {
      content.push({ type: 'math', attrs: { latex: piece.formula, display: piece.display } })
      continue
    }
    piece.text.split('\n').forEach((line, index) => {
      if (index > 0) content.push({ type: 'hardBreak' })
      if (line) content.push({ type: 'text', text: line, ...(marks ? { marks } : {}) })
    })
  }
  return content
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
    ...(group.passage ? [paragraph(inlineContent(group.passage))] : []),
    ...image(group.passageImageUrl, range ? `Hình minh hoạ ngữ liệu ${range}` : 'Hình minh hoạ ngữ liệu'),
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
  return [
    paragraph(
      [{ type: 'text', text: `Câu ${number}. `, marks: [{ type: 'bold' }] }, ...inlineContent(question.prompt)],
      { examItem: question.id }
    ),
    ...image(question.imageUrl, `Hình minh hoạ câu ${number}`),
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

  let parent: string | null = null
  for (const part of paper.parts) {
    if (part.parentTitle && part.parentTitle !== parent) content.push(heading(2, part.parentTitle.toUpperCase()))
    parent = part.parentTitle ?? null
    content.push(part.parentTitle
      ? heading(3, part.code ? `${part.code}. ${part.title}` : part.title, { examPart: part.id })
      : heading(2, part.title.toUpperCase(), { examPart: part.id }))

    const questions = paper.questions.filter((question) => question.partId === part.id)
    content.push(...questionsToBlocks(paper, questions, { complete: true }))
  }
  content.push(paragraph([{ type: 'text', text: '--- HẾT ---', marks: [{ type: 'bold' }] }], { textAlign: 'center' }))
  return { type: 'doc', attrs: { deliveredItems: paper.questions.map((question) => question.id) }, content }
}

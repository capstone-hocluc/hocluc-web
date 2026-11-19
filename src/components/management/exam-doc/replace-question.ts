import type { Editor, JSONContent } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { isSoloGroup, type ExamPaper, type ExamPaperQuestion } from '../ai-assistant/exam-format'
import { questionsToBlocks } from './draft-to-doc'
import { END_LINE } from './exam-lines'

const QUESTION_NUMBER = /^\s*Câu\s+(\d+)/u

/** A block that starts something other than the question before it: the next question, passage, part or the end. */
function startsOther(node: ProseMirrorNode) {
  const { attrs } = node
  if (attrs.examItem || attrs.examGroup || attrs.examPart || attrs.examKey) return true
  if (node.type.name === 'heading' || node.type.name === 'pageBreak') return true
  return node.type.name === 'paragraph' && END_LINE.test(node.textContent.trim())
}

/** `block` with "Câu n" (its first text run, or a passage lead's "câu n") reading `number`. */
export function renumbered(block: JSONContent, number: number): JSONContent {
  const content = block.content ?? []
  const index = content.findIndex((child) => child.type === 'text')
  if (index < 0) return block
  const child = content[index]
  const text = block.attrs?.examGroup
    ? (child.text ?? '').replace(/câu \d+(?:–\d+)?/u, `câu ${number}`)
    : (child.text ?? '').replace(/^Câu \d+\./u, `Câu ${number}.`)
  const next = content.slice()
  next[index] = { ...child, text }
  return { ...block, content: next }
}

/**
 * Writes a question the AI rewrote ("Sửa câu 2") over its blocks on the sheet: from its "Câu n." line to the next
 * question, passage, part heading or the end line, keeping the number the sheet prints. Its own passage (one no other
 * question shares) is written again with it; a shared passage stays. Not an edit: Ctrl+Z does not undo it; the
 * document saves it like an edit, once. Returns the position of the question's line, or null when the sheet does not
 * hold the question.
 */
export function replaceQuestionBlocks(editor: Editor, paper: ExamPaper, question: ExamPaperQuestion): number | null {
  const blocks: Array<{ node: ProseMirrorNode; pos: number }> = []
  editor.state.doc.forEach((node, pos) => blocks.push({ node, pos }))
  const line = blocks.findIndex(({ node }) => node.attrs.examItem === question.id)
  if (line < 0) return null
  const number = Number(QUESTION_NUMBER.exec(blocks[line].node.textContent)?.[1] ?? 0)
  let end = line + 1
  while (end < blocks.length && !startsOther(blocks[end].node)) end++

  const solo = isSoloGroup(question.groupId)
  let start = line
  if (solo) {
    const lead = blocks.findIndex(({ node }) => node.attrs.examGroup === question.groupId)
    if (lead >= 0 && lead < line) start = lead
  }
  // A shared passage is already on the sheet; the question's own passage is part of what is rewritten.
  const shownGroups = new Set(question.groupId && !solo ? [question.groupId] : [])
  const content = questionsToBlocks(paper, [question], { shownGroups, complete: true }).map((block) =>
    number > 0 && (block.attrs?.examItem === question.id || block.attrs?.examGroup) ? renumbered(block, number) : block
  )
  const from = blocks[start].pos
  const last = blocks[end - 1]
  const tr = editor.state.tr.replaceWith(
    from,
    last.pos + last.node.nodeSize,
    content.map((block) => editor.schema.nodeFromJSON(block))
  )
  editor.view.dispatch(tr.setMeta('addToHistory', false))
  let at: number | null = null
  editor.state.doc.forEach((node, pos) => {
    if (at === null && node.attrs.examItem === question.id) at = pos
  })
  return at
}

/**
 * Writes `content` (a rewritten question's blocks) over the sheet's blocks from `from` to `to`, its "Câu n." reading
 * `number`. For a question the sheet alone holds (the teacher typed it). Not an edit, like the AI's other writes.
 */
export function replaceSheetRange(editor: Editor, from: number, to: number, number: number, content: JSONContent[]) {
  const blocks = content.map((block) => {
    const lead = (block.content ?? []).find((child) => child.type === 'text')?.text ?? ''
    const numbered = block.attrs?.examGroup || QUESTION_NUMBER.test(lead) ? renumbered(block, number) : block
    // The question is no draft item: no tag that would tie it to one.
    return numbered.attrs?.examItem ? { ...numbered, attrs: { ...numbered.attrs, examItem: null } } : numbered
  })
  const tr = editor.state.tr.replaceWith(from, to, blocks.map((block) => editor.schema.nodeFromJSON(block)))
  editor.view.dispatch(tr.setMeta('addToHistory', false))
}

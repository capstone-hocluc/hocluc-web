import type { Editor, JSONContent } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { showErrorToast } from '../../../lib/toastBus'
import type { AiSolutionStyle } from '../../../services/aiAssistantService'
import type { ExamPaper, ExamPaperPart, ExamPaperQuestion } from '../ai-assistant/exam-format'
import { inlineContent, textBlocks } from './draft-to-doc'
import { END_LINE } from './exam-lines'

type KeyKind = 'table' | 'guide'

/** Questions per row of the answer table, as Vietnamese answer keys print them. */
const KEY_ROW = 10
const QUESTION_LINE = /^\s*Câu\s+(\d+)/u

interface KeyEntry {
  number: number
  question: ExamPaperQuestion
}

interface KeySection {
  part: ExamPaperPart | null
  entries: KeyEntry[]
}

const tagged = (block: JSONContent, kind: KeyKind): JSONContent => ({ ...block, attrs: { ...block.attrs, examKey: kind } })

const paragraph = (content: JSONContent[], kind: KeyKind, attrs: Record<string, unknown> = {}): JSONContent => ({
  type: 'paragraph',
  attrs: { ...attrs, examKey: kind },
  ...(content.length ? { content } : {}),
})

const text = (value: string, marks?: string[]): JSONContent => ({
  type: 'text',
  text: value,
  ...(marks?.length ? { marks: marks.map((type) => ({ type })) } : {}),
})

const title = (value: string, kind: KeyKind): JSONContent => ({
  type: 'heading',
  attrs: { level: 2, textAlign: 'center', examKey: kind },
  content: [text(value)],
})

const isEndLine = (node: ProseMirrorNode) => node.type.name === 'paragraph' && END_LINE.test(node.textContent.trim())

/** The letter of the question's correct option; "—" when it has none. */
function answerOf(question: ExamPaperQuestion) {
  return question.options.find((option) => option.correct)?.label ?? '—'
}

const partTitle = (part: ExamPaperPart) => (part.code ? `${part.code}. ${part.title}` : part.title)

/**
 * The AI questions the document holds, in its order and with the numbers it prints ("Câu 7."), grouped under the
 * part heading they stand under. A question the teacher deleted is left out; one they renumbered keeps their number.
 */
function keySections(doc: ProseMirrorNode, paper: ExamPaper): KeySection[] {
  const questions = new Map(paper.questions.map((question) => [question.id, question]))
  const parts = new Map(paper.parts.map((part) => [part.id, part]))
  const sections: KeySection[] = []
  let part: ExamPaperPart | null = null
  let ended = false
  doc.forEach((node) => {
    if (ended || node.attrs.examKey || isEndLine(node)) {
      ended = true
      return
    }
    if (node.attrs.examPart) part = parts.get(String(node.attrs.examPart)) ?? null
    const question = node.attrs.examItem ? questions.get(String(node.attrs.examItem)) : undefined
    const number = question ? QUESTION_LINE.exec(node.textContent) : null
    if (!question || !number) return
    let section = sections.at(-1)
    if (!section || section.part !== part) {
      section = { part, entries: [] }
      sections.push(section)
    }
    section.entries.push({ number: Number(number[1]), question })
  })
  return sections
}

const keyCell = (value: string, bold = false): JSONContent => ({
  type: 'tableCell',
  content: [{ type: 'paragraph', attrs: { textAlign: 'center' }, ...(value ? { content: [text(value, bold ? ['bold'] : [])] } : {}) }],
})

/** The answers of one part as rows of ten: "Câu | 1 … 10" over "Đáp án | A … D". */
function answerTable(entries: KeyEntry[]): JSONContent {
  const width = Math.min(KEY_ROW, entries.length)
  const row = (head: string, values: string[]): JSONContent => ({
    type: 'tableRow',
    content: [keyCell(head, true), ...Array.from({ length: width }, (_, index) => keyCell(values[index] ?? '', head === 'Câu'))],
  })
  const rows: JSONContent[] = []
  for (let start = 0; start < entries.length; start += KEY_ROW) {
    const chunk = entries.slice(start, start + KEY_ROW)
    rows.push(row('Câu', chunk.map((entry) => String(entry.number))))
    rows.push(row('Đáp án', chunk.map((entry) => answerOf(entry.question))))
  }
  return { type: 'table', attrs: { examKey: 'table' }, content: rows }
}

function sectionTitle(section: KeySection, kind: KeyKind, many: boolean): JSONContent[] {
  if (!many || !section.part) return []
  return [paragraph([text(partTitle(section.part).toUpperCase(), ['bold'])], kind)]
}

/** "Câu 3. Chọn B." then the solution: in full, method, steps and why each wrong option is wrong. */
function guideBlocks(entry: KeyEntry, style: AiSolutionStyle): JSONContent[] {
  const { question } = entry
  if (question.failure) {
    return [paragraph([text(`Câu ${entry.number}. `, ['bold']), text('Chưa soạn được, chưa có đáp án.', ['italic'])], 'guide')]
  }
  const label = (value: string) => text(value, ['bold', 'italic'])
  const blocks: JSONContent[] = [
    paragraph([text(`Câu ${entry.number}. `, ['bold']), text('Chọn '), text(answerOf(question), ['bold']), text('.')], 'guide'),
  ]
  const full = style === 'full'
  if (full && question.method) blocks.push(paragraph([label('Phương pháp giải: '), ...inlineContent(question.method)], 'guide'))
  const explanation = question.explanation.trim()
  if (explanation) {
    if (full && (question.method || Object.keys(question.eliminations).length > 0)) {
      blocks.push(paragraph([label('Lời giải:')], 'guide'))
    }
    blocks.push(...textBlocks(explanation).map((block) => tagged(block, 'guide')))
  }
  const wrong = full ? question.options.filter((option) => !option.correct && question.eliminations[option.label]) : []
  if (wrong.length > 0) {
    blocks.push(paragraph([label('Phân tích, loại trừ:')], 'guide'))
    for (const option of wrong) {
      blocks.push(
        paragraph([text(`+ Đáp án ${option.label} sai: `), ...inlineContent(question.eliminations[option.label])], 'guide')
      )
    }
  }
  return blocks
}

/**
 * The answer key written after the end of the exam, each block tagged with `examKey`: a page break and BẢNG ĐÁP ÁN
 * (a table of ten per row for each part, and the questions the teacher should check), then a page break and
 * HƯỚNG DẪN GIẢI (each question's answer and solution). Empty when the document holds no AI question.
 */
export function answerKeyBlocks(doc: ProseMirrorNode, paper: ExamPaper, style: AiSolutionStyle): JSONContent[] {
  const sections = keySections(doc, paper)
  if (sections.length === 0) return []
  const many = sections.length > 1
  const review = sections.flatMap((section) => section.entries).filter((entry) => entry.question.needsReview)
  const blocks: JSONContent[] = [{ type: 'pageBreak', attrs: { examKey: 'table' } }, title('BẢNG ĐÁP ÁN', 'table')]
  for (const section of sections) blocks.push(...sectionTitle(section, 'table', many), answerTable(section.entries))
  if (review.length > 0) {
    blocks.push(
      paragraph(
        [text(`Câu cần thầy cô kiểm tra lại trước khi dùng: ${review.map((entry) => entry.number).join(', ')}.`, ['italic'])],
        'guide'
      )
    )
  }
  blocks.push({ type: 'pageBreak', attrs: { examKey: 'guide' } }, title('HƯỚNG DẪN GIẢI', 'guide'))
  for (const section of sections) {
    blocks.push(...sectionTitle(section, 'guide', many))
    for (const entry of section.entries) blocks.push(...guideBlocks(entry, style))
  }
  return blocks
}

/**
 * Writes the answer key again from the draft: the old key's blocks go, the new ones follow the end line (or end the
 * document when it has none). Not an edit: the caret stays and Ctrl+Z does not undo it; the document saves it like an
 * edit, once. Returns whether the document changed.
 */
export function replaceAnswerKey(editor: Editor, paper: ExamPaper, style: AiSolutionStyle): boolean {
  const { state } = editor
  const blocks = answerKeyBlocks(state.doc, paper, style)
  const old: Array<{ from: number; to: number; json: unknown }> = []
  state.doc.forEach((node, pos) => {
    if (node.attrs.examKey) old.push({ from: pos, to: pos + node.nodeSize, json: node.toJSON() })
  })
  const nodes = blocks.map((block) => editor.schema.nodeFromJSON(block))
  const same = old.length === nodes.length && nodes.every((node, index) => JSON.stringify(node.toJSON()) === JSON.stringify(old[index].json))
  if (same) return false

  const tr = state.tr
  for (const range of [...old].reverse()) tr.delete(range.from, range.to)
  let at = tr.doc.content.size
  tr.doc.forEach((node, pos) => {
    if (at === tr.doc.content.size && isEndLine(node)) at = pos + node.nodeSize
  })
  if (nodes.length > 0) tr.insert(at, nodes)
  editor.view.dispatch(tr.setMeta('addToHistory', false))
  return true
}

/** The document without its answer key, for an "exam only" download. */
export function withoutAnswerKey(doc: JSONContent): JSONContent {
  return { ...doc, content: (doc.content ?? []).filter((block) => !block.attrs?.examKey) }
}

/** Downloads the exam without its answer key as Word ("…-khong-dap-an.docx"). */
export async function downloadExamOnlyDocx(editor: Editor) {
  if (editor.isDestroyed) return
  try {
    const [{ buildDocx }, { downloadBlob }] = await Promise.all([import('./export/export-docx'), import('./export/file-name')])
    const { blob, fileName, formulas, missingImages } = await buildDocx(withoutAnswerKey(editor.getJSON()))
    downloadBlob(blob, fileName.replace(/\.docx$/i, '-khong-dap-an.docx'))
    if (missingImages) showErrorToast(`Không tải được ${missingImages} hình; tệp Word ghi tên hình ở chỗ đó`)
    if (formulas.texts) showErrorToast(`${formulas.texts} công thức được ghi dưới dạng LaTeX`)
  } catch {
    showErrorToast('Không tạo được tệp tải xuống')
  }
}

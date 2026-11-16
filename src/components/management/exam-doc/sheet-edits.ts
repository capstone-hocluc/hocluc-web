import type { Editor } from '@tiptap/react'
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import type { AiSheetEdit } from '../../../services/aiAssistantService'
import { sheetQuestion, sheetQuestions, type DraftPlace, type SheetQuestion } from './doc-snapshot'

const NUMBER_LINE = /^(\s*Câu\s+)(\d{1,3})/u
const LEAD_RANGE = /(câu\s+)(\d{1,3})(?:(\s*[–-]\s*)(\d{1,3}))?/u

/** The assistant's changes already made on this sheet. */
function appliedEdits(doc: ProseMirrorNode): string[] {
  const value = doc.attrs.appliedEdits as unknown
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
}

/** The question an edit names: by its draft item, else by the number the sheet printed. */
function find(questions: SheetQuestion[], itemId: string | null | undefined, number: number | undefined) {
  if (itemId) return questions.find((question) => question.itemId === itemId) ?? null
  return number ? sheetQuestion(questions, number) : null
}

/** A question's blocks, with its passage when the passage leads only it. */
function unitOf(question: SheetQuestion, questions: SheetQuestion[]) {
  const alone = question.group !== null && questions.filter((other) => other.group === question.group).length === 1
  return { from: alone && question.groupFrom !== null ? question.groupFrom : question.from, to: question.to }
}

/**
 * Makes on the sheet a change the assistant made to the exam's order (questions taken off, or moved within their
 * part), then numbers the questions 1, 2, 3… and each passage's "câu a–b" again. An edit, like the teacher's own:
 * Ctrl+Z takes it back. Made once: the sheet remembers it, so the same change replayed after a reload does nothing.
 * Returns whether the sheet changed.
 */
export function applySheetEdit(editor: Editor, edit: AiSheetEdit, items?: ReadonlyMap<string, DraftPlace>): boolean {
  const { doc } = editor.state
  const applied = appliedEdits(doc)
  if (applied.includes(edit.editId)) return false
  const questions = sheetQuestions(doc, items)
  const named = edit.numbers
    .map((number, index) => find(questions, edit.items[index], number))
    .filter((question): question is SheetQuestion => question !== null)
  const tr = editor.state.tr
  if (named.length > 0) {
    if (edit.op === 'remove') remove(tr, named, questions)
    else move(tr, edit, named, questions)
    renumber(tr, items)
  }
  tr.setDocAttribute('appliedEdits', [...applied, edit.editId])
  editor.view.dispatch(tr)
  return named.length > 0
}

function remove(tr: Transaction, named: SheetQuestion[], questions: SheetQuestion[]) {
  const ranges = named.map((question) => unitOf(question, questions))
  // A passage whose questions all go goes with them.
  const groups = new Set(named.map((question) => question.group).filter((group): group is string => group !== null))
  for (const group of groups) {
    const members = questions.filter((question) => question.group === group)
    const first = members[0]
    // A passage of one question already goes with it (see unitOf).
    if (members.length > 1 && members.every((member) => named.includes(member)) && first.groupFrom !== null) {
      ranges.push({ from: first.groupFrom, to: first.from })
    }
  }
  for (const range of ranges.sort((a, b) => b.from - a.from)) {
    tr.delete(tr.mapping.map(range.from, 1), tr.mapping.map(range.to, -1))
  }
}

function move(tr: Transaction, edit: AiSheetEdit, named: SheetQuestion[], questions: SheetQuestion[]) {
  const moving = questions.filter((question) => named.includes(question))
  let target: number | null = null
  if (edit.after && edit.after > 0) {
    const anchor = find(questions, edit.afterItem, edit.after)
    if (anchor && !moving.includes(anchor)) target = anchor.to
  } else {
    const part = edit.part ?? moving[0].part
    const first = questions.find((question) => question.part === part && !moving.includes(question))
    if (first) target = unitOf(first, questions).from
  }
  if (target === null) return
  const units = moving.map((question) => unitOf(question, questions))
  const content = units.reduce((fragment, unit) => fragment.append(tr.doc.slice(unit.from, unit.to).content), Fragment.empty)
  for (const unit of [...units].sort((a, b) => b.from - a.from)) tr.delete(unit.from, unit.to)
  tr.insert(tr.mapping.map(target, -1), content)
}

/**
 * Numbers the questions 1, 2, 3… in sheet order, and each passage lead's "câu a–b" after its questions. Also used when
 * the assistant's new questions land on an exam it changed: they are written with the draft's numbers, which count the
 * questions taken off the sheet.
 */
export function renumber(tr: Transaction, items?: ReadonlyMap<string, DraftPlace>) {
  const changes: Array<{ from: number; to: number; text: string }> = []
  const questions = sheetQuestions(tr.doc, items)
  questions.forEach((question, index) => {
    const line = tr.doc.nodeAt(question.from)
    const first = line?.firstChild
    const match = first?.isText ? NUMBER_LINE.exec(first.text ?? '') : null
    if (!match || Number(match[2]) === index + 1) return
    const from = question.from + 1 + match[1].length
    changes.push({ from, to: from + match[2].length, text: String(index + 1) })
  })
  // A passage's lead names the numbers of its questions: "Đọc đoạn văn sau và trả lời câu 5–8".
  const numbers = new Map<string, number[]>()
  questions.forEach((question, index) => {
    if (question.group === null) return
    numbers.set(question.group, [...(numbers.get(question.group) ?? []), index + 1])
  })
  tr.doc.forEach((node, pos) => {
    const group = node.attrs.examGroup as unknown
    if (typeof group !== 'string' || !numbers.has(group)) return
    const list = numbers.get(group) ?? []
    const wanted = list.length > 1 ? `${list[0]}–${list[list.length - 1]}` : String(list[0])
    let found = false
    node.forEach((child, offset) => {
      if (found || !child.isText) return
      const match = LEAD_RANGE.exec(child.text ?? '')
      if (!match) return
      found = true
      const written = match[4] ? `${match[2]}${match[3]}${match[4]}` : match[2]
      if (written.replace(/\s/g, '').replace('-', '–') === wanted) return
      const from = pos + 1 + offset + match.index + match[1].length
      changes.push({ from, to: from + written.length, text: wanted })
    })
  })
  for (const change of changes.sort((a, b) => b.from - a.from)) tr.insertText(change.text, change.from, change.to)
}

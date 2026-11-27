import type { Editor } from '@tiptap/react'
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import type { JSONContent } from '@tiptap/core'
import type { AiLineFormat, AiQuestionEdit, AiSheetEdit, AiSheetLine, AiTextEdit } from '../../../services/aiAssistantService'
import { inlineContent } from './draft-to-doc'
import { examHeaderContent } from './nodes/exam-header'
import { sheetBlocks, sheetQuestion, sheetQuestions, type DraftPlace, type SheetBlock, type SheetQuestion } from './doc-snapshot'

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
 * Makes on the sheet a change the assistant made: to the exam's order (questions taken off, or moved within their
 * part, then the questions numbered 1, 2, 3… and each passage's "câu a–b" again), or to its words (a line outside the
 * questions written, added or taken off, the header added, words found and replaced). An edit, like the teacher's own:
 * Ctrl+Z takes it back. Made once: the sheet remembers it, so the same change replayed after a reload does nothing.
 * Returns whether the questions' order changed, which an answer key follows.
 */
export function applySheetEdit(editor: Editor, edit: AiSheetEdit, items?: ReadonlyMap<string, DraftPlace>): boolean {
  const { doc } = editor.state
  const applied = appliedEdits(doc)
  if (applied.includes(edit.editId)) return false
  const tr = editor.state.tr
  let reordered = false
  if (isQuestionEdit(edit)) {
    const questions = sheetQuestions(doc, items)
    const named = edit.numbers
      .map((number, index) => find(questions, edit.items[index], number))
      .filter((question): question is SheetQuestion => question !== null)
    if (named.length > 0) {
      if (edit.op === 'remove') remove(tr, named, questions)
      else move(tr, edit, named, questions)
      renumber(tr, items)
      reordered = true
    }
  } else {
    changeWords(tr, edit, items)
  }
  tr.setDocAttribute('appliedEdits', [...applied, edit.editId])
  editor.view.dispatch(tr)
  return reordered
}

const isQuestionEdit = (edit: AiSheetEdit): edit is AiQuestionEdit => edit.op === 'remove' || edit.op === 'move'

/**
 * The line the assistant read: the one of its id that still reads the same, else the first that does (an earlier
 * change moved the ids). None when the teacher changed its words since: the change is left out.
 */
function findLine(doc: ProseMirrorNode, line: AiSheetLine, items?: ReadonlyMap<string, DraftPlace>): SheetBlock | null {
  const blocks = sheetBlocks(doc, items)
  const same = (block: SheetBlock) => (line.cut ? block.text.startsWith(line.from) : block.text === line.from)
  return blocks.find((block) => block.id === line.block && same(block)) ?? blocks.find(same) ?? null
}

/** The marks of a line's first words, with the emphasis the change asks for put on or taken off. */
function lineMarks(node: ProseMirrorNode | null, format: AiLineFormat): JSONContent['marks'] {
  let first: JSONContent['marks'] = []
  node?.descendants((child) => {
    if (first?.length || !child.isText) return !first?.length
    first = child.marks.map((mark) => mark.toJSON() as { type: string })
    return false
  })
  let marks = first ?? []
  for (const [name, on] of [['bold', format.bold], ['italic', format.italic]] as const) {
    if (on === undefined) continue
    marks = marks.filter((mark) => mark.type !== name)
    if (on) marks = [...marks, { type: name }]
  }
  return marks
}

/** Sets a line's alignment when the change asks for one and the line has one to set. */
function align(tr: Transaction, pos: number, value: AiLineFormat['align']) {
  const node = tr.doc.nodeAt(pos)
  if (!value || !node || !('textAlign' in node.attrs)) return
  tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: value })
}

function changeWords(tr: Transaction, edit: AiTextEdit, items?: ReadonlyMap<string, DraftPlace>) {
  const { schema } = tr.doc.type
  const words = (text: string, marks: JSONContent['marks']) => Fragment.fromJSON(schema, inlineContent(text, marks))
  switch (edit.op) {
    case 'text': {
      const line = findLine(tr.doc, edit, items)
      if (!line) return
      align(tr, line.pos, edit.align)
      tr.replaceWith(line.pos + 1, line.pos + line.node.nodeSize - 1, words(edit.text, lineMarks(line.node, edit)))
      return
    }
    case 'insert': {
      let at: number | null = null
      if (edit.after === 'start') {
        const first = tr.doc.firstChild
        at = first?.type.name === 'examHeader' ? first.nodeSize : 0
      } else if (edit.after === 'block' && edit.block && edit.from !== undefined) {
        const anchor = findLine(tr.doc, { block: edit.block, from: edit.from, cut: edit.cut }, items)
        if (anchor) at = anchor.pos + anchor.node.nodeSize
      } else if (edit.after === 'question') {
        at = find(sheetQuestions(tr.doc, items), edit.item, edit.number)?.to ?? null
      }
      if (at === null) return
      const heading = edit.kind === 'heading'
      tr.insert(
        at,
        schema.nodeFromJSON({
          type: heading ? 'heading' : 'paragraph',
          attrs: { ...(heading ? { level: 2 } : {}), ...(edit.align ? { textAlign: edit.align } : {}) },
          content: inlineContent(edit.text, lineMarks(null, edit)),
        })
      )
      return
    }
    case 'removeText': {
      const lines = edit.blocks
        .map((line) => findLine(tr.doc, line, items))
        .filter((line): line is SheetBlock => line !== null)
      for (const line of lines.sort((a, b) => b.pos - a.pos)) {
        const parent = tr.doc.resolve(line.pos).parent
        // A header column keeps a line of its own: its only one is emptied, not taken off.
        if (parent.type.name === 'headerColumn' && parent.childCount === 1) tr.delete(line.pos + 1, line.pos + line.node.nodeSize - 1)
        else tr.delete(line.pos, line.pos + line.node.nodeSize)
      }
      return
    }
    case 'header': {
      let has = false
      tr.doc.forEach((node) => {
        if (node.type.name === 'examHeader') has = true
      })
      if (!has) tr.insert(0, schema.nodeFromJSON(examHeaderContent()))
      return
    }
    case 'replace': {
      if (!edit.find) return
      const questions = sheetQuestions(tr.doc, items)
      const ranges: Array<[number, number]> = []
      edit.numbers.forEach((number, index) => {
        const question = find(questions, edit.items[index], number)
        if (question) ranges.push([question.from, question.to])
      })
      for (const line of edit.blocks) {
        const found = findLine(tr.doc, line, items)
        if (found) ranges.push([found.pos, found.pos + found.node.nodeSize])
      }
      // Only words within one run of text: a formula, or words split by a mark, are not read through.
      const hits = new Map<number, number>()
      for (const [from, to] of ranges) {
        tr.doc.nodesBetween(from, to, (node, pos) => {
          if (!node.isText) return
          const text = node.text ?? ''
          for (let at = text.indexOf(edit.find); at >= 0; at = text.indexOf(edit.find, at + edit.find.length)) {
            if (pos + at >= from && pos + at + edit.find.length <= to) hits.set(pos + at, pos + at + edit.find.length)
          }
        })
      }
      for (const [from, to] of [...hits].sort((a, b) => b[0] - a[0])) tr.insertText(edit.replace, from, to)
      return
    }
  }
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

function move(tr: Transaction, edit: AiQuestionEdit, named: SheetQuestion[], questions: SheetQuestion[]) {
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

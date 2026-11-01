import type { JSONContent } from '@tiptap/core'
import { CODE_LINE, lineOf, type AnswerSlot, type ExamQuestion, type ParsedExam } from './parse-exam'
import { variantCodes, type VariantSettings } from './variant-settings'

/**
 * Builds the exam variants from the parsed original. Parts stay in place; inside a part the questions and passage
 * groups change places, options change places inside their grid; then the questions are numbered again and the
 * options lettered again. Every order is drawn from its own random stream, seeded with the set's salt, the code and
 * where the shuffled thing sits (part, unit, question) - never with text - so editing words keeps every code as it
 * was, and adding, removing or moving a question or option only changes orders inside its own part. The free
 * document does not know the correct answers, so each variant carries a key mapping its questions and options back
 * to the original, and an answer table found in the original's tail is rewritten for the variant.
 */

/** An option of a variant question: its letter now, and its letter in the original. */
export interface VariantOptionMove {
  label: string
  original: string
}

export interface VariantAnswerRow {
  /** Number in the variant. */
  number: number
  /** Number in the original. */
  originalNumber: number
  /** Options in their new order; null when the question has no option grid. */
  options: VariantOptionMove[] | null
  /** Correct answer in the variant, from the original's answer table; null when the original has none. */
  answer: string | null
}

export interface VariantAnswerKey {
  rows: VariantAnswerRow[]
  /** "ĐÁP ÁN MÃ ĐỀ …" and the table Câu | Câu gốc | Phương án (| Đáp án), as blocks to add to an export. */
  content: JSONContent[]
}

export interface VariantDoc {
  code: string
  /** The variant exam: the original with its code, questions and options moved, answer table rewritten. */
  content: JSONContent
  answerKey: VariantAnswerKey
}

const LABELS = 'ABCDEFGH'
const labelAt = (index: number) => LABELS[index] ?? String(index + 1)

/* ---------- Random ---------- */

/** FNV-1a over the text, then murmur3's finaliser so seeds of near-identical keys still differ in every bit. */
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35)
  hash ^= hash >>> 16
  return hash >>> 0
}

/** Mulberry32: a small seeded generator of numbers in [0, 1). */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** The random stream of one order of one code: `place` names what is shuffled ("units:0", "options:0:3:0"). */
const streamFor = (salt: string, code: string, place: string) => seededRandom(hashString(`${salt}|${code}|${place}`))

const identity = (length: number) => Array.from({ length }, (_, index) => index)
const isIdentity = (order: number[]) => order.every((value, index) => value === index)

/**
 * Indices 0..length-1 in a random order (Fisher–Yates over all of them). With `keepLast` the last index goes back to
 * the end and the others keep their drawn order, so pinning or unpinning a last option usually leaves the other
 * options where they were. Three or more movable items that come out in their original order are drawn again (a few
 * times); one or two are left as drawn, so with two items the codes differ among themselves instead of all taking
 * the same swap.
 */
function shuffledOrder(length: number, random: () => number, keepLast = false): number[] {
  const movable = keepLast ? length - 1 : length
  let order = identity(length)
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const drawn = identity(length)
    for (let index = length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1))
      ;[drawn[index], drawn[other]] = [drawn[other], drawn[index]]
    }
    order = keepLast ? [...drawn.filter((value) => value !== length - 1), length - 1] : drawn
    if (movable < 3 || !isIdentity(order)) break
  }
  return order
}

/* ---------- Text edits that keep marks ---------- */

/** Applies `edit` to the text of the paragraph's first text node whose text `test` accepts. */
function editText(block: JSONContent, test: RegExp, edit: (text: string) => string): JSONContent {
  const content = block.content ?? []
  const index = content.findIndex((node) => node.type === 'text' && test.test((node.text ?? '').normalize('NFC')))
  if (index < 0) return block
  const next = content.slice()
  next[index] = { ...content[index], text: edit((content[index].text ?? '').normalize('NFC')) }
  return { ...block, content: next }
}

const LEADING_NUMBER = /^(\s*c[âa]u\s+)(\d+)/iu
const LEADING_WORD = /^\s*c[âa]u\s*$/iu

/** The question line with "Câu n" set to `number` (also when "Câu " and the number are separate text runs). */
function renumber(block: JSONContent, number: number): JSONContent {
  const content = block.content ?? []
  const first = content.findIndex((node) => node.type === 'text')
  if (first < 0) return block
  const text = (content[first].text ?? '').normalize('NFC')
  if (LEADING_NUMBER.test(text)) return editText(block, LEADING_NUMBER, (value) => value.replace(LEADING_NUMBER, `$1${number}`))
  const after = content[first + 1]
  if (LEADING_WORD.test(text) && after?.type === 'text' && /^\d+/u.test(after.text ?? '')) {
    const next = content.slice()
    next[first + 1] = { ...after, text: (after.text ?? '').replace(/^\d+/u, String(number)) }
    return { ...block, content: next }
  }
  return block
}

const RANGE_PARTS = /(câu\s*)(\d+)(\s*(?:[-–—]|đến|tới|và)\s*(?:câu\s*)?)(\d+)/iu

/** The lead line of a passage group with its "câu x–y" set to the group's new numbers. */
function renumberRange(block: JSONContent, first: number, last: number): JSONContent {
  return editText(block, RANGE_PARTS, (text) => text.replace(RANGE_PARTS, (_, word, _from, between) => `${word}${first}${between}${last}`))
}

const PLACEHOLDER = /^[\s….·_-]*$/u
const codeText = (code: string, align: 'center' | 'right'): JSONContent => ({
  type: 'paragraph',
  attrs: { textAlign: align },
  content: [{ type: 'text', text: `Mã đề ${code}`, marks: [{ type: 'bold' }, { type: 'boxed' }] }],
})

/** The first "Mã đề …" line in `blocks` (header columns, tables included) with the code written in; null when none. */
function fillCodeLine(blocks: JSONContent[], code: string): JSONContent[] | null {
  for (const [index, block] of blocks.entries()) {
    let replaced: JSONContent | null = null
    if (block.type === 'paragraph') {
      if (!CODE_LINE.test(lineOf(block))) continue
      const content = block.content ?? []
      const first = content.findIndex((node) => node.type === 'text' && CODE_LINE.test((node.text ?? '').normalize('NFC')))
      if (first < 0) continue
      const text = (content[first].text ?? '').normalize('NFC')
      const prefix = CODE_LINE.exec(text)?.[1] ?? ''
      const after = text.slice(prefix.length)
      // The word after "Mã đề" ("…", "132", "____") becomes the code; the rest of the run stays.
      const token = /^\S*/u.exec(after)?.[0] ?? ''
      let rest = content.slice(first + 1)
      // "Mã đề" alone in its run: the dots in the runs after it ("……") make way for the code.
      if (!after.trim()) {
        let skip = 0
        while (skip < rest.length && rest[skip].type === 'text' && PLACEHOLDER.test(rest[skip].text ?? '')) skip += 1
        rest = rest.slice(skip)
      }
      replaced = {
        ...block,
        content: [
          ...content.slice(0, first),
          { ...content[first], text: `${prefix.replace(/(\S)$/u, '$1 ')}${code}${after.slice(token.length)}` },
          ...rest,
        ],
      }
    } else if (block.content?.length) {
      const inner = fillCodeLine(block.content, code)
      if (inner) replaced = { ...block, content: inner }
    }
    if (replaced) {
      const next = blocks.slice()
      next[index] = replaced
      return next
    }
  }
  return null
}

/** The front matter with the exam code: in its "Mã đề" line, else a new line in the exam header, else on top. */
function placeCode(front: JSONContent[], code: string): JSONContent[] {
  const filled = fillCodeLine(front, code)
  if (filled) return filled
  const header = front.findIndex((block) => block.type === 'examHeader')
  if (header >= 0) {
    const block = front[header]
    const columns = block.content ?? []
    const last = columns[columns.length - 1]
    if (last) {
      const next = front.slice()
      next[header] = { ...block, content: [...columns.slice(0, -1), { ...last, content: [...(last.content ?? []), codeText(code, 'center')] }] }
      return next
    }
  }
  return [codeText(code, 'right'), ...front]
}

/* ---------- Answers ---------- */

const LETTER_ANSWER = /^([A-H])(\.?)$/iu

/** The original answer in the variant's letters: a letter follows its option; anything else (Đ/S, numbers) stays. */
function remapAnswer(answer: string | null, order: number[] | null): string | null {
  if (!answer) return null
  const match = LETTER_ANSWER.exec(answer.trim())
  if (!match || !order) return answer
  const moved = order.indexOf(LABELS.indexOf(match[1].toUpperCase()))
  return moved >= 0 ? `${labelAt(moved)}${match[2]}` : answer
}

/** A table cell with `value` as its text, in the first paragraph's alignment and the first text run's marks. */
function withCellText(cell: JSONContent, value: string | null): JSONContent {
  const paragraph = cell.content?.find((node) => node.type === 'paragraph') ?? { type: 'paragraph' }
  const marks = paragraph.content?.find((node) => node.type === 'text')?.marks
  const line: JSONContent = { type: 'paragraph', ...(paragraph.attrs ? { attrs: paragraph.attrs } : {}) }
  if (value) line.content = [{ type: 'text', text: value, ...(marks ? { marks } : {}) }]
  return { ...cell, content: [line] }
}

/** The tail with every answer cell emptied, then each slot filled with `values` (a slot per variant position). */
function rewriteAnswerTable(tail: JSONContent[], cells: AnswerSlot[], writes: Array<{ slot: AnswerSlot; value: string | null }>): JSONContent[] {
  if (cells.length === 0) return tail
  const next = tail.slice()
  const tables = new Map<number, JSONContent>()
  const tableAt = (index: number) => {
    let table = tables.get(index)
    if (!table) {
      table = structuredClone(tail[index])
      tables.set(index, table)
    }
    return table
  }
  const write = (slot: AnswerSlot, value: string | null) => {
    const row = tableAt(slot.table).content?.[slot.row]
    const cell = row?.content?.[slot.cell]
    if (row?.content && cell) row.content[slot.cell] = withCellText(cell, value)
  }
  cells.forEach((slot) => write(slot, null))
  writes.forEach(({ slot, value }) => write(slot, value))
  tables.forEach((table, index) => {
    next[index] = table
  })
  return next
}

const keyCell = (value: string, header = false): JSONContent => ({
  type: header ? 'tableHeader' : 'tableCell',
  content: [{ type: 'paragraph', attrs: { textAlign: 'center' }, ...(value ? { content: [{ type: 'text', text: value, ...(header ? { marks: [{ type: 'bold' }] } : {}) }] } : {}) }],
})

/** "A←C, B←A, C←D, D←B"; "Giữ nguyên" when nothing moved; "—" without options. */
export function describeOptions(options: VariantOptionMove[] | null): string {
  if (!options) return '—'
  if (options.every((option) => option.label === option.original)) return 'Giữ nguyên'
  return options.map((option) => `${option.label}←${option.original}`).join(', ')
}

function answerKeyContent(code: string, rows: VariantAnswerRow[], withAnswers: boolean): JSONContent[] {
  const header = ['Câu', 'Câu gốc', 'Phương án', ...(withAnswers ? ['Đáp án'] : [])]
  return [
    { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: `ĐÁP ÁN MÃ ĐỀ ${code}`, marks: [{ type: 'bold' }] }] },
    {
      type: 'table',
      content: [
        { type: 'tableRow', content: header.map((value) => keyCell(value, true)) },
        ...rows.map((row) => ({
          type: 'tableRow',
          content: [
            keyCell(String(row.number)),
            keyCell(String(row.originalNumber)),
            keyCell(describeOptions(row.options)),
            ...(withAnswers ? [keyCell(row.answer ?? '')] : []),
          ],
        })),
      ],
    },
  ]
}

/* ---------- Variants ---------- */

function optionOrder(question: ExamQuestion, settings: VariantSettings, random: () => number): number[] | null {
  if (question.gridIndex < 0) return null
  if (!settings.shuffleOptions || question.fixedOptions || question.optionCount < 2) return identity(question.optionCount)
  return shuffledOrder(question.optionCount, random, settings.keepLastOption && question.pinnedLast)
}

/** Unit order of each part: from the salt, the code, the part's place and its number of units only. */
function unitOrder(settings: VariantSettings, code: string, partIndex: number, length: number): number[] {
  return settings.shuffleQuestions ? shuffledOrder(length, streamFor(settings.salt, code, `units:${partIndex}`)) : identity(length)
}

function questionBlocks(question: ExamQuestion, number: number, order: number[] | null): JSONContent[] {
  const blocks = question.blocks.slice()
  blocks[0] = renumber(blocks[0], number)
  if (order && question.gridIndex >= 0) {
    const grid = blocks[question.gridIndex]
    const cells = grid.content ?? []
    blocks[question.gridIndex] = {
      ...grid,
      // The labels are written here: the editor relabels options only after a change it makes itself.
      content: order.map((from, index) => ({ ...cells[from], attrs: { ...cells[from].attrs, label: labelAt(index) } })),
    }
  }
  return blocks
}

export function buildVariant(parsed: ParsedExam, settings: VariantSettings, code: string): VariantDoc {
  const body: JSONContent[] = []
  const placed: Array<{ question: ExamQuestion; number: number; order: number[] | null }> = []
  let counter = 0

  parsed.parts.forEach((part, partIndex) => {
    if (parsed.numberingPerPart) counter = 0
    body.push(...part.head)
    unitOrder(settings, code, partIndex, part.units.length).forEach((from, slot) => {
      const unit = part.units[from]
      const first = counter + 1
      const blocks = unit.questions.flatMap((question, index) => {
        counter += 1
        // Keyed by the question's place in the original part (never its text): other parts cannot change its options.
        const options = optionOrder(question, settings, streamFor(settings.salt, code, `options:${partIndex}:${from}:${index}`))
        placed.push({ question, number: counter, order: options })
        return questionBlocks(question, counter, options)
      })
      const lead = unit.leadRange && unit.lead.length > 0 ? [renumberRange(unit.lead[0], first, counter), ...unit.lead.slice(1)] : unit.lead
      // Page breaks stay where they were in the part, after whatever unit now sits there.
      body.push(...lead, ...blocks, ...part.units[slot].trailer)
    })
  })

  const rows: VariantAnswerRow[] = placed.map(({ question, number, order }) => ({
    number,
    originalNumber: question.number,
    options: order ? order.map((from, index) => ({ label: labelAt(index), original: labelAt(from) })) : null,
    answer: remapAnswer(parsed.answers[question.index] ?? null, order),
  }))
  // Each variant question writes its answer in the cell for its new number (or, when numbers repeat, in the cell at
  // its position: parts keep their sizes, so the table's order still fits).
  const cellOf = new Map<number, AnswerSlot>()
  parsed.answerCells.forEach((slot) => {
    if (!cellOf.has(slot.number)) cellOf.set(slot.number, slot)
  })
  const writes = placed.flatMap(({ number }, position) => {
    const slot =
      parsed.answerMatch === 'position' ? parsed.answerCells[position] : parsed.answerMatch === 'number' ? cellOf.get(number) : undefined
    return slot ? [{ slot, value: rows[position].answer }] : []
  })
  const tail = rewriteAnswerTable(parsed.tail, parsed.answerCells, writes)

  return {
    code,
    content: { type: 'doc', content: [...placeCode(parsed.front, code), ...body, ...tail] },
    answerKey: { rows, content: answerKeyContent(code, rows, parsed.answers.some(Boolean)) },
  }
}

/** One variant per code of the settings; none while the original has no question. */
export function buildVariants(parsed: ParsedExam, settings: VariantSettings): VariantDoc[] {
  if (parsed.questions.length === 0) return []
  return variantCodes(settings).map((code) => buildVariant(parsed, settings, code))
}

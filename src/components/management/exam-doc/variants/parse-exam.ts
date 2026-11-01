import type { JSONContent } from '@tiptap/core'

/**
 * Reads the free exam document as exam structure, from its top-level blocks only: the front matter (school header,
 * title, instructions), the parts ("PHẦN I…" or headings between questions), the questions ("Câu n." lines up to the
 * next question), shared passages ("Dựa vào … trả lời câu 5–6") that move with their questions, and the tail
 * ("--- HẾT ---", answer key, marking scheme). Pure: JSON in, structure out.
 */

export type QuestionKind = 'choice' | 'trueFalse' | 'other'

export interface ExamQuestion {
  /** Order in the original, from 0. */
  index: number
  /** Number printed in its "Câu n" line. */
  number: number
  /** Index of its first top-level block in the document. */
  blockIndex: number
  blocks: JSONContent[]
  /** Index in `blocks` of the choice grid whose options can be shuffled; -1 when there is none. */
  gridIndex: number
  optionCount: number
  kind: QuestionKind
  /** The question line as plain text, formulas as `$…$`. */
  text: string
  /** The options keep their order (an option names another by its letter, several grids, options as lines). */
  fixedOptions: boolean
  /** The last option ("Tất cả…", "Không có…") can stay last when the options are shuffled. */
  pinnedLast: boolean
  issues: string[]
}

export interface ExamUnit {
  /** The line that introduces a shared passage and the passage itself; empty for a lone question. */
  lead: JSONContent[]
  leadBlockIndex: number
  /** The lead names its questions ("câu 5–6"); the numbers are rewritten after renumbering. */
  leadRange: boolean
  questions: ExamQuestion[]
  /** Page breaks (with blank lines around them) closing the unit: they stay at this place in the part. */
  trailer: JSONContent[]
}

export interface ExamPart {
  title: string
  /** The heading and its lines before the first question; they stay in place. */
  head: JSONContent[]
  units: ExamUnit[]
}

export interface AnswerSlot {
  /** Index of the table in `tail`. */
  table: number
  row: number
  cell: number
  /** The question number the table gives this cell. */
  number: number
}

export interface ParsedExam {
  front: JSONContent[]
  parts: ExamPart[]
  tail: JSONContent[]
  /** All questions in document order. */
  questions: ExamQuestion[]
  /** "Câu n" numbering starts again at 1 in every part. */
  numberingPerPart: boolean
  /** Every answer cell of the tail's answer table, in table order; a variant clears them all, then writes its own. */
  answerCells: AnswerSlot[]
  /**
   * How a variant's question finds its cell: by its number, or by its position when numbers repeat (each part from 1)
   * and the table lists them in the same order. Null when the table cannot be matched (or there is none).
   */
  answerMatch: 'number' | 'position' | null
  /** The answer each question has in that table (text of the cell), by `index`. */
  answers: Array<string | null>
  /** The tail holds an answer table that names questions the exam does not have (its answers are left blank). */
  answerTableMismatch: boolean
  /** Where the exam code goes: an existing "Mã đề …" line, a new line in the exam header, a new line at the top. */
  codePlacement: 'line' | 'header' | 'top'
}

/* ---------- Text ---------- */

/** Plain text of a node, formulas as `$…$`, line breaks as spaces, NFC (pasted Vietnamese can be decomposed). */
export function textOf(node: JSONContent | undefined): string {
  if (!node) return ''
  if (node.type === 'text') return (node.text ?? '').normalize('NFC')
  if (node.type === 'math') return `$${String(node.attrs?.latex ?? '')}$`
  if (node.type === 'hardBreak') return ' '
  const parts = (node.content ?? []).map(textOf)
  const isBlockParent = (node.content ?? []).some((child) => child.type !== 'text' && child.type !== 'math' && child.type !== 'hardBreak')
  return parts.join(isBlockParent ? ' ' : '')
}

/** Text of a node on one line, trimmed. */
export const lineOf = (node: JSONContent | undefined) => textOf(node).replace(/\s+/gu, ' ').trim()

/* ---------- Block kinds ---------- */

/** "Câu 12.", "CÂU 3:", "Câu 1 (1,0 điểm)." - not "Câu 1–3: …", which introduces several questions. */
const QUESTION_LINE = /^câu\s+(\d+)(?!\d)(?!\s*(?:[-–—]|đến|tới)\s*(?:câu\s*)?\d)/iu
/** A range of questions: "câu 5–6", "từ câu 1 đến câu 3", "câu 2 và 3". */
export const RANGE = /câu\s*(\d+)\s*(?:[-–—]|đến|tới|và)\s*(?:câu\s*)?(\d+)/iu
// `\b` only knows ASCII letters; Vietnamese words are delimited with lookarounds on letters instead.
const LEAD_WORDS = /(?<!\p{L})(?:trả lời|dựa vào|đọc|sử dụng|căn cứ|quan sát|thực hiện)(?!\p{L})/iu
const LEAD_START = /^(?:đọc|dựa vào|căn cứ|sử dụng|quan sát|cho|trả lời)(?!\p{L})/iu
const LEAD_ASKS = /trả lời|câu hỏi|yêu cầu/iu
const LEAD_PLURAL = /các câu|những câu|các yêu cầu|câu hỏi sau|các ý/iu
/** "Trả lời: ……" is a question's answer line, "Thí sinh trả lời từ câu 1 đến câu 12" a part's opening. */
const NOT_LEAD = /^(?:trả lời\s*:|đáp án|lời giải|hướng dẫn|thí sinh|lưu ý)/iu
const PART_LINE = /^phần\s+(?:[ivxlc]+|\d+)(?![\p{L}\p{N}])/iu
/** The "--- HẾT ---" line that closes the questions (also where new AI questions stop being appended). */
export const END_LINE = /^[-–—_.*\s]*hết[-–—_.*\s]*$/iu
/** An answer key / marking scheme heading: like the end line, nothing after it belongs to the questions. */
export const TAIL_HEADING = /^(?:bảng\s+)?(?:đáp án|thang điểm|hướng dẫn chấm|lời giải|hướng dẫn giải)/iu
const PROCTOR_LINE = /^(?:thí sinh không được|giám thị|cán bộ coi thi)/iu
const OPTION_LINE = /^[A-H][.)]\s/u
const ITEM_LINE = /^[a-h]\)/u
const PINNED_LAST =
  /^(?:tất cả|cả\s+(?:ba|bốn|hai|3|4)(?![\p{L}\p{N}])|không có|không\s+(?:phải|phương án|đáp án|câu|ý)\s+nào|các\s+(?:phương án|đáp án|ý)\s+trên|cả\s+[A-H](?!\p{L}))/iu
const LETTER_REFERENCE = /(?<!\p{L})[A-H]\s*(?:,|và|hoặc|&)\s*[A-H](?!\p{L})/u

const isParagraph = (node: JSONContent) => node.type === 'paragraph'
const isHeading = (node: JSONContent) => node.type === 'heading' && Number(node.attrs?.level ?? 1) <= 3

function questionNumber(node: JSONContent): number | null {
  if (!isParagraph(node)) return null
  const match = QUESTION_LINE.exec(lineOf(node))
  return match ? Number(match[1]) : null
}

function isPartLine(node: JSONContent): boolean {
  return (isParagraph(node) || node.type === 'heading') && PART_LINE.test(lineOf(node))
}

/** How many questions a lead line introduces, or 0 when the block is no lead. */
function leadCount(node: JSONContent): { count: number; range: boolean } {
  if (!isParagraph(node)) return { count: 0, range: false }
  const text = lineOf(node)
  if (!text || NOT_LEAD.test(text) || questionNumber(node) !== null) return { count: 0, range: false }
  const range = RANGE.exec(text)
  if (range && LEAD_WORDS.test(text)) {
    const first = Number(range[1])
    const last = Number(range[2])
    if (last > first && last - first < 50) return { count: last - first + 1, range: true }
  }
  if (LEAD_START.test(text) && LEAD_ASKS.test(text)) return { count: LEAD_PLURAL.test(text) ? Infinity : 1, range: false }
  return { count: 0, range: false }
}

function isTailStart(node: JSONContent): boolean {
  if (!isParagraph(node) && node.type !== 'heading') return false
  const text = lineOf(node)
  if (!text) return false
  if (END_LINE.test(text) || PROCTOR_LINE.test(text)) return true
  if (!TAIL_HEADING.test(text)) return false
  // "Đáp án: A" inside a question is no tail; a heading or a line in capitals is.
  return node.type === 'heading' || text === text.toLocaleUpperCase('vi')
}

const isBlank = (node: JSONContent) => isParagraph(node) && lineOf(node) === '' && !(node.content ?? []).some((child) => child.type !== 'text')
const isBreak = (node: JSONContent) => node.type === 'pageBreak' || node.type === 'horizontalRule'

/* ---------- Questions ---------- */

function describeQuestion(question: ExamQuestion) {
  const grids = question.blocks.map((block, index) => (block.type === 'choiceGrid' ? index : -1)).filter((index) => index >= 0)
  if (grids.length > 0) {
    question.kind = 'choice'
    const grid = question.blocks[grids[0]]
    const cells = grid.content ?? []
    question.optionCount = cells.length
    if (grids.length > 1) {
      question.fixedOptions = true
      question.issues.push('Có nhiều nhóm phương án: giữ nguyên thứ tự')
      return
    }
    question.gridIndex = grids[0]
    if (cells.length < 2) question.issues.push('Chỉ có 1 phương án')
    const texts = cells.map(lineOf)
    texts.forEach((text, index) => {
      if (!text && !(cells[index].content ?? []).length) question.issues.push(`Phương án ${String.fromCharCode(65 + index)} để trống`)
    })
    if (texts.some((text) => LETTER_REFERENCE.test(text))) {
      question.fixedOptions = true
      question.issues.push('Phương án nhắc tới chữ cái khác: giữ nguyên thứ tự')
    }
    question.pinnedLast = cells.length > 2 && PINNED_LAST.test(texts[texts.length - 1] ?? '')
    return
  }
  const lines = question.blocks.slice(1).filter(isParagraph).map(lineOf)
  const options = lines.filter((text) => OPTION_LINE.test(text)).length
  if (options >= 2) {
    question.kind = 'choice'
    question.optionCount = options
    question.fixedOptions = true
    question.issues.push('Phương án viết thành dòng riêng: không trộn được')
    return
  }
  if (lines.filter((text) => ITEM_LINE.test(text)).length >= 2) question.kind = 'trueFalse'
}

/* ---------- Answer table ---------- */

const ANSWER_HEADER = /^đáp\s*án$|^đa$|^đ\/a$/iu
const QUESTION_HEADER = /^câu(?:\s+hỏi)?$/iu
const NUMBER_CELL = /^(?:câu\s*)?(\d+)\s*[.:]?$/iu
const LETTER_ANSWER = /^[A-H]\.?$/u

interface FoundSlot extends AnswerSlot {
  value: string
}

function tableRows(table: JSONContent): string[][] {
  return (table.content ?? []).map((row) => (row.content ?? []).map(lineOf))
}

/** Answer cells of a table read "Câu | 1 | 2 …" over "Đáp án | … " (any number of such row pairs). */
function horizontalSlots(rows: string[][], table: number): FoundSlot[] {
  const slots: FoundSlot[] = []
  for (let row = 0; row + 1 < rows.length; row += 1) {
    if (!QUESTION_HEADER.test(rows[row][0] ?? '') || !ANSWER_HEADER.test(rows[row + 1][0] ?? '')) continue
    rows[row].forEach((value, cell) => {
      const match = cell > 0 ? /^(\d+)$/u.exec(value) : null
      if (match && cell < rows[row + 1].length) slots.push({ table, row: row + 1, cell, number: Number(match[1]), value: rows[row + 1][cell] })
    })
    row += 1
  }
  return slots
}

/** Answer cells of a table read "Câu | Đáp án" down the rows (several such column pairs side by side are fine). */
function verticalSlots(rows: string[][], table: number): FoundSlot[] {
  const header = rows[0] ?? []
  const pairs = header.flatMap((value, cell) => (QUESTION_HEADER.test(value) && ANSWER_HEADER.test(header[cell + 1] ?? '') ? [cell] : []))
  const columns = pairs.length > 0 ? pairs : [0]
  const slots: FoundSlot[] = []
  rows.forEach((values, row) => {
    if (pairs.length > 0 && row === 0) return
    for (const cell of columns) {
      const match = NUMBER_CELL.exec(values[cell] ?? '')
      if (match && cell + 1 < values.length) slots.push({ table, row, cell: cell + 1, number: Number(match[1]), value: values[cell + 1] })
    }
  })
  if (pairs.length > 0) return slots
  // Without a "Câu | Đáp án" header only a table of letters is an answer key ("Câu | Nội dung | Điểm" is not).
  const letters = slots.filter((slot) => LETTER_ANSWER.test(slot.value)).length
  return slots.length >= 2 && letters * 2 >= slots.length ? slots : []
}

function findAnswerSlots(tail: JSONContent[]): FoundSlot[] {
  const slots: FoundSlot[] = []
  tail.forEach((block, table) => {
    if (block.type !== 'table') return
    const rows = tableRows(block)
    const horizontal = horizontalSlots(rows, table)
    slots.push(...(horizontal.length > 0 ? horizontal : verticalSlots(rows, table)))
  })
  return slots
}

/* ---------- Exam code ---------- */

export const CODE_LINE = /^(\s*mã\s+đề(?:\s+thi)?\s*[:.]?\s*)/iu

function hasCodeLine(blocks: JSONContent[]): boolean {
  return blocks.some((block) => (isParagraph(block) ? CODE_LINE.test(lineOf(block)) : hasCodeLine(block.content ?? [])))
}

/* ---------- Parsing ---------- */

function partTitle(head: JSONContent[], index: number): string {
  const title = head.map(lineOf).find((text) => text) ?? ''
  return title ? (title.length > 60 ? `${title.slice(0, 57)}…` : title) : `Phần ${index + 1}`
}

/** Moves page breaks (and the blank lines around them) closing a unit into its trailer. */
function splitTrailer(unit: ExamUnit) {
  const last = unit.questions[unit.questions.length - 1]
  if (!last) return
  let start = last.blocks.length
  while (start > 1 && (isBreak(last.blocks[start - 1]) || isBlank(last.blocks[start - 1]))) start -= 1
  const trailer = last.blocks.slice(start)
  if (!trailer.some(isBreak)) return
  unit.trailer = trailer
  last.blocks = last.blocks.slice(0, start)
}

export function parseExam(doc: JSONContent): ParsedExam {
  const blocks = doc.content ?? []
  const empty: ParsedExam = {
    front: blocks,
    parts: [],
    tail: [],
    questions: [],
    numberingPerPart: false,
    answerCells: [],
    answerMatch: null,
    answers: [],
    answerTableMismatch: false,
    codePlacement: 'top',
  }
  const firstQuestion = blocks.findIndex((block) => questionNumber(block) !== null)
  if (firstQuestion < 0) return empty

  // The tail starts at the first end line or answer heading after the first question, with the page breaks before it.
  let tailStart = blocks.length
  for (let index = firstQuestion + 1; index < blocks.length; index += 1) {
    if (isTailStart(blocks[index])) {
      tailStart = index
      break
    }
  }
  while (tailStart < blocks.length && tailStart - 1 > firstQuestion && (isBreak(blocks[tailStart - 1]) || isBlank(blocks[tailStart - 1]))) {
    tailStart -= 1
  }

  // Before the first question: the last "PHẦN …" line or level 2-3 heading opens the first part; a lead line before
  // the question opens it otherwise; everything above is front matter.
  let start = -1
  for (let index = firstQuestion - 1; index >= 0; index -= 1) {
    const block = blocks[index]
    if (isPartLine(block) || (block.type === 'heading' && Number(block.attrs?.level ?? 1) >= 2 && Number(block.attrs?.level) <= 3)) {
      start = index
      break
    }
  }
  if (start < 0) {
    start = blocks.findIndex((block, index) => index < firstQuestion && leadCount(block).count > 0)
    if (start < 0) start = firstQuestion
  }

  const parts: ExamPart[] = []
  const questions: ExamQuestion[] = []
  let part: ExamPart = { title: '', head: [], units: [] }
  let unit: ExamUnit | null = null
  let question: ExamQuestion | null = null
  /** Questions the current lead still takes in. */
  let expecting = 0

  const closePart = () => {
    if (part.units.length > 0 || part.head.length > 0) parts.push(part)
  }

  for (let index = start; index < tailStart; index += 1) {
    const block = blocks[index]
    const number = questionNumber(block)
    const lead = number === null ? leadCount(block) : { count: 0, range: false }

    if (number === null && (isPartLine(block) || (isHeading(block) && index > firstQuestion))) {
      // A heading right after another (or after a part's opening lines) belongs to the same part head.
      if (part.units.length > 0) {
        closePart()
        part = { title: '', head: [], units: [] }
      }
      part.head.push(block)
      unit = null
      question = null
      expecting = 0
    } else if (number !== null) {
      question = {
        index: questions.length,
        number,
        blockIndex: index,
        blocks: [block],
        gridIndex: -1,
        optionCount: 0,
        kind: 'other',
        text: lineOf(block),
        fixedOptions: false,
        pinnedLast: false,
        issues: [],
      }
      questions.push(question)
      if (unit && expecting > 0) {
        unit.questions.push(question)
        expecting -= 1
      } else {
        unit = { lead: [], leadBlockIndex: index, leadRange: false, questions: [question], trailer: [] }
        part.units.push(unit)
        expecting = 0
      }
    } else if (lead.count > 0) {
      unit = { lead: [block], leadBlockIndex: index, leadRange: lead.range, questions: [], trailer: [] }
      part.units.push(unit)
      question = null
      expecting = lead.count
    } else if (question) {
      question.blocks.push(block)
    } else if (unit) {
      unit.lead.push(block)
    } else {
      part.head.push(block)
    }
  }
  closePart()

  for (const [partIndex, current] of parts.entries()) {
    // A lead no question followed stays where it is: after the question before it, or in the part head.
    current.units = current.units.filter((item, index, all) => {
      if (item.questions.length > 0) return true
      const before = all.slice(0, index).reverse().find((other) => other.questions.length > 0)
      if (before) before.questions[before.questions.length - 1].blocks.push(...item.lead)
      else current.head.push(...item.lead)
      return false
    })
    // A lead over every question of its part ("Thí sinh trả lời từ câu 1 đến câu 12") is the part's opening.
    const only = current.units[0]
    if (current.units.length === 1 && only.lead.length > 0 && only.questions.length > 1) {
      current.head.push(...only.lead)
      current.units = only.questions.map((item) => ({ lead: [], leadBlockIndex: item.blockIndex, leadRange: false, questions: [item], trailer: [] }))
    }
    current.units.forEach(splitTrailer)
    current.title = partTitle(current.head, partIndex)
  }

  questions.forEach(describeQuestion)
  for (const current of parts) {
    const inPart = current.units.flatMap((item) => item.questions)
    if (!inPart.some((item) => item.kind === 'choice')) continue
    for (const item of inPart) {
      if (item.kind === 'other') item.issues.push('Chưa có phương án A–D')
    }
  }

  // Numbering: each part from 1 when every part (from the second on) starts again at 1, else on from the last part.
  const withQuestions = parts.filter((current) => current.units.length > 0)
  const numberingPerPart =
    withQuestions.length > 1 && withQuestions.every((current) => current.units[0].questions[0].number === 1)
  let expected = 1
  for (const current of withQuestions) {
    if (numberingPerPart) expected = 1
    for (const item of current.units.flatMap((entry) => entry.questions)) {
      if (item.number !== expected) item.issues.push(`Số câu không liền mạch: chờ Câu ${expected}`)
      expected = item.number + 1
    }
  }

  // The answer table: by number when the numbers are unique, else in order when it lists the same numbers in order.
  const tail = blocks.slice(tailStart)
  const found = findAnswerSlots(tail)
  const answers: Array<string | null> = questions.map(() => null)
  let answerMatch: ParsedExam['answerMatch'] = null
  let answerTableMismatch = false
  if (found.length > 0) {
    const unique = new Set(questions.map((item) => item.number)).size === questions.length
    if (unique) {
      answerMatch = 'number'
      const byNumber = new Map<number, FoundSlot>()
      found.forEach((slot) => {
        if (!byNumber.has(slot.number)) byNumber.set(slot.number, slot)
      })
      questions.forEach((item) => {
        answers[item.index] = byNumber.get(item.number)?.value || null
      })
      // Questions missing from the table (an essay part) are fine; numbers the exam does not have are not.
      const numbers = new Set(questions.map((item) => item.number))
      answerTableMismatch = found.some((slot) => !numbers.has(slot.number))
    } else if (found.length === questions.length && found.every((slot, index) => slot.number === questions[index].number)) {
      answerMatch = 'position'
      found.forEach((slot, index) => {
        answers[index] = slot.value || null
      })
    } else {
      answerTableMismatch = true
    }
  }

  const front = blocks.slice(0, start)
  return {
    front,
    parts,
    tail,
    questions,
    numberingPerPart,
    answerCells: found.map(({ table, row, cell, number }) => ({ table, row, cell, number })),
    answerMatch,
    answers,
    answerTableMismatch,
    codePlacement: hasCodeLine(front) ? 'line' : front.some((block) => block.type === 'examHeader') ? 'header' : 'top',
  }
}

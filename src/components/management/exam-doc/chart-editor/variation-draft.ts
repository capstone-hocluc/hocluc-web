import type { AiVariationChart } from '../../../../services/aiAssistantService'
import { normalizeVariationChart, VARIATION_LIMITS } from '../chart-variation'
import { freshKey } from './function-draft'

/*
 * A variation table as the figure editor holds it: one column per x value, with the sign of f' at it ("", "0", or
 * "||" where f' is undefined but f is not, as at a cusp), whether f is undefined there (then f' is too, and f has a
 * limit on each side), and f's value; and the sign of f' on each interval between two columns. The table's sign row
 * is built from it, so it always has the right length.
 */

export type IntervalSign = '' | '+' | '-' | '0'
/** The sign of f' at an x value where f is defined: nothing, 0, or "||" where f' is undefined. */
export type AtSign = '' | '0' | '||'

export interface VariationColumnDraft {
  key: string
  x: string
  /** The sign of f' at x where f is defined. */
  atSign: AtSign
  /** f is undefined at x: a double bar crosses the f' and f rows, with f's limits from the left and the right. */
  undefined: boolean
  value: string
  left: string
  right: string
}

export interface VariationDraft {
  name: string
  columns: VariationColumnDraft[]
  /** The sign of f' between column i and column i + 1; "" until the teacher picks one. */
  intervals: IntervalSign[]
}

const UNDEFINED = '||'
const { values: MAX_COLUMNS, cell: MAX_CELL } = VARIATION_LIMITS
export const MIN_COLUMNS = 2
export { MAX_COLUMNS }

export const variationFieldKey = {
  name: 'name',
  x: (column: VariationColumnDraft) => `x.${column.key}`,
  value: (column: VariationColumnDraft) => `value.${column.key}`,
  limits: (column: VariationColumnDraft) => `limits.${column.key}`,
  /** The interval right of `column`. */
  interval: (column: VariationColumnDraft) => `interval.${column.key}`,
}

const emptyColumn = (): VariationColumnDraft => ({
  key: freshKey('column'),
  x: '',
  atSign: '',
  undefined: false,
  value: '',
  left: '',
  right: '',
})

export function variationDraftFrom(figure: AiVariationChart): VariationDraft {
  return {
    name: figure.name ?? 'f',
    columns: figure.xValues.map((x, index) => {
      const sign = figure.signs[2 * index] ?? ''
      const value = figure.values[index] ?? ''
      // Only a value with a double bar means f is undefined; "||" in the sign row alone means f' is (f has a value).
      const undefinedHere = value.includes(UNDEFINED)
      const [left = '', right = ''] = undefinedHere ? value.split(UNDEFINED).map((side) => side.trim()) : []
      return {
        key: freshKey('column'),
        x,
        atSign: sign === '0' || sign === UNDEFINED ? sign : '',
        undefined: undefinedHere,
        value: undefinedHere ? '' : value,
        left,
        right,
      }
    }),
    intervals: figure.xValues.slice(1).map((_, index) => {
      const sign = figure.signs[2 * index + 1]
      return sign === '+' || sign === '-' || sign === '0' ? sign : ''
    }),
  }
}

/** A new, empty column before the last one (usually +∞); its interval to the last column waits for a sign. */
export function insertColumn(draft: VariationDraft): VariationDraft {
  if (draft.columns.length >= MAX_COLUMNS) return draft
  const at = draft.columns.length - 1
  return {
    ...draft,
    columns: [...draft.columns.slice(0, at), emptyColumn(), ...draft.columns.slice(at)],
    intervals: [...draft.intervals, ''],
  }
}

/** The table without column `index`; the intervals either side of it become one, with the sign of the left one. */
export function removeColumn(draft: VariationDraft, index: number): VariationDraft {
  if (draft.columns.length <= MIN_COLUMNS) return draft
  const interval = index === draft.columns.length - 1 ? index - 1 : index
  return {
    ...draft,
    columns: draft.columns.filter((_, at) => at !== index),
    intervals: draft.intervals.filter((_, at) => at !== interval),
  }
}

/**
 * The number a cell of the table stands for, where it is plainly one: ±∞, a decimal (comma or point), a fraction a/b,
 * or a root k√n. Null for anything else (a letter, an expression), which the checks then leave alone.
 */
export function cellNumber(text: string): number | null {
  const value = text.replace(/\s/g, '').replace(/[−–]/g, '-').replace(/,/g, '.')
  const infinity = value.match(/^([+-]?)∞$/)
  if (infinity) return infinity[1] === '-' ? -Infinity : Infinity
  const number = '(\\d+(?:\\.\\d+)?|\\.\\d+)'
  const plain = value.match(new RegExp(`^([+-]?)${number}$`))
  if (plain) return Number(`${plain[1]}${plain[2]}`)
  const fraction = value.match(new RegExp(`^([+-]?)${number}/${number}$`))
  if (fraction) return Number(fraction[3]) === 0 ? null : (fraction[1] === '-' ? -1 : 1) * (Number(fraction[2]) / Number(fraction[3]))
  const root = value.match(new RegExp(`^([+-]?)${number}?√${number}$`))
  if (root) return (root[1] === '-' ? -1 : 1) * Number(root[2] ?? 1) * Math.sqrt(Number(root[3]))
  return null
}

export interface VariationCheck {
  /** The table to save; null while something keeps it from being saved. */
  figure: AiVariationChart | null
  /** What is wrong, by the key of the field it belongs to (`variationFieldKey`). */
  problems: Map<string, string>
  /** What is wrong with the table as a whole. */
  general: string[]
  /** What looks wrong but may be meant: an arrow that goes against the values it joins. */
  warnings: string[]
}

const NAME = /^[A-Za-z][A-Za-z0-9]{0,2}$/

export function checkVariationDraft(draft: VariationDraft): VariationCheck {
  const problems = new Map<string, string>()
  const general: string[] = []
  const warnings: string[] = []
  const { columns, intervals } = draft
  const name = draft.name.trim()
  if (!NAME.test(name)) problems.set(variationFieldKey.name, 'Từ 1 đến 3 chữ cái hoặc chữ số, bắt đầu bằng chữ cái (f, g, y…).')
  if (columns.length < MIN_COLUMNS || columns.length > MAX_COLUMNS) {
    general.push(`Bảng biến thiên có từ ${MIN_COLUMNS} đến ${MAX_COLUMNS} giá trị x.`)
  }
  if (intervals.length !== columns.length - 1) general.push('Số dấu của đạo hàm không khớp với số giá trị x.')

  const cellProblem = (text: string, missing: string) => {
    const value = text.trim()
    if (!value) return missing
    if (value.length > MAX_CELL) return `Tối đa ${MAX_CELL} ký tự.`
    if (value.includes(UNDEFINED)) return 'Không dùng "||" trong ô; đánh dấu "Không xác định" thay vào đó.'
    return null
  }

  const shown = (column: VariationColumnDraft) => column.x.trim() || '?'
  let previous: number | null = null
  columns.forEach((column, index) => {
    const xProblem = cellProblem(column.x, 'Nhập giá trị x.')
    if (xProblem) problems.set(variationFieldKey.x(column), xProblem)
    const x = xProblem ? null : cellNumber(column.x)
    if (x !== null && previous !== null && !(x > previous)) {
      problems.set(variationFieldKey.x(column), 'Phải lớn hơn giá trị x bên trái.')
    }
    previous = x ?? (xProblem ? previous : null)
    if (column.undefined) {
      const [left, right] = [column.left.trim(), column.right.trim()]
      if (left.includes(UNDEFINED) || right.includes(UNDEFINED)) problems.set(variationFieldKey.limits(column), 'Không dùng "||" trong giới hạn.')
      else if (`${left}${UNDEFINED}${right}`.length > MAX_CELL) problems.set(variationFieldKey.limits(column), `Hai giới hạn tối đa ${MAX_CELL - 2} ký tự.`)
    } else {
      const valueProblem = cellProblem(column.value, 'Nhập giá trị của hàm số (có thể là −∞, +∞).')
      if (valueProblem) problems.set(variationFieldKey.value(column), valueProblem)
    }
    if (index < intervals.length && !intervals[index]) {
      problems.set(variationFieldKey.interval(column), `Chọn dấu trên khoảng (${shown(column)}; ${shown(columns[index + 1])}).`)
    }
  })

  // An arrow up between values that go down (or the other way) is most likely a slip.
  const leaving = (column: VariationColumnDraft) => cellNumber(column.undefined ? column.right : column.value)
  const arriving = (column: VariationColumnDraft) => cellNumber(column.undefined ? column.left : column.value)
  intervals.forEach((sign, index) => {
    const [from, to] = [leaving(columns[index]), index + 1 < columns.length ? arriving(columns[index + 1]) : null]
    if (from === null || to === null || !sign) return
    const wrong = sign === '+' ? to <= from : sign === '-' ? to >= from : to !== from
    if (!wrong) return
    const where = `(${shown(columns[index])}; ${shown(columns[index + 1])})`
    warnings.push(
      sign === '0'
        ? `Trên khoảng ${where} đạo hàm bằng 0 nhưng giá trị hàm số thay đổi.`
        : `Trên khoảng ${where} hàm số ${sign === '+' ? 'đồng biến' : 'nghịch biến'} nhưng giá trị ở hai đầu không ${sign === '+' ? 'tăng' : 'giảm'}.`
    )
  })

  let figure: AiVariationChart | null = null
  if (!problems.size && !general.length) {
    figure = normalizeVariationChart({
      type: 'variation',
      name,
      xValues: columns.map((column) => column.x.trim()),
      signs: columns.flatMap((column, index) => [
        column.undefined ? UNDEFINED : column.atSign,
        ...(index < intervals.length ? [intervals[index]] : []),
      ]),
      values: columns.map((column) =>
        column.undefined ? `${column.left.trim()}${UNDEFINED}${column.right.trim()}` : column.value.trim()
      ),
    })
    if (!figure) general.push('Bảng biến thiên chưa hợp lệ.')
  }
  return { figure, problems, general, warnings }
}

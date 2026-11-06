import type { AiVariationChart } from '../../../services/aiAssistantService'
import { arrowHead, INK, line, text } from './chart-svg-base'

/*
 * A variation table (bảng biến thiên) in the layout of Vietnamese papers: a column naming the rows x, f'(x) and f(x),
 * the x values across the top, the sign of f' on each interval (and 0 or a double bar at the x values), and the values
 * of f with arrows that rise on "+" and fall on "-". A value sits high or low as the arrows beside it say: at the top
 * of a rise, at the bottom of a fall, half way where it does neither. Where f is undefined a double bar crosses the
 * last two rows, with the limit from the left before it and the limit from the right after it; where only f' is
 * undefined (a cusp) the double bar stands in the f' row alone.
 */

/** Most x values a table has, and the longest text of a cell. */
export const VARIATION_LIMITS = { values: 9, cell: 24 } as const
const LIMITS = VARIATION_LIMITS
const UNDEFINED = '||'
const SIGNS_AT_VALUE = new Set(['', '0', UNDEFINED])
const SIGNS_ON_INTERVAL = new Set(['+', '-', '0'])
const EDGE = 6
const TITLE_ROOM = 26
const NAME_COLUMN = 62
/** Room between the column lines and the first and last x value. */
const SIDE_ROOM = 26
const ROW = { x: 32, sign: 32, value: 112 } as const

type Level = 'top' | 'middle' | 'bottom'

const cellOf = (value: unknown): string | null =>
  typeof value === 'string'
    ? value.replace(/[−–]/g, '-').trim()
    : typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : null

/** "a||b" as its two sides, the limit from the left and from the right; a plain value is both. */
function sides(value: string): [string, string] {
  if (!value.includes(UNDEFINED)) return [value, value]
  const [left, right] = value.split(UNDEFINED)
  return [left.trim(), right.trim()]
}

/**
 * Any variation table (from the server, kept in a document, pasted) as one the drawing can trust, without its title:
 * 2 to 9 x values, a sign row one entry shorter than twice that with signs where they may stand, one value per x
 * (short text; "||" or "a||b" where f is undefined, and f' then undefined too) and a function name. Null otherwise.
 */
export function normalizeVariationChart(raw: unknown): AiVariationChart | null {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const row = (value: unknown) => (Array.isArray(value) ? value.map(cellOf) : null)
  const xValues = row(source.xValues)
  if (!xValues || xValues.length < 2 || xValues.length > LIMITS.values) return null
  if (xValues.some((x) => !x || x.length > LIMITS.cell || x.includes(UNDEFINED))) return null
  const signs = row(source.signs)
  const values = row(source.values)
  if (!signs || signs.length !== 2 * xValues.length - 1 || !values || values.length !== xValues.length) return null
  if (signs.some((sign, index) => sign === null || !(index % 2 === 0 ? SIGNS_AT_VALUE : SIGNS_ON_INTERVAL).has(sign))) {
    return null
  }
  if (values.some((value) => !value || value.length > LIMITS.cell || value.split(UNDEFINED).length > 2)) return null
  const name = typeof source.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,2}$/.test(source.name.trim()) ? source.name.trim() : 'f'
  return {
    type: 'variation',
    name,
    xValues,
    // Where f is undefined, so is f'.
    signs: signs.map((sign, index) => (index % 2 === 0 && values[index / 2].includes(UNDEFINED) ? UNDEFINED : sign)),
    values: values.map((value) => (value.includes(UNDEFINED) ? sides(value).join(UNDEFINED) : value)),
  }
}

/** Size of the drawing of `chart` in px: wider with more x values, up to the width of the sheet's text. */
export function variationChartSize(chart: AiVariationChart) {
  const count = normalizeVariationChart(chart)?.xValues.length ?? 3
  const width = Math.min(560, Math.max(320, NAME_COLUMN + 2 * EDGE + count * 92))
  return { width, height: EDGE + (chart.title ? TITLE_ROOM : 0) + ROW.x + ROW.sign + ROW.value + EDGE }
}

/** Text as a table prints it: a true minus sign. */
const printed = (value: string) => value.replace(/-/g, '−')
/** About how wide `value` prints at 14px in the sheet's serif. */
const widthOf = (value: string) => [...value].length * 7.2

/** The drawing of `chart` without its title, sized by `variationChartSize`. */
export function variationChartBody(chart: AiVariationChart): string {
  const size = variationChartSize(chart)
  const table = normalizeVariationChart(chart)
  if (!table) return text(size.width / 2, size.height / 2, 'Không vẽ được bảng biến thiên', 'text-anchor="middle" font-size="13"')
  const { xValues, signs, values } = table
  const name = table.name ?? 'f'
  const count = xValues.length
  const [left, right] = [EDGE, size.width - EDGE]
  const top = EDGE + (chart.title ? TITLE_ROOM : 0)
  const signTop = top + ROW.x
  const valueTop = signTop + ROW.sign
  const bottom = valueTop + ROW.value
  const column = left + NAME_COLUMN
  const xs = xValues.map((_, index) => column + SIDE_ROOM + (index * (right - column - 2 * SIDE_ROOM)) / (count - 1))
  const parts: string[] = [
    `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" fill="none" stroke="${INK}" stroke-width="1"/>`,
    line(column, top, column, bottom),
    line(left, signTop, right, signTop),
    line(left, valueTop, right, valueTop),
  ]

  const [derivativeRow, functionRow] = name === 'y' ? ["y'", 'y'] : [`${name}'(x)`, `${name}(x)`]
  const nameX = left + NAME_COLUMN / 2
  const named = 'text-anchor="middle" font-size="15" font-style="italic"'
  parts.push(text(nameX, top + 21, 'x', named), text(nameX, signTop + 21, derivativeRow, named))
  parts.push(text(nameX, (valueTop + bottom) / 2 + 5, functionRow, named))
  xValues.forEach((x, index) => parts.push(text(xs[index], top + 21, printed(x), 'text-anchor="middle" font-size="14"')))

  signs.forEach((sign, index) => {
    if (index % 2 === 0) {
      const at = xs[index / 2]
      if (sign === UNDEFINED) {
        // Where f is undefined the bars cross its row too; where only f' is (a cusp), f's value stands between them.
        const end = values[index / 2].includes(UNDEFINED) ? bottom : valueTop
        parts.push(line(at - 2, signTop, at - 2, end), line(at + 2, signTop, at + 2, end))
      } else if (sign) {
        parts.push(text(at, signTop + 21, sign, 'text-anchor="middle" font-size="14"'))
      }
    } else {
      const at = (xs[(index - 1) / 2] + xs[(index + 1) / 2]) / 2
      parts.push(text(at, signTop + 22, printed(sign), 'text-anchor="middle" font-size="16"'))
    }
  })

  // Each value: where an arrow from the left ends and where the arrow to the right starts.
  const levelY: Record<Level, number> = { top: valueTop + 20, middle: (valueTop + bottom) / 2 + 5, bottom: bottom - 10 }
  const arriving = (sign: string): Level => (sign === '+' ? 'top' : sign === '-' ? 'bottom' : 'middle')
  const leaving = (sign: string): Level => (sign === '+' ? 'bottom' : sign === '-' ? 'top' : 'middle')
  const ends = values.map((value, index) => {
    const before = index > 0 ? signs[2 * index - 1] : null
    const after = index < count - 1 ? signs[2 * index + 1] : null
    const at = xs[index]
    if (value.includes(UNDEFINED)) {
      const [fromLeft, fromRight] = sides(value).map(printed)
      const [leftY, rightY] = [levelY[before ? arriving(before) : 'middle'], levelY[after ? leaving(after) : 'middle']]
      if (fromLeft) parts.push(text(at - 6, leftY, fromLeft, 'text-anchor="end" font-size="14"'))
      if (fromRight) parts.push(text(at + 6, rightY, fromRight, 'font-size="14"'))
      return {
        in: [at - 6 - (fromLeft ? widthOf(fromLeft) + 5 : 2), leftY - 5],
        out: [at + 6 + (fromRight ? widthOf(fromRight) + 5 : 2), rightY - 5],
      }
    }
    const [arrive, leave] = [before ? arriving(before) : null, after ? leaving(after) : null]
    // A value at a peak or a trough sits where both arrows put it; between a rise and a rise, half way.
    const level: Level = !arrive ? leave : !leave ? arrive : arrive === leave ? arrive : arrive === 'middle' ? leave : leave === 'middle' ? arrive : 'middle'
    const shown = printed(value)
    parts.push(text(at, levelY[level], shown, 'text-anchor="middle" font-size="14"'))
    const half = widthOf(shown) / 2 + 5
    return { in: [at - half, levelY[level] - 5], out: [at + half, levelY[level] - 5] }
  })
  for (let index = 0; index + 1 < count; index += 1) {
    const [fromX, fromY] = ends[index].out
    const [toX, toY] = ends[index + 1].in
    if (toX - fromX < 12) continue
    parts.push(line(fromX, fromY, toX, toY), arrowHead(toX, toY, fromX, fromY))
  }
  return parts.join('')
}

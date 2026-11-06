import type { AiFunctionChart } from '../../../services/aiAssistantService'
import { compileExpression, normalizeExpression, type RealFunction } from './chart-expression'
import { arrowHead, colorAt, formatNumber, GRID, GUIDE, INK, line, niceStep, text, type ChartPalette } from './chart-svg-base'

/*
 * The graph of y = f(x) as exam papers draw it: the axes through the origin (along the window's edge when the origin
 * is outside it) with their arrows, a light grid, numbered ticks, the curves, dashed asymptotes, and labelled points
 * with dashed guides to the axes. A curve is sampled across the window and broken where the function has no value,
 * at a vertical asymptote, and where it jumps across the window between two samples (a pole); where its domain ends
 * the curve is drawn to the edge.
 */

/** Most curves, points and asymptotes a graph keeps, the largest coordinate and the longest label. */
export const FUNCTION_LIMITS = { functions: 3, points: 8, asymptotes: 4, coordinate: 1000, label: 80 } as const
const LIMITS = FUNCTION_LIMITS
/** Width of the drawing in px: what it takes on the sheet at its initial width, so its numbers print at their size. */
const WIDTH = 400
const MARGIN = { top: 18, right: 26, bottom: 24, left: 30 } as const
const TITLE_ROOM = 24
/** The first, second and third curve: solid, dashed, dotted, so they stay apart in black and white. */
export const CURVE_DASHES = ['', '7 4', '2 3'] as const
const DASHES = CURVE_DASHES

interface Point {
  x: number
  y: number
}

const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const labelOf = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, LIMITS.label) : '')
const asItem = (value: unknown) => (value && typeof value === 'object' ? value : {}) as Record<string, unknown>

/**
 * Any function graph (from the server, kept in a document, pasted) as one the drawing can trust, without its title:
 * a window within ±1000, at most three functions written in the grammar, and the points and asymptotes that lie in
 * the window; what does not fit is left out. Null without a window.
 */
export function normalizeFunctionChart(raw: unknown): AiFunctionChart | null {
  const source = asItem(raw)
  const [xMin, xMax, yMin, yMax] = [source.xMin, source.xMax, source.yMin, source.yMax].map(finite)
  if (xMin === null || xMax === null || yMin === null || yMax === null || !(xMin < xMax) || !(yMin < yMax)) return null
  if ([xMin, xMax, yMin, yMax].some((bound) => Math.abs(bound) > LIMITS.coordinate)) return null
  const inX = (value: number | null) => value !== null && value >= xMin && value <= xMax
  const inY = (value: number | null) => value !== null && value >= yMin && value <= yMax

  const functions: AiFunctionChart['functions'] = []
  for (const entry of Array.isArray(source.functions) ? source.functions : []) {
    if (functions.length === LIMITS.functions) break
    const item = typeof entry === 'string' ? { expression: entry } : asItem(entry)
    const expression = typeof item.expression === 'string' ? normalizeExpression(item.expression) : null
    if (!expression || !compileExpression(expression)) continue
    const label = labelOf(item.label)
    functions.push(label ? { expression, label } : { expression })
  }
  const points: NonNullable<AiFunctionChart['points']> = []
  for (const entry of Array.isArray(source.points) ? source.points : []) {
    const item = asItem(entry)
    const [x, y] = [finite(item.x), finite(item.y)]
    if (points.length === LIMITS.points || !inX(x) || !inY(y)) continue
    const label = labelOf(item.label)
    points.push(label ? { x, y, label } : { x, y })
  }
  const asymptotes: NonNullable<AiFunctionChart['asymptotes']> = []
  for (const entry of Array.isArray(source.asymptotes) ? source.asymptotes : []) {
    const item = asItem(entry)
    const [x, y] = [finite(item.x), finite(item.y)]
    if (asymptotes.length === LIMITS.asymptotes) break
    if (inX(x) && item.y === undefined) asymptotes.push({ x })
    else if (inY(y) && item.x === undefined) asymptotes.push({ y })
  }
  return {
    type: 'function',
    xMin,
    xMax,
    yMin,
    yMax,
    functions,
    ...(points.length ? { points } : {}),
    ...(asymptotes.length ? { asymptotes } : {}),
  }
}

/** Where the window is drawn: a unit as long on both axes where the window allows it, from a wide frame to a square one. */
function frame(chart: AiFunctionChart, titled: boolean) {
  const width = WIDTH - MARGIN.left - MARGIN.right
  const even = (width * (chart.yMax - chart.yMin)) / (chart.xMax - chart.xMin)
  const height = Math.round(Math.min(width * 0.9, Math.max(width * 0.5, even)))
  return { left: MARGIN.left, top: MARGIN.top + (titled ? TITLE_ROOM : 0), width, height }
}

/** Size of the drawing of `chart` in px. */
export function functionChartSize(chart: AiFunctionChart) {
  const figure = normalizeFunctionChart(chart)
  if (!figure) return { width: WIDTH, height: 240 }
  const plot = frame(figure, Boolean(chart.title))
  return { width: WIDTH, height: plot.top + plot.height + MARGIN.bottom }
}

/** The multiples of `step` from `min` to `max`, without the float noise of adding steps up. */
function ticks(min: number, max: number, step: number) {
  const out: number[] = []
  for (let k = Math.ceil(min / step - 1e-9); k * step <= max + step * 1e-9; k += 1) out.push(Math.round(k * step * 1e9) / 1e9)
  return out
}

/** The part of the segment from `a` to `b` inside yMin..yMax (its x is inside by construction); null when none is. */
function clip(a: Point, b: Point, yMin: number, yMax: number): [Point, Point] | null {
  let enter = 0
  let leave = 1
  const dy = b.y - a.y
  for (const [p, q] of [
    [-dy, a.y - yMin],
    [dy, yMax - a.y],
  ]) {
    if (p === 0) {
      if (q < 0) return null
    } else if (p < 0) {
      enter = Math.max(enter, q / p)
    } else {
      leave = Math.min(leave, q / p)
    }
  }
  if (enter > leave) return null
  const at = (t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + dy * t })
  return [at(enter), at(leave)]
}

/** The last point of the graph between `inside` (where f has a value) and `outside` (where it has none). */
function edge(f: RealFunction, inside: number, outside: number): Point {
  let [good, bad] = [inside, outside]
  for (let step = 0; step < 40; step += 1) {
    const middle = (good + bad) / 2
    if (Number.isFinite(f(middle))) good = middle
    else bad = middle
  }
  return { x: good, y: f(good) }
}

/**
 * Whether f jumps between two samples more than `span` instead of rising steeply: halving the step, a continuous
 * function's change shrinks, while across a pole it stays large or the function loses its value.
 */
function jumps(f: RealFunction, a: Point, b: Point, span: number): boolean {
  let [x0, y0, x1, y1] = [a.x, a.y, b.x, b.y]
  for (let depth = 0; depth < 40; depth += 1) {
    if (Math.abs(y1 - y0) <= span) return false
    const middle = (x0 + x1) / 2
    const value = f(middle)
    if (!Number.isFinite(value)) return true
    if (Math.abs(value - y0) >= Math.abs(y1 - value)) [x1, y1] = [middle, value]
    else [x0, y0] = [middle, value]
  }
  return true
}

/** The SVG path of y = f(x) across the window (see the top of this file for where it breaks). */
function curve(
  f: RealFunction,
  chart: AiFunctionChart,
  toX: (x: number) => number,
  toY: (y: number) => number,
  steps: number
): string {
  const { xMin, xMax, yMin, yMax } = chart
  const verticals = (chart.asymptotes ?? []).flatMap((asymptote) => ('x' in asymptote ? [asymptote.x] : []))
  const parts: string[] = []
  // Where the path ends so far, as written; null when the next piece starts a new one.
  let pen: string | null = null
  const draw = (from: Point, to: Point) => {
    const piece = clip(from, to, yMin, yMax)
    if (!piece) {
      pen = null
      return
    }
    const start = `${toX(piece[0].x).toFixed(1)} ${toY(piece[0].y).toFixed(1)}`
    const end = `${toX(piece[1].x).toFixed(1)} ${toY(piece[1].y).toFixed(1)}`
    if (start !== pen) parts.push(`M${start}`)
    if (end !== start) parts.push(`L${end}`)
    pen = end
  }

  let last: Point | null = null
  let lastX = xMin
  for (let i = 0; i <= steps; i += 1) {
    const x = xMin + ((xMax - xMin) * i) / steps
    const y = f(x)
    if (!Number.isFinite(y)) {
      if (last) draw(last, edge(f, last.x, x))
      last = null
      pen = null
    } else {
      const point = { x, y }
      const previous = last
      if (previous) {
        if (verticals.some((at) => previous.x < at && at < x) || jumps(f, previous, point, yMax - yMin)) pen = null
        else draw(previous, point)
      } else if (i > 0) {
        draw(edge(f, x, lastX), point)
      }
      last = point
    }
    lastX = x
  }
  return parts.join('')
}

/** The drawing of `chart` without its title, sized by `functionChartSize`. */
export function functionChartBody(chart: AiFunctionChart, palette: ChartPalette, colors: readonly string[]): string {
  const figure = normalizeFunctionChart(chart)
  if (!figure) {
    const size = functionChartSize(chart)
    return text(size.width / 2, size.height / 2, 'Không vẽ được đồ thị', 'text-anchor="middle" font-size="13"')
  }
  const { xMin, xMax, yMin, yMax } = figure
  const plot = frame(figure, Boolean(chart.title))
  const right = plot.left + plot.width
  const bottom = plot.top + plot.height
  const toX = (x: number) => plot.left + ((x - xMin) / (xMax - xMin)) * plot.width
  const toY = (y: number) => plot.top + ((yMax - y) / (yMax - yMin)) * plot.height
  // The axes cross at the origin, or at the edge of the window nearest to it.
  const crossX = Math.min(xMax, Math.max(xMin, 0))
  const crossY = Math.min(yMax, Math.max(yMin, 0))
  const [axisX, axisY] = [toX(crossX), toY(crossY)]
  const origin = crossX === 0 && crossY === 0
  const xStep = niceStep(xMax - xMin, plot.width / 44)
  const yStep = niceStep(yMax - yMin, plot.height / 36)
  const xTicks = ticks(xMin, xMax, xStep)
  const yTicks = ticks(yMin, yMax, yStep)
  const dashed = (x1: number, y1: number, x2: number, y2: number) => line(x1, y1, x2, y2, GUIDE, 0.8, 'stroke-dasharray="4 3"')
  const parts: string[] = []

  for (const x of xTicks) parts.push(line(toX(x), plot.top, toX(x), bottom, GRID, 0.6))
  for (const y of yTicks) parts.push(line(plot.left, toY(y), right, toY(y), GRID, 0.6))
  for (const asymptote of figure.asymptotes ?? []) {
    parts.push('x' in asymptote
      ? line(toX(asymptote.x), plot.top, toX(asymptote.x), bottom, GUIDE, 1, 'stroke-dasharray="6 4"')
      : line(plot.left, toY(asymptote.y), right, toY(asymptote.y), GUIDE, 1, 'stroke-dasharray="6 4"'))
  }
  // A point's guides to the axes, and its coordinates where the ticks do not already say them.
  const offGrid = (value: number, step: number) => Math.abs(value / step - Math.round(value / step)) > 0.35
  for (const point of figure.points ?? []) {
    const [px, py] = [toX(point.x), toY(point.y)]
    if (Math.abs(py - axisY) > 0.5) parts.push(dashed(px, py, px, axisY))
    if (Math.abs(px - axisX) > 0.5) parts.push(dashed(px, py, axisX, py))
    if (point.x !== crossX && offGrid(point.x, xStep)) parts.push(text(px, axisY + 15, formatNumber(point.x), 'text-anchor="middle" font-size="11"'))
    if (point.y !== crossY && offGrid(point.y, yStep)) parts.push(text(axisX - 6, py + 4, formatNumber(point.y), 'text-anchor="end" font-size="11"'))
  }

  parts.push(line(plot.left, axisY, right + 12, axisY), arrowHead(right + 14, axisY, right, axisY))
  parts.push(line(axisX, bottom, axisX, plot.top - 12), arrowHead(axisX, plot.top - 14, axisX, plot.top))
  parts.push(text(right + 13, axisY - 7, 'x', 'text-anchor="end" font-size="13" font-style="italic"'))
  parts.push(text(axisX + 8, plot.top - 6, 'y', 'font-size="13" font-style="italic"'))
  if (origin) parts.push(text(axisX - 4, axisY + 14, 'O', 'text-anchor="end" font-size="12" font-style="italic"'))
  for (const x of xTicks) {
    if (origin && x === 0) continue
    parts.push(line(toX(x), axisY - 3, toX(x), axisY + 3))
    parts.push(text(toX(x), axisY + 15, formatNumber(x), 'text-anchor="middle" font-size="11"'))
  }
  for (const y of yTicks) {
    if (origin && y === 0) continue
    parts.push(line(axisX - 3, toY(y), axisX + 3, toY(y)))
    parts.push(text(axisX - 6, toY(y) + 4, formatNumber(y), 'text-anchor="end" font-size="11"'))
  }

  figure.functions.forEach((graph, index) => {
    const f = compileExpression(graph.expression)
    if (!f) return
    const color = palette === 'color' ? colorAt(colors, index) : INK
    const dash = DASHES[index % DASHES.length]
    const path = curve(f, figure, toX, toY, Math.round(plot.width * 1.5))
    if (path) {
      parts.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`)
    }
    if (!graph.label) return
    // The label sits by the curve towards the right, at the first place it shows well inside the window.
    const margin = (yMax - yMin) * 0.08
    for (let share = 0.9 - index * 0.12; share > 0.1; share -= 0.04) {
      const x = xMin + (xMax - xMin) * share
      const y = f(x)
      if (!Number.isFinite(y) || y < yMin + margin || y > yMax - margin) continue
      const [lx, ly] = [toX(x), toY(y)]
      const fits = lx + 6 + graph.label.length * 6.5 < right
      parts.push(text(fits ? lx + 6 : lx - 6, ly - 7, graph.label, `${fits ? '' : 'text-anchor="end" '}font-size="12" font-style="italic" fill="${color}"`))
      break
    }
  })

  for (const point of figure.points ?? []) {
    const [px, py] = [toX(point.x), toY(point.y)]
    parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${INK}"/>`)
    if (point.label) parts.push(text(px + 6, py - 6, point.label, 'font-size="12" font-style="italic"'))
  }
  return parts.join('')
}

/** The finite values of the curves `expressions` at `count` + 1 even steps across xMin..xMax. */
function sampleCurves(expressions: readonly string[], xMin: number, xMax: number, count: number): number[] {
  const values: number[] = []
  for (const expression of expressions) {
    const f = compileExpression(expression)
    if (!f) continue
    for (let i = 0; i <= count; i += 1) {
      const y = f(xMin + ((xMax - xMin) * i) / count)
      if (Number.isFinite(y)) values.push(y)
    }
  }
  return values
}

/** Whether y = f(x) shows anywhere in the window: some sample of it across the x range lies inside the y range. */
export function curveShowsInWindow(expression: string, window: Pick<AiFunctionChart, 'xMin' | 'xMax' | 'yMin' | 'yMax'>) {
  return sampleCurves([expression], window.xMin, window.xMax, 400).some((y) => y >= window.yMin && y <= window.yMax)
}

/**
 * A y range that shows the curves over xMin..xMax, with the points and the horizontal asymptotes: the values the
 * curves take there, padded and rounded outwards to round numbers. Where a curve shoots off near a pole (its extremes
 * lie far beyond the bulk of its values) the extremes are left out and the range kept within about the x range's
 * length of the middle value. The x axis is taken in when it is near. Null when nothing has a value there.
 */
export function fitFunctionY(chart: Pick<AiFunctionChart, 'xMin' | 'xMax' | 'functions' | 'points' | 'asymptotes'>) {
  const { xMin, xMax } = chart
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || !(xMin < xMax)) return null
  const values = sampleCurves(
    chart.functions.map((graph) => graph.expression),
    xMin,
    xMax,
    600
  ).sort((a, b) => a - b)
  const fixed = [
    ...(chart.points ?? []).map((point) => point.y),
    ...(chart.asymptotes ?? []).flatMap((asymptote) => ('y' in asymptote ? [asymptote.y] : [])),
  ].filter(Number.isFinite)
  if (!values.length && !fixed.length) return null

  let low = Infinity
  let high = -Infinity
  if (values.length) {
    const at = (share: number) => values[Math.round(share * (values.length - 1))]
    const [bulkLow, bulkHigh] = [at(0.05), at(0.95)]
    if (values[values.length - 1] - values[0] > 4 * Math.max(bulkHigh - bulkLow, 1e-9)) {
      const [middle, reach] = [at(0.5), xMax - xMin]
      low = Math.max(bulkLow, middle - reach)
      high = Math.min(bulkHigh, middle + reach)
    } else {
      low = values[0]
      high = values[values.length - 1]
    }
  }
  for (const value of fixed) {
    low = Math.min(low, value)
    high = Math.max(high, value)
  }
  if (high - low < 1e-9) {
    low -= 1
    high += 1
  }
  // The x axis comes into the window when it is no further off than the graph is tall.
  if (low > 0 && low <= high - low) low = 0
  if (high < 0 && -high <= high - low) high = 0
  const pad = (high - low) * 0.08
  const step = niceStep(high - low + 2 * pad, 10)
  const yMin = Math.max(-LIMITS.coordinate, Math.floor((low - pad) / step) * step)
  const yMax = Math.min(LIMITS.coordinate, Math.ceil((high + pad) / step) * step)
  if (!(yMin < yMax)) return null
  return { yMin: Math.round(yMin * 1e9) / 1e9, yMax: Math.round(yMax * 1e9) / 1e9 }
}

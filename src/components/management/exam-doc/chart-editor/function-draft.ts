import type { AiFunctionChart } from '../../../../services/aiAssistantService'
import { formatChartNumber, parseChartNumber } from '../chart-data'
import { expressionProblem, normalizeExpression } from '../chart-expression'
import { curveShowsInWindow, FUNCTION_LIMITS, fitFunctionY, normalizeFunctionChart } from '../chart-function'

/*
 * A function graph as the figure editor holds it while the teacher types: every number as typed (so "-", "0," and a
 * decimal comma can be on the way to a number), every row with a key of its own. `checkFunctionDraft` reads it back
 * into the graph `normalizeFunctionChart` keeps, or says in Vietnamese what keeps it from being saved.
 */

export type WindowField = 'xMin' | 'xMax' | 'yMin' | 'yMax'

export interface CurveDraft {
  key: string
  expression: string
  label: string
}

export interface PointDraft {
  key: string
  x: string
  y: string
  label: string
}

export interface AsymptoteDraft {
  key: string
  /** 'x' for the vertical line x = a, 'y' for the horizontal line y = b. */
  axis: 'x' | 'y'
  at: string
}

export interface FunctionDraft {
  window: Record<WindowField, string>
  curves: CurveDraft[]
  points: PointDraft[]
  asymptotes: AsymptoteDraft[]
}

export const WINDOW_FIELDS: readonly WindowField[] = ['xMin', 'xMax', 'yMin', 'yMax']

/** Where each problem is shown: the key of the field it belongs to. */
export const functionFieldKey = {
  window: (field: WindowField) => `window.${field}`,
  expression: (curve: CurveDraft) => `curve.${curve.key}`,
  pointX: (point: PointDraft) => `point.${point.key}.x`,
  pointY: (point: PointDraft) => `point.${point.key}.y`,
  asymptote: (asymptote: AsymptoteDraft) => `asymptote.${asymptote.key}`,
}

/**
 * The fields whose problems an edit of the window can change: the four bounds (a bound's "must be larger" problem shows
 * on xMax or yMax) and every coordinate typed of a point or an asymptote, which the window may now leave out. Empty
 * ones are left alone, so a row just added does not say "Nhập một số." before the teacher reaches it.
 */
export function windowChangedKeys(draft: FunctionDraft): string[] {
  const typed = (text: string, key: string) => (text.trim() ? [key] : [])
  return [
    ...WINDOW_FIELDS.map(functionFieldKey.window),
    ...draft.points.flatMap((point) => [
      ...typed(point.x, functionFieldKey.pointX(point)),
      ...typed(point.y, functionFieldKey.pointY(point)),
    ]),
    ...draft.asymptotes.flatMap((asymptote) => typed(asymptote.at, functionFieldKey.asymptote(asymptote))),
  ]
}

let lastKey = 0
export const freshKey = (prefix: string) => `${prefix}-${(lastKey += 1)}`

export const emptyCurve = (): CurveDraft => ({ key: freshKey('curve'), expression: '', label: '' })
export const emptyPoint = (): PointDraft => ({ key: freshKey('point'), x: '', y: '', label: '' })
export const emptyAsymptote = (axis: 'x' | 'y' = 'x'): AsymptoteDraft => ({ key: freshKey('asymptote'), axis, at: '' })

export function functionDraftFrom(figure: AiFunctionChart): FunctionDraft {
  return {
    window: {
      xMin: formatChartNumber(figure.xMin),
      xMax: formatChartNumber(figure.xMax),
      yMin: formatChartNumber(figure.yMin),
      yMax: formatChartNumber(figure.yMax),
    },
    curves: figure.functions.map((graph) => ({ key: freshKey('curve'), expression: graph.expression, label: graph.label ?? '' })),
    points: (figure.points ?? []).map((point) => ({
      key: freshKey('point'),
      x: formatChartNumber(point.x),
      y: formatChartNumber(point.y),
      label: point.label ?? '',
    })),
    asymptotes: (figure.asymptotes ?? []).map((asymptote) =>
      'x' in asymptote
        ? { key: freshKey('asymptote'), axis: 'x' as const, at: formatChartNumber(asymptote.x) }
        : { key: freshKey('asymptote'), axis: 'y' as const, at: formatChartNumber(asymptote.y) }
    ),
  }
}

export interface FunctionCheck {
  /** The graph to save, holding everything drafted; null while something keeps it from being saved. */
  figure: AiFunctionChart | null
  /** What is wrong, by the key of the field it belongs to (`functionFieldKey`). */
  problems: Map<string, string>
  /** What is wrong with the graph as a whole. */
  general: string[]
  /** The keys of curves written well that do not show anywhere in the window. */
  hidden: Set<string>
  /** What the preview draws: every part written well, in the window; null while the window is not a window. */
  preview: AiFunctionChart | null
}

const { coordinate: MAX_COORDINATE } = FUNCTION_LIMITS

/** A coordinate as typed, or why it is none. */
function readCoordinate(text: string): { value: number } | { problem: string } {
  if (!text.trim()) return { problem: 'Nhập một số.' }
  const value = parseChartNumber(text)
  if (value === null) return { problem: 'Không phải là số.' }
  if (Math.abs(value) > MAX_COORDINATE) return { problem: `Chỉ từ −${MAX_COORDINATE} đến ${MAX_COORDINATE}.` }
  return { value }
}

const curveOf = (curve: CurveDraft) => {
  const label = curve.label.trim()
  const expression = normalizeExpression(curve.expression) ?? ''
  return label ? { expression, label } : { expression }
}

export function checkFunctionDraft(draft: FunctionDraft): FunctionCheck {
  const problems = new Map<string, string>()
  const general: string[] = []
  const hidden = new Set<string>()
  const coordinate = (key: string, text: string) => {
    const read = readCoordinate(text)
    if ('problem' in read) {
      problems.set(key, read.problem)
      return null
    }
    return read.value
  }

  const [xMin, xMax, yMin, yMax] = WINDOW_FIELDS.map((field) => coordinate(functionFieldKey.window(field), draft.window[field]))
  if (xMin !== null && xMax !== null && !(xMin < xMax)) problems.set(functionFieldKey.window('xMax'), 'Phải lớn hơn x nhỏ nhất.')
  if (yMin !== null && yMax !== null && !(yMin < yMax)) problems.set(functionFieldKey.window('yMax'), 'Phải lớn hơn y nhỏ nhất.')
  const window =
    xMin !== null && xMax !== null && yMin !== null && yMax !== null && xMin < xMax && yMin < yMax ? { xMin, xMax, yMin, yMax } : null

  const curves: AiFunctionChart['functions'] = []
  for (const curve of draft.curves) {
    const problem = expressionProblem(curve.expression)
    if (problem) {
      problems.set(functionFieldKey.expression(curve), problem)
      continue
    }
    const graph = curveOf(curve)
    curves.push(graph)
    if (window && !curveShowsInWindow(graph.expression, window)) hidden.add(curve.key)
  }

  const points: NonNullable<AiFunctionChart['points']> = []
  for (const point of draft.points) {
    const x = coordinate(functionFieldKey.pointX(point), point.x)
    const y = coordinate(functionFieldKey.pointY(point), point.y)
    if (x === null || y === null) continue
    if (window && (x < window.xMin || x > window.xMax)) {
      problems.set(functionFieldKey.pointX(point), 'Điểm nằm ngoài khung nhìn theo x.')
      continue
    }
    if (window && (y < window.yMin || y > window.yMax)) {
      problems.set(functionFieldKey.pointY(point), 'Điểm nằm ngoài khung nhìn theo y.')
      continue
    }
    const label = point.label.trim()
    points.push(label ? { x, y, label } : { x, y })
  }

  const asymptotes: NonNullable<AiFunctionChart['asymptotes']> = []
  for (const asymptote of draft.asymptotes) {
    const at = coordinate(functionFieldKey.asymptote(asymptote), asymptote.at)
    if (at === null) continue
    const [low, high] = asymptote.axis === 'x' ? [window?.xMin, window?.xMax] : [window?.yMin, window?.yMax]
    if (low !== undefined && high !== undefined && (at < low || at > high)) {
      problems.set(functionFieldKey.asymptote(asymptote), 'Nằm ngoài khung nhìn.')
      continue
    }
    asymptotes.push(asymptote.axis === 'x' ? { x: at } : { y: at })
  }

  if (draft.curves.length > FUNCTION_LIMITS.functions) general.push(`Một đồ thị có tối đa ${FUNCTION_LIMITS.functions} hàm số.`)
  if (draft.points.length > FUNCTION_LIMITS.points) general.push(`Một đồ thị có tối đa ${FUNCTION_LIMITS.points} điểm.`)
  if (draft.asymptotes.length > FUNCTION_LIMITS.asymptotes) general.push(`Một đồ thị có tối đa ${FUNCTION_LIMITS.asymptotes} tiệm cận.`)

  const raw = window ? { type: 'function' as const, ...window, functions: curves, points, asymptotes } : null
  const preview = raw ? normalizeFunctionChart(raw) : null
  let figure: AiFunctionChart | null = null
  if (preview && !problems.size && !general.length) {
    // Saved only when the graph keeps all that was drafted: what normalizing leaves out would be lost without a word.
    const kept =
      preview.functions.length === draft.curves.length &&
      (preview.points?.length ?? 0) === draft.points.length &&
      (preview.asymptotes?.length ?? 0) === draft.asymptotes.length
    if (kept) figure = preview
    else general.push('Đồ thị chưa vẽ được như đã nhập. Hãy kiểm tra lại các hàm số, điểm và tiệm cận.')
  }
  return { figure, problems, general, hidden, preview }
}

/**
 * The y range "Tự động" fits to the curves written well over the x range typed, with the points and horizontal
 * asymptotes (wherever they are): see `fitFunctionY`. Null when the x range is not a range or nothing has a value there.
 */
export function autoFitY(draft: FunctionDraft): { yMin: string; yMax: string } | null {
  const [xMin, xMax] = [draft.window.xMin, draft.window.xMax].map((text) => {
    const read = readCoordinate(text)
    return 'value' in read ? read.value : null
  })
  if (xMin === null || xMax === null || !(xMin < xMax)) return null
  const number = (text: string) => {
    const read = readCoordinate(text)
    return 'value' in read ? read.value : null
  }
  const fitted = fitFunctionY({
    xMin,
    xMax,
    functions: draft.curves.filter((curve) => !expressionProblem(curve.expression)).map(curveOf),
    points: draft.points.flatMap((point) => {
      const [x, y] = [number(point.x), number(point.y)]
      return x !== null && y !== null && x >= xMin && x <= xMax ? [{ x, y }] : []
    }),
    asymptotes: draft.asymptotes.flatMap((asymptote) => {
      const at = number(asymptote.at)
      return asymptote.axis === 'y' && at !== null ? [{ y: at }] : []
    }),
  })
  return fitted && { yMin: formatChartNumber(fitted.yMin), yMax: formatChartNumber(fitted.yMax) }
}

import type { JSONContent } from '@tiptap/core'
import type { AiChart, AiDataChart, AiFunctionChart, AiVariationChart } from '../../../services/aiAssistantService'
import { normalizeFunctionChart } from './chart-function'
import {
  CHART_SVG_SIZE,
  chartAlt,
  chartImageSrc,
  chartSvgSize,
  dataChartAlt,
  dataChartImageSrc,
  type ChartPalette,
} from './chart-svg'
import { PALETTES } from './chart-svg-base'
import {
  DATA_CHART_TYPES,
  isRound,
  type DataChartDrawing,
  type DataChartType,
  type DataDrawOptions,
  type LegendPosition,
  type SliceLabels,
} from './chart-svg-parts'
import { normalizeVariationChart } from './chart-variation'

/*
 * A chart as the document keeps it, in the shape of Tiptap's Diagrams data so a later move to that extension keeps
 * the documents: a table (`data`: columns, then one row per category) and how to draw it (`spec`). The first column
 * labels the categories, every other column is a series of numbers. A function's graph or variation table is no table
 * of numbers: it is kept whole in `spec.figure` and its table stays empty. The AI's chart data converts both ways, and
 * `chart-svg.ts` draws it.
 *
 * A data chart can be of more kinds than the AI writes (bars, stacked columns, areas, scatter, donut, a combination)
 * and carries the chart editor's options. Each option is kept only when it is set, so a chart saved before there were
 * options reads, saves and draws as it did.
 */

/** The kinds of chart a document holds: the AI's and the further data charts of the chart editor. */
export type ChartType = DataChartType | 'function' | 'variation'
export type { ChartPalette, DataChartType, LegendPosition, SliceLabels }
export { DATA_CHART_TYPES }
/** What a function graph or a variation table draws, without its title (the spec's). */
export type ChartFigure = AiFunctionChart | AiVariationChart

export interface ChartColumn {
  id: string
  label: string
  role: 'label' | 'series'
}

export interface ChartData {
  columns: ChartColumn[]
  /** One row per category: its label, then one number per series column, in column order. */
  rows: (string | number)[][]
}

export interface ChartSpec {
  type: ChartType
  title: string
  xLabel: string
  yLabel: string
  /** Shows the legend where the chart has one (two or more series, a pie). */
  legend: boolean
  palette: ChartPalette
  /** Width as a share of the text width. */
  width: number
  /** The graph or variation table drawn; set exactly when `type` is 'function' or 'variation'. */
  figure?: ChartFigure
  /** Where the legend goes; missing, right of a pie or donut and under any other chart. */
  legendPosition?: LegendPosition
  /** Numbers on the marks, on or off; missing, as charts were drawn before (see `autoDataLabels`). */
  dataLabels?: boolean
  /** False draws only the axes; missing, the gridlines too. */
  gridlines?: false
  /** Start and end of the value axis; missing, worked out from the numbers. */
  yMin?: number
  yMax?: number
  /** A pie's or donut's slice labels as values; missing, as percentages. */
  sliceLabels?: 'value'
  /** Colours picked for series in the colour palette, by series column id; each one of the palette's own. */
  colors?: Record<string, string>
}

export interface ChartValue {
  data: ChartData
  spec: ChartSpec
}

/** Width as a share of the text width; the initial one shows the drawing at its own size on the A4 sheet. */
export const CHART_WIDTH = { min: 0.3, max: 1, initial: 0.85 } as const
/** Text width of the A4 sheet in px (21 cm less the 2 cm and 1.5 cm margins), which the width is a share of. */
export const SHEET_TEXT_WIDTH_PX = (17.5 * 96) / 2.54
/** Most rows and series a stored chart keeps: a guard against broken input, not a limit of the editor. */
const STORED_LIMITS = { rows: 60, series: 8, text: 200 } as const
const LABEL_COLUMN = 'Nhãn'

/**
 * A number as a teacher types it: "16,5" and "16.5" alike, "1.234,5" or "1 234,5" with thousands grouped, a minus
 * sign or a trailing "%". Null when the text is not a number.
 */
export function parseChartNumber(input: string): number | null {
  let text = input.replace(/[\s\u00a0\u202f]/g, '').replace(/^[\u2212\u2013]/, '-').replace(/%$/, '')
  if (!text) return null
  const comma = text.lastIndexOf(',')
  const dot = text.lastIndexOf('.')
  if (comma >= 0 && dot >= 0) {
    // Both marks: the later one is the decimal mark, the other groups thousands.
    const decimal = comma > dot ? ',' : '.'
    text = text.split(decimal === ',' ? '.' : ',').join('').replace(decimal, '.')
  } else if (comma >= 0) {
    // One comma is the decimal mark (Vietnamese); several group thousands.
    text = text.indexOf(',') === comma ? text.replace(',', '.') : text.split(',').join('')
  } else if (dot >= 0 && text.indexOf('.') !== dot) {
    text = text.split('.').join('')
  }
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

/** A number written for editing, as a Vietnamese reader writes it: comma decimals, no grouping. */
export function formatChartNumber(value: number): string {
  return value.toLocaleString('vi-VN', { useGrouping: false, maximumFractionDigits: 10 })
}

const textOf = (value: unknown) =>
  (typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '').slice(
    0,
    STORED_LIMITS.text
  )

function numberOf(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return typeof value === 'string' ? (parseChartNumber(value) ?? 0) : 0
}

/** A width share in range, in hundredths; the initial width when it is missing or not a number. */
export function chartWidth(value: unknown): number {
  const share = Number(value)
  if (!Number.isFinite(share) || share <= 0) return CHART_WIDTH.initial
  return Math.round(Math.min(CHART_WIDTH.max, Math.max(CHART_WIDTH.min, share)) * 100) / 100
}

interface RawColumn {
  id?: unknown
  label?: unknown
  role?: unknown
}

function normalizeData(raw: unknown): ChartData {
  const source = (raw && typeof raw === 'object' ? raw : {}) as { columns?: unknown; rows?: unknown }
  const given = (Array.isArray(source.columns) ? source.columns : []) as RawColumn[]
  const rows = (Array.isArray(source.rows) ? source.rows : []).filter(Array.isArray).slice(0, STORED_LIMITS.rows) as unknown[][]
  // The label column is the one that says so, else the first; every other column is a series.
  const labelAt = Math.max(0, given.findIndex((column) => column?.role === 'label'))
  const count = Math.min(Math.max(given.length, ...rows.map((row) => row.length), 2), labelAt + 1 + STORED_LIMITS.series)
  const seriesAt = Array.from({ length: count }, (_, index) => index)
    .filter((index) => index !== labelAt)
    .slice(0, STORED_LIMITS.series)

  const used = new Set<string>()
  const idFor = (value: unknown, fallback: string) => {
    let id = typeof value === 'string' && value ? value : fallback
    for (let next = 1; used.has(id); next += 1) id = `${fallback}-${next}`
    used.add(id)
    return id
  }
  const label = given[labelAt]
  const columns: ChartColumn[] = [
    { id: idFor(label?.id, 'label'), label: textOf(label?.label) || LABEL_COLUMN, role: 'label' },
    ...seriesAt.map((index, order) => ({
      id: idFor(given[index]?.id, `s${order + 1}`),
      label: textOf(given[index]?.label),
      role: 'series' as const,
    })),
  ]
  return {
    columns,
    rows: (rows.length ? rows : [[]]).map((row) => [textOf(row[labelAt]), ...seriesAt.map((index) => numberOf(row[index]))]),
  }
}

const LEGEND_POSITIONS: readonly LegendPosition[] = ['top', 'bottom', 'right']
/** Largest magnitude of an axis bound: a guard against broken input. */
const AXIS_LIMIT = 1e12

const axisBound = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= AXIS_LIMIT ? value : undefined

/** Whether a stored type is a data chart's. */
export const isDataChartType = (type: unknown): type is DataChartType =>
  typeof type === 'string' && (DATA_CHART_TYPES as readonly string[]).includes(type)

/** The editor's options a stored spec of a data chart holds, each checked; anything not valid is left out. */
type ChartOptions = Pick<ChartSpec, 'legendPosition' | 'dataLabels' | 'gridlines' | 'yMin' | 'yMax' | 'sliceLabels' | 'colors'>

function normalizeOptions(spec: Record<string, unknown>): ChartOptions {
  const options: ChartOptions = {}
  if (LEGEND_POSITIONS.includes(spec.legendPosition as LegendPosition)) options.legendPosition = spec.legendPosition as LegendPosition
  if (typeof spec.dataLabels === 'boolean') options.dataLabels = spec.dataLabels
  if (spec.gridlines === false) options.gridlines = false
  let [yMin, yMax] = [axisBound(spec.yMin), axisBound(spec.yMax)]
  // An axis that would end before it starts is worked out from the numbers instead.
  if (yMin !== undefined && yMax !== undefined && yMin >= yMax) [yMin, yMax] = [undefined, undefined]
  if (yMin !== undefined) options.yMin = yMin
  if (yMax !== undefined) options.yMax = yMax
  if (spec.sliceLabels === 'value') options.sliceLabels = 'value'
  if (spec.colors && typeof spec.colors === 'object' && !Array.isArray(spec.colors)) {
    const colors = Object.fromEntries(
      Object.entries(spec.colors as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && PALETTES.color.includes(entry[1])
      )
    )
    if (Object.keys(colors).length) options.colors = colors
  }
  return options
}

/** The graph or variation table a stored spec holds, checked again: a pasted chart's JSON is anybody's. */
function figureOf(type: unknown, raw: unknown): ChartFigure | null {
  if (type === 'function') return normalizeFunctionChart(raw)
  if (type === 'variation') return normalizeVariationChart(raw)
  return null
}

function normalizeSpec(raw: unknown): ChartSpec {
  const spec = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  // A graph or table that cannot be drawn leaves a chart of the (empty) table.
  const figure = figureOf(spec.type, spec.figure)
  return {
    type: figure ? figure.type : isDataChartType(spec.type) ? spec.type : 'bar',
    title: textOf(spec.title),
    xLabel: textOf(spec.xLabel),
    yLabel: textOf(spec.yLabel),
    legend: typeof spec.legend === 'boolean' ? spec.legend : true,
    palette: spec.palette === 'color' ? 'color' : 'print',
    width: chartWidth(spec.width),
    ...(figure ? { figure } : normalizeOptions(spec)),
  }
}

/**
 * Any stored, pasted or imported chart as a chart the editor can draw: the label column first, at least one row and
 * one series, every cell a string or a finite number, the settings in range, and a graph or variation table checked
 * as the server checks it. Always a new object.
 */
export function normalizeChart(raw: { data?: unknown; spec?: unknown } | null | undefined): ChartValue {
  const spec = normalizeSpec(raw?.spec)
  const data = normalizeData(spec.figure ? null : raw?.data)
  if (spec.colors) {
    // Only the colours of series the table still has.
    const ids = new Set(data.columns.slice(1).map((column) => column.id))
    const colors = Object.fromEntries(Object.entries(spec.colors).filter(([id]) => ids.has(id)))
    if (Object.keys(colors).length) spec.colors = colors
    else delete spec.colors
  }
  return { data, spec }
}

/** Same data and settings: saving it again would only add an empty undo step. */
export function sameChart(a: ChartValue, b: ChartValue): boolean {
  return JSON.stringify(normalizeChart(a)) === JSON.stringify(normalizeChart(b))
}

/**
 * The AI's chart data as a chart of the document, at its initial width unless `width` says otherwise: a bar, line or
 * pie chart at {@link CHART_WIDTH}'s, a graph or variation table as wide as its drawing is (so its text keeps its size).
 */
export function aiChartToValue(chart: AiChart, width?: number): ChartValue {
  if (chart.type === 'function' || chart.type === 'variation') {
    return normalizeChart({
      data: null,
      spec: {
        type: chart.type,
        title: chart.title ?? '',
        legend: true,
        palette: 'print',
        width: width ?? chartWidth(chartSvgSize(chart).width / SHEET_TEXT_WIDTH_PX),
        figure: chart,
      },
    })
  }
  const series = chart.series ?? []
  return normalizeChart({
    data: {
      columns: [
        { id: 'label', label: chart.xLabel ?? '', role: 'label' },
        ...series.map((item, index) => ({ id: `s${index + 1}`, label: item.name, role: 'series' })),
      ],
      rows: (chart.categories ?? []).map((category, row) => [category, ...series.map((item) => item.values?.[row])]),
    },
    spec: {
      type: chart.type,
      title: chart.title ?? '',
      xLabel: chart.xLabel ?? '',
      yLabel: chart.yLabel ?? '',
      legend: true,
      palette: 'print',
      width: width ?? CHART_WIDTH.initial,
    },
  })
}

/** The AI's kind of data chart nearest to each kind a document chart can be. */
const AI_DATA_TYPES: Record<DataChartType, AiDataChart['type']> = {
  bar: 'bar',
  horizontalBar: 'bar',
  stackedBar: 'bar',
  stackedHorizontalBar: 'bar',
  combo: 'bar',
  line: 'line',
  area: 'line',
  scatter: 'line',
  pie: 'pie',
  donut: 'pie',
}

/**
 * A normalized chart as the AI's chart data: a graph or variation table as it is, a data chart of a kind the AI does
 * not write as the nearest one it does (bars of any kind as columns, an area or scatter chart as a line, a donut as a
 * pie), without the editor's options.
 */
export function valueToAiChart({ data, spec }: ChartValue): AiChart {
  if (spec.figure) return { ...spec.figure, title: spec.title }
  return {
    // Without a figure the type is a table's (normalizeSpec sees to it).
    type: AI_DATA_TYPES[spec.type as DataChartType] ?? 'bar',
    title: spec.title,
    xLabel: spec.xLabel,
    yLabel: spec.yLabel,
    categories: data.rows.map((row) => String(row[0] ?? '')),
    series: data.columns.slice(1).map((column, index) => ({
      name: column.label,
      values: data.rows.map((row) => Number(row[index + 1]) || 0),
    })),
  }
}

/** A normalized data chart as `chart-svg.ts` draws it: its table as categories and series, with the editor's colours. */
export function chartDrawing({ data, spec }: ChartValue): DataChartDrawing {
  const categories = data.rows.map((row) => String(row[0] ?? ''))
  return {
    type: isDataChartType(spec.type) ? spec.type : 'bar',
    title: spec.title,
    xLabel: spec.xLabel,
    yLabel: spec.yLabel,
    categories,
    series: data.columns.slice(1).map((column, index) => {
      const color = spec.colors?.[column.id]
      return { name: column.label, values: data.rows.map((row) => Number(row[index + 1]) || 0), ...(color ? { color } : {}) }
    }),
    ...(spec.type === 'scatter' ? { xValues: categories.map((category) => parseChartNumber(category)) } : {}),
  }
}

/** How a normalized data chart's spec says to draw it. */
export function chartDrawOptions(spec: ChartSpec): DataDrawOptions {
  return {
    legend: spec.legend,
    palette: spec.palette,
    ...(spec.legendPosition ? { legendPosition: spec.legendPosition } : {}),
    ...(spec.dataLabels !== undefined ? { dataLabels: spec.dataLabels } : {}),
    ...(spec.gridlines === false ? { gridlines: false } : {}),
    ...(spec.yMin !== undefined ? { yMin: spec.yMin } : {}),
    ...(spec.yMax !== undefined ? { yMax: spec.yMax } : {}),
    ...(isDataChartType(spec.type) && isRound(spec.type) ? { sliceLabels: spec.sliceLabels ?? 'percent' } : {}),
  }
}

/** The drawing of a normalized chart, as an image source. */
export const chartValueSrc = (value: ChartValue) =>
  value.spec.figure
    ? chartImageSrc(valueToAiChart(value), { legend: value.spec.legend, palette: value.spec.palette })
    : dataChartImageSrc(chartDrawing(value), chartDrawOptions(value.spec))

/** "Biểu đồ cột: <title>", the alt text of the chart's drawing. */
export const chartValueAlt = (value: ChartValue) =>
  value.spec.figure ? chartAlt(valueToAiChart(value)) : dataChartAlt({ type: chartDrawing(value).type, title: value.spec.title })

/** Size of the chart's drawing in px (a graph or a variation table has its own). */
export const chartValueSize = (value: ChartValue) => (value.spec.figure ? chartSvgSize(valueToAiChart(value)) : CHART_SVG_SIZE)

/** The picture a chart becomes outside the editor (Word, Markdown): its drawing, alt text and width in px. */
export function chartPicture(value: ChartValue, textWidthPx: number = SHEET_TEXT_WIDTH_PX) {
  const width = Math.round(value.spec.width * textWidthPx)
  const size = chartValueSize(value)
  return {
    src: chartValueSrc(value),
    alt: chartValueAlt(value),
    width,
    height: Math.round((width * size.height) / size.width),
  }
}

/** The AI's chart as a chart block of the editor document. */
export function chartBlock(chart: AiChart): JSONContent {
  return { type: 'chart', attrs: { ...aiChartToValue(chart) } }
}

/** A data chart of `type` with a small table, at the initial width, as Chèn ▸ Biểu đồ puts it in. */
function sampleDataChart(
  type: DataChartType,
  categories: string[],
  series: { name: string; values: number[] }[],
  labels: { xLabel?: string; yLabel?: string } = {}
): ChartValue {
  return normalizeChart({
    data: {
      columns: [
        { id: 'label', label: labels.xLabel ?? '', role: 'label' },
        ...series.map((item, index) => ({ id: `s${index + 1}`, label: item.name, role: 'series' })),
      ],
      rows: categories.map((category, row) => [category, ...series.map((item) => item.values[row])]),
    },
    spec: {
      type,
      title: '',
      xLabel: labels.xLabel ?? '',
      yLabel: labels.yLabel ?? '',
      legend: true,
      palette: 'print',
      width: CHART_WIDTH.initial,
    },
  })
}

const GROUPS = ['Nhóm 1', 'Nhóm 2', 'Nhóm 3']
const TWO_YEARS = [
  { name: 'Năm 2023', values: [12, 18, 15] },
  { name: 'Năm 2024', values: [14, 16, 20] },
]

/** y = x³ − 3x around its two turning points: the graph Chèn ▸ Biểu đồ ▸ Đồ thị hàm số starts from. */
const SAMPLE_GRAPH: AiFunctionChart = {
  type: 'function',
  title: '',
  xMin: -3,
  xMax: 3,
  yMin: -3,
  yMax: 3,
  functions: [{ expression: 'x^3 - 3*x' }],
  points: [
    { x: -1, y: 2 },
    { x: 1, y: -2 },
  ],
}

/** The variation table of y = x³ − 3x: the table Chèn ▸ Biểu đồ ▸ Bảng biến thiên starts from. */
const SAMPLE_VARIATION: AiVariationChart = {
  type: 'variation',
  title: '',
  name: 'y',
  xValues: ['-∞', '-1', '1', '+∞'],
  signs: ['', '+', '0', '-', '0', '+', ''],
  values: ['-∞', '2', '-2', '+∞'],
}

/**
 * The chart Chèn ▸ Biểu đồ puts in for each kind, with a little data to start from as a docs app does: a few groups
 * of numbers, a class's grades for a pie, points for a scatter chart, the graph and the variation table of y = x³ − 3x.
 */
export function sampleChart(type: ChartType): ChartValue {
  switch (type) {
    case 'function':
      return aiChartToValue(SAMPLE_GRAPH)
    case 'variation':
      return aiChartToValue(SAMPLE_VARIATION)
    case 'stackedBar':
    case 'stackedHorizontalBar':
    case 'combo':
      return sampleDataChart(type, GROUPS, TWO_YEARS)
    case 'line':
    case 'area':
      return sampleDataChart(type, ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4'], [{ name: 'Số liệu', values: [16, 18, 21, 25] }])
    case 'scatter':
      return sampleDataChart(type, ['1', '2', '3', '4', '5'], [{ name: 'y', values: [2, 4, 5, 4, 6] }], { xLabel: 'x', yLabel: 'y' })
    case 'pie':
    case 'donut':
      return sampleDataChart(type, ['Giỏi', 'Khá', 'Trung bình', 'Yếu'], [{ name: 'Số học sinh', values: [8, 15, 12, 5] }])
    default:
      return sampleDataChart(type, GROUPS, [{ name: 'Số liệu', values: [12, 18, 15] }])
  }
}

/** The chart Chèn ▸ Biểu đồ starts from: the sample column chart. */
export function newChart(): ChartValue {
  return sampleChart('bar')
}

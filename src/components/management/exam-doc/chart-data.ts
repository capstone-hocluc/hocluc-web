import type { JSONContent } from '@tiptap/core'
import type { AiChart } from '../../../services/aiAssistantService'
import { CHART_SVG_SIZE, chartAlt, chartImageSrc, type ChartPalette } from './chart-svg'

/*
 * A chart as the document keeps it, in the shape of Tiptap's Diagrams data so a later move to that extension keeps
 * the documents: a table (`data`: columns, then one row per category) and how to draw it (`spec`). The first column
 * labels the categories, every other column is a series of numbers. The AI's chart data converts both ways, and
 * `chart-svg.ts` draws it.
 */

export type ChartType = AiChart['type']
export type { ChartPalette }

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

function normalizeSpec(raw: unknown): ChartSpec {
  const spec = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    type: spec.type === 'line' || spec.type === 'pie' ? spec.type : 'bar',
    title: textOf(spec.title),
    xLabel: textOf(spec.xLabel),
    yLabel: textOf(spec.yLabel),
    legend: typeof spec.legend === 'boolean' ? spec.legend : true,
    palette: spec.palette === 'color' ? 'color' : 'print',
    width: chartWidth(spec.width),
  }
}

/**
 * Any stored, pasted or imported chart as a chart the editor can draw: the label column first, at least one row and
 * one series, every cell a string or a finite number, the settings in range. Always a new object.
 */
export function normalizeChart(raw: { data?: unknown; spec?: unknown } | null | undefined): ChartValue {
  return { data: normalizeData(raw?.data), spec: normalizeSpec(raw?.spec) }
}

/** Same data and settings: saving it again would only add an empty undo step. */
export function sameChart(a: ChartValue, b: ChartValue): boolean {
  return JSON.stringify(normalizeChart(a)) === JSON.stringify(normalizeChart(b))
}

/** The AI's chart data as a chart of the document, at the initial width unless `width` says otherwise. */
export function aiChartToValue(chart: AiChart, width: number = CHART_WIDTH.initial): ChartValue {
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
      width,
    },
  })
}

/** A normalized chart as the AI's chart data, the shape `chart-svg.ts` draws. */
export function valueToAiChart({ data, spec }: ChartValue): AiChart {
  return {
    type: spec.type,
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

/** The drawing of a normalized chart, as an image source. */
export const chartValueSrc = (value: ChartValue) =>
  chartImageSrc(valueToAiChart(value), { legend: value.spec.legend, palette: value.spec.palette })

/** "Biểu đồ cột: <title>", the alt text of the chart's drawing. */
export const chartValueAlt = (value: ChartValue) => chartAlt(valueToAiChart(value))

/** The picture a chart becomes outside the editor (Word, Markdown): its drawing, alt text and width in px. */
export function chartPicture(value: ChartValue, textWidthPx: number = SHEET_TEXT_WIDTH_PX) {
  const width = Math.round(value.spec.width * textWidthPx)
  return {
    src: chartValueSrc(value),
    alt: chartValueAlt(value),
    width,
    height: Math.round((width * CHART_SVG_SIZE.height) / CHART_SVG_SIZE.width),
  }
}

/** The AI's chart as a chart block of the editor document. */
export function chartBlock(chart: AiChart): JSONContent {
  return { type: 'chart', attrs: { ...aiChartToValue(chart) } }
}

/** The chart Chèn ▸ Biểu đồ starts from. */
export function newChart(): ChartValue {
  return aiChartToValue({
    type: 'bar',
    title: '',
    categories: ['Nhóm 1', 'Nhóm 2', 'Nhóm 3'],
    series: [{ name: 'Số liệu', values: [12, 18, 15] }],
  })
}

import { colorAt, text, type ChartPalette } from './chart-svg-base'

/*
 * What the drawings of data charts (numbers over labelled categories) share: their kinds, the options a document
 * chart can set, the markers that tell line series apart in black and white, and the legend in its three places.
 */

/** Size of the drawing of a data chart in px; the sheet scales it to the chart's width. */
export const CHART_SVG_SIZE = { width: 560, height: 300 } as const

/**
 * The kinds of data chart a document can hold: the AI's bar (columns), line and pie, and the further kinds a teacher
 * picks in the chart editor.
 */
export const DATA_CHART_TYPES = [
  'bar',
  'horizontalBar',
  'stackedBar',
  'stackedHorizontalBar',
  'line',
  'area',
  'scatter',
  'pie',
  'donut',
  'combo',
] as const
export type DataChartType = (typeof DATA_CHART_TYPES)[number]

export type LegendPosition = 'top' | 'bottom' | 'right'
/** What a pie's or donut's slice shows when data labels are on. */
export type SliceLabels = 'value' | 'percent'

export const isRound = (type: DataChartType) => type === 'pie' || type === 'donut'
export const isHorizontal = (type: DataChartType) => type === 'horizontalBar' || type === 'stackedHorizontalBar'
export const isStacked = (type: DataChartType) => type === 'stackedBar' || type === 'stackedHorizontalBar'

/** A data chart ready to draw: numbers over labelled categories, each series with its own colour if it has one. */
export interface DataChartDrawing {
  type: DataChartType
  title?: string
  xLabel?: string
  yLabel?: string
  categories: string[]
  series: { name: string; values: number[]; color?: string }[]
  /** A scatter chart's x of each category row, read from its label; null where the label is not a number. */
  xValues?: (number | null)[]
}

export interface DataDrawOptions {
  /** False leaves the legend out; true draws it where the chart has one: two or more series, a pie. */
  legend: boolean
  /** Where the legend goes; by default right of a pie or donut and under any other chart. */
  legendPosition?: LegendPosition
  palette: ChartPalette
  /** Numbers on the marks; by default on the bars of one or two series and the points of a single line. */
  dataLabels?: boolean
  /** Gridlines across the plot (the default) or only the axes. */
  gridlines?: boolean
  /** Where the value axis starts and ends; worked out from the numbers when missing. */
  yMin?: number
  yMax?: number
  sliceLabels?: SliceLabels
}

export const defaultLegendPosition = (type: DataChartType): LegendPosition => (isRound(type) ? 'right' : 'bottom')

/**
 * Whether a chart with axes shows its legend. One series has nothing to tell apart, so its legend is left out (as it
 * always was) until the teacher picks a place for it; a pie or a donut names its slices and is not asked here.
 */
export const axisLegendShown = (legend: boolean, seriesCount: number, legendPosition: LegendPosition | undefined) =>
  legend && (seriesCount > 1 || legendPosition !== undefined)

/** Whether a chart shows its numbers when the teacher has not said: as charts were drawn before it could be said. */
export function autoDataLabels(type: DataChartType, seriesCount: number): boolean {
  if (type === 'bar' || type === 'horizontalBar') return seriesCount <= 2
  if (type === 'line') return seriesCount === 1
  return false
}

export const MARKERS = ['circle', 'square', 'triangle', 'diamond'] as const
export type Marker = (typeof MARKERS)[number]

export const markerAt = (index: number): Marker => MARKERS[index % MARKERS.length]

/** The dashes of the n-th line printed in black and white: solid, dashed, dotted, dash-dot. */
const PRINT_DASHES = ['', '7 4', '2 3', '8 3 2 3'] as const
export const dashAt = (palette: ChartPalette, index: number) =>
  palette === 'print' && PRINT_DASHES[index % PRINT_DASHES.length]
    ? ` stroke-dasharray="${PRINT_DASHES[index % PRINT_DASHES.length]}"`
    : ''

export function marker(kind: Marker, x: number, y: number, color: string, attrs = '') {
  const extra = attrs ? ` ${attrs}` : ''
  switch (kind) {
    case 'circle':
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${color}"${extra}/>`
    case 'square':
      return `<rect x="${(x - 3.5).toFixed(1)}" y="${(y - 3.5).toFixed(1)}" width="7" height="7" fill="${color}"${extra}/>`
    case 'triangle':
      return `<path d="M${x.toFixed(1)} ${(y - 4.5).toFixed(1)}L${(x + 4.5).toFixed(1)} ${(y + 3.5).toFixed(1)}L${(x - 4.5).toFixed(1)} ${(y + 3.5).toFixed(1)}Z" fill="${color}"${extra}/>`
    case 'diamond':
      return `<path d="M${x.toFixed(1)} ${(y - 4.5).toFixed(1)}L${(x + 4.5).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y + 4.5).toFixed(1)}L${(x - 4.5).toFixed(1)} ${y.toFixed(1)}Z" fill="${color}"${extra}/>`
  }
}

/** A number beside its mark (above a bar or a point), as the charts have always set it. */
export const plainLabel = (x: number, y: number, value: string, anchor: 'start' | 'middle' | 'end' = 'middle') =>
  text(x, y, value, `text-anchor="${anchor}" font-size="10.5" data-label=""`)

/**
 * A number on a mark, ringed in white so it reads over a bar or a slice as well as over the paper. The ring is a copy
 * of the text drawn first, outlined and unfilled, rather than `paint-order` on the text itself: the PDF export's SVG
 * renderer knows only SVG 1.1 and would paint the outline over the glyphs.
 */
export const markLabel = (x: number, y: number, value: string, anchor: 'start' | 'middle' | 'end' = 'middle') =>
  text(x, y, value, `text-anchor="${anchor}" font-size="10.5" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"`) +
  plainLabel(x, y, value, anchor)

/** About how wide `value` prints at `size` px in the sheet's serif. */
export const textWidth = (value: string, size = 11) => [...value].length * size * 0.51

/** One entry of a legend: a box (bars, slices) or a line with its marker (line series). */
export interface LegendEntry {
  name: string
  color: string
  swatch: 'box' | 'line' | 'point'
  index: number
}

/** Width a legend takes right of the plot. */
export const rightLegendWidth = (entries: LegendEntry[]) =>
  Math.min(170, Math.max(60, ...entries.map((entry) => 30 + textWidth(entry.name, 12))))

function swatch(entry: LegendEntry, x: number, baseline: number, palette: ChartPalette) {
  if (entry.swatch === 'box') return `<rect x="${x}" y="${baseline - 10}" width="14" height="10" fill="${entry.color}"/>`
  const kind = markerAt(entry.index)
  if (entry.swatch === 'point') return marker(kind, x + 7, baseline - 4, entry.color)
  return `<line x1="${x}" y1="${baseline - 4}" x2="${x + 18}" y2="${baseline - 4}" stroke="${entry.color}" stroke-width="2"${dashAt(palette, entry.index)}/>${marker(kind, x + 9, baseline - 4, entry.color)}`
}

/**
 * The legend in a row centred across the drawing at `baseline` (above or under the plot), or as a column right of
 * it, starting at `left` and centred on `middle`.
 */
export function drawLegend(
  entries: LegendEntry[],
  place: { position: 'row'; baseline: number; width: number } | { position: 'column'; left: number; middle: number },
  palette: ChartPalette
) {
  if (place.position === 'row') {
    const widths = entries.map((entry) => 34 + entry.name.length * 6.5)
    const total = widths.reduce((sum, width) => sum + width, 0)
    let x = Math.max(8, (place.width - total) / 2)
    return `<g data-legend="row">${entries
      .map((entry, index) => {
        const part = swatch(entry, x, place.baseline, palette) + text(x + 24, place.baseline, entry.name)
        x += widths[index]
        return part
      })
      .join('')}</g>`
  }
  const rowHeight = 20
  let rowY = place.middle - ((entries.length - 1) * rowHeight) / 2 + 4
  return `<g data-legend="column">${entries
    .map((entry) => {
      const part = swatch(entry, place.left, rowY, palette) + text(place.left + 24, rowY, entry.name, 'font-size="12"')
      rowY += rowHeight
      return part
    })
    .join('')}</g>`
}

export const seriesColor = (series: DataChartDrawing['series'][number], colors: readonly string[], index: number) =>
  series.color ?? colorAt(colors, index)


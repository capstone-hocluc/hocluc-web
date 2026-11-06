import type { AiChart } from '../../../services/aiAssistantService'
import { axisChartBody } from './chart-svg-axis'
import { colorAt, FONT, formatNumber, INK, PALETTES, text, type ChartPalette } from './chart-svg-base'
import { functionChartBody, functionChartSize } from './chart-function'
import {
  CHART_SVG_SIZE,
  drawLegend,
  isRound,
  markLabel,
  type DataChartDrawing,
  type DataChartType,
  type DataDrawOptions,
  type LegendEntry,
} from './chart-svg-parts'
import { variationChartBody, variationChartSize } from './chart-variation'

/**
 * Draws chart data as an SVG picture for the exam sheet, set in the sheet's serif: a data chart sized for an A4
 * column (columns, bars, lines, areas, scatter, pie, donut or a combination, `chart-svg-axis.ts` for those on axes),
 * the graph of a function (`chart-function.ts`) or a variation table (`chart-variation.ts`). By default in print
 * greys that stay apart in black and white (each line series also has its own marker and dashes); the chart node
 * shows it as an image, so printing and the Word export (which rasterises SVG) keep it.
 */

export { CHART_SVG_SIZE, formatNumber, type ChartPalette }
const WIDTH = CHART_SVG_SIZE.width
const HEIGHT = CHART_SVG_SIZE.height

export interface ChartDrawOptions {
  /** False leaves the legend out; true (the default) draws it where the chart has one: two or more series, a pie. */
  legend?: boolean
  /** 'print' (the default) stays readable in black and white; 'color' gives every series its own hue. */
  palette?: ChartPalette
}

/** A pie, or a donut with its hole, of the first series; the legend names every slice. */
function roundChart(chart: DataChartDrawing, options: DataDrawOptions, colors: readonly string[]) {
  const values = chart.series[0]?.values ?? []
  const total = values.reduce((sum, value) => sum + value, 0)
  const position = options.legendPosition ?? 'right'
  const showLegend = options.legend
  const sliceLabels = options.dataLabels === true
  const titleRoom = chart.title ? 34 : 14
  const top = titleRoom + (showLegend && position === 'top' ? 22 : 0)
  const bottomRoom = showLegend && position === 'bottom' ? 22 : 0
  const radius = Math.min(110, (HEIGHT - top - 16 - bottomRoom) / 2)
  // Without its legend at the side the pie sits in the middle.
  const cx = showLegend && position === 'right' ? 170 : WIDTH / 2
  const cy = top + radius + 4
  const hole = chart.type === 'donut' ? radius * 0.55 : 0
  const parts: string[] = []
  if (total <= 0) return text(WIDTH / 2, cy, 'Không có số liệu', 'text-anchor="middle"')
  const point = (angle: number, r: number) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)].map((v) => v.toFixed(2)).join(' ')
  let angle = -Math.PI / 2
  values.forEach((value, index) => {
    const color = colorAt(colors, index)
    const sweep = (value / total) * Math.PI * 2
    const end = angle + sweep
    const mark = `fill="${color}" stroke="#fff" stroke-width="1.5" data-mark="slice" data-series="${index}"`
    if (sweep >= Math.PI * 2 - 1e-9) {
      parts.push(hole
        ? `<path d="M${cx - radius} ${cy}a${radius} ${radius} 0 1 0 ${2 * radius} 0a${radius} ${radius} 0 1 0 ${-2 * radius} 0ZM${(cx - hole).toFixed(2)} ${cy}a${hole.toFixed(2)} ${hole.toFixed(2)} 0 1 0 ${(2 * hole).toFixed(2)} 0a${hole.toFixed(2)} ${hole.toFixed(2)} 0 1 0 ${(-2 * hole).toFixed(2)} 0Z" fill-rule="evenodd" ${mark}/>`
        : `<circle cx="${cx}" cy="${cy}" r="${radius}" ${mark}/>`)
    } else if (sweep > 0) {
      const large = sweep > Math.PI ? 1 : 0
      parts.push(hole
        ? `<path d="M${point(angle, radius)}A${radius} ${radius} 0 ${large} 1 ${point(end, radius)}L${point(end, hole)}A${hole.toFixed(2)} ${hole.toFixed(2)} 0 ${large} 0 ${point(angle, hole)}Z" ${mark}/>`
        : `<path d="M${cx} ${cy}L${point(angle, radius)}A${radius} ${radius} 0 ${large} 1 ${point(end, radius)}Z" ${mark}/>`)
    }
    if (sliceLabels && sweep > 0) {
      const middle = angle + sweep / 2
      const label = options.sliceLabels === 'value' ? formatNumber(value) : `${formatNumber((value / total) * 100)}%`
      // A wide slice holds its number; a thin one has it just outside.
      const inside = sweep >= 0.35
      const r = inside ? (hole ? (radius + hole) / 2 : radius * 0.66) : radius + 12
      const [lx, ly] = [cx + r * Math.cos(middle), cy + r * Math.sin(middle)]
      const anchor = inside ? 'middle' : Math.cos(middle) >= 0 ? 'start' : 'end'
      parts.push(markLabel(lx, ly + 4, label, anchor))
    }
    angle = end
  })
  if (!showLegend) return parts.join('')
  if (position !== 'right') {
    // In a row the legend names the slices; their shares are on them when the labels are.
    const entries: LegendEntry[] = values.map((value, index) => ({
      name: sliceLabels ? (chart.categories[index] ?? '') : `${chart.categories[index] ?? ''}: ${formatNumber((value / total) * 100)}%`,
      color: colorAt(colors, index),
      swatch: 'box',
      index,
    }))
    parts.push(drawLegend(entries, { position: 'row', baseline: position === 'top' ? titleRoom + 8 : HEIGHT - 8, width: WIDTH }, options.palette))
    return parts.join('')
  }
  // The legend names every slice with its share, so the chart reads the same printed in black and white.
  const rowHeight = 20
  let rowY = cy - ((values.length - 1) * rowHeight) / 2
  parts.push('<g data-legend="column">')
  values.forEach((value, index) => {
    const color = colorAt(colors, index)
    const share = formatNumber((value / total) * 100)
    const name = chart.categories[index] ?? ''
    parts.push(`<rect x="320" y="${(rowY - 10).toFixed(1)}" width="12" height="12" fill="${color}"/>`)
    parts.push(text(340, rowY, sliceLabels ? name : `${name}: ${share}%`, 'font-size="12"'))
    rowY += rowHeight
  })
  parts.push('</g>')
  return parts.join('')
}

const svgDocument = (width: number, height: number, title: string | undefined, body: string) => {
  const heading = title ? text(width / 2, 20, title, 'text-anchor="middle" font-size="13.5" font-weight="bold"') : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" fill="${INK}"><rect width="${width}" height="${height}" fill="#fff"/>${heading}${body}</svg>`
}

/** A data chart of the document, with every option the chart editor sets, as a standalone SVG document. */
export function dataChartToSvg(chart: DataChartDrawing, options: DataDrawOptions): string {
  const colors = PALETTES[options.palette] ?? PALETTES.print
  // Colours chosen per series belong to the colour palette; printed, every series takes its grey.
  const drawn = options.palette === 'color' ? chart : { ...chart, series: chart.series.map(({ name, values }) => ({ name, values })) }
  const body = isRound(chart.type) ? roundChart(drawn, options, colors) : axisChartBody(drawn, options, colors)
  return svgDocument(WIDTH, HEIGHT, chart.title, body)
}

/** A data chart of the document as an image source. */
export const dataChartImageSrc = (chart: DataChartDrawing, options: DataDrawOptions) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dataChartToSvg(chart, options))}`

/** Size of the drawing of `chart` in px: a graph and a variation table take the size their content needs. */
export function chartSvgSize(chart: AiChart): { width: number; height: number } {
  if (chart.type === 'function') return functionChartSize(chart)
  if (chart.type === 'variation') return variationChartSize(chart)
  return CHART_SVG_SIZE
}

/** The chart as a standalone SVG document. */
export function chartToSvg(chart: AiChart, { legend: showLegend = true, palette = 'print' }: ChartDrawOptions = {}): string {
  if (chart.type !== 'function' && chart.type !== 'variation') return dataChartToSvg(chart, { legend: showLegend, palette })
  const colors = PALETTES[palette] ?? PALETTES.print
  const { width, height } = chartSvgSize(chart)
  const body = chart.type === 'function' ? functionChartBody(chart, palette, colors) : variationChartBody(chart)
  return svgDocument(width, height, chart.title, body)
}

/** The chart as an image source the document, the print view and the Word export can all use. */
export function chartImageSrc(chart: AiChart, options?: ChartDrawOptions): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(chartToSvg(chart, options))}`
}

const KINDS: Record<AiChart['type'], string> = {
  bar: 'Biểu đồ cột',
  line: 'Biểu đồ đường',
  pie: 'Biểu đồ tròn',
  function: 'Đồ thị hàm số',
  variation: 'Bảng biến thiên',
}

/** What each kind of data chart is called, as its alt text and the chart editor name it. */
export const DATA_CHART_KINDS: Record<DataChartType, string> = {
  bar: 'Biểu đồ cột',
  horizontalBar: 'Biểu đồ thanh',
  stackedBar: 'Biểu đồ cột chồng',
  stackedHorizontalBar: 'Biểu đồ thanh chồng',
  line: 'Biểu đồ đường',
  area: 'Biểu đồ vùng',
  scatter: 'Biểu đồ phân tán',
  pie: 'Biểu đồ tròn',
  donut: 'Biểu đồ vành khuyên',
  combo: 'Biểu đồ kết hợp cột và đường',
}

/** A short description of the chart for its alt text. */
export function chartAlt(chart: AiChart): string {
  const kind = KINDS[chart.type] ?? 'Biểu đồ'
  return chart.title ? `${kind}: ${chart.title}` : kind
}

/** The alt text of a data chart of the document: its kind and title, as {@link chartAlt} words an AI chart. */
export function dataChartAlt(chart: Pick<DataChartDrawing, 'type' | 'title'>): string {
  const kind = DATA_CHART_KINDS[chart.type] ?? 'Biểu đồ'
  return chart.title ? `${kind}: ${chart.title}` : kind
}

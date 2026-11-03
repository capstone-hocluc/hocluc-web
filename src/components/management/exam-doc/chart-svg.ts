import type { AiChart } from '../../../services/aiAssistantService'

/**
 * Draws chart data as an SVG picture for the exam sheet: a bar, line or pie chart sized for an A4 column, set in the
 * sheet's serif. By default in print colours that stay apart in black and white (each series also has its own
 * marker); the chart node shows it as an image, so printing and the Word export (which rasterises SVG) keep it.
 */

/** Size of the drawing in px; the sheet scales it to the chart's width. */
export const CHART_SVG_SIZE = { width: 560, height: 300 } as const
const WIDTH = CHART_SVG_SIZE.width
const HEIGHT = CHART_SVG_SIZE.height
const FONT = `'Times New Roman', Times, serif`
const INK = '#1f2328'
const GRID = '#d0d4da'
const MARKERS = ['circle', 'square', 'triangle', 'diamond'] as const

export type ChartPalette = 'print' | 'color'

const PALETTES: Record<ChartPalette, readonly string[]> = {
  print: ['#1f3a5f', '#7a9cc6', '#4b4f56', '#b9c4d0'],
  // Hues in a fixed order whose neighbours stay apart for colour-blind readers too.
  color: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
}

export interface ChartDrawOptions {
  /** False leaves the legend out; true (the default) draws it where the chart has one: two or more series, a pie. */
  legend?: boolean
  /** 'print' (the default) stays readable in black and white; 'color' gives every series its own hue. */
  palette?: ChartPalette
}

const colorAt = (colors: readonly string[], index: number) => colors[index % colors.length]

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const text = (x: number, y: number, value: string, attrs = '') =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${attrs}>${escape(value)}</text>`

/** Numbers as a Vietnamese reader writes them: comma decimals, at most two places. */
export function formatNumber(value: number) {
  const rounded = Math.round(value * 100) / 100
  return String(rounded).replace('.', ',')
}

/** A round step for about `count` gridlines over `span`. */
function niceStep(span: number, count: number) {
  const raw = span / count || 1
  const power = 10 ** Math.floor(Math.log10(raw))
  const fraction = raw / power
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power
}

function scale(chart: AiChart) {
  const values = chart.series.flatMap((series) => series.values)
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const step = niceStep(high - low, 5)
  const min = Math.floor(low / step) * step
  const max = Math.max(min + step, Math.ceil(high / step) * step)
  return { min, max, step }
}

function marker(kind: (typeof MARKERS)[number], x: number, y: number, color: string) {
  switch (kind) {
    case 'circle':
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${color}"/>`
    case 'square':
      return `<rect x="${(x - 3.5).toFixed(1)}" y="${(y - 3.5).toFixed(1)}" width="7" height="7" fill="${color}"/>`
    case 'triangle':
      return `<path d="M${x.toFixed(1)} ${(y - 4.5).toFixed(1)}L${(x + 4.5).toFixed(1)} ${(y + 3.5).toFixed(1)}L${(x - 4.5).toFixed(1)} ${(y + 3.5).toFixed(1)}Z" fill="${color}"/>`
    case 'diamond':
      return `<path d="M${x.toFixed(1)} ${(y - 4.5).toFixed(1)}L${(x + 4.5).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y + 4.5).toFixed(1)}L${(x - 4.5).toFixed(1)} ${y.toFixed(1)}Z" fill="${color}"/>`
  }
}

function legend(chart: AiChart, top: number, lineChart: boolean, colors: readonly string[]) {
  const named = chart.series.filter((series) => series.name.trim())
  if (chart.series.length < 2 || named.length === 0) return ''
  const widths = chart.series.map((series) => 34 + series.name.length * 6.5)
  const total = widths.reduce((sum, width) => sum + width, 0)
  let x = Math.max(8, (WIDTH - total) / 2)
  return chart.series
    .map((series, index) => {
      const color = colorAt(colors, index)
      const swatch = lineChart
        ? `<line x1="${x}" y1="${top - 4}" x2="${x + 18}" y2="${top - 4}" stroke="${color}" stroke-width="2"/>${marker(MARKERS[index % MARKERS.length], x + 9, top - 4, color)}`
        : `<rect x="${x}" y="${top - 10}" width="14" height="10" fill="${color}"/>`
      const label = text(x + 24, top, series.name)
      x += widths[index]
      return swatch + label
    })
    .join('')
}

function axisChart(chart: AiChart, colors: readonly string[], showLegend: boolean) {
  const lineChart = chart.type === 'line'
  const hasLegend = showLegend && chart.series.length > 1
  const top = chart.title ? 34 : 14
  const left = chart.yLabel ? 62 : 48
  const right = WIDTH - 14
  const band = (right - left) / Math.max(1, chart.categories.length)
  // Labels too wide for their slot (twelve months) are slanted instead of running into each other, which takes
  // room under the axis.
  const widest = Math.max(0, ...chart.categories.map((category) => category.length)) * 5.6
  const slanted = widest > band - 4
  const labelRoom = slanted ? Math.min(widest * 0.6, 46) : 0
  const bottom = HEIGHT - (chart.xLabel ? 44 : 28) - (hasLegend ? 22 : 0) - labelRoom
  const { min, max, step } = scale(chart)
  const y = (value: number) => bottom - ((value - min) / (max - min)) * (bottom - top)
  const parts: string[] = []

  for (let value = min; value <= max + step / 2; value += step) {
    const at = y(value)
    parts.push(`<line x1="${left}" y1="${at.toFixed(1)}" x2="${right}" y2="${at.toFixed(1)}" stroke="${value === 0 ? INK : GRID}" stroke-width="${value === 0 ? 1 : 0.7}"/>`)
    parts.push(text(left - 6, at + 4, formatNumber(value), 'text-anchor="end" font-size="11"'))
  }
  parts.push(`<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="1"/>`)

  chart.categories.forEach((category, index) => {
    const x = left + band * (index + 0.5)
    parts.push(slanted
      ? text(x, bottom + 12, category, `text-anchor="end" font-size="10.5" transform="rotate(-35 ${x.toFixed(1)} ${bottom + 12})"`)
      : text(x, bottom + 16, category, 'text-anchor="middle" font-size="11"'))
  })

  if (lineChart) {
    chart.series.forEach((series, index) => {
      const color = colorAt(colors, index)
      const points = series.values.map((value, at) => [left + band * (at + 0.5), y(value)] as const)
      parts.push(`<polyline points="${points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`)
      points.forEach(([px, py], at) => {
        parts.push(marker(MARKERS[index % MARKERS.length], px, py, color))
        if (chart.series.length === 1) parts.push(text(px, py - 8, formatNumber(series.values[at]), 'text-anchor="middle" font-size="10.5"'))
      })
    })
  } else {
    const inner = band * 0.72
    const barWidth = inner / chart.series.length
    chart.series.forEach((series, index) => {
      const color = colorAt(colors, index)
      series.values.forEach((value, at) => {
        const x = left + band * at + (band - inner) / 2 + barWidth * index
        const from = y(Math.max(0, Math.min(value, max)))
        const to = y(Math.min(0, Math.max(value, min)))
        parts.push(`<rect x="${x.toFixed(1)}" y="${Math.min(from, to).toFixed(1)}" width="${(barWidth - 2).toFixed(1)}" height="${Math.abs(to - from).toFixed(1)}" fill="${color}"/>`)
        if (chart.series.length <= 2) {
          const labelY = value >= 0 ? Math.min(from, to) - 4 : Math.max(from, to) + 12
          parts.push(text(x + (barWidth - 2) / 2, labelY, formatNumber(value), 'text-anchor="middle" font-size="10.5"'))
        }
      })
    })
  }

  if (chart.yLabel) {
    const middle = (top + bottom) / 2
    parts.push(text(14, middle, chart.yLabel, `text-anchor="middle" font-size="12" transform="rotate(-90 14 ${middle.toFixed(1)})"`))
  }
  if (chart.xLabel) parts.push(text((left + right) / 2, bottom + 34 + labelRoom, chart.xLabel, 'text-anchor="middle" font-size="12"'))
  if (hasLegend) parts.push(legend(chart, HEIGHT - 8, lineChart, colors))
  return parts.join('')
}

function pieChart(chart: AiChart, colors: readonly string[], showLegend: boolean) {
  const values = chart.series[0]?.values ?? []
  const total = values.reduce((sum, value) => sum + value, 0)
  const top = chart.title ? 34 : 14
  const radius = Math.min(110, (HEIGHT - top - 16) / 2)
  // Without its legend the pie sits in the middle.
  const cx = showLegend ? 170 : WIDTH / 2
  const cy = top + radius + 4
  const parts: string[] = []
  if (total <= 0) return text(WIDTH / 2, cy, 'Không có số liệu', 'text-anchor="middle"')
  let angle = -Math.PI / 2
  values.forEach((value, index) => {
    const color = colorAt(colors, index)
    const sweep = (value / total) * Math.PI * 2
    const end = angle + sweep
    if (sweep >= Math.PI * 2 - 1e-9) {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" stroke="#fff" stroke-width="1.5"/>`)
    } else if (sweep > 0) {
      const [x1, y1] = [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
      const [x2, y2] = [cx + radius * Math.cos(end), cy + radius * Math.sin(end)]
      parts.push(`<path d="M${cx} ${cy}L${x1.toFixed(2)} ${y1.toFixed(2)}A${radius} ${radius} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>`)
    }
    angle = end
  })
  if (!showLegend) return parts.join('')
  // The legend names every slice with its share, so the chart reads the same printed in black and white.
  const rowHeight = 20
  let rowY = cy - ((values.length - 1) * rowHeight) / 2
  values.forEach((value, index) => {
    const color = colorAt(colors, index)
    const share = formatNumber((value / total) * 100)
    parts.push(`<rect x="320" y="${(rowY - 10).toFixed(1)}" width="12" height="12" fill="${color}"/>`)
    parts.push(text(340, rowY, `${chart.categories[index] ?? ''}: ${share}%`, 'font-size="12"'))
    rowY += rowHeight
  })
  return parts.join('')
}

/** The chart as a standalone SVG document. */
export function chartToSvg(chart: AiChart, { legend: showLegend = true, palette = 'print' }: ChartDrawOptions = {}): string {
  const colors = PALETTES[palette] ?? PALETTES.print
  const body = chart.type === 'pie' ? pieChart(chart, colors, showLegend) : axisChart(chart, colors, showLegend)
  const title = chart.title ? text(WIDTH / 2, 20, chart.title, 'text-anchor="middle" font-size="13.5" font-weight="bold"') : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}" fill="${INK}"><rect width="${WIDTH}" height="${HEIGHT}" fill="#fff"/>${title}${body}</svg>`
}

/** The chart as an image source the document, the print view and the Word export can all use. */
export function chartImageSrc(chart: AiChart, options?: ChartDrawOptions): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(chartToSvg(chart, options))}`
}

/** A short description of the chart for its alt text. */
export function chartAlt(chart: AiChart): string {
  const kind = chart.type === 'bar' ? 'Biểu đồ cột' : chart.type === 'line' ? 'Biểu đồ đường' : 'Biểu đồ tròn'
  return chart.title ? `${kind}: ${chart.title}` : kind
}

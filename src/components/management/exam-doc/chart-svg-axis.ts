import { formatNumber, formatTick, GRID, INK, niceStep, text } from './chart-svg-base'
import {
  autoDataLabels,
  axisLegendShown,
  CHART_SVG_SIZE,
  dashAt,
  drawLegend,
  isHorizontal,
  isStacked,
  markerAt,
  marker,
  markLabel,
  plainLabel,
  rightLegendWidth,
  seriesColor,
  textWidth,
  type DataChartDrawing,
  type DataDrawOptions,
  type LegendEntry,
} from './chart-svg-parts'

/*
 * Charts drawn on axes: columns and bars (side by side or stacked), lines, areas, a combination of columns and lines
 * over categories, and scatter charts over a numeric x axis. The value axis takes round steps through zero (or the
 * teacher's own start and end), negative values hang below zero, and the legend goes above, under or right of the
 * plot.
 */

const WIDTH = CHART_SVG_SIZE.width
const HEIGHT = CHART_SVG_SIZE.height
const LEGEND_ROW = 22

interface Scale {
  min: number
  max: number
  step: number
}

/**
 * Round steps over the numbers, through zero when `includeZero`; a start or end the teacher gave is kept as given.
 * Without either it is the scale the charts have always had.
 */
function valueScale(low: number, high: number, bounds: { min?: number; max?: number }, includeZero: boolean): Scale {
  let lo = includeZero ? Math.min(0, low) : low
  let hi = includeZero ? Math.max(0, high) : high
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  if (bounds.min === undefined && bounds.max === undefined) {
    const step = niceStep(hi - lo, 5)
    const min = Math.floor(lo / step) * step
    return { min, max: Math.max(min + step, Math.ceil(hi / step) * step), step }
  }
  if (bounds.min !== undefined) lo = bounds.min
  if (bounds.max !== undefined) hi = bounds.max
  if (hi <= lo) {
    if (bounds.max === undefined) hi = lo + Math.max(1, Math.abs(lo))
    else lo = hi - Math.max(1, Math.abs(hi))
  }
  const step = niceStep(hi - lo, 5)
  const min = bounds.min ?? Math.floor(lo / step) * step
  const max = bounds.max ?? Math.max(min + step, Math.ceil(hi / step) * step)
  return { min, max, step }
}

/** The values a scale has a tick at: multiples of its step from its start to its end. */
function ticksOf({ min, max, step }: Scale): number[] {
  const ticks: number[] = []
  const first = Math.ceil(min / step - 1e-9) * step
  for (let index = 0; index <= 60; index += 1) {
    const value = first + index * step
    if (value > max + step * 1e-6) break
    ticks.push(Math.abs(value) < step * 1e-9 ? 0 : Number(value.toPrecision(12)))
  }
  return ticks
}

const clamp = (value: number, { min, max }: Scale) => Math.min(max, Math.max(min, value))

/** Where bars start: zero, or the end of the axis nearer to it when zero is off the axis. */
const baseOf = (scale: Scale) => clamp(0, scale)

function legendEntries(chart: DataChartDrawing, colors: readonly string[]): LegendEntry[] {
  return chart.series.map((series, index) => ({
    name: series.name,
    color: seriesColor(series, colors, index),
    swatch:
      chart.type === 'line' || (chart.type === 'combo' && index > 0)
        ? 'line'
        : chart.type === 'scatter'
          ? 'point'
          : 'box',
    index,
  }))
}

interface Plot {
  top: number
  right: number
  /** The legend, drawn once the plot is known. */
  legend: (left: number, top: number, bottom: number) => string
  /** Room the legend takes under the plot. */
  bottomRoom: number
}

/** Room for the title and the legend, and the legend itself in its place. */
function plotFrame(chart: DataChartDrawing, options: DataDrawOptions, colors: readonly string[]): Plot {
  const titleRoom = chart.title ? 34 : 14
  const entries = legendEntries(chart, colors)
  const named = chart.series.some((series) => series.name.trim())
  // Room for a legend whenever there are series to tell apart, as before, and for one series once the teacher has
  // placed its legend and it has a name; the legend is drawn only when a series has a name.
  const hasLegend =
    axisLegendShown(options.legend, chart.series.length, options.legendPosition) && (chart.series.length > 1 || named)
  const position = options.legendPosition ?? 'bottom'
  const columnWidth = hasLegend && position === 'right' ? rightLegendWidth(entries) : 0
  const right = WIDTH - 14 - columnWidth
  return {
    top: titleRoom + (hasLegend && position === 'top' ? LEGEND_ROW : 0),
    right,
    bottomRoom: hasLegend && position === 'bottom' ? LEGEND_ROW : 0,
    legend: (_left, top, bottom) => {
      if (!hasLegend || !named) return ''
      if (position === 'right') return drawLegend(entries, { position: 'column', left: right + 12, middle: (top + bottom) / 2 }, options.palette)
      if (position === 'top') return drawLegend(entries, { position: 'row', baseline: titleRoom + 8, width: WIDTH }, options.palette)
      return drawLegend(entries, { position: 'row', baseline: HEIGHT - 8, width: WIDTH }, options.palette)
    },
  }
}

/** Room left of the plot for the value axis: its numbers and its title. */
const valueAxisRoom = (labels: string[], titled: boolean, least: number) =>
  Math.max(least, (titled ? 24 : 6) + Math.max(0, ...labels.map((label) => textWidth(label))) + 8)

function rangeOf(chart: DataChartDrawing): { low: number; high: number } {
  if (isStacked(chart.type)) {
    let low = 0
    let high = 0
    chart.categories.forEach((_, at) => {
      let up = 0
      let down = 0
      for (const series of chart.series) {
        const value = series.values[at] ?? 0
        if (value >= 0) up += value
        else down += value
      }
      high = Math.max(high, up)
      low = Math.min(low, down)
    })
    return { low, high }
  }
  const values = chart.series.flatMap((series) => series.values)
  return { low: Math.min(0, ...values), high: Math.max(0, ...values) }
}

/** The value axis's gridlines and the line its bars start from. */
function valueGrid(
  scale: Scale,
  options: DataDrawOptions,
  at: (value: number) => number,
  line: (position: number, color: string, width: number) => string,
  label: (position: number, value: string) => string
) {
  const parts: string[] = []
  const base = baseOf(scale)
  const gridlines = options.gridlines !== false
  let baseDrawn = false
  for (const value of ticksOf(scale)) {
    const position = at(value)
    if (value === base) {
      parts.push(line(position, INK, 1))
      baseDrawn = true
    } else if (gridlines) {
      parts.push(line(position, GRID, 0.7))
    }
    parts.push(label(position, formatTick(value, scale.step)))
  }
  if (!baseDrawn) parts.push(line(at(base), INK, 1))
  return parts.join('')
}

/** Columns, lines, areas or both over the categories along the bottom. */
function verticalChart(chart: DataChartDrawing, options: DataDrawOptions, colors: readonly string[]) {
  const { type } = chart
  const frame = plotFrame(chart, options, colors)
  const { low, high } = rangeOf(chart)
  const scale = valueScale(low, high, { min: options.yMin, max: options.yMax }, true)
  const ticks = ticksOf(scale)
  const top = frame.top
  const left = valueAxisRoom(ticks.map((value) => formatTick(value, scale.step)), Boolean(chart.yLabel), chart.yLabel ? 62 : 48)
  const right = frame.right
  const band = (right - left) / Math.max(1, chart.categories.length)
  // Labels too wide for their slot (twelve months) are slanted instead of running into each other, which takes
  // room under the axis.
  const widest = Math.max(0, ...chart.categories.map((category) => category.length)) * 5.6
  const slanted = widest > band - 4
  const labelRoom = slanted ? Math.min(widest * 0.6, 46) : 0
  const bottom = HEIGHT - (chart.xLabel ? 44 : 28) - frame.bottomRoom - labelRoom
  const y = (value: number) => bottom - ((value - scale.min) / (scale.max - scale.min)) * (bottom - top)
  const labels = options.dataLabels ?? autoDataLabels(type, chart.series.length)
  const base = baseOf(scale)
  const parts: string[] = []

  parts.push(
    valueGrid(
      scale,
      options,
      y,
      (at, color, width) => `<line x1="${left}" y1="${at.toFixed(1)}" x2="${right}" y2="${at.toFixed(1)}" stroke="${color}" stroke-width="${width}"/>`,
      (at, value) => text(left - 6, at + 4, value, 'text-anchor="end" font-size="11"')
    )
  )
  parts.push(`<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="1"/>`)

  chart.categories.forEach((category, index) => {
    const x = left + band * (index + 0.5)
    parts.push(slanted
      ? text(x, bottom + 12, category, `text-anchor="end" font-size="10.5" transform="rotate(-35 ${x.toFixed(1)} ${bottom + 12})"`)
      : text(x, bottom + 16, category, 'text-anchor="middle" font-size="11"'))
  })

  const inner = band * 0.72
  const barSeries = type === 'bar' ? chart.series.length : 1
  const barWidth = inner / barSeries

  /** A column from the base to `value`, and its number above (or under) it. */
  const column = (value: number, x: number, width: number, color: string, index: number) => {
    const from = y(clamp(Math.max(base, value), scale))
    const to = y(clamp(Math.min(base, value), scale))
    parts.push(`<rect x="${x.toFixed(1)}" y="${Math.min(from, to).toFixed(1)}" width="${(width - 2).toFixed(1)}" height="${Math.abs(to - from).toFixed(1)}" fill="${color}" data-mark="bar" data-series="${index}"/>`)
    if (!labels) return
    const middle = x + (width - 2) / 2
    if (value >= base) {
      const labelY = Math.min(from, to) - 4
      parts.push(labelY < top - 16 ? markLabel(middle, Math.min(from, to) + 12, formatNumber(value)) : plainLabel(middle, labelY, formatNumber(value)))
    } else {
      const labelY = Math.max(from, to) + 12
      // Under a bar that reaches the bottom the number would sit on the category labels: it goes inside the bar.
      parts.push(labelY > bottom - 2 ? markLabel(middle, Math.max(from, to) - 4, formatNumber(value)) : plainLabel(middle, labelY, formatNumber(value)))
    }
  }

  if (type === 'stackedBar') {
    chart.categories.forEach((_, at) => {
      let up = 0
      let down = 0
      const x = left + band * at + (band - inner) / 2
      chart.series.forEach((series, index) => {
        const value = series.values[at] ?? 0
        const start = value >= 0 ? up : down
        const end = start + value
        if (value >= 0) up = end
        else down = end
        const from = y(clamp(Math.max(start, end), scale))
        const to = y(clamp(Math.min(start, end), scale))
        const height = Math.abs(to - from)
        parts.push(`<rect x="${x.toFixed(1)}" y="${Math.min(from, to).toFixed(1)}" width="${(inner - 2).toFixed(1)}" height="${height.toFixed(1)}" fill="${seriesColor(series, colors, index)}" stroke="#fff" stroke-width="1" data-mark="bar" data-series="${index}"/>`)
        if (labels && value !== 0 && height >= 13) parts.push(markLabel(x + (inner - 2) / 2, (from + to) / 2 + 4, formatNumber(value)))
      })
    })
  } else if (type === 'bar' || type === 'combo') {
    const bars = type === 'combo' ? chart.series.slice(0, 1) : chart.series
    bars.forEach((series, index) => {
      const color = seriesColor(series, colors, index)
      series.values.forEach((value, at) => column(value, left + band * at + (band - inner) / 2 + barWidth * index, barWidth, color, index))
    })
  }

  if (type === 'line' || type === 'area' || type === 'combo') {
    chart.series.forEach((series, index) => {
      if (type === 'combo' && index === 0) return
      const color = seriesColor(series, colors, index)
      const points = series.values.map((value, at) => [left + band * (at + 0.5), y(clamp(value, scale))] as const)
      if (points.length === 0) return
      const path = points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
      if (type === 'area') {
        const baseY = y(base).toFixed(1)
        parts.push(`<path d="M${points[0][0].toFixed(1)} ${baseY}L${path.replace(/ /g, 'L').replace(/,/g, ' ')}L${points[points.length - 1][0].toFixed(1)} ${baseY}Z" fill="${color}" fill-opacity="0.35" data-mark="area" data-series="${index}"/>`)
      }
      parts.push(`<polyline points="${path}" fill="none" stroke="${color}" stroke-width="2"${dashAt(options.palette, index)} data-mark="line" data-series="${index}"/>`)
      points.forEach(([px, py], at) => {
        if (type !== 'area') parts.push(marker(markerAt(index), px, py, color, `data-mark="point" data-series="${index}"`))
        if (labels) parts.push(plainLabel(px, py - 8, formatNumber(series.values[at])))
      })
    })
  }

  if (chart.yLabel) {
    const middle = (top + bottom) / 2
    parts.push(text(14, middle, chart.yLabel, `text-anchor="middle" font-size="12" transform="rotate(-90 14 ${middle.toFixed(1)})"`))
  }
  if (chart.xLabel) parts.push(text((left + right) / 2, bottom + 34 + labelRoom, chart.xLabel, 'text-anchor="middle" font-size="12"'))
  parts.push(frame.legend(left, top, bottom))
  return parts.join('')
}

/** Bars, side by side or stacked, out from the categories down the left. */
function horizontalChart(chart: DataChartDrawing, options: DataDrawOptions, colors: readonly string[]) {
  const frame = plotFrame(chart, options, colors)
  const { low, high } = rangeOf(chart)
  const scale = valueScale(low, high, { min: options.yMin, max: options.yMax }, true)
  const stacked = isStacked(chart.type)
  const top = frame.top
  const categoryRoom = Math.min(130, Math.max(10, ...chart.categories.map((category) => textWidth(category))))
  // The category axis is the vertical one here: its title (the label column's) stands at the left.
  const left = (chart.xLabel ? 26 : 8) + categoryRoom + 8
  const right = frame.right - 8
  const bottom = HEIGHT - (chart.yLabel ? 44 : 28) - frame.bottomRoom
  const band = (bottom - top) / Math.max(1, chart.categories.length)
  const x = (value: number) => left + ((value - scale.min) / (scale.max - scale.min)) * (right - left)
  const labels = options.dataLabels ?? autoDataLabels(chart.type, chart.series.length)
  const base = baseOf(scale)
  const parts: string[] = []

  parts.push(
    valueGrid(
      scale,
      options,
      x,
      (at, color, width) => `<line x1="${at.toFixed(1)}" y1="${top}" x2="${at.toFixed(1)}" y2="${bottom}" stroke="${color}" stroke-width="${width}"/>`,
      (at, value) => text(at, bottom + 16, value, 'text-anchor="middle" font-size="11"')
    )
  )
  parts.push(`<line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="${INK}" stroke-width="1"/>`)
  chart.categories.forEach((category, index) => {
    parts.push(text(left - 6, top + band * (index + 0.5) + 4, category, 'text-anchor="end" font-size="11"'))
  })

  const inner = band * 0.72
  if (stacked) {
    chart.categories.forEach((_, at) => {
      let up = 0
      let down = 0
      const barY = top + band * at + (band - inner) / 2
      chart.series.forEach((series, index) => {
        const value = series.values[at] ?? 0
        const start = value >= 0 ? up : down
        const end = start + value
        if (value >= 0) up = end
        else down = end
        const from = x(clamp(Math.min(start, end), scale))
        const to = x(clamp(Math.max(start, end), scale))
        parts.push(`<rect x="${from.toFixed(1)}" y="${barY.toFixed(1)}" width="${(to - from).toFixed(1)}" height="${(inner - 2).toFixed(1)}" fill="${seriesColor(series, colors, index)}" stroke="#fff" stroke-width="1" data-mark="bar" data-series="${index}"/>`)
        const number = formatNumber(value)
        if (labels && value !== 0 && to - from >= textWidth(number, 10.5) + 6) parts.push(markLabel((from + to) / 2, barY + (inner - 2) / 2 + 4, number))
      })
    })
  } else {
    const barHeight = inner / chart.series.length
    chart.series.forEach((series, index) => {
      const color = seriesColor(series, colors, index)
      series.values.forEach((value, at) => {
        const barY = top + band * at + (band - inner) / 2 + barHeight * index
        const from = x(clamp(Math.min(base, value), scale))
        const to = x(clamp(Math.max(base, value), scale))
        parts.push(`<rect x="${from.toFixed(1)}" y="${barY.toFixed(1)}" width="${(to - from).toFixed(1)}" height="${(barHeight - 2).toFixed(1)}" fill="${color}" data-mark="bar" data-series="${index}"/>`)
        if (!labels) return
        const number = formatNumber(value)
        const middle = barY + (barHeight - 2) / 2 + 4
        const room = textWidth(number, 10.5) + 4
        if (value >= base) {
          parts.push(to + room > right + 12 ? markLabel(to - 4, middle, number, 'end') : plainLabel(to + 4, middle, number, 'start'))
        } else {
          // Left of a bar that reaches the left edge the number would sit on the category labels: it goes inside.
          parts.push(from - room < left ? markLabel(from + 4, middle, number, 'start') : plainLabel(from - 4, middle, number, 'end'))
        }
      })
    })
  }

  if (chart.xLabel) {
    const middle = (top + bottom) / 2
    parts.push(text(14, middle, chart.xLabel, `text-anchor="middle" font-size="12" transform="rotate(-90 14 ${middle.toFixed(1)})"`))
  }
  if (chart.yLabel) parts.push(text((left + right) / 2, bottom + 34, chart.yLabel, 'text-anchor="middle" font-size="12"'))
  parts.push(frame.legend(left, top, bottom))
  return parts.join('')
}

/** Points at their x (the label, read as a number) and y, one marker shape per series. */
function scatterChart(chart: DataChartDrawing, options: DataDrawOptions, colors: readonly string[]) {
  const xs = chart.xValues ?? []
  const rows = chart.categories.map((_, at) => at).filter((at) => xs[at] !== null && xs[at] !== undefined)
  if (rows.length === 0) return text(WIDTH / 2, HEIGHT / 2, 'Không có số liệu', 'text-anchor="middle"')
  const frame = plotFrame(chart, options, colors)
  const xValues = rows.map((at) => xs[at] as number)
  const yValues = chart.series.flatMap((series) => rows.map((at) => series.values[at] ?? 0))
  const xScale = valueScale(Math.min(...xValues), Math.max(...xValues), {}, false)
  const yScale = valueScale(Math.min(...yValues), Math.max(...yValues), { min: options.yMin, max: options.yMax }, false)
  const top = frame.top
  const yTicks = ticksOf(yScale)
  const left = valueAxisRoom(yTicks.map((value) => formatTick(value, yScale.step)), Boolean(chart.yLabel), chart.yLabel ? 62 : 48)
  const right = frame.right - 8
  const bottom = HEIGHT - (chart.xLabel ? 44 : 28) - frame.bottomRoom
  const px = (value: number) => left + ((value - xScale.min) / (xScale.max - xScale.min)) * (right - left)
  const py = (value: number) => bottom - ((value - yScale.min) / (yScale.max - yScale.min)) * (bottom - top)
  const gridlines = options.gridlines !== false
  const labels = options.dataLabels ?? false
  const parts: string[] = []

  for (const value of yTicks) {
    const at = py(value)
    if (gridlines && value !== yScale.min) parts.push(`<line x1="${left}" y1="${at.toFixed(1)}" x2="${right}" y2="${at.toFixed(1)}" stroke="${GRID}" stroke-width="0.7"/>`)
    parts.push(text(left - 6, at + 4, formatTick(value, yScale.step), 'text-anchor="end" font-size="11"'))
  }
  for (const value of ticksOf(xScale)) {
    const at = px(value)
    if (gridlines && value !== xScale.min) parts.push(`<line x1="${at.toFixed(1)}" y1="${top}" x2="${at.toFixed(1)}" y2="${bottom}" stroke="${GRID}" stroke-width="0.7"/>`)
    parts.push(text(at, bottom + 16, formatTick(value, xScale.step), 'text-anchor="middle" font-size="11"'))
  }
  parts.push(`<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="1"/>`)
  parts.push(`<line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="${INK}" stroke-width="1"/>`)

  chart.series.forEach((series, index) => {
    const color = seriesColor(series, colors, index)
    rows.forEach((at) => {
      const value = series.values[at] ?? 0
      // A point outside the axis the teacher set is left out, not drawn on its edge.
      if (value < yScale.min || value > yScale.max) return
      const [x, y] = [px(xs[at] as number), py(value)]
      parts.push(marker(markerAt(index), x, y, color, `data-mark="point" data-series="${index}"`))
      if (labels) parts.push(plainLabel(x, y - 8, formatNumber(value)))
    })
  })

  if (chart.yLabel) {
    const middle = (top + bottom) / 2
    parts.push(text(14, middle, chart.yLabel, `text-anchor="middle" font-size="12" transform="rotate(-90 14 ${middle.toFixed(1)})"`))
  }
  if (chart.xLabel) parts.push(text((left + right) / 2, bottom + 34, chart.xLabel, 'text-anchor="middle" font-size="12"'))
  parts.push(frame.legend(left, top, bottom))
  return parts.join('')
}

/** The drawing of any chart on axes, without its title. */
export function axisChartBody(chart: DataChartDrawing, options: DataDrawOptions, colors: readonly string[]) {
  if (chart.type === 'scatter') return scatterChart(chart, options, colors)
  if (isHorizontal(chart.type)) return horizontalChart(chart, options, colors)
  return verticalChart(chart, options, colors)
}

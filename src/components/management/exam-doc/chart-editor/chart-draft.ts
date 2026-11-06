import {
  formatChartNumber,
  normalizeChart,
  parseChartNumber,
  type ChartPalette,
  type ChartSpec,
  type ChartType,
  type ChartValue,
  type LegendPosition,
} from '../chart-data'

/*
 * The chart editor's working copy: settings as typed, and the data table with every number still the text in its
 * cell, so a half-typed "16," is kept while the teacher types. It becomes a chart again on "Lưu" when every cell
 * reads as a number.
 */

export interface DraftSeries {
  id: string
  name: string
}

export interface DraftRow {
  /** Only for the editor's own bookkeeping (React keys); rows are stored without one. */
  key: string
  label: string
  /** One text per series, in series order. */
  cells: string[]
}

export interface ChartDraft {
  type: ChartType
  title: string
  xLabel: string
  yLabel: string
  legend: boolean
  /** Where the legend goes once the teacher has said; until then the chart type's own place. */
  legendPosition?: LegendPosition
  /** Numbers on the marks once the teacher has said; until then as the chart type has them. */
  dataLabels?: boolean
  gridlines: boolean
  /** The value axis's start and end as typed; blank is worked out from the numbers. */
  yMin: string
  yMax: string
  sliceLabels: 'value' | 'percent'
  /** Colours picked for series (by series id) in the colour palette. */
  colors: Record<string, string>
  palette: ChartPalette
  width: number
  labelColumnId: string
  series: DraftSeries[]
  rows: DraftRow[]
}

/** Rows and series the editor adds up to: four series keep their own colour and marker in black and white. */
export const DRAFT_LIMITS = { rows: 40, series: 4 } as const

let rowKeys = 0
const rowKey = () => `row-${(rowKeys += 1)}`

const axisText = (value: number | undefined) => (value === undefined ? '' : formatChartNumber(value))

export function draftFromValue({ data, spec }: ChartValue): ChartDraft {
  const [labelColumn, ...series] = data.columns
  return {
    type: spec.type,
    title: spec.title,
    xLabel: spec.xLabel,
    yLabel: spec.yLabel,
    legend: spec.legend,
    ...(spec.legendPosition ? { legendPosition: spec.legendPosition } : {}),
    ...(spec.dataLabels !== undefined ? { dataLabels: spec.dataLabels } : {}),
    gridlines: spec.gridlines !== false,
    yMin: axisText(spec.yMin),
    yMax: axisText(spec.yMax),
    sliceLabels: spec.sliceLabels ?? 'percent',
    colors: { ...spec.colors },
    palette: spec.palette,
    width: spec.width,
    labelColumnId: labelColumn.id,
    series: series.map((column) => ({ id: column.id, name: column.label })),
    rows: data.rows.map(([label, ...cells]) => ({
      key: rowKey(),
      label: String(label ?? ''),
      cells: series.map((_, index) => formatChartNumber(Number(cells[index]) || 0)),
    })),
  }
}

/** A row of empty cells, for `series` series. */
export function emptyRow(series: number): DraftRow {
  return { key: rowKey(), label: '', cells: Array.from({ length: series }, () => '') }
}

/** An id no series of the draft has: "s<n>", after the highest in use. */
export function freshSeriesId(draft: ChartDraft): string {
  const used = new Set([draft.labelColumnId, ...draft.series.map((series) => series.id)])
  let next = draft.series.length + 1
  while (used.has(`s${next}`)) next += 1
  return `s${next}`
}

/** Whether the table can be turned over: its rows would become series, of which the editor takes four. */
export const canSwitchRowsAndColumns = (draft: ChartDraft) =>
  draft.rows.length <= DRAFT_LIMITS.series && draft.series.length <= DRAFT_LIMITS.rows

/**
 * The table turned over ("Chuyển đổi hàng/cột"): every row becomes a series named by its label, every series a row
 * labelled by its name, each cell's text kept as typed. Colours picked for the old series are dropped.
 */
export function switchRowsAndColumns(draft: ChartDraft): ChartDraft {
  const ids: string[] = []
  for (let next = 1; ids.length < draft.rows.length; next += 1) {
    if (`s${next}` !== draft.labelColumnId) ids.push(`s${next}`)
  }
  return {
    ...draft,
    colors: {},
    series: draft.rows.map((row, index) => ({ id: ids[index], name: row.label })),
    rows: draft.series.map((series, column) => ({
      key: rowKey(),
      label: series.name,
      cells: draft.rows.map((row) => row.cells[column] ?? ''),
    })),
  }
}

/** Key of a number cell: its row and series. */
export const cellKey = (row: DraftRow, series: DraftSeries) => `${row.key}:${series.id}`

/** Keys of the axis fields in `DraftCheck.invalid`. */
export const AXIS_KEYS = { min: 'axis:min', max: 'axis:max' } as const

export interface DraftCheck {
  /** The chart to save; null while a cell blocks saving. */
  value: ChartValue | null
  /** Cells that are not numbers (or not what the chart type takes), by `cellKey`, and axis fields by `AXIS_KEYS`. */
  invalid: Set<string>
  /** What keeps the chart from being saved, one sentence each. */
  problems: string[]
  /** What the chart leaves out but can still be saved with, one sentence each. */
  warnings: string[]
}

export const isRoundType = (type: ChartType) => type === 'pie' || type === 'donut'
export const isHorizontalType = (type: ChartType) => type === 'horizontalBar' || type === 'stackedHorizontalBar'

/** The axis bounds as numbers: blank is none, text that is not a number is null. */
function axisBounds(draft: ChartDraft): { min: number | null | undefined; max: number | null | undefined } {
  const read = (text: string) => (text.trim() ? parseChartNumber(text) : undefined)
  return { min: read(draft.yMin), max: read(draft.yMax) }
}

function spec(draft: ChartDraft): ChartSpec {
  const round = isRoundType(draft.type)
  const { min, max } = axisBounds(draft)
  return {
    type: draft.type,
    title: draft.title.trim(),
    xLabel: draft.xLabel.trim(),
    yLabel: draft.yLabel.trim(),
    legend: draft.legend,
    palette: draft.palette,
    width: draft.width,
    // Options only as set, so an untouched chart saves as it was (normalizeChart checks them again).
    ...(draft.legendPosition ? { legendPosition: draft.legendPosition } : {}),
    ...(draft.dataLabels !== undefined ? { dataLabels: draft.dataLabels } : {}),
    ...(!draft.gridlines && !round ? { gridlines: false as const } : {}),
    ...(typeof min === 'number' && !round ? { yMin: min } : {}),
    ...(typeof max === 'number' && !round ? { yMax: max } : {}),
    ...(draft.sliceLabels === 'value' && round ? { sliceLabels: 'value' as const } : {}),
    ...(Object.keys(draft.colors).length ? { colors: draft.colors } : {}),
  }
}

function build(draft: ChartDraft, numbers: (row: number, column: number) => number): ChartValue {
  const xLabel = draft.xLabel.trim()
  return normalizeChart({
    data: {
      columns: [
        { id: draft.labelColumnId, label: xLabel, role: 'label' },
        ...draft.series.map((series) => ({ id: series.id, label: series.name.trim(), role: 'series' })),
      ],
      rows: draft.rows.map((row, index) => [row.label.trim(), ...draft.series.map((_, column) => numbers(index, column))]),
    },
    spec: spec(draft),
  })
}

/** The chart as it would be saved now, every cell that is not a number drawn as 0: what the preview shows. */
export function previewValue(draft: ChartDraft): ChartValue {
  return build(draft, (row, column) => parseChartNumber(draft.rows[row].cells[column] ?? '') ?? 0)
}

export function checkDraft(draft: ChartDraft): DraftCheck {
  const invalid = new Set<string>()
  const problems: string[] = []
  const warnings: string[] = []
  const round = isRoundType(draft.type)
  let blank = false
  let negative = false
  draft.rows.forEach((row) => {
    draft.series.forEach((series, column) => {
      const value = parseChartNumber(row.cells[column] ?? '')
      if (value === null) {
        invalid.add(cellKey(row, series))
        blank = true
      } else if (round && column === 0 && value < 0) {
        // A pie draws its first series only.
        invalid.add(cellKey(row, series))
        negative = true
      }
    })
  })
  if (blank) problems.push('Có ô số liệu trống hoặc không phải là số.')
  if (negative) problems.push('Biểu đồ tròn không nhận số âm.')
  if (round && !blank && !negative && draft.rows.every((row) => (parseChartNumber(row.cells[0] ?? '') ?? 0) === 0)) {
    problems.push('Biểu đồ tròn cần ít nhất một số lớn hơn 0.')
  }
  if (!round) {
    const { min, max } = axisBounds(draft)
    if (min === null) invalid.add(AXIS_KEYS.min)
    if (max === null) invalid.add(AXIS_KEYS.max)
    if (min === null || max === null) problems.push('Giá trị nhỏ nhất và lớn nhất của trục phải là số.')
    else if (min !== undefined && max !== undefined && min >= max) {
      invalid.add(AXIS_KEYS.min)
      invalid.add(AXIS_KEYS.max)
      problems.push('Giá trị nhỏ nhất của trục phải nhỏ hơn giá trị lớn nhất.')
    }
  }
  if (draft.type === 'scatter') {
    const numeric = draft.rows.filter((row) => parseChartNumber(row.label) !== null).length
    if (numeric === 0) problems.push('Biểu đồ phân tán cần ít nhất một dòng có nhãn là số.')
    else if (numeric < draft.rows.length) warnings.push('Biểu đồ phân tán bỏ qua các dòng có nhãn không phải là số.')
  }
  return {
    value: problems.length ? null : build(draft, (row, column) => parseChartNumber(draft.rows[row].cells[column] ?? '') ?? 0),
    invalid,
    problems,
    warnings,
  }
}

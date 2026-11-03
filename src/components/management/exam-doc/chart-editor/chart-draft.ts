import {
  formatChartNumber,
  normalizeChart,
  parseChartNumber,
  type ChartPalette,
  type ChartSpec,
  type ChartType,
  type ChartValue,
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

export function draftFromValue({ data, spec }: ChartValue): ChartDraft {
  const [labelColumn, ...series] = data.columns
  return {
    type: spec.type,
    title: spec.title,
    xLabel: spec.xLabel,
    yLabel: spec.yLabel,
    legend: spec.legend,
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

/** Key of a number cell: its row and series. */
export const cellKey = (row: DraftRow, series: DraftSeries) => `${row.key}:${series.id}`

export interface DraftCheck {
  /** The chart to save; null while a cell blocks saving. */
  value: ChartValue | null
  /** Cells that are not numbers (or not what the chart type takes), by `cellKey`. */
  invalid: Set<string>
  /** What keeps the chart from being saved, one sentence each. */
  problems: string[]
}

function spec(draft: ChartDraft): ChartSpec {
  return {
    type: draft.type,
    title: draft.title.trim(),
    xLabel: draft.xLabel.trim(),
    yLabel: draft.yLabel.trim(),
    legend: draft.legend,
    palette: draft.palette,
    width: draft.width,
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
  const pie = draft.type === 'pie'
  let blank = false
  let negative = false
  draft.rows.forEach((row) => {
    draft.series.forEach((series, column) => {
      const value = parseChartNumber(row.cells[column] ?? '')
      if (value === null) {
        invalid.add(cellKey(row, series))
        blank = true
      } else if (pie && column === 0 && value < 0) {
        // A pie draws its first series only.
        invalid.add(cellKey(row, series))
        negative = true
      }
    })
  })
  if (blank) problems.push('Có ô số liệu trống hoặc không phải là số.')
  if (negative) problems.push('Biểu đồ tròn không nhận số âm.')
  if (pie && !blank && !negative && draft.rows.every((row) => (parseChartNumber(row.cells[0] ?? '') ?? 0) === 0)) {
    problems.push('Biểu đồ tròn cần ít nhất một số lớn hơn 0.')
  }
  return {
    value: problems.length ? null : build(draft, (row, column) => parseChartNumber(draft.rows[row].cells[column] ?? '') ?? 0),
    invalid,
    problems,
  }
}

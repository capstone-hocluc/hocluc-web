import { useEffect, useRef, type KeyboardEvent } from 'react'
import { cn } from '../../../../lib/cn'
import Button from '../../../console/button'
import { Plus, Trash2 } from '../../../console/icons'
import { DRAFT_LIMITS, cellKey, emptyRow, freshSeriesId, type ChartDraft } from './chart-draft'

// `size={1}` on the inputs lets them take their column's width instead of the browser's 20 characters.
const INPUT =
  'h-9 w-full min-w-0 rounded-md border border-card-border bg-input-background px-2.5 text-sm text-text-primary outline-none placeholder:text-input-placeholder-text focus:border-input-primary-focus-border aria-[invalid=true]:border-input-error-focus-border'
const ICON_BUTTON =
  'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon-tertiary outline-none transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

/** A cell of the grid: column 0 holds the category labels, then one column per series; row -1 is the header. */
interface CellPlace {
  row: number
  column: number
}

interface ChartDataGridProps {
  draft: ChartDraft
  onChange: (draft: ChartDraft) => void
  /** Whether a number cell is shown as wrong (it is not a number, and the teacher left it or tried to save). */
  showsInvalid: (key: string) => boolean
  onLeaveCell: (key: string) => void
}

/**
 * The chart's data as a table to type into: categories down the first column, one column per series named in the
 * header. Enter and the up/down arrows move between rows, Tab between columns.
 */
export default function ChartDataGrid({ draft, onChange, showsInvalid, onLeaveCell }: ChartDataGridProps) {
  const table = useRef<HTMLTableElement>(null)
  // Where focus goes once the table has rendered a change (a new row, a new series, a removed one).
  const pendingFocus = useRef<CellPlace | null>(null)
  const { rows, series } = draft

  useEffect(() => {
    const place = pendingFocus.current
    if (!place) return
    pendingFocus.current = null
    table.current?.querySelector<HTMLInputElement>(`[data-row="${place.row}"][data-column="${place.column}"]`)?.focus()
  })

  function focusCell(place: CellPlace) {
    table.current?.querySelector<HTMLInputElement>(`[data-row="${place.row}"][data-column="${place.column}"]`)?.focus()
  }

  function onCellKeyDown(event: KeyboardEvent<HTMLInputElement>, place: CellPlace) {
    const down = event.key === 'ArrowDown' || (event.key === 'Enter' && !event.shiftKey)
    const up = event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey)
    if (!down && !up) return
    event.preventDefault()
    const row = place.row + (down ? 1 : -1)
    if (row >= -1 && row < rows.length) focusCell({ row, column: place.column })
  }

  function setLabel(index: number, label: string) {
    onChange({ ...draft, rows: rows.map((row, at) => (at === index ? { ...row, label } : row)) })
  }

  function setCell(index: number, column: number, text: string) {
    onChange({
      ...draft,
      rows: rows.map((row, at) => (at === index ? { ...row, cells: row.cells.map((cell, of) => (of === column ? text : cell)) } : row)),
    })
  }

  function setSeriesName(index: number, name: string) {
    onChange({ ...draft, series: series.map((item, at) => (at === index ? { ...item, name } : item)) })
  }

  function addRow() {
    pendingFocus.current = { row: rows.length, column: 0 }
    onChange({ ...draft, rows: [...rows, emptyRow(series.length)] })
  }

  function removeRow(index: number) {
    pendingFocus.current = { row: Math.min(index, rows.length - 2), column: 0 }
    onChange({ ...draft, rows: rows.filter((_, at) => at !== index) })
  }

  function addSeries() {
    pendingFocus.current = { row: -1, column: series.length + 1 }
    onChange({
      ...draft,
      series: [...series, { id: freshSeriesId(draft), name: '' }],
      rows: rows.map((row) => ({ ...row, cells: [...row.cells, ''] })),
    })
  }

  function removeSeries(index: number) {
    pendingFocus.current = { row: -1, column: Math.min(index, series.length - 2) + 1 }
    onChange({
      ...draft,
      series: series.filter((_, at) => at !== index),
      rows: rows.map((row) => ({ ...row, cells: row.cells.filter((_, at) => at !== index) })),
    })
  }

  const seriesName = (index: number) => series[index].name.trim() || `Dãy số ${index + 1}`

  return (
    <div className="flex flex-col gap-3">
      <div className="app-scroll overflow-x-auto rounded-lg border border-card-border">
        <table ref={table} className="w-full border-collapse text-sm">
          <thead className="bg-background-gray-secondary">
            <tr>
              <th scope="col" className="min-w-28 px-3 py-2 text-left font-medium text-text-secondary">
                {draft.xLabel.trim() || 'Nhãn'}
              </th>
              {series.map((item, index) => (
                <th key={item.id} scope="col" className="min-w-32 px-1.5 py-1.5 font-medium">
                  <div className="flex items-center gap-1">
                    <input
                      data-row={-1}
                      data-column={index + 1}
                      aria-label={`Tên dãy số ${index + 1}`}
                      placeholder={`Dãy số ${index + 1}`}
                      value={item.name}
                      size={1}
                      spellCheck={false}
                      onChange={(event) => setSeriesName(index, event.currentTarget.value)}
                      onKeyDown={(event) => onCellKeyDown(event, { row: -1, column: index + 1 })}
                      className={INPUT}
                    />
                    <button
                      type="button"
                      aria-label={`Xoá dãy số ${index + 1}`}
                      title="Xoá dãy số"
                      disabled={series.length === 1}
                      onClick={() => removeSeries(index)}
                      className={ICON_BUTTON}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </th>
              ))}
              <th scope="col" className="w-11">
                <span className="sr-only">Xoá dòng</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key} className="border-t border-card-border">
                <td className="px-1.5 py-1.5">
                  <input
                    data-row={index}
                    data-column={0}
                    aria-label={`Nhãn dòng ${index + 1}`}
                    value={row.label}
                    size={1}
                    spellCheck={false}
                    onChange={(event) => setLabel(index, event.currentTarget.value)}
                    onKeyDown={(event) => onCellKeyDown(event, { row: index, column: 0 })}
                    className={INPUT}
                  />
                </td>
                {series.map((item, column) => {
                  const key = cellKey(row, item)
                  return (
                    <td key={item.id} className="px-1.5 py-1.5">
                      <input
                        data-row={index}
                        data-column={column + 1}
                        aria-label={`${seriesName(column)}, dòng ${index + 1}`}
                        inputMode="decimal"
                        autoComplete="off"
                        size={1}
                        spellCheck={false}
                        value={row.cells[column] ?? ''}
                        aria-invalid={showsInvalid(key) || undefined}
                        onChange={(event) => setCell(index, column, event.currentTarget.value)}
                        onBlur={() => onLeaveCell(key)}
                        onKeyDown={(event) => onCellKeyDown(event, { row: index, column: column + 1 })}
                        className={cn(INPUT, 'text-right tabular-nums')}
                      />
                    </td>
                  )
                })}
                <td className="px-1.5 py-1.5 text-center">
                  <button
                    type="button"
                    aria-label={`Xoá dòng ${index + 1}`}
                    title="Xoá dòng"
                    disabled={rows.length === 1}
                    onClick={() => removeRow(index)}
                    className={ICON_BUTTON}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" appearance="outline" disabled={rows.length >= DRAFT_LIMITS.rows} onClick={addRow}>
          <Plus size={16} />
          Thêm dòng
        </Button>
        <Button size="sm" appearance="outline" disabled={series.length >= DRAFT_LIMITS.series} onClick={addSeries}>
          <Plus size={16} />
          Thêm dãy số
        </Button>
      </div>
    </div>
  )
}

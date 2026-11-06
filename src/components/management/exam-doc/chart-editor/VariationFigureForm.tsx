import { useEffect, useRef } from 'react'
import Button from '../../../console/button'
import { Plus, Trash2 } from '../../../console/icons'
import { Checkbox } from '../../../tailgrids/core/checkbox'
import { VARIATION_LIMITS } from '../chart-variation'
import { FIGURE_ICON_BUTTON, FIGURE_INPUT, FIGURE_SECTION_LABEL, fieldProps } from './figure-controls'
import { FieldError } from './FigureFieldNotes'
import {
  insertColumn,
  MAX_COLUMNS,
  MIN_COLUMNS,
  removeColumn,
  variationFieldKey,
  type AtSign,
  type IntervalSign,
  type VariationCheck,
  type VariationColumnDraft,
  type VariationDraft,
} from './variation-draft'

interface VariationFigureFormProps {
  draft: VariationDraft
  check: VariationCheck
  /** The new draft, with the keys of the fields the teacher has just changed. */
  onChange: (draft: VariationDraft, changed: string[]) => void
  /** Whether the problem of a field is shown yet (the teacher has changed it, or tried to save). */
  shows: (key: string) => boolean
}

const ARROWS: Record<IntervalSign, string> = { '': '', '+': '↗', '-': '↘', '0': '→' }
const ROW_HEADER = 'w-16 border-r border-card-border bg-background-gray-secondary px-2 py-2 text-center text-sm font-medium text-text-primary italic'
const CELL = 'px-1.5 py-1.5 align-top'

/**
 * A variation table to edit as it prints: the x values across the top, the sign of the derivative at and between
 * them, and the function's values, with the arrows between them following the signs. A column can be added (before
 * the last one) or removed, and marked where the function is undefined.
 */
export default function VariationFigureForm({ draft, check, onChange, shows }: VariationFigureFormProps) {
  const root = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const { columns, intervals } = draft
  const name = draft.name.trim() || 'f'
  const [derivative, value] = name === 'y' ? ["y'", 'y'] : [`${name}'(x)`, `${name}(x)`]
  const problemOf = (key: string) => (shows(key) ? check.problems.get(key) : undefined)

  useEffect(() => {
    const key = pendingFocus.current
    if (!key) return
    pendingFocus.current = null
    root.current?.querySelector<HTMLElement>(`[data-field="${key}"]`)?.focus()
  })

  const setColumn = (index: number, patch: Partial<VariationColumnDraft>, changed: string[]) =>
    onChange({ ...draft, columns: columns.map((column, at) => (at === index ? { ...column, ...patch } : column)) }, changed)

  /**
   * An x value is compared with the next one filled in, so editing it can put "Phải lớn hơn giá trị x bên trái." on
   * that column: its problem shows at once too.
   */
  const xChangedKeys = (index: number) => {
    const next = columns.slice(index + 1).find((column) => column.x.trim())
    return next ? [variationFieldKey.x(columns[index]), variationFieldKey.x(next)] : [variationFieldKey.x(columns[index])]
  }

  const setInterval = (index: number, sign: IntervalSign) =>
    onChange({ ...draft, intervals: intervals.map((entry, at) => (at === index ? sign : entry)) }, [
      variationFieldKey.interval(columns[index]),
    ])

  function addColumn() {
    const next = insertColumn(draft)
    pendingFocus.current = variationFieldKey.x(next.columns[next.columns.length - 2])
    onChange(next, [])
  }

  function dropColumn(index: number) {
    const next = removeColumn(draft, index)
    pendingFocus.current = variationFieldKey.x(next.columns[Math.min(index, next.columns.length - 1)])
    onChange(next, [])
  }

  const nameProblem = problemOf(variationFieldKey.name)
  return (
    <div ref={root} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="flex w-fit flex-col gap-1.5 text-sm font-medium text-text-primary">
          Tên hàm số
          <input
            {...fieldProps(variationFieldKey.name, nameProblem)}
            value={draft.name}
            maxLength={3}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => onChange({ ...draft, name: event.currentTarget.value }, [variationFieldKey.name])}
            className={`${FIGURE_INPUT} w-24 italic`}
          />
        </label>
        <FieldError fieldKey={variationFieldKey.name} message={nameProblem} />
      </div>

      <div className="flex flex-col gap-2">
        <span className={FIGURE_SECTION_LABEL}>Bảng biến thiên</span>
        <div className="app-scroll overflow-x-auto rounded-lg border border-card-border">
          <table className="border-collapse text-sm" aria-label="Bảng biến thiên">
            <tbody>
              <tr>
                <th scope="row" className={ROW_HEADER}>
                  x
                </th>
                {columns.map((column, index) => {
                  const key = variationFieldKey.x(column)
                  const problem = problemOf(key)
                  return [
                    <td key={column.key} className={`${CELL} min-w-28`}>
                      <input
                        {...fieldProps(key, problem)}
                        aria-label={`Giá trị x, cột ${index + 1}`}
                        value={column.x}
                        size={1}
                        maxLength={VARIATION_LIMITS.cell}
                        spellCheck={false}
                        autoComplete="off"
                        onChange={(event) => setColumn(index, { x: event.currentTarget.value }, xChangedKeys(index))}
                        className={`${FIGURE_INPUT} text-center`}
                      />
                      <FieldError fieldKey={key} message={problem} />
                    </td>,
                    index < intervals.length && <td key={`${column.key}-gap`} className="min-w-20" />,
                  ]
                })}
              </tr>
              <tr className="border-t border-card-border">
                <th scope="row" className={ROW_HEADER}>
                  {derivative}
                </th>
                {columns.map((column, index) => {
                  const intervalKey = variationFieldKey.interval(column)
                  const intervalProblem = problemOf(intervalKey)
                  return [
                    <td key={column.key} className={`${CELL} text-center`}>
                      {column.undefined ? (
                        <span className="inline-flex h-9 items-center font-semibold" title="Không xác định">
                          <span aria-hidden="true">||</span>
                          <span className="sr-only">Không xác định</span>
                        </span>
                      ) : (
                        <select
                          aria-label={`Dấu ${derivative} tại cột ${index + 1}`}
                          value={column.atSign}
                          onChange={(event) => setColumn(index, { atSign: event.currentTarget.value as AtSign }, [])}
                          className={`${FIGURE_INPUT} text-center`}
                        >
                          <option value="">Trống</option>
                          <option value="0">0</option>
                          <option value="||" aria-label="Không xác định" title={`${derivative} không xác định`}>
                            ||
                          </option>
                        </select>
                      )}
                    </td>,
                    index < intervals.length && (
                      <td key={`${column.key}-gap`} className={`${CELL} text-center`}>
                        <select
                          {...fieldProps(intervalKey, intervalProblem)}
                          aria-label={`Dấu ${derivative} giữa cột ${index + 1} và cột ${index + 2}`}
                          value={intervals[index]}
                          onChange={(event) => setInterval(index, event.currentTarget.value as IntervalSign)}
                          className={`${FIGURE_INPUT} text-center`}
                        >
                          <option value="">Chọn</option>
                          <option value="+">+</option>
                          <option value="-">−</option>
                          <option value="0">0</option>
                        </select>
                        <FieldError fieldKey={intervalKey} message={intervalProblem} />
                      </td>
                    ),
                  ]
                })}
              </tr>
              <tr className="border-t border-card-border">
                <th scope="row" className={ROW_HEADER}>
                  {value}
                </th>
                {columns.map((column, index) => {
                  const valueKey = variationFieldKey.value(column)
                  const limitsKey = variationFieldKey.limits(column)
                  const [valueProblem, limitsProblem] = [problemOf(valueKey), problemOf(limitsKey)]
                  return [
                    <td key={column.key} className={CELL}>
                      {column.undefined ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <input
                              {...fieldProps(limitsKey, limitsProblem)}
                              aria-label={`Giới hạn bên trái, cột ${index + 1}`}
                              placeholder="Trái"
                              value={column.left}
                              size={1}
                              spellCheck={false}
                              autoComplete="off"
                              onChange={(event) => setColumn(index, { left: event.currentTarget.value }, [limitsKey])}
                              className={`${FIGURE_INPUT} px-1.5 text-center`}
                            />
                            <span aria-hidden="true" className="font-semibold">
                              ||
                            </span>
                            <input
                              aria-invalid={limitsProblem ? true : undefined}
                              aria-label={`Giới hạn bên phải, cột ${index + 1}`}
                              placeholder="Phải"
                              value={column.right}
                              size={1}
                              spellCheck={false}
                              autoComplete="off"
                              onChange={(event) => setColumn(index, { right: event.currentTarget.value }, [limitsKey])}
                              className={`${FIGURE_INPUT} px-1.5 text-center`}
                            />
                          </div>
                          <FieldError fieldKey={limitsKey} message={limitsProblem} />
                        </div>
                      ) : (
                        <>
                          <input
                            {...fieldProps(valueKey, valueProblem)}
                            aria-label={`Giá trị ${value}, cột ${index + 1}`}
                            value={column.value}
                            size={1}
                            maxLength={VARIATION_LIMITS.cell}
                            spellCheck={false}
                            autoComplete="off"
                            onChange={(event) => setColumn(index, { value: event.currentTarget.value }, [valueKey])}
                            className={`${FIGURE_INPUT} text-center`}
                          />
                          <FieldError fieldKey={valueKey} message={valueProblem} />
                        </>
                      )}
                    </td>,
                    index < intervals.length && (
                      <td key={`${column.key}-gap`} aria-hidden="true" className="text-center align-middle text-xl text-text-secondary">
                        {ARROWS[intervals[index]]}
                      </td>
                    ),
                  ]
                })}
              </tr>
              <tr className="border-t border-card-border">
                <td className="border-r border-card-border bg-background-gray-secondary" />
                {columns.map((column, index) => [
                  <td key={column.key} className={CELL}>
                    <div className="flex items-center justify-between gap-1">
                      <Checkbox
                        isSelected={column.undefined}
                        aria-label={`Không xác định tại cột ${index + 1}`}
                        onChange={(undefinedHere) => setColumn(index, { undefined: undefinedHere }, [])}
                        className="text-xs text-text-secondary"
                      >
                        Không xác định
                      </Checkbox>
                      <button
                        type="button"
                        aria-label={`Xoá cột ${index + 1}`}
                        title="Xoá cột"
                        disabled={columns.length <= MIN_COLUMNS}
                        onClick={() => dropColumn(index)}
                        className={FIGURE_ICON_BUTTON}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>,
                  index < intervals.length && <td key={`${column.key}-gap`} />,
                ])}
              </tr>
            </tbody>
          </table>
        </div>
        <Button size="sm" appearance="outline" className="w-fit" disabled={columns.length >= MAX_COLUMNS} onClick={addColumn}>
          <Plus size={16} />
          Thêm cột
        </Button>
      </div>
    </div>
  )
}

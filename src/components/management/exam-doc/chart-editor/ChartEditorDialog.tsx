import { useId, useMemo, useRef, useState, type ComponentType } from 'react'
import Button from '../../../console/button'
import ConsoleDialog from '../../../console/dialog'
import Field, { fieldControlClass } from '../../../console/form-field'
import { BarChart3, LineChart, PieChart, type IconProps } from '../../../console/icons'
import Notice from '../../../console/notice'
import Slider from '../../../console/slider'
import { Checkbox } from '../../../tailgrids/core/checkbox'
import { CHART_WIDTH, chartValueAlt, chartValueSrc, type ChartPalette, type ChartType, type ChartValue } from '../chart-data'
import ChartDataGrid from './ChartDataGrid'
import { cellKey, checkDraft, draftFromValue, previewValue, type ChartDraft } from './chart-draft'

interface Option<T extends string> {
  id: T
  label: string
  icon?: ComponentType<IconProps>
}

const TYPES: Option<ChartType>[] = [
  { id: 'bar', label: 'Cột', icon: BarChart3 },
  { id: 'line', label: 'Đường', icon: LineChart },
  { id: 'pie', label: 'Tròn', icon: PieChart },
]

const PALETTES: Option<ChartPalette>[] = [
  { id: 'print', label: 'In đen trắng' },
  { id: 'color', label: 'Màu' },
]

const SECTION_LABEL = 'text-sm font-medium text-text-primary'

/** One choice of a few, as pressed buttons in a group (the console's segmented control). */
function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={id} className={SECTION_LABEL}>
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-card-border p-1">
        {options.map(({ id: option, label: text, icon: Icon }) => (
          <Button
            key={option}
            size="sm"
            appearance={value === option ? 'fill' : 'ghost'}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {Icon && <Icon size={16} />}
            {text}
          </Button>
        ))}
      </div>
    </div>
  )
}

interface ChartEditorDialogProps {
  initial: ChartValue
  onCancel: () => void
  onSave: (value: ChartValue) => void
}

/**
 * Edits a chart of the document: its kind, labels, legend, colours, width and data, with the drawing previewed as it
 * changes. Nothing reaches the document before "Lưu"; "Huỷ" (or Esc) leaves it as it was.
 */
export default function ChartEditorDialog({ initial, onCancel, onSave }: ChartEditorDialogProps) {
  const [draft, setDraft] = useState<ChartDraft>(() => draftFromValue(initial))
  // Number cells the teacher has left; one that is not a number shows as wrong from then on.
  const [left, setLeft] = useState<ReadonlySet<string>>(() => new Set())
  const [triedSave, setTriedSave] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  // With a mouse the title takes focus at once; on a touch screen the keyboard would cover the dialog before the
  // teacher has seen it (and the dialog would wait for that keyboard before it shows).
  const [focusTitle] = useState(() => window.matchMedia('(pointer: fine)').matches)
  const check = useMemo(() => checkDraft(draft), [draft])
  const preview = useMemo(() => previewValue(draft), [draft])
  const previewSrc = useMemo(() => chartValueSrc(preview), [preview])
  const pie = draft.type === 'pie'

  const update = (patch: Partial<ChartDraft>) => setDraft((current) => ({ ...current, ...patch }))
  // A cell left wrong is outlined at once. What is wrong is said only after "Lưu": said on the way to the button
  // (the cell's blur), it would grow the dialog under the pointer and the click would miss.
  const showsInvalid = (key: string) => check.invalid.has(key) && (triedSave || left.has(key))

  function leaveCell(key: string) {
    if (!left.has(key)) setLeft((current) => new Set(current).add(key))
  }

  function save() {
    if (check.value) {
      onSave(check.value)
      return
    }
    setTriedSave(true)
    // To the first cell that keeps the chart from being saved.
    for (const [row, entry] of draft.rows.entries()) {
      const column = draft.series.findIndex((series) => check.invalid.has(cellKey(entry, series)))
      if (column >= 0) {
        body.current?.querySelector<HTMLInputElement>(`[data-row="${row}"][data-column="${column + 1}"]`)?.focus()
        return
      }
    }
  }

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <Button appearance="outline" onClick={onCancel}>
        Huỷ
      </Button>
      <Button onClick={save}>Lưu</Button>
    </div>
  )

  return (
    <ConsoleDialog open onClose={onCancel} title="Sửa biểu đồ" maxWidth={1120} footer={footer}>
      <div ref={body} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <Choice label="Loại" options={TYPES} value={draft.type} onChange={(type) => update({ type })} />
            <Choice label="Màu" options={PALETTES} value={draft.palette} onChange={(palette) => update({ palette })} />
          </div>
          <Field label="Tiêu đề">
            <input
              // The dialog has just opened from the chart or the menu: the title is where the teacher types first.
              autoFocus={focusTitle}
              value={draft.title}
              spellCheck={false}
              onChange={(event) => update({ title: event.currentTarget.value })}
              className={fieldControlClass}
            />
          </Field>
          {!pie && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trục ngang">
                <input
                  value={draft.xLabel}
                  spellCheck={false}
                  onChange={(event) => update({ xLabel: event.currentTarget.value })}
                  className={fieldControlClass}
                />
              </Field>
              <Field label="Trục dọc">
                <input
                  value={draft.yLabel}
                  spellCheck={false}
                  onChange={(event) => update({ yLabel: event.currentTarget.value })}
                  className={fieldControlClass}
                />
              </Field>
            </div>
          )}
          <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Slider
              label="Độ rộng"
              value={draft.width}
              minValue={CHART_WIDTH.min}
              maxValue={CHART_WIDTH.max}
              step={0.05}
              formatOptions={{ style: 'percent' }}
              onChange={(width) => update({ width: Math.round(width * 100) / 100 })}
            />
            <Checkbox isSelected={draft.legend} onChange={(legend) => update({ legend })} className="h-9 text-sm text-text-primary">
              Chú giải
            </Checkbox>
          </div>

          <div className="flex flex-col gap-2">
            <span className={SECTION_LABEL}>Số liệu</span>
            <ChartDataGrid draft={draft} onChange={setDraft} showsInvalid={showsInvalid} onLeaveCell={leaveCell} />
          </div>
          {pie && draft.series.length > 1 && <Notice>Biểu đồ tròn chỉ vẽ dãy số đầu tiên.</Notice>}
          {triedSave &&
            check.problems.map((problem) => (
              <Notice key={problem} tone="danger">
                {problem}
              </Notice>
            ))}
        </div>

        <div className="order-first lg:order-none">
          {/* The sheet's text column: the drawing takes its share of it, as it will on paper. */}
          <div className="rounded-lg border border-card-border bg-white p-3 lg:sticky lg:top-0">
            <img src={previewSrc} alt={chartValueAlt(preview)} className="mx-auto block h-auto" style={{ width: `${draft.width * 100}%` }} />
          </div>
        </div>
      </div>
    </ConsoleDialog>
  )
}

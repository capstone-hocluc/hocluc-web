import { useEffect, useId, useMemo, useRef, useState, type ComponentType } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import Button from '../../../console/button'
import ConsoleDialog from '../../../console/dialog'
import Field, { fieldControlClass } from '../../../console/form-field'
import type { IconProps } from '../../../console/icons'
import Notice from '../../../console/notice'
import Slider from '../../../console/slider'
import { ConsoleTabs, ConsoleTabsContent, ConsoleTabsList, ConsoleTabsTrigger } from '../../../console/tabs'
import { Checkbox } from '../../../tailgrids/core/checkbox'
import { CHART_WIDTH, chartValueAlt, chartValueSrc, type ChartPalette, type ChartValue, type LegendPosition } from '../chart-data'
import { PALETTES as COLORS } from '../chart-svg-base'
import { autoDataLabels, axisLegendShown, defaultLegendPosition, type DataChartType } from '../chart-svg-parts'
import ChartDataGrid from './ChartDataGrid'
import {
  AXIS_KEYS,
  canSwitchRowsAndColumns,
  cellKey,
  checkDraft,
  DRAFT_LIMITS,
  draftFromValue,
  isHorizontalType,
  isRoundType,
  previewValue,
  switchRowsAndColumns,
  type ChartDraft,
} from './chart-draft'
import { DATA_CHART_OPTIONS } from './chart-types'

interface Option<T extends string> {
  id: T
  label: string
  icon?: ComponentType<IconProps>
}

const PALETTES: Option<ChartPalette>[] = [
  { id: 'print', label: 'In đen trắng' },
  { id: 'color', label: 'Màu' },
]

type LegendChoice = LegendPosition | 'none'

const LEGEND_CHOICES: Option<LegendChoice>[] = [
  { id: 'none', label: 'Không' },
  { id: 'top', label: 'Trên' },
  { id: 'bottom', label: 'Dưới' },
  { id: 'right', label: 'Phải' },
]

const SLICE_LABELS: Option<'percent' | 'value'>[] = [
  { id: 'percent', label: 'Phần trăm' },
  { id: 'value', label: 'Giá trị' },
]

/** The colour palette's hues by name, in its order. */
const COLOR_NAMES = ['Xanh dương', 'Cam', 'Xanh ngọc', 'Vàng', 'Hồng', 'Xanh lá', 'Tím', 'Đỏ']

const SECTION_LABEL = 'text-sm font-medium text-text-primary'

type Tab = 'setup' | 'customize'

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

/** The kinds of data chart as a grid of pressed buttons, each with its icon. */
function TypePicker({ value, onChange }: { value: string; onChange: (type: DataChartType) => void }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={id} className={SECTION_LABEL}>
        Loại biểu đồ
      </span>
      <div role="group" aria-labelledby={id} className="grid grid-cols-2 gap-1 rounded-lg border border-card-border p-1 sm:grid-cols-5">
        {DATA_CHART_OPTIONS.map(({ id: type, label, icon: Icon }) => (
          <Button
            key={type}
            size="sm"
            appearance={value === type ? 'fill' : 'ghost'}
            aria-pressed={value === type}
            onClick={() => onChange(type)}
            className="justify-start"
          >
            <Icon size={16} aria-hidden />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** The colour of one series, picked from the colour palette's hues. */
function SeriesColor({ name, value, onChange }: { name: string; value: string; onChange: (color: string) => void }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
      <span id={id} className="min-w-24 text-sm text-text-primary">
        {name}
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-1.5">
        {COLORS.color.map((color, index) => (
          <button
            key={color}
            type="button"
            aria-label={COLOR_NAMES[index]}
            title={COLOR_NAMES[index]}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            className="size-7 cursor-pointer rounded-full border-2 border-transparent outline-none ring-offset-2 transition-shadow focus-visible:ring-2 focus-visible:ring-input-primary-focus-border aria-pressed:border-text-primary"
            style={{ backgroundColor: color }}
          />
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
 * Edits a data chart of the document as a docs app does, in two tabs: "Thiết lập" (its kind and its data, which can
 * be turned over) and "Tùy chỉnh" (titles, legend, colours, numbers on the marks, gridlines, the value axis, width),
 * with the drawing previewed as it changes. Nothing reaches the document before "Lưu"; "Huỷ" (or Esc) leaves it as it
 * was.
 */
export default function ChartEditorDialog({ initial, onCancel, onSave }: ChartEditorDialogProps) {
  const [draft, setDraft] = useState<ChartDraft>(() => draftFromValue(initial))
  const [tab, setTab] = useState<Tab>('setup')
  // Number cells the teacher has left; one that is not a number shows as wrong from then on.
  const [left, setLeft] = useState<ReadonlySet<string>>(() => new Set())
  const [triedSave, setTriedSave] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  // What "Lưu" sends focus to once its tab shows: the first field that keeps the chart from being saved.
  const focusTarget = useRef<string | null>(null)
  const check = useMemo(() => checkDraft(draft), [draft])
  const preview = useMemo(() => previewValue(draft), [draft])
  const previewSrc = useMemo(() => chartValueSrc(preview), [preview])
  const type = draft.type as DataChartType
  const round = isRoundType(type)
  const horizontal = isHorizontalType(type)
  const dataLabels = draft.dataLabels ?? autoDataLabels(type, draft.series.length)
  // The choice pressed is what the drawing shows: a chart with axes and one series has no legend until one is placed.
  const legendShown = round ? draft.legend : axisLegendShown(draft.legend, draft.series.length, draft.legendPosition)
  const legendChoice: LegendChoice = legendShown ? (draft.legendPosition ?? defaultLegendPosition(type)) : 'none'
  const switchable = canSwitchRowsAndColumns(draft)

  useEffect(() => {
    const target = focusTarget.current
    if (!target) return
    focusTarget.current = null
    body.current?.querySelector<HTMLElement>(target)?.focus()
  })

  const update = (patch: Partial<ChartDraft>) => setDraft((current) => ({ ...current, ...patch }))
  // A cell left wrong is outlined at once. What is wrong is said only after "Lưu": said on the way to the button
  // (the cell's blur), it would grow the dialog under the pointer and the click would miss.
  const showsInvalid = (key: string) => check.invalid.has(key) && (triedSave || left.has(key))

  function leaveCell(key: string) {
    if (!left.has(key)) setLeft((current) => new Set(current).add(key))
  }

  function chooseLegend(choice: LegendChoice) {
    if (choice === 'none') update({ legend: false })
    else update({ legend: true, legendPosition: choice })
  }

  /** Focus to `target`, on its tab: at once when the tab shows, else once it does. */
  function focusOn(target: string, on: Tab) {
    if (tab === on) {
      body.current?.querySelector<HTMLElement>(target)?.focus()
      return
    }
    focusTarget.current = target
    setTab(on)
  }

  function save() {
    if (check.value) {
      onSave(check.value)
      return
    }
    setTriedSave(true)
    // To the first cell that keeps the chart from being saved, on the tab it is on.
    for (const [row, entry] of draft.rows.entries()) {
      const column = draft.series.findIndex((series) => check.invalid.has(cellKey(entry, series)))
      if (column >= 0) {
        focusOn(`[data-row="${row}"][data-column="${column + 1}"]`, 'setup')
        return
      }
    }
    const axis = [AXIS_KEYS.min, AXIS_KEYS.max].find((key) => check.invalid.has(key))
    if (axis) {
      focusOn(`[data-axis="${axis}"]`, 'customize')
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

  const axisInput = (key: string, label: string, value: string, field: 'yMin' | 'yMax') => (
    <Field label={label}>
      <input
        data-axis={key}
        value={value}
        inputMode="decimal"
        autoComplete="off"
        placeholder="Tự động"
        spellCheck={false}
        aria-invalid={(triedSave && check.invalid.has(key)) || undefined}
        onChange={(event) => {
          const text = event.currentTarget.value
          update(field === 'yMin' ? { yMin: text } : { yMax: text })
        }}
        className={`${fieldControlClass} aria-[invalid=true]:border-input-error-focus-border`}
      />
    </Field>
  )

  return (
    <ConsoleDialog open onClose={onCancel} title="Sửa biểu đồ" maxWidth={1120} footer={footer}>
      <div ref={body} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ConsoleTabs value={tab} onValueChange={(next) => setTab(next as Tab)}>
            <ConsoleTabsList aria-label="Sửa biểu đồ">
              <ConsoleTabsTrigger value="setup">Thiết lập</ConsoleTabsTrigger>
              <ConsoleTabsTrigger value="customize">Tùy chỉnh</ConsoleTabsTrigger>
            </ConsoleTabsList>

            <ConsoleTabsContent value="setup" className="gap-4 pt-4">
              <TypePicker value={type} onChange={(next) => update({ type: next })} />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={SECTION_LABEL}>Số liệu</span>
                  <Button
                    size="sm"
                    appearance="outline"
                    disabled={!switchable}
                    title={switchable ? undefined : `Chỉ chuyển được khi bảng có tối đa ${DRAFT_LIMITS.series} dòng`}
                    onClick={() => setDraft((current) => switchRowsAndColumns(current))}
                  >
                    <ArrowLeftRight size={16} aria-hidden />
                    Chuyển đổi hàng/cột
                  </Button>
                </div>
                <ChartDataGrid draft={draft} onChange={setDraft} showsInvalid={showsInvalid} onLeaveCell={leaveCell} />
              </div>
              {round && draft.series.length > 1 && <Notice>Biểu đồ tròn chỉ vẽ dãy số đầu tiên.</Notice>}
              {type === 'combo' && draft.series.length > 1 && <Notice>Dãy số đầu tiên vẽ thành cột, các dãy còn lại thành đường.</Notice>}
              {check.warnings.map((warning) => (
                <Notice key={warning} tone="warning">
                  {warning}
                </Notice>
              ))}
            </ConsoleTabsContent>

            <ConsoleTabsContent value="customize" className="gap-4 pt-4">
              <Field label="Tiêu đề">
                <input
                  value={draft.title}
                  spellCheck={false}
                  onChange={(event) => update({ title: event.currentTarget.value })}
                  className={fieldControlClass}
                />
              </Field>
              {!round && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* The label column names the category axis, which runs down the left of a bar chart. */}
                  <Field label={horizontal ? 'Trục dọc' : 'Trục ngang'}>
                    <input
                      value={draft.xLabel}
                      spellCheck={false}
                      onChange={(event) => update({ xLabel: event.currentTarget.value })}
                      className={fieldControlClass}
                    />
                  </Field>
                  <Field label={horizontal ? 'Trục ngang' : 'Trục dọc'}>
                    <input
                      value={draft.yLabel}
                      spellCheck={false}
                      onChange={(event) => update({ yLabel: event.currentTarget.value })}
                      className={fieldControlClass}
                    />
                  </Field>
                  {axisInput(AXIS_KEYS.min, 'Giá trị nhỏ nhất', draft.yMin, 'yMin')}
                  {axisInput(AXIS_KEYS.max, 'Giá trị lớn nhất', draft.yMax, 'yMax')}
                </div>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-4">
                <Choice label="Chú giải" options={LEGEND_CHOICES} value={legendChoice} onChange={chooseLegend} />
                <Choice label="Màu" options={PALETTES} value={draft.palette} onChange={(palette) => update({ palette })} />
              </div>
              {draft.palette === 'color' && !round && (
                <div className="flex flex-col gap-2">
                  <span className={SECTION_LABEL}>Màu dãy số</span>
                  {draft.series.map((series, index) => (
                    <SeriesColor
                      key={series.id}
                      name={series.name.trim() || `Dãy số ${index + 1}`}
                      value={draft.colors[series.id] ?? COLORS.color[index % COLORS.color.length]}
                      onChange={(color) => update({ colors: { ...draft.colors, [series.id]: color } })}
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <Checkbox isSelected={dataLabels} onChange={(on) => update({ dataLabels: on })} className="h-9 text-sm text-text-primary">
                  Nhãn dữ liệu
                </Checkbox>
                {!round && (
                  <Checkbox isSelected={draft.gridlines} onChange={(gridlines) => update({ gridlines })} className="h-9 text-sm text-text-primary">
                    Đường lưới
                  </Checkbox>
                )}
              </div>
              {round && dataLabels && (
                <Choice label="Nhãn lát" options={SLICE_LABELS} value={draft.sliceLabels} onChange={(sliceLabels) => update({ sliceLabels })} />
              )}
              <Slider
                label="Độ rộng"
                value={draft.width}
                minValue={CHART_WIDTH.min}
                maxValue={CHART_WIDTH.max}
                step={0.05}
                formatOptions={{ style: 'percent' }}
                onChange={(width) => update({ width: Math.round(width * 100) / 100 })}
              />
            </ConsoleTabsContent>
          </ConsoleTabs>

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

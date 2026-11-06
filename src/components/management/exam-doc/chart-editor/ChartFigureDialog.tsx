import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../../../console/button'
import ConsoleDialog from '../../../console/dialog'
import Field, { fieldControlClass } from '../../../console/form-field'
import Notice from '../../../console/notice'
import Slider from '../../../console/slider'
import { CHART_WIDTH, chartValueAlt, chartValueSrc, normalizeChart, type ChartFigure, type ChartValue } from '../chart-data'
import FunctionFigureForm from './FunctionFigureForm'
import { checkFunctionDraft, functionDraftFrom, type FunctionDraft } from './function-draft'
import VariationFigureForm from './VariationFigureForm'
import { checkVariationDraft, variationDraftFrom, type VariationDraft } from './variation-draft'

interface ChartFigureDialogProps {
  initial: ChartValue
  onCancel: () => void
  onSave: (value: ChartValue) => void
  onDelete: () => void
}

type FigureDraft = { type: 'function'; draft: FunctionDraft } | { type: 'variation'; draft: VariationDraft }

const draftOf = (figure: ChartFigure): FigureDraft =>
  figure.type === 'function'
    ? { type: 'function', draft: functionDraftFrom(figure) }
    : { type: 'variation', draft: variationDraftFrom(figure) }

/** What the draft saves as (null while it cannot be saved), what is wrong with it, and what the preview draws. */
function checkOf(draft: FigureDraft) {
  if (draft.type === 'function') {
    const check = checkFunctionDraft(draft.draft)
    return { figure: check.figure, preview: check.preview, general: check.general, warnings: [], function: check, variation: null }
  }
  const check = checkVariationDraft(draft.draft)
  return { figure: check.figure, preview: check.figure, general: check.general, warnings: check.warnings, function: null, variation: check }
}

/**
 * Edits a function's graph or a variation table of the document by hand: the curves, window, points and asymptotes
 * of a graph, or the cells of a table, with its title and width, the drawing previewed as it changes. A field's
 * problem shows under it as soon as it is changed; "Lưu" saves only what draws exactly as entered, else it shows every
 * problem and goes to the first. "Xoá" takes the chart out of the document (Ctrl+Z brings it back).
 */
export default function ChartFigureDialog(props: ChartFigureDialogProps) {
  const figure = props.initial.spec.figure
  // The host opens this dialog only for a chart holding a graph or a table.
  if (!figure) return null
  return <FigureDialog {...props} figure={figure} />
}

function FigureDialog({ initial, figure, onCancel, onSave, onDelete }: ChartFigureDialogProps & { figure: ChartFigure }) {
  const [title, setTitle] = useState(initial.spec.title)
  const [width, setWidth] = useState(initial.spec.width)
  const [draft, setDraft] = useState<FigureDraft>(() => draftOf(figure))
  // While a field is half typed the preview keeps the last drawing that could be made.
  const [drawn, setDrawn] = useState<ChartFigure>(figure)
  // Fields the teacher has changed: their problems show from then on; every problem shows once "Lưu" was tried.
  const [changed, setChanged] = useState<ReadonlySet<string>>(() => new Set())
  const [triedSave, setTriedSave] = useState(false)
  const focusFirstProblem = useRef(false)
  const body = useRef<HTMLDivElement>(null)
  // As in the chart editor: with a mouse the title takes focus at once, on a touch screen it waits for a tap.
  const [focusTitle] = useState(() => window.matchMedia('(pointer: fine)').matches)
  const check = useMemo(() => checkOf(draft), [draft])
  const preview = useMemo(
    () => normalizeChart({ data: null, spec: { ...initial.spec, type: drawn.type, title: title.trim(), width, figure: drawn } }),
    [initial.spec, drawn, title, width]
  )
  const previewSrc = useMemo(() => chartValueSrc(preview), [preview])
  const shows = (key: string) => triedSave || changed.has(key)

  useEffect(() => {
    if (!focusFirstProblem.current) return
    focusFirstProblem.current = false
    body.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  })

  function update(next: FigureDraft, keys: string[]) {
    setDraft(next)
    const nextPreview = checkOf(next).preview
    if (nextPreview) setDrawn(nextPreview)
    if (keys.some((key) => !changed.has(key))) setChanged((current) => new Set([...current, ...keys]))
  }

  function save() {
    if (check.figure) {
      onSave(
        normalizeChart({
          data: null,
          spec: { ...initial.spec, type: check.figure.type, title: title.trim(), width, figure: check.figure },
        })
      )
      return
    }
    setTriedSave(true)
    focusFirstProblem.current = true
  }

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <Button variant="danger" appearance="outline" onClick={onDelete}>
        Xoá
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <Button appearance="outline" onClick={onCancel}>
          Huỷ
        </Button>
        <Button onClick={save}>Lưu</Button>
      </div>
    </div>
  )

  const notices = (
    <>
      {check.warnings.map((warning) => (
        <Notice key={warning} tone="warning">
          {warning}
        </Notice>
      ))}
      {triedSave &&
        check.general.map((problem) => (
          <Notice key={problem} tone="danger">
            {problem}
          </Notice>
        ))}
    </>
  )
  const settings = (
    <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
      <Field label="Tiêu đề">
        <input
          autoFocus={focusTitle}
          value={title}
          spellCheck={false}
          onChange={(event) => setTitle(event.currentTarget.value)}
          className={fieldControlClass}
        />
      </Field>
      <Slider
        label="Độ rộng"
        value={width}
        minValue={CHART_WIDTH.min}
        maxValue={CHART_WIDTH.max}
        step={0.05}
        formatOptions={{ style: 'percent' }}
        onChange={(next) => setWidth(Math.round(next * 100) / 100)}
      />
    </div>
  )
  // The sheet's text column: the drawing takes its share of it, as it will on paper.
  const drawing = (
    <div className="rounded-lg border border-card-border bg-white p-3 lg:sticky lg:top-0">
      <img src={previewSrc} alt={chartValueAlt(preview)} className="mx-auto block h-auto" style={{ width: `${width * 100}%` }} />
    </div>
  )

  return (
    <ConsoleDialog
      open
      onClose={onCancel}
      title={draft.type === 'function' ? 'Sửa đồ thị' : 'Sửa bảng biến thiên'}
      maxWidth={1120}
      footer={footer}
    >
      <div ref={body}>
        {draft.type === 'function' && check.function && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="flex min-w-0 flex-col gap-5">
              {settings}
              <FunctionFigureForm
                draft={draft.draft}
                check={check.function}
                shows={shows}
                onChange={(next, keys) => update({ type: 'function', draft: next }, keys)}
              />
              {notices}
            </div>
            <div className="order-first lg:order-none">{drawing}</div>
          </div>
        )}
        {draft.type === 'variation' && check.variation && (
          // A table reads across: its drawing above, the cells to edit under it, each as wide as the dialog.
          <div className="flex min-w-0 flex-col gap-5">
            <div className="mx-auto w-full max-w-[560px]">{drawing}</div>
            {settings}
            <VariationFigureForm
              draft={draft.draft}
              check={check.variation}
              shows={shows}
              onChange={(next, keys) => update({ type: 'variation', draft: next }, keys)}
            />
            {notices}
          </div>
        )}
      </div>
    </ConsoleDialog>
  )
}

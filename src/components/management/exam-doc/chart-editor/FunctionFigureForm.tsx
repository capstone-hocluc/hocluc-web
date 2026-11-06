import { useEffect, useRef, useState } from 'react'
import Button from '../../../console/button'
import { Plus, Trash2 } from '../../../console/icons'
import { CURVE_DASHES, FUNCTION_LIMITS } from '../chart-function'
import { FIGURE_ICON_BUTTON, FIGURE_INPUT, FIGURE_SECTION_LABEL, fieldProps } from './figure-controls'
import { FieldError, FieldHint } from './FigureFieldNotes'
import {
  autoFitY,
  emptyAsymptote,
  emptyCurve,
  emptyPoint,
  functionFieldKey,
  WINDOW_FIELDS,
  type AsymptoteDraft,
  type CurveDraft,
  type FunctionCheck,
  type FunctionDraft,
  type PointDraft,
  type WindowField,
  windowChangedKeys,
} from './function-draft'

interface FunctionFigureFormProps {
  draft: FunctionDraft
  check: FunctionCheck
  /** The new draft, with the keys of the fields the teacher has just changed. */
  onChange: (draft: FunctionDraft, changed: string[]) => void
  /** Whether the problem of a field is shown yet (the teacher has changed it, or tried to save). */
  shows: (key: string) => boolean
}

const WINDOW_LABELS: Record<WindowField, string> = {
  xMin: 'x nhỏ nhất',
  xMax: 'x lớn nhất',
  yMin: 'y nhỏ nhất',
  yMax: 'y lớn nhất',
}

/** The line a curve is drawn with on the sheet (solid, dashed, dotted), so the teacher knows which is which. */
function CurveSwatch({ index }: { index: number }) {
  const dash = CURVE_DASHES[index % CURVE_DASHES.length]
  return (
    <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true" className="shrink-0 text-text-primary">
      <line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={dash || undefined} />
    </svg>
  )
}

/**
 * The parts of a function graph to edit: its curves y = f(x), the window it shows (with "Tự động" fitting y to the
 * curves), the points marked on it and its asymptotes. Each problem shows under its field as soon as the field is
 * changed.
 */
export default function FunctionFigureForm({ draft, check, onChange, shows }: FunctionFigureFormProps) {
  const root = useRef<HTMLDivElement>(null)
  // The field that takes focus once a change has rendered (a new row, the row after a removed one).
  const pendingFocus = useRef<string | null>(null)
  const [fitProblem, setFitProblem] = useState<string | null>(null)
  const problemOf = (key: string) => (shows(key) ? check.problems.get(key) : undefined)

  useEffect(() => {
    const key = pendingFocus.current
    if (!key) return
    pendingFocus.current = null
    root.current?.querySelector<HTMLElement>(`[data-field="${key}"]`)?.focus()
  })

  const setWindow = (field: WindowField, text: string) => {
    setFitProblem(null)
    const next = { ...draft, window: { ...draft.window, [field]: text } }
    onChange(next, windowChangedKeys(next))
  }

  function fitY() {
    const fitted = autoFitY(draft)
    if (!fitted) {
      setFitProblem('Chưa tính được: cần khoảng x hợp lệ và một hàm số (hoặc điểm) có giá trị trên khoảng đó.')
      return
    }
    setFitProblem(null)
    const next = { ...draft, window: { ...draft.window, ...fitted } }
    onChange(next, windowChangedKeys(next))
  }

  const setCurve = (index: number, patch: Partial<CurveDraft>, changed: string[] = []) =>
    onChange({ ...draft, curves: draft.curves.map((curve, at) => (at === index ? { ...curve, ...patch } : curve)) }, changed)
  const setPoint = (index: number, patch: Partial<PointDraft>, changed: string[] = []) =>
    onChange({ ...draft, points: draft.points.map((point, at) => (at === index ? { ...point, ...patch } : point)) }, changed)
  const setAsymptote = (index: number, patch: Partial<AsymptoteDraft>, changed: string[] = []) =>
    onChange(
      { ...draft, asymptotes: draft.asymptotes.map((asymptote, at) => (at === index ? { ...asymptote, ...patch } : asymptote)) },
      changed
    )

  function addCurve() {
    const curve = emptyCurve()
    pendingFocus.current = functionFieldKey.expression(curve)
    onChange({ ...draft, curves: [...draft.curves, curve] }, [])
  }

  function addPoint() {
    const point = emptyPoint()
    pendingFocus.current = functionFieldKey.pointX(point)
    onChange({ ...draft, points: [...draft.points, point] }, [])
  }

  function addAsymptote() {
    const asymptote = emptyAsymptote()
    pendingFocus.current = functionFieldKey.asymptote(asymptote)
    onChange({ ...draft, asymptotes: [...draft.asymptotes, asymptote] }, [])
  }

  /** Removes row `index` of `rows`; focus goes to the row taking its place, else to the add button. */
  function removed<T>(rows: T[], index: number, focusOf: (row: T) => string, fallback: string): T[] {
    const next = rows.filter((_, at) => at !== index)
    pendingFocus.current = next.length ? focusOf(next[Math.min(index, next.length - 1)]) : fallback
    return next
  }

  return (
    <div ref={root} className="flex flex-col gap-5">
      <section className="flex flex-col gap-2" aria-labelledby="figure-curves">
        <h3 id="figure-curves" className={FIGURE_SECTION_LABEL}>
          Hàm số
        </h3>
        {draft.curves.map((curve, index) => {
          const key = functionFieldKey.expression(curve)
          const problem = problemOf(key)
          return (
            <div key={curve.key} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CurveSwatch index={index} />
                <span className="shrink-0 text-sm text-text-secondary italic">y =</span>
                <input
                  {...fieldProps(key, problem)}
                  aria-label={`Hàm số ${index + 1}`}
                  placeholder="x^3 - 3x + 1"
                  value={curve.expression}
                  size={1}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => setCurve(index, { expression: event.currentTarget.value }, [key])}
                  className={`${FIGURE_INPUT} font-mono`}
                />
                <input
                  aria-label={`Nhãn hàm số ${index + 1}`}
                  placeholder="Nhãn"
                  value={curve.label}
                  size={1}
                  maxLength={FUNCTION_LIMITS.label}
                  spellCheck={false}
                  onChange={(event) => setCurve(index, { label: event.currentTarget.value })}
                  className={`${FIGURE_INPUT} w-24 shrink-0 sm:w-32`}
                />
                <button
                  type="button"
                  aria-label={`Xoá hàm số ${index + 1}`}
                  title="Xoá hàm số"
                  onClick={() =>
                    onChange({ ...draft, curves: removed(draft.curves, index, functionFieldKey.expression, 'add-curve') }, [])
                  }
                  className={FIGURE_ICON_BUTTON}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="pl-[4.25rem]">
                <FieldError fieldKey={key} message={problem} />
                {!problem && check.hidden.has(curve.key) && <FieldHint>Đồ thị không đi qua khung nhìn này.</FieldHint>}
              </div>
            </div>
          )
        })}
        <Button
          size="sm"
          appearance="outline"
          className="w-fit"
          data-field="add-curve"
          disabled={draft.curves.length >= FUNCTION_LIMITS.functions}
          onClick={addCurve}
        >
          <Plus size={16} />
          Thêm hàm số
        </Button>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="figure-window">
        <h3 id="figure-window" className={FIGURE_SECTION_LABEL}>
          Khung nhìn
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
          {WINDOW_FIELDS.map((field) => {
            const key = functionFieldKey.window(field)
            const problem = problemOf(key)
            return (
              <div key={field} className="flex min-w-0 flex-col gap-1">
                <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
                  {WINDOW_LABELS[field]}
                  <input
                    {...fieldProps(key, problem)}
                    inputMode="decimal"
                    autoComplete="off"
                    size={1}
                    value={draft.window[field]}
                    onChange={(event) => setWindow(field, event.currentTarget.value)}
                    className={`${FIGURE_INPUT} tabular-nums`}
                  />
                </label>
                <FieldError fieldKey={key} message={problem} />
              </div>
            )
          })}
          <Button size="sm" appearance="outline" className="col-span-2 w-fit sm:col-span-1 sm:mt-[1.625rem]" onClick={fitY}>
            Tự động
          </Button>
        </div>
        {fitProblem && <p className="text-xs text-danger">{fitProblem}</p>}
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="figure-points">
        <h3 id="figure-points" className={FIGURE_SECTION_LABEL}>
          Điểm
        </h3>
        {draft.points.map((point, index) => {
          const [xKey, yKey] = [functionFieldKey.pointX(point), functionFieldKey.pointY(point)]
          const [xProblem, yProblem] = [problemOf(xKey), problemOf(yKey)]
          return (
            <div key={point.key} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-sm text-text-secondary">x</span>
                <input
                  {...fieldProps(xKey, xProblem)}
                  aria-label={`Hoành độ điểm ${index + 1}`}
                  inputMode="decimal"
                  autoComplete="off"
                  size={1}
                  value={point.x}
                  onChange={(event) => setPoint(index, { x: event.currentTarget.value }, [xKey])}
                  className={`${FIGURE_INPUT} tabular-nums`}
                />
                <span className="w-5 shrink-0 text-center text-sm text-text-secondary">y</span>
                <input
                  {...fieldProps(yKey, yProblem)}
                  aria-label={`Tung độ điểm ${index + 1}`}
                  inputMode="decimal"
                  autoComplete="off"
                  size={1}
                  value={point.y}
                  onChange={(event) => setPoint(index, { y: event.currentTarget.value }, [yKey])}
                  className={`${FIGURE_INPUT} tabular-nums`}
                />
                <input
                  aria-label={`Nhãn điểm ${index + 1}`}
                  placeholder="Nhãn"
                  value={point.label}
                  size={1}
                  maxLength={FUNCTION_LIMITS.label}
                  spellCheck={false}
                  onChange={(event) => setPoint(index, { label: event.currentTarget.value })}
                  className={`${FIGURE_INPUT} w-24 shrink-0 sm:w-32`}
                />
                <button
                  type="button"
                  aria-label={`Xoá điểm ${index + 1}`}
                  title="Xoá điểm"
                  onClick={() => onChange({ ...draft, points: removed(draft.points, index, functionFieldKey.pointX, 'add-point') }, [])}
                  className={FIGURE_ICON_BUTTON}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="pl-7">
                <FieldError fieldKey={xKey} message={xProblem} />
                <FieldError fieldKey={yKey} message={yProblem} />
              </div>
            </div>
          )
        })}
        <Button
          size="sm"
          appearance="outline"
          className="w-fit"
          data-field="add-point"
          disabled={draft.points.length >= FUNCTION_LIMITS.points}
          onClick={addPoint}
        >
          <Plus size={16} />
          Thêm điểm
        </Button>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="figure-asymptotes">
        <h3 id="figure-asymptotes" className={FIGURE_SECTION_LABEL}>
          Tiệm cận
        </h3>
        {draft.asymptotes.map((asymptote, index) => {
          const key = functionFieldKey.asymptote(asymptote)
          const problem = problemOf(key)
          return (
            <div key={asymptote.key} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <select
                  aria-label={`Loại tiệm cận ${index + 1}`}
                  value={asymptote.axis}
                  onChange={(event) => setAsymptote(index, { axis: event.currentTarget.value === 'y' ? 'y' : 'x' }, [key])}
                  className={`${FIGURE_INPUT} w-36 shrink-0`}
                >
                  <option value="x">Đứng: x =</option>
                  <option value="y">Ngang: y =</option>
                </select>
                <input
                  {...fieldProps(key, problem)}
                  aria-label={`Vị trí tiệm cận ${index + 1}`}
                  inputMode="decimal"
                  autoComplete="off"
                  size={1}
                  value={asymptote.at}
                  onChange={(event) => setAsymptote(index, { at: event.currentTarget.value }, [key])}
                  className={`${FIGURE_INPUT} tabular-nums`}
                />
                <button
                  type="button"
                  aria-label={`Xoá tiệm cận ${index + 1}`}
                  title="Xoá tiệm cận"
                  onClick={() =>
                    onChange(
                      { ...draft, asymptotes: removed(draft.asymptotes, index, functionFieldKey.asymptote, 'add-asymptote') },
                      []
                    )
                  }
                  className={FIGURE_ICON_BUTTON}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="pl-[9.5rem]">
                <FieldError fieldKey={key} message={problem} />
              </div>
            </div>
          )
        })}
        <Button
          size="sm"
          appearance="outline"
          className="w-fit"
          data-field="add-asymptote"
          disabled={draft.asymptotes.length >= FUNCTION_LIMITS.asymptotes}
          onClick={addAsymptote}
        >
          <Plus size={16} />
          Thêm tiệm cận
        </Button>
      </section>
    </div>
  )
}

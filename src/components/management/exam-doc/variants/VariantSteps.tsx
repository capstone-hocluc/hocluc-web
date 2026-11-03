import type { ReactNode } from 'react'
import { cn } from '../../../../lib/cn'
import SelectField from '../../../console/select-field'
import { AlertTriangle, Check, Eye, FileText, RefreshCw, Sparkles } from '../../../console/icons'
import { Checkbox } from '../../../tailgrids/core/checkbox'
import MathText from '../../../ui/MathText'
import { Minus, Plus } from '../toolbar/toolbar-icons'
import { describeOptions, type VariantDoc } from './build-variants'
import type { ExamQuestion, ExamUnit, ParsedExam } from './parse-exam'
import {
  CODE_STYLES,
  MAX_VARIANTS,
  MIN_VARIANTS,
  formatCode,
  variantCodes,
  type CodeStyle,
  type VariantSettings,
} from './variant-settings'

const SECTION_LABEL = 'text-[11px] font-semibold tracking-wide text-text-tertiary uppercase'
const CARD = 'rounded-xl border border-card-border bg-card-background'
const SMALL_BUTTON =
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-text-secondary outline-none transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:cursor-not-allowed disabled:opacity-50'
const INPUT =
  'h-9 rounded-lg border border-input-border bg-input-background px-2.5 text-[13px] text-text-primary tabular-nums outline-none focus:border-input-primary-focus-border focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'

/** A number typed freely and applied on Enter or leaving the field (the settings clamp it into range then). */
function NumberField({
  value,
  min,
  max,
  label,
  title,
  className,
  onCommit,
}: {
  value: number
  min: number
  max: number
  label: string
  title: string
  className?: string
  onCommit: (value: number) => void
}) {
  const commit = (input: HTMLInputElement) => {
    const next = Number(input.value)
    if (input.value.trim() && Number.isFinite(next) && next !== value) onCommit(next)
    // A changed value remounts the field (key); one clamped back to the same value shows it again here.
    input.value = String(value)
  }
  return (
    <input
      key={value}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      defaultValue={value}
      onBlur={(event) => commit(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit(event.currentTarget)
      }}
      aria-label={label}
      title={title}
      className={cn(INPUT, className)}
    />
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={SECTION_LABEL}>{label}</h3>
      {children}
    </section>
  )
}

/* ---------- Step 1: the original ---------- */

const QUESTION_PREFIX = /^câu\s+\d+\s*(?:\([^)]*\))?\s*[.:]?\s*/iu

function kindLabel(question: ExamQuestion) {
  if (question.kind === 'choice') return `${question.optionCount} phương án`
  if (question.kind === 'trueFalse') return 'Đúng/sai'
  return 'Tự luận'
}

function QuestionRow({ question, onGoTo }: { question: ExamQuestion; onGoTo: (question: ExamQuestion) => void }) {
  const stem = question.text.replace(QUESTION_PREFIX, '')
  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex min-w-0 items-start gap-2">
        <span className="shrink-0 text-[13px] font-semibold text-text-primary tabular-nums">Câu {question.number}</span>
        <span className="line-clamp-2 min-w-0 flex-1 text-[13px] text-text-secondary">
          <MathText>{stem || '…'}</MathText>
        </span>
        <button
          type="button"
          onClick={() => onGoTo(question)}
          aria-label={`Đi tới câu ${question.number}`}
          title={`Đi tới câu ${question.number}`}
          className={SMALL_BUTTON}
        >
          Đi tới
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-md bg-background-gray-secondary px-1.5 py-0.5 text-[11px] text-text-secondary">{kindLabel(question)}</span>
        {question.pinnedLast && (
          <span className="rounded-md bg-background-gray-secondary px-1.5 py-0.5 text-[11px] text-text-secondary">Phương án cuối cố định</span>
        )}
      </div>
      {question.issues.map((issue) => (
        <p key={issue} className="flex items-start gap-1.5 text-xs text-badge-warning-text">
          <AlertTriangle aria-hidden size={13} className="mt-px shrink-0" />
          {issue}
        </p>
      ))}
    </li>
  )
}

function UnitRows({ unit, onGoTo }: { unit: ExamUnit; onGoTo: (question: ExamQuestion) => void }) {
  const rows = unit.questions.map((question) => <QuestionRow key={question.index} question={question} onGoTo={onGoTo} />)
  if (unit.lead.length === 0) return <>{rows}</>
  const first = unit.questions[0].number
  const last = unit.questions[unit.questions.length - 1].number
  return (
    <li className="my-1 rounded-lg border-l-2 border-primary-text/40 bg-background-gray-secondary/50 pl-2.5">
      <p className="pt-1.5 text-xs font-medium text-primary-text">
        {first === last ? `Câu ${first}` : `Câu ${first}–${last}`} · chung ngữ liệu
      </p>
      <ul className="divide-y divide-border-secondary">{rows}</ul>
    </li>
  )
}

export function CheckSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className={cn(CARD, 'flex flex-col gap-2 p-3')}>
        <div className="h-4 w-2/5 animate-pulse rounded bg-background-gray-secondary" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-background-gray-secondary" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-background-gray-secondary" />
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="h-3.5 w-12 animate-pulse rounded bg-background-gray-secondary" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-background-gray-secondary" />
          <div className="h-6 w-12 animate-pulse rounded bg-background-gray-secondary" />
        </div>
      ))}
    </div>
  )
}

export function CheckStep({ parsed, onGoTo }: { parsed: ParsedExam; onGoTo: (question: ExamQuestion) => void }) {
  if (parsed.questions.length === 0) {
    return (
      <div className={cn(CARD, 'flex items-start gap-2 p-3 text-[13px] text-text-secondary')}>
        <FileText aria-hidden size={15} className="mt-0.5 shrink-0 text-icon-tertiary" />
        <p>Đề gốc chưa có câu nào bắt đầu bằng “Câu 1.”, “Câu 2.”…</p>
      </div>
    )
  }
  const parts = parsed.parts.filter((part) => part.units.length > 0)
  const groups = parts.flatMap((part) => part.units).filter((unit) => unit.lead.length > 0).length
  const flagged = parsed.questions.filter((question) => question.issues.length > 0).length
  const keyed = parsed.answers.filter(Boolean).length

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(CARD, 'flex flex-col gap-1.5 p-3 text-[13px] text-text-secondary')}>
        <p className="flex items-center gap-1.5 font-medium text-text-primary">
          <Check aria-hidden size={15} className="text-success-500" />
          Đã đọc đề gốc
        </p>
        <p>
          {parsed.questions.length} câu trong {parts.length} phần
          {groups > 0 && ` · ${groups} nhóm chung ngữ liệu`}
        </p>
        <p>{keyed > 0 ? `Bảng đáp án: ${keyed} câu` : 'Chưa có bảng đáp án'}</p>
        {parsed.answerTableMismatch && (
          <p className="text-badge-warning-text">Bảng đáp án có số câu không có trong đề: các mã để trống ô đó</p>
        )}
        {flagged > 0 && <p className="text-badge-warning-text">{flagged} câu cần xem lại</p>}
      </div>

      {parts.map((part, index) => (
        <section key={index} className="flex flex-col">
          <h3 className={cn(SECTION_LABEL, 'flex items-baseline gap-2')}>
            <span className="min-w-0 truncate" title={part.title}>{part.title}</span>
            <span className="ml-auto shrink-0 normal-case tabular-nums">
              {part.units.reduce((total, unit) => total + unit.questions.length, 0)} câu
            </span>
          </h3>
          <ul className="divide-y divide-border-secondary">
            {part.units.map((unit) => (
              <UnitRows key={unit.questions[0].index} unit={unit} onGoTo={onGoTo} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/* ---------- Step 2: settings ---------- */

const PLACEMENT_LABEL: Record<ParsedExam['codePlacement'], string> = {
  line: 'Dòng “Mã đề …” trong đầu đề',
  header: 'Dòng mới cuối đầu đề',
  top: 'Dòng đóng khung ở đầu trang',
}

const AI_METHODS = ['Đổi số liệu bằng AI', 'Câu tương đồng bằng AI'] as const

export function SettingsStep({
  settings,
  placement,
  onChange,
}: {
  settings: VariantSettings
  placement: ParsedExam['codePlacement']
  onChange: (patch: Partial<VariantSettings>) => void
}) {
  const style = CODE_STYLES.find((item) => item.id === settings.codeStyle) ?? CODE_STYLES[0]
  const lastStart = style.last - settings.count + 1
  const letters = Array.from({ length: Math.max(0, lastStart - style.first + 1) }, (_, index) => {
    const value = style.first + index
    return { id: String(value), label: formatCode('letters', value) }
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
        <h3 className={SECTION_LABEL}>Số mã đề</h3>
        <h3 className={SECTION_LABEL}>Kiểu đánh mã</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ count: settings.count - 1 })}
            disabled={settings.count <= MIN_VARIANTS}
            aria-label="Bớt một mã"
            title="Bớt một mã"
            className={cn(SMALL_BUTTON, 'size-9 justify-center rounded-lg border border-card-border px-0')}
          >
            <Minus aria-hidden size={14} />
          </button>
          <NumberField
            value={settings.count}
            min={MIN_VARIANTS}
            max={MAX_VARIANTS}
            label="Số mã đề"
            title={`Số mã đề (${MIN_VARIANTS}–${MAX_VARIANTS})`}
            onCommit={(count) => onChange({ count })}
            className="w-12 px-1 text-center"
          />
          <button
            type="button"
            onClick={() => onChange({ count: settings.count + 1 })}
            disabled={settings.count >= Math.min(MAX_VARIANTS, style.last - style.first + 1)}
            aria-label="Thêm một mã"
            title="Thêm một mã"
            className={cn(SMALL_BUTTON, 'size-9 justify-center rounded-lg border border-card-border px-0')}
          >
            <Plus aria-hidden size={14} />
          </button>
        </div>
        <SelectField
          ariaLabel="Kiểu đánh mã đề"
          options={CODE_STYLES.map((item) => ({ id: item.id, label: item.label }))}
          value={settings.codeStyle}
          onChange={(value) => {
            const next = CODE_STYLES.find((item) => item.id === value)
            if (next) onChange({ codeStyle: next.id as CodeStyle, start: next.first })
          }}
          triggerClassName="h-9"
        />
      </div>

      <Section label="Mã đầu tiên">
        {settings.codeStyle === 'letters' ? (
          <SelectField
            ariaLabel="Mã đầu tiên"
            options={letters}
            value={String(settings.start)}
            onChange={(value) => onChange({ start: Number(value) })}
            triggerClassName="h-9 w-24"
          />
        ) : (
          <NumberField
            value={settings.start}
            min={style.first}
            max={lastStart}
            label="Mã đầu tiên"
            title={`Mã đầu tiên (${formatCode(settings.codeStyle, style.first)}–${formatCode(settings.codeStyle, lastStart)})`}
            onCommit={(start) => onChange({ start })}
            className="w-24"
          />
        )}
        <ul aria-label="Các mã sẽ tạo" className="flex flex-wrap gap-1">
          {variantCodes(settings).map((code) => (
            <li key={code} className="rounded-md bg-badge-primary-background px-1.5 py-0.5 text-[11px] font-medium text-primary-text tabular-nums">
              Mã {code}
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Vị trí mã đề">
        <p className="text-[13px] text-text-secondary">{PLACEMENT_LABEL[placement]}</p>
      </Section>

      <Section label="Cách trộn">
        <div className="flex flex-col gap-2.5 text-[13px] text-text-primary">
          <Checkbox isSelected={settings.shuffleQuestions} onChange={(value) => onChange({ shuffleQuestions: value })}>
            Trộn thứ tự câu trong mỗi phần
          </Checkbox>
          <Checkbox isSelected isDisabled className="text-text-secondary">
            Giữ nguyên nhóm câu chung ngữ liệu
          </Checkbox>
          <Checkbox isSelected={settings.shuffleOptions} onChange={(value) => onChange({ shuffleOptions: value })}>
            Trộn phương án A–D
          </Checkbox>
          <Checkbox
            isSelected={settings.keepLastOption}
            isDisabled={!settings.shuffleOptions}
            onChange={(value) => onChange({ keepLastOption: value })}
            className={cn(!settings.shuffleOptions && 'text-text-secondary')}
          >
            Giữ phương án cuối nếu là “Tất cả/Không có đáp án nào”
          </Checkbox>
        </div>
      </Section>

      <Section label="Tạo bằng AI">
        <div className="flex flex-col gap-1.5">
          {AI_METHODS.map((label) => (
            <button
              key={label}
              type="button"
              disabled
              aria-label={label}
              title="Sắp có"
              className="flex h-9 items-center gap-2 rounded-lg border border-dashed border-card-border px-2.5 text-left text-[13px] text-text-secondary disabled:cursor-not-allowed"
            >
              <Sparkles aria-hidden size={14} className="shrink-0 text-icon-tertiary" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <span className="shrink-0 rounded-md bg-background-gray-secondary px-1.5 py-0.5 text-[11px]">Sắp có</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ---------- Step 3: the codes ---------- */

export function CodesStep({
  variants,
  active,
  onView,
  onReshuffle,
}: {
  variants: VariantDoc[]
  active: string | null
  onView: (code: string) => void
  onReshuffle: () => void
}) {
  const shown = variants.find((variant) => variant.code === active) ?? variants[0]
  if (!shown) return null
  const withAnswers = shown.answerKey.rows.some((row) => row.answer)

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className={SECTION_LABEL}>{variants.length} mã đề</h3>
          <button
            type="button"
            onClick={onReshuffle}
            aria-label="Trộn lại các mã đề"
            title="Trộn lại các mã đề"
            className={cn(SMALL_BUTTON, 'ml-auto')}
          >
            <RefreshCw aria-hidden size={13} />
            Trộn lại
          </button>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-1.5">
          {variants.map((variant) => {
            const viewing = variant.code === active
            return (
              <li key={variant.code}>
                <button
                  type="button"
                  aria-pressed={viewing}
                  onClick={() => onView(variant.code)}
                  aria-label={`Xem mã ${variant.code}`}
                  title={`Xem mã ${variant.code} (chỉ đọc)`}
                  className={cn(
                    'flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border text-[13px] font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-input-primary-focus-border',
                    viewing
                      ? 'border-primary-text/40 bg-badge-primary-background text-primary-text'
                      : 'border-card-border text-text-primary hover:bg-background-gray-secondary'
                  )}
                >
                  <Eye aria-hidden size={14} className={viewing ? 'text-primary-text' : 'text-icon-tertiary'} />
                  Mã {variant.code}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <Section label={`Đáp án mã ${shown.code}`}>
        <div className="overflow-x-auto rounded-lg border border-card-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-background-gray-secondary text-text-secondary">
              <tr>
                <th scope="col" className="px-2 py-1.5 font-medium">Câu</th>
                <th scope="col" className="px-2 py-1.5 font-medium">Câu gốc</th>
                <th scope="col" className="px-2 py-1.5 font-medium">Phương án</th>
                {withAnswers && <th scope="col" className="px-2 py-1.5 font-medium">Đáp án</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary text-text-primary">
              {shown.answerKey.rows.map((row, index) => (
                <tr key={index}>
                  <td className="px-2 py-1.5 font-medium tabular-nums">{row.number}</td>
                  <td className="px-2 py-1.5 text-text-secondary tabular-nums">{row.originalNumber}</td>
                  <td className="px-2 py-1.5 text-text-secondary">{describeOptions(row.options)}</td>
                  {withAnswers && <td className="px-2 py-1.5 font-semibold">{row.answer ?? ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

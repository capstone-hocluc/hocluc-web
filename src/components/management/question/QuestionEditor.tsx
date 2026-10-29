import { useState, type ReactNode } from 'react'
import { Plus, X } from '../../console/icons'
import Button from '../../console/button'
import DropdownField from '../../console/dropdown-field'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { RadioGroup, RadioGroupMark } from '../../ui/RadioGroup'
import { cn } from '../../../lib/cn'
import MathText from '../../ui/MathText'
import { CHOICE_TYPES, QUESTION_TYPE_OPTIONS, type QuestionDraft } from './question-draft'

const DIFFICULTY_OPTIONS = [
  { id: 'DE', label: 'Dễ' },
  { id: 'TB', label: 'Trung bình' },
  { id: 'KHO', label: 'Khó' },
]

/** What a text with a formula looks like once set; nothing is shown for plain text. */
function FormulaPreview({ text }: { text: string }) {
  if (!text.includes('$')) return null
  return <p className="m-0 rounded-lg bg-background-gray-secondary px-3 py-2 text-sm leading-6 whitespace-pre-wrap break-words text-text-primary"><MathText>{text}</MathText></p>
}

/** Shared content fields; callers can keep their own layout and append context-specific fields. */
export default function QuestionEditor({
  value, onChange, disabled = false, busy = false, categoryOptions, categoriesReady, categoriesLoading,
  showCategory = true, showType = true, showDifficulty = true, categoryAriaLabel = 'Môn/nhóm đánh giá',
  categoryLabel = 'Môn/nhóm đánh giá', categoryPlaceholder = 'Chọn môn (không bắt buộc)',
  explanationOpen, onExplanationOpenChange, children,
}: {
  value: QuestionDraft
  onChange: (update: Partial<QuestionDraft>) => void
  disabled?: boolean
  busy?: boolean
  categoryOptions: Array<{ id: string; label: string }>
  categoriesReady: boolean
  categoriesLoading: boolean
  showCategory?: boolean
  showType?: boolean
  showDifficulty?: boolean
  categoryAriaLabel?: string
  categoryLabel?: string
  categoryPlaceholder?: string
  explanationOpen?: boolean
  onExplanationOpenChange?: (open: boolean) => void
  children?: ReactNode
}) {
  const [localExplaining, setLocalExplaining] = useState(Boolean(value.explanation))
  const explaining = explanationOpen ?? localExplaining
  const setExplaining = onExplanationOpenChange ?? setLocalExplaining
  const isChoice = CHOICE_TYPES.includes(value.questionType)
  const optionRows = value.options.map((option, optionIndex) => {
    const letter = String.fromCharCode(65 + optionIndex)
    const markLabel = 'Đánh dấu lựa chọn ' + letter + ' là đáp án đúng'
    return (
      <div key={optionIndex} className={cn('flex min-w-0 items-center gap-3 rounded-lg px-2 py-1.5', option.correct && 'bg-badge-success-bg')}>
        {value.questionType === 'SINGLE_CHOICE'
          ? <RadioGroupMark value={String(optionIndex)} aria-label={markLabel} />
          : (
            <Checkbox
              size="md"
              aria-label={markLabel}
              isSelected={option.correct}
              isDisabled={disabled || busy}
              onChange={(checked) => onChange({ options: value.options.map((item, index) => index === optionIndex ? { ...item, correct: checked } : item) })}
            />
          )}
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-badge-blue-background text-xs font-medium text-primary">{letter}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            className={`${fieldControlClass} min-w-0`}
            value={option.text}
            onChange={(event) => onChange({ options: value.options.map((item, index) => index === optionIndex ? { ...item, text: event.target.value } : item) })}
            placeholder={'Lựa chọn ' + letter}
            disabled={disabled || busy}
          />
          <FormulaPreview text={option.text} />
        </div>
        {!disabled && value.options.length > 2 && (
          <button
            type="button"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-text-tertiary hover:bg-badge-danger-bg hover:text-badge-error-text"
            aria-label={'Bỏ lựa chọn ' + letter}
            disabled={busy}
            onClick={() => onChange({ options: value.options.filter((_, index) => index !== optionIndex) })}
          ><X size={14} /></button>
        )}
      </div>
    )
  })

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
        Nội dung câu hỏi
        <textarea
          aria-label="Nội dung câu hỏi"
          className={`${textareaControlClass} min-h-11! resize-none field-sizing-content`}
          value={value.questionText}
          onChange={(event) => onChange({ questionText: event.target.value })}
          placeholder="Nhập nội dung câu hỏi"
          disabled={disabled || busy}
        />
        <FormulaPreview text={value.questionText} />
      </label>

      {showType && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Loại câu hỏi
          <DropdownField ariaLabel="Loại câu hỏi" options={QUESTION_TYPE_OPTIONS} value={value.questionType}
            isDisabled={disabled || busy} onChange={(next) => {
              const type = QUESTION_TYPE_OPTIONS.find((option) => option.id === next)?.id
              if (type === 'SINGLE_CHOICE') {
                const firstCorrect = value.options.findIndex((option) => option.correct)
                onChange({ questionType: type, options: value.options.map((option, index) => ({ ...option, correct: index === firstCorrect })) })
              } else if (type) onChange({ questionType: type })
            }} />
        </label>
      )}

      {showCategory && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          {categoryLabel}
          <DropdownField ariaLabel={categoryAriaLabel}
            options={categoryOptions.some((option) => option.id === value.categoryId) || !value.categoryId ? categoryOptions : [...categoryOptions, { id: value.categoryId, label: 'Môn đã gắn' }]}
            value={value.categoryId} placeholder={categoryPlaceholder}
            isLoading={categoriesLoading} emptyMessage="Chưa có môn khả dụng."
            isDisabled={disabled || busy || !categoriesReady}
            onChange={(value) => onChange({ categoryId: value })} />
        </label>
      )}

      {showDifficulty && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Độ khó
          <DropdownField ariaLabel="Độ khó" options={DIFFICULTY_OPTIONS} value={value.difficulty}
            placeholder="Chọn độ khó" isDisabled={disabled || busy}
            onChange={(difficulty) => onChange({ difficulty })} />
        </label>
      )}

      {isChoice ? (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-text-primary">Lựa chọn</span>
              {!disabled && value.options.length < 8 && (
                <Button appearance="ghost" size="sm" onClick={() => onChange({ options: [...value.options, { text: '', correct: false }] })} disabled={busy}>
                  <Plus size={14} />Thêm lựa chọn
                </Button>
              )}
            </div>
            {value.questionType === 'SINGLE_CHOICE' ? (
              <RadioGroup
                aria-label="Đáp án đúng"
                className="gap-1"
                value={String(value.options.findIndex((option) => option.correct))}
                onValueChange={(selected) => onChange({ options: value.options.map((item, index) => ({ ...item, correct: String(index) === selected })) })}
                disabled={disabled || busy}
              >{optionRows}</RadioGroup>
            ) : <div className="flex flex-col gap-1">{optionRows}</div>}
          </div>
          {explaining ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Giải thích
              <textarea
                className={`${textareaControlClass} min-h-11! resize-none field-sizing-content`}
                value={value.explanation}
                onChange={(event) => onChange({ explanation: event.target.value })}
                placeholder="Giải thích vì sao đáp án này đúng"
                disabled={disabled || busy}
              />
              <FormulaPreview text={value.explanation} />
            </label>
          ) : !disabled && (
            <Button appearance="ghost" size="sm" className="self-start" onClick={() => setExplaining(true)} disabled={busy}>
              <Plus size={14} />Thêm giải thích
            </Button>
          )}
        </>
      ) : (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Đáp án / hướng dẫn chấm
          <textarea
            className={textareaControlClass}
            value={value.explanation}
            onChange={(event) => onChange({ explanation: event.target.value })}
            placeholder="Nhập đáp án gợi ý hoặc tiêu chí chấm điểm"
            disabled={disabled || busy}
          />
        </label>
      )}

      {value.imageUrl && (
        <a className="text-sm font-medium text-primary underline" href={value.imageUrl} target="_blank" rel="noreferrer">Xem ảnh đính kèm</a>
      )}

      {children}
    </>
  )
}

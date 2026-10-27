import { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pencil, Plus, Trash2, X } from '../../console/icons'
import Button from '../../console/button'
import DropdownField from '../../console/dropdown-field'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { RadioGroup, RadioGroupMark } from '../../ui/RadioGroup'
import { cn } from '../../../lib/cn'
import MathText from '../../ui/MathText'
import { CHOICE_TYPES, QUESTION_TYPE_OPTIONS, type DraftQuestion } from './exam-draft'

interface CategoryOption {
  id: string
  label: string
}

/** What a text with a formula looks like once set; nothing is shown for plain text. */
function FormulaPreview({ text }: { text: string }) {
  if (!text.includes('$')) return null
  return <p className="m-0 rounded-lg bg-background-gray-secondary px-3 py-2 text-sm leading-6 whitespace-pre-wrap break-words text-text-primary"><MathText>{text}</MathText></p>
}

/** One question of the exam in full: text, options, answer and the review flag, with the controls that move or remove it. */
export default function ExamQuestionEditor({
  question, number, sectionTitle, placement, editable, structureEditable, busy,
  canMoveUp, canMoveDown, categoryOptions, categoriesReady, categoriesLoading,
  onChange, onMove, onDelete, onPrevious, onNext,
}: {
  question: DraftQuestion
  number: number
  sectionTitle: string
  placement: boolean
  /** The content of this question may be changed. */
  editable: boolean
  /** The question may also be moved or removed. */
  structureEditable: boolean
  busy: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  categoryOptions: CategoryOption[]
  categoriesReady: boolean
  categoriesLoading: boolean
  onChange: (update: Partial<DraftQuestion>) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  /** Step to the neighbouring question; left out when every question is listed on one page. */
  onPrevious?: (() => void) | null
  onNext?: (() => void) | null
}) {
  const typeLabel = QUESTION_TYPE_OPTIONS.find((option) => option.id === question.questionType)?.label ??
    (question.questionType === 'TRUE_FALSE' ? 'Đúng / sai' : 'Trả lời ngắn')
  const isChoice = CHOICE_TYPES.includes(question.questionType)
  // The explanation is optional for a choice question: it stays folded until there is one or the teacher asks for it.
  const [explaining, setExplaining] = useState(Boolean(question.explanation))
  const [editing, setEditing] = useState(false)
  const navigation = onPrevious !== undefined && (
    <footer className="flex items-center justify-between gap-3 border-t border-card-border pt-4">
      <Button appearance="outline" onClick={onPrevious ?? undefined} disabled={!onPrevious}><ArrowLeft size={15} />Câu trước</Button>
      <Button appearance="outline" onClick={onNext ?? undefined} disabled={!onNext}>Câu sau<ArrowRight size={15} /></Button>
    </footer>
  )

  if (!editing || !editable) return (
    <article aria-label={`Câu ${number}`} className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 text-sm leading-6 text-text-primary sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-base font-semibold">Câu {number}</h2>
        {editable && <Button appearance="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}><Pencil size={14} />Sửa</Button>}
      </header>
      <p className="m-0 whitespace-pre-wrap break-words"><MathText>{question.questionText || 'Chưa có nội dung câu hỏi.'}</MathText></p>
      {question.imageUrl && <img src={question.imageUrl} alt={`Hình minh họa câu ${number}`} className="max-h-80 max-w-full self-start object-contain" />}
      {isChoice && (
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {question.options.map((option, index) => (
            <p key={index} className={cn('m-0 flex min-w-0 items-baseline gap-2 rounded-md px-2 py-1', option.correct && 'bg-badge-success-bg text-badge-success-text')}>
              <strong className="shrink-0">{String.fromCharCode(65 + index)}.</strong>
              <span className="min-w-0 whitespace-pre-wrap break-words"><MathText>{option.text || '…'}</MathText>{option.correct && <span className="sr-only"> (Đáp án đúng)</span>}</span>
            </p>
          ))}
        </div>
      )}
      {question.explanation && <details className="text-text-secondary"><summary className="cursor-pointer font-medium">{isChoice ? 'Giải thích' : 'Đáp án / hướng dẫn chấm'}</summary><p className="mt-2 mb-0 whitespace-pre-wrap break-words"><MathText>{question.explanation}</MathText></p></details>}
      {placement && question.categoryId && <p className="m-0 text-xs text-text-tertiary">Môn/nhóm đánh giá: {categoryOptions.find(option => option.id === question.categoryId)?.label ?? 'Môn đã gắn'}</p>}
      {question.needsReview && <p className="m-0 rounded-md bg-badge-warning-bg px-2 py-1 text-xs text-badge-warning-text">Cần rà soát{question.reviewNote ? `: ${question.reviewNote}` : ''}</p>}
      {navigation}
    </article>
  )

  const optionRows = question.options.map((option, optionIndex) => {
    const letter = String.fromCharCode(65 + optionIndex)
    const markLabel = 'Đánh dấu lựa chọn ' + letter + ' là đáp án đúng'
    return (
      <div key={question.clientId + '-option-' + optionIndex} className={cn('flex min-w-0 items-center gap-3 rounded-lg px-2 py-1.5', option.correct && 'bg-badge-success-bg')}>
        {question.questionType === 'SINGLE_CHOICE'
          ? <RadioGroupMark value={String(optionIndex)} aria-label={markLabel} />
          : (
            <Checkbox
              size="md"
              aria-label={markLabel}
              isSelected={option.correct}
              isDisabled={!editable || busy}
              onChange={(checked) => onChange({ options: question.options.map((item, index) => index === optionIndex ? { ...item, correct: checked } : item) })}
            />
          )}
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-badge-blue-background text-xs font-medium text-primary">{letter}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            className={`${fieldControlClass} min-w-0`}
            value={option.text}
            onChange={(event) => onChange({ options: question.options.map((item, index) => index === optionIndex ? { ...item, text: event.target.value } : item) })}
            placeholder={'Lựa chọn ' + letter}
            disabled={!editable || busy}
          />
          <FormulaPreview text={option.text} />
        </div>
        {editable && question.options.length > 2 && (
          <button
            type="button"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-text-tertiary hover:bg-badge-danger-bg hover:text-badge-error-text"
            aria-label={'Bỏ lựa chọn ' + letter}
            disabled={busy}
            onClick={() => onChange({ options: question.options.filter((_, index) => index !== optionIndex) })}
          ><X size={14} /></button>
        )}
      </div>
    )
  })

  return (
    <article aria-label={`Câu ${number}`} className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-base font-semibold text-text-primary">Câu {number}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button appearance="outline" size="sm" disabled={busy} onClick={() => setEditing(false)}>Xong</Button>
        {editable && structureEditable && (
          <div className="flex gap-1">
            <Button appearance="outline" size="icon" aria-label="Đưa câu hỏi lên" disabled={busy || !canMoveUp} onClick={() => onMove(-1)}><ArrowUp size={14} /></Button>
            <Button appearance="outline" size="icon" aria-label="Đưa câu hỏi xuống" disabled={busy || !canMoveDown} onClick={() => onMove(1)}><ArrowDown size={14} /></Button>
            <Button variant="danger" appearance="ghost" size="icon" aria-label="Xóa câu hỏi" disabled={busy} onClick={onDelete}><Trash2 size={14} /></Button>
          </div>
        )}
        </div>
      </header>

      {!question.editable && (
        <p className="m-0 rounded-lg border border-card-border bg-background-gray-secondary px-3 py-2.5 text-sm text-text-tertiary">{typeLabel} · chỉ xem</p>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
        Nội dung câu hỏi
        <textarea
          aria-label="Nội dung câu hỏi"
          className={`${textareaControlClass} min-h-11! resize-none field-sizing-content`}
          value={question.questionText}
          onChange={(event) => onChange({ questionText: event.target.value })}
          placeholder="Nhập nội dung câu hỏi"
          disabled={!editable || busy}
        />
        <FormulaPreview text={question.questionText} />
      </label>

      {placement && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Môn/nhóm đánh giá
          <DropdownField ariaLabel={`Môn cho câu ${number} trong ${sectionTitle}`}
            options={categoryOptions.some((option) => option.id === question.categoryId) || !question.categoryId ? categoryOptions : [...categoryOptions, { id: question.categoryId, label: 'Môn đã gắn' }]}
            value={question.categoryId} placeholder="Chọn môn (không bắt buộc)"
            isLoading={categoriesLoading} emptyMessage="Chưa có môn khả dụng."
            isDisabled={!editable || busy || !categoriesReady}
            onChange={(value) => onChange({ categoryId: value })} />
        </label>
      )}

      {isChoice ? (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-text-primary">Lựa chọn</span>
              {editable && question.options.length < 8 && (
                <Button appearance="ghost" size="sm" onClick={() => onChange({ options: [...question.options, { text: '', correct: false }] })} disabled={busy}>
                  <Plus size={14} />Thêm lựa chọn
                </Button>
              )}
            </div>
            {question.questionType === 'SINGLE_CHOICE' ? (
              <RadioGroup
                aria-label="Đáp án đúng"
                className="gap-1"
                value={String(question.options.findIndex((option) => option.correct))}
                onValueChange={(value) => onChange({ options: question.options.map((item, index) => ({ ...item, correct: String(index) === value })) })}
                disabled={!editable || busy}
              >{optionRows}</RadioGroup>
            ) : <div className="flex flex-col gap-1">{optionRows}</div>}
          </div>
          {explaining ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Giải thích
              <textarea
                className={`${textareaControlClass} min-h-11! resize-none field-sizing-content`}
                value={question.explanation}
                onChange={(event) => onChange({ explanation: event.target.value })}
                placeholder="Giải thích vì sao đáp án này đúng"
                disabled={!editable || busy}
              />
              <FormulaPreview text={question.explanation} />
            </label>
          ) : editable && (
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
            value={question.explanation}
            onChange={(event) => onChange({ explanation: event.target.value })}
            placeholder="Nhập đáp án gợi ý hoặc tiêu chí chấm điểm"
            disabled={!editable || busy}
          />
        </label>
      )}

      {question.imageUrl && (
        <a className="text-sm font-medium text-primary underline" href={question.imageUrl} target="_blank" rel="noreferrer">Xem ảnh đính kèm</a>
      )}

      {editable && (
        <div className="flex flex-col gap-2">
          <Checkbox isSelected={question.needsReview} onChange={(checked) => onChange({ needsReview: checked })} isDisabled={busy} className="text-sm font-medium text-text-primary">
            Câu hỏi cần rà soát trước khi xuất bản
          </Checkbox>
          {question.needsReview && (
            <textarea
              className={`${textareaControlClass} min-h-11! resize-none field-sizing-content`}
              aria-label="Ghi chú rà soát"
              value={question.reviewNote}
              onChange={(event) => onChange({ reviewNote: event.target.value })}
              placeholder="Ghi chú nội bộ về nội dung cần rà soát"
              disabled={busy}
            />
          )}
        </div>
      )}

      {navigation}
    </article>
  )
}

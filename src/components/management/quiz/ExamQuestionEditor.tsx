import { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pencil, Trash2 } from '../../console/icons'
import Button from '../../console/button'
import { textareaControlClass } from '../../console/form-field'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { cn } from '../../../lib/cn'
import MathText from '../../ui/MathText'
import { CHOICE_TYPES, QUESTION_TYPE_OPTIONS, type DraftQuestion } from './exam-draft'
import QuestionEditor from '../question/QuestionEditor'

interface CategoryOption {
  id: string
  label: string
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

      <QuestionEditor
        value={question} onChange={onChange} disabled={!editable} busy={busy}
        categoryOptions={categoryOptions} categoriesReady={categoriesReady} categoriesLoading={categoriesLoading}
        showCategory={placement} showType={false} showDifficulty={false}
        categoryAriaLabel={`Môn cho câu ${number} trong ${sectionTitle}`}
        explanationOpen={explaining} onExplanationOpenChange={setExplaining}
      >
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
      </QuestionEditor>
      {navigation}
    </article>
  )
}

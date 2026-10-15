import type { QuizQuestion } from '../../services/assessmentService'
import { bySequence } from '../../lib/sequence'
import { cn } from '../../lib/cn'
import Card from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import { RadioGroup, RadioGroupItem } from '../ui/RadioGroup'

interface QuizQuestionCardProps {
  question: QuizQuestion
  index: number
  total: number
  selectedOptionId: string | null
  saving: boolean
  saveFailed: boolean
  disabled: boolean
  onSelectOption: (optionId: string) => void
}

// Answer rows: chunky ledge tiles with a lettered badge. The built-in radio dot of RadioGroupItem
// is hidden; the checked state is carried by the blue tile and the filled letter badge.
const optionClass =
  'min-h-14 gap-3.5 rounded-2xl border-2 border-line px-4 py-3 text-base font-bold text-text-heading [&>span:first-child]:hidden hover:-translate-y-px hover:border-[#84d8ff] hover:bg-surface-brand data-[state=checked]:border-primary data-[state=checked]:bg-surface-brand data-[state=checked]:font-extrabold focus-visible:outline-3 focus-visible:outline-[#174fbd]'

function QuizQuestionCard({
  question,
  index,
  total,
  selectedOptionId,
  saving,
  saveFailed,
  disabled,
  onSelectOption,
}: QuizQuestionCardProps) {
  const saveState = saving
    ? { text: 'Đang lưu...', className: 'text-text-secondary' }
    : saveFailed
      ? { text: 'Lưu chưa thành công, thử chọn lại', className: 'text-badge-danger-text' }
      : selectedOptionId
        ? { text: 'Đã lưu', className: 'text-badge-success-text' }
        : null

  return (
    <Card variant="panel" padding="none" radius="xl" className="p-6 max-[640px]:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge tone="assessment" className="px-3.5 py-1 text-sm">
          Câu {index + 1}/{total}
        </StatusBadge>
        {saveState && (
          <span aria-live="polite" className={cn('text-sm font-bold', saveState.className)}>
            {saveState.text}
          </span>
        )}
      </div>

      {question.imageUrl && (
        <img className="mb-4 max-w-full rounded-2xl border-[1.5px] border-line-card" src={question.imageUrl} alt="" />
      )}

      <p className="mb-6 text-lg leading-[1.6] font-extrabold text-text-heading max-[640px]:text-[17px]">
        {question.questionText}
      </p>

      {question.questionType === 'SINGLE_CHOICE' ? (
        <RadioGroup
          value={selectedOptionId ?? ''}
          onValueChange={onSelectOption}
          disabled={disabled}
          className="gap-3"
        >
          {bySequence(question.options).map((option, optionIndex) => (
            <RadioGroupItem key={option.id} value={option.id} className={optionClass}>
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-line bg-surface-sky text-[15px] font-black text-text-body group-data-[state=checked]:border-transparent group-data-[state=checked]:bg-primary group-data-[state=checked]:text-white"
              >
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span className="min-w-0 flex-1">{option.optionText}</span>
            </RadioGroupItem>
          ))}
        </RadioGroup>
      ) : (
        <p className="text-sm text-text-secondary">Loại câu hỏi này chưa được hỗ trợ.</p>
      )}
    </Card>
  )
}

export default QuizQuestionCard

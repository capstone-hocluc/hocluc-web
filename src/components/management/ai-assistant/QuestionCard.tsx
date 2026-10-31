import { useState } from 'react'
import { cn } from '../../../lib/cn'
import { CheckCircle2, Eye, EyeOff, XCircle } from '../../console/icons'
import Button from '../../console/button'
import { Badge } from '../../tailgrids/core/badge'
import type { AiDifficulty, AiQuestion } from '../../../services/aiAssistantService'
import AiMarkdown from './AiMarkdown'

const DIFFICULTY_LABEL: Record<AiDifficulty, string> = {
  DE: 'Dễ',
  TB: 'Trung bình',
  KHO: 'Khó',
}

const DIFFICULTY_COLOR: Record<AiDifficulty, 'success' | 'warning' | 'error'> = {
  DE: 'success',
  TB: 'warning',
  KHO: 'error',
}

export default function QuestionCard({
  index,
  question,
}: {
  index: number
  question: AiQuestion
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const correct = question.answerId.trim().toUpperCase()

  return (
    <div className="rounded-xl border border-card-border bg-card-background p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span className="pt-0.5 text-sm font-semibold text-text-primary">{index + 1}.</span>
          <div className="min-w-0 flex-1">
            <AiMarkdown
              content={question.prompt}
              variant="compact"
              className="text-sm font-medium text-text-primary"
            />
          </div>
        </div>
        <Badge
          color={DIFFICULTY_COLOR[question.difficulty]}
          size="sm"
          className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
        >
          {DIFFICULTY_LABEL[question.difficulty]}
        </Badge>
      </div>

      <div className="mt-3 space-y-1.5">
        {question.options.map((option) => {
          const upperKey = option.id.toUpperCase()
          const isSelected = selected === upperKey
          const isCorrect = revealed && upperKey === correct
          const isWrongPick = revealed && isSelected && upperKey !== correct
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(upperKey)}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-input-primary-focus-border',
                isCorrect
                  ? 'border-badge-success-text/30 bg-badge-success-background text-badge-success-text'
                  : isWrongPick
                    ? 'border-badge-danger-text/30 bg-badge-danger-background text-badge-danger-text'
                    : isSelected
                      ? 'border-primary-text/40 bg-badge-primary-background text-primary-text'
                      : 'border-card-border bg-card-background text-text-primary hover:bg-background-gray-secondary'
              )}
            >
              <span className="pt-px text-xs font-semibold opacity-70">{upperKey}.</span>
              <div className="min-w-0 flex-1 break-words">
                <AiMarkdown content={option.label} variant="compact" className="text-sm" />
              </div>
              {isCorrect && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
              {isWrongPick && <XCircle className="mt-0.5 size-4 shrink-0" />}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Button
          appearance="outline"
          size="sm"
          onClick={() => setRevealed((value) => !value)}
        >
          {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          {revealed ? 'Ẩn đáp án' : 'Xem đáp án'}
        </Button>
        {revealed && (
          <span className="text-xs text-text-tertiary">
            Đáp án: <span className="font-mono font-semibold text-text-primary">{correct}</span>
          </span>
        )}
      </div>

      {revealed && question.explanation && (
        <div className="mt-2.5 rounded-lg bg-background-gray-secondary p-3">
          <AiMarkdown content={question.explanation} variant="compact" />
        </div>
      )}
    </div>
  )
}

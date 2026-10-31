import { useState } from 'react'
import { cn } from '../../../lib/cn'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  RotateCcw,
  type LucideIcon,
} from '../../console/icons'
import Button from '../../console/button'
import type { AiAssistantMessage, AiAssistantMode } from '../../../services/aiAssistantService'
import AiMarkdown from './AiMarkdown'
import AiOrb from './AiOrb'
import StageTrace from './StageTrace'

const MODE_LABEL: Record<AiAssistantMode, string> = {
  ask: 'Hỏi đáp',
  compose: 'Soạn câu hỏi',
  'mock-exam': 'Mô phỏng đề',
}

export default function AssistantMessage({
  message,
  onRegenerate,
  onJumpToQuestion,
}: {
  message: AiAssistantMessage
  onRegenerate: () => void
  onJumpToQuestion: (questionId: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [traceOpen, setTraceOpen] = useState(false)
  const hasStages = Boolean(message.stages?.length)
  const hasTrace = Boolean(message.trace?.length)
  const addedIds = message.addedQuestionIds ?? []

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.body)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied; the reply stays readable either way.
    }
  }

  const statusInner = (
    <>
      <AiOrb />
      <span>Trợ lý AI đã phản hồi</span>
      {message.mode && message.mode !== 'ask' && (
        <span className="text-xs font-medium text-text-tertiary/80">
          · {MODE_LABEL[message.mode]}
        </span>
      )}
      {hasStages && (
        <span className="text-xs font-medium text-text-tertiary/80">
          · {message.stages!.length} giai đoạn
        </span>
      )}
      {!hasStages && hasTrace && (
        <span className="text-xs font-medium text-text-tertiary/80">
          · {message.trace!.length} bước
        </span>
      )}
      {!hasStages && hasTrace && (
        <ChevronDown
          size={14}
          aria-hidden
          className={cn('transition-transform', traceOpen && 'rotate-180')}
        />
      )}
    </>
  )
  const statusClass = 'flex items-center gap-2.5 text-sm leading-none font-semibold text-text-tertiary'

  return (
    <article className="min-w-0">
      {!hasStages && hasTrace ? (
        <button
          type="button"
          aria-expanded={traceOpen}
          onClick={() => setTraceOpen((open) => !open)}
          className={cn(statusClass, 'mb-3 w-full rounded-lg text-left transition-colors hover:text-text-primary')}
        >
          {statusInner}
        </button>
      ) : (
        <div role="status" aria-live="polite" aria-atomic="false" className={cn(statusClass, 'mb-3')}>
          {statusInner}
        </div>
      )}

      {!hasStages && hasTrace && traceOpen && (
        <ol className="mb-4 ml-[7px] space-y-1.5 border-l border-card-border pl-3">
          {message.trace!.map((step, index) => (
            <li key={step} className="flex gap-2 text-xs leading-5 text-text-tertiary">
              <span className="text-text-secondary">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="text-[16px] leading-[1.75] text-text-primary">
        <AiMarkdown content={message.body} />
      </div>

      {hasStages && <StageTrace stages={message.stages!} />}

      {addedIds.length > 0 && (
        <div className="mt-4 rounded-xl border border-card-border bg-card-background p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-badge-success-text" aria-hidden />
            <p className="min-w-0 flex-1 text-sm font-medium text-text-primary">
              Đã thêm {addedIds.length} câu vào đề
              {message.addedPartTitle ? ` · ${message.addedPartTitle}` : ''}
            </p>
          </div>
          <Button
            size="sm"
            appearance="outline"
            className="mt-2.5"
            onClick={() => onJumpToQuestion(addedIds[0])}
          >
            Xem trong đề
          </Button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1">
        <ActionButton
          icon={copied ? Check : Copy}
          label={copied ? 'Đã sao chép' : 'Sao chép câu trả lời'}
          onClick={() => void copy()}
        />
        <ActionButton icon={RotateCcw} label="Tạo lại câu trả lời" onClick={onRegenerate} />
      </div>
    </article>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center rounded-lg p-1.5 text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
    >
      <Icon size={16} strokeWidth={1.5} />
    </button>
  )
}

import { useState } from 'react'
import { cn } from '../../../lib/cn'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  ListChecks,
  RotateCcw,
  XCircle,
  type LucideIcon,
} from '../../console/icons'
import { FileFormatPdf } from '@tailgrids/icons'
import Button from '../../console/button'
import type { AiAssistantMode } from '../../../services/aiAssistantService'
import { usePdfBusy, usePdfJob } from '../exam-doc/export'
import AiMarkdown from './AiMarkdown'
import AiOrb from './AiOrb'
import StageTrace from './StageTrace'
import type { AiChatMessage } from './exam-format'

export type ExamDownload = 'docx' | 'pdf' | 'docx-exam' | 'pdf-exam'

const MODE_LABEL: Record<AiAssistantMode, string> = {
  ask: 'Hỏi đáp',
  compose: 'Soạn câu hỏi',
  'mock-exam': 'Mô phỏng đề',
  revise: 'Sửa câu hỏi',
}

export default function AssistantMessage({
  message,
  onRegenerate,
  onDownload,
  onAnswerKey,
}: {
  message: AiChatMessage
  onRegenerate: () => void
  /** Word or PDF of the exam with its answer key, or Word of the exam alone ('docx-exam'). */
  onDownload: (format: ExamDownload) => void
  /** Writes the answer key after the exam again from the questions it holds now. */
  onAnswerKey: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [traceOpen, setTraceOpen] = useState(false)
  const pdfBusy = usePdfBusy()
  const pdfJob = usePdfJob()
  const hasStages = Boolean(message.stages?.length)
  const hasTrace = Boolean(message.trace?.length)
  const addedIds = message.addedItemIds ?? []
  // A compose or mock-exam answer that finished (not an error): its exam is ready to take away.
  const composed = !message.error && (message.mode === 'compose' || message.mode === 'mock-exam' || message.mode === 'revise')
  const revised = message.mode === 'revise'

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
      {message.error ? (
        <>
          <XCircle size={15} strokeWidth={1.8} className="shrink-0 text-badge-error-text" aria-hidden />
          <span className="text-badge-error-text">Trợ lý AI báo lỗi</span>
        </>
      ) : (
        <>
          <AiOrb />
          <span>Trợ lý AI đã phản hồi</span>
        </>
      )}
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
            <li key={`${index}-${step}`} className="flex gap-2 text-xs leading-5 text-text-tertiary">
              <span className="text-text-secondary">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {message.body && (
        <div
          className={cn(
            'text-[16px] leading-[1.75]',
            message.error ? 'text-badge-error-text' : 'text-text-primary'
          )}
        >
          <AiMarkdown content={message.body} />
        </div>
      )}

      {hasStages && <StageTrace stages={message.stages!} />}

      {/* A finished exam is one step from the teacher's hands: the questions are already on the sheet beside, so the
          card offers the files rather than a jump to them. */}
      {composed && (
        <div className="mt-4 rounded-xl border border-card-border bg-card-background p-3">
          {addedIds.length > 0 && (
            <div className="mb-2.5 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-badge-success-text" aria-hidden />
              <p className="min-w-0 flex-1 text-sm font-medium text-text-primary">
                {revised ? `Đã sửa ${addedIds.length} câu trong đề` : `Đã thêm ${addedIds.length} câu vào đề`}
              </p>
            </div>
          )}
          {/* Two by two: the exam with its key, then the exam alone. */}
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" appearance="outline" className="justify-start" onClick={() => onDownload('docx')}>
              <FileText size={15} aria-hidden />
              Tải Word
            </Button>
            <Button size="sm" appearance="outline" className="justify-start" disabled={pdfBusy} onClick={() => onDownload('pdf')}>
              <FileFormatPdf aria-hidden className="size-[15px]" />
              {pdfJob === 'full' ? 'Đang tạo PDF…' : 'Tải PDF'}
            </Button>
            <Button size="sm" appearance="outline" className="justify-start" onClick={() => onDownload('docx-exam')}>
              <FileText size={15} aria-hidden />
              Word không đáp án
            </Button>
            <Button size="sm" appearance="outline" className="justify-start" disabled={pdfBusy} onClick={() => onDownload('pdf-exam')}>
              <FileFormatPdf aria-hidden className="size-[15px]" />
              {pdfJob === 'examOnly' ? 'Đang tạo PDF…' : 'PDF không đáp án'}
            </Button>
          </div>
          <Button size="sm" appearance="ghost" className="mt-2" onClick={onAnswerKey}>
            <ListChecks size={15} aria-hidden />
            Cập nhật đáp án
          </Button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1">
        {message.body && (
          <ActionButton
            icon={copied ? Check : Copy}
            label={copied ? 'Đã sao chép' : 'Sao chép câu trả lời'}
            onClick={() => void copy()}
          />
        )}
        {!message.error && (
          <ActionButton icon={RotateCcw} label="Tạo lại câu trả lời" onClick={onRegenerate} />
        )}
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

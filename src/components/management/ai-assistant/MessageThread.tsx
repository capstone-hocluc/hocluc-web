import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from '../../console/icons'
import ScrollArea from '../../ui/ScrollArea'
import { Skeleton } from '../../tailgrids/core/skeleton'
import AssistantMessage, { type ExamDownload } from './AssistantMessage'
import AiOrb from './AiOrb'
import StageTrace from './StageTrace'
import type { AiChatMessage, AiTraceStage } from './exam-format'

export default function MessageThread({
  messages,
  pending,
  stages,
  trace,
  loading,
  onRegenerate,
  onDownload,
  onAnswerKey,
  onRetry,
  onChooseSubject,
}: {
  messages: readonly AiChatMessage[]
  pending: boolean
  stages: readonly AiTraceStage[]
  trace: readonly string[]
  loading: boolean
  onRegenerate: () => void
  /** Downloads the exam on the sheet: a Word file, or the print dialog to save it as PDF. */
  onDownload: (format: ExamDownload) => void
  onAnswerKey: () => void
  onRetry: (messageId: string) => void
  onChooseSubject: (messageId: string, subjectName: string | null) => void
}) {
  const scroll = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scroll.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, pending, stages, trace, loading])

  return (
    <ScrollArea
      ref={scroll}
      className="w-full flex-1 min-h-0 pt-4 pb-10 [scrollbar-gutter:stable_both-edges] [mask-image:linear-gradient(to_bottom,transparent_0px,#000_24px,#000_calc(100%_-_32px),transparent_100%)]"
    >
      <div className="mx-auto w-full max-w-[960px] space-y-7 px-4">
        {loading ? (
          <div aria-hidden className="space-y-7">
            <div className="flex justify-end">
              <Skeleton className="h-16 w-3/5 rounded-2xl" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
        ) : (
          messages.map((message) =>
            message.role === 'user' ? (
              <UserMessage key={message.id} message={message} />
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                onRegenerate={onRegenerate}
                onDownload={onDownload}
                onAnswerKey={onAnswerKey}
                onRetry={onRetry}
                onChooseSubject={onChooseSubject}
              />
            )
          )
        )}
        {pending && (
          <div role="status" aria-live="polite" aria-busy className="min-w-0">
            <div className="flex items-center gap-2.5 text-sm leading-none font-semibold text-text-tertiary">
              <AiOrb active />
              <span className="animate-pulse motion-reduce:animate-none">Trợ lý AI đang xử lý</span>
            </div>
            {stages.length > 0 && (
              <div className="mt-4">
                <StageTrace stages={stages} />
              </div>
            )}
            {trace.length > 0 && (
              <ol className="mt-4 ml-[7px] space-y-1.5 border-l border-card-border pl-3">
                {trace.map((step, index) => (
                  <li key={`${index}-${step}`} className="flex gap-2 text-xs leading-5 text-text-tertiary">
                    <span className="text-text-secondary">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}
            {stages.length === 0 && trace.length === 0 && (
              <div className="mt-4 space-y-2.5">
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            )}
          </div>
        )}
        <div className="h-px w-full shrink-0" />
      </div>
    </ScrollArea>
  )
}

function UserMessage({ message }: { message: AiChatMessage }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.body)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied; the bubble stays readable either way.
    }
  }

  return (
    <div className="group flex justify-end">
      <div className="flex max-w-[75%] flex-col items-end gap-1.5">
        <div className="rounded-2xl bg-background-gray-secondary px-4 py-2.5 text-sm leading-relaxed text-text-primary">
          <div className="whitespace-pre-wrap">{message.body}</div>
        </div>
        <div className="flex h-7 items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => void copy()}
            aria-label={copied ? 'Đã sao chép' : 'Sao chép tin nhắn'}
            title={copied ? 'Đã sao chép' : 'Sao chép tin nhắn'}
            className="inline-flex items-center justify-center rounded-lg p-1 text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
          >
            {copied ? <Check size={15} strokeWidth={1.5} /> : <Copy size={15} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </div>
  )
}

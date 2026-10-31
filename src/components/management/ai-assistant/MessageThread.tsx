import { useEffect, useRef, useState } from 'react'
import type { AiAssistantMessage } from '../../../services/aiAssistantService'
import { Check, Copy } from '../../console/icons'
import ScrollArea from '../../ui/ScrollArea'
import { Skeleton } from '../../tailgrids/core/skeleton'
import AssistantMessage from './AssistantMessage'
import AiOrb from './AiOrb'

export default function MessageThread({
  messages,
  pending,
  onRegenerate,
  onJumpToQuestion,
}: {
  messages: readonly AiAssistantMessage[]
  pending: boolean
  onRegenerate: () => void
  onJumpToQuestion: (questionId: string) => void
}) {
  const scroll = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scroll.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, pending])

  return (
    <ScrollArea
      ref={scroll}
      className="w-full flex-1 min-h-0 pt-4 pb-10 [scrollbar-gutter:stable_both-edges] [mask-image:linear-gradient(to_bottom,transparent_0px,#000_24px,#000_calc(100%_-_32px),transparent_100%)]"
    >
      <div className="mx-auto w-full max-w-[960px] space-y-7 px-4">
        {messages.map((message) =>
          message.role === 'user' ? (
            <UserMessage key={message.id} message={message} />
          ) : (
            <AssistantMessage
              key={message.id}
              message={message}
              onRegenerate={onRegenerate}
              onJumpToQuestion={onJumpToQuestion}
            />
          )
        )}
        {pending && (
          <div role="status" aria-live="polite" aria-busy className="min-w-0">
            <div className="flex items-center gap-2.5 text-sm leading-none font-semibold text-text-tertiary">
              <AiOrb active />
              <span className="animate-pulse motion-reduce:animate-none">Trợ lý AI đang xử lý</span>
            </div>
            <div className="mt-4 space-y-2.5">
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        )}
        <div className="h-px w-full shrink-0" />
      </div>
    </ScrollArea>
  )
}

function UserMessage({ message }: { message: AiAssistantMessage }) {
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

import type { FormEvent } from 'react'
import { Send, X } from '../../console/icons'
import { cn } from '../../../lib/cn'
import Button from '../../ui/Button'
import { Input } from '../../ui/Field'
import { quickActions, type AiMessage } from './teacherAiMock'

// Floating owl that opens the chat.
export function TeacherAiButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="absolute right-7 bottom-7 z-4 grid animate-float-y cursor-pointer place-items-center drop-shadow-[0_16px_22px_rgba(0,0,0,0.28)] max-[760px]:right-3.5 max-[760px]:bottom-3.5"
      aria-label="Mở Teacher AI"
      onClick={onOpen}
    >
      <img
        src="/owl-support-headset.png"
        alt=""
        aria-hidden="true"
        className="size-[98px] object-contain max-[760px]:size-[60px]"
      />
    </button>
  )
}

interface TeacherAiPanelProps {
  lessonTitle: string
  messages: AiMessage[]
  input: string
  onInput: (value: string) => void
  onClose: () => void
  onSend: (event: FormEvent) => void
  onQuickAction: (action: string) => void
}

export function TeacherAiPanel({
  lessonTitle,
  messages,
  input,
  onInput,
  onClose,
  onSend,
  onQuickAction,
}: TeacherAiPanelProps) {
  return (
    <aside className="relative z-5 flex h-[min(100%,620px)] w-full flex-col self-center overflow-hidden rounded-[22px] border border-line-brand bg-lock-soft shadow-[0_22px_46px_rgba(28, 176, 246,0.16)] max-[760px]:absolute max-[760px]:inset-x-2.5 max-[760px]:bottom-2.5 max-[760px]:h-auto max-[760px]:max-h-[calc(100dvh_-_92px)] max-[760px]:w-auto">
      <div className="flex shrink-0 items-center justify-between gap-2.5 bg-primary-bright px-3.5 py-[15px] text-surface">
        <img
          src="/owl-support-headset.png"
          alt=""
          aria-hidden="true"
          className="size-[46px] rounded-full bg-surface p-[5px] object-contain"
        />
        <div className="min-w-0 flex-1">
          <strong className="block text-base font-bold">Trợ lý AI HocLuc</strong>
          <span className="mt-[3px] block text-xs leading-[1.35] font-medium">
            <i className="mr-1.5 inline-block size-2 rounded-full bg-success" /> Đang hoạt động
          </span>
          <small className="mt-0.5 block truncate text-[10.5px] text-white/78">
            Đang hỗ trợ: {lessonTitle}
          </small>
        </div>
        <Button
          size="icon"
          className="shrink-0 border-0 bg-white/16 text-surface hover:bg-white/24"
          aria-label="Đóng Teacher AI"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[9px] overflow-y-auto bg-lock-soft px-[18px] py-[22px]">
        {messages.map((message) => (
          <p
            key={message.id}
            className={cn(
              'max-w-[90%] rounded-[18px] px-[15px] py-[13px] text-[13px] leading-[1.48] shadow-[0_10px_22px_rgba(17,24,58,0.06)]',
              message.role === 'ai'
                ? 'self-start bg-surface text-text-dim'
                : 'self-end bg-primary text-surface'
            )}
          >
            {message.text}
          </p>
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-line bg-surface px-[18px] pt-3.5 pb-2">
        {quickActions.map((action) => (
          <Button
            key={action}
            appearance="outline"
            shape="pill"
            size="sm"
            className="h-auto border-line-blue bg-surface-brand px-[9px] py-[7px] text-[11px] font-semibold"
            onClick={() => onQuickAction(action)}
          >
            {action}
          </Button>
        ))}
      </div>

      <form
        className="grid shrink-0 grid-cols-[minmax(0,1fr)_36px] gap-2 bg-surface px-[18px] pt-2 pb-4"
        onSubmit={onSend}
      >
        <Input
          value={input}
          onChange={(event) => onInput(event.target.value)}
          placeholder="Hỏi trợ lý AI..."
          className="h-[46px] min-w-0 rounded-full px-4 text-[12.5px]"
        />
        <Button
          type="submit"
          size="icon"
          shape="pill"
          className="size-[46px]"
          aria-label="Gửi câu hỏi"
        >
          <Send size={16} />
        </Button>
      </form>
    </aside>
  )
}

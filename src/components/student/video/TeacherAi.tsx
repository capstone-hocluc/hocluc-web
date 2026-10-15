import type { FormEvent } from 'react'
import { Send, X } from '../../console/icons'
import { cn } from '../../../lib/cn'
import Button from '../../ui/Button'
import { Input } from '../../ui/Field'
import { quickActions, type AiMessage } from './teacherAiMock'
import SubjectAvatarIcon from '../../common/SubjectAvatarIcon'

// Floating avatar that opens the chat.
export function TeacherAiButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="absolute right-7 bottom-7 z-4 grid animate-float-y cursor-pointer place-items-center drop-shadow-[0_16px_22px_rgba(0,0,0,0.28)] max-[760px]:right-3.5 max-[760px]:bottom-3.5"
      aria-label="Mở Teacher AI"
      onClick={onOpen}
    >
      <SubjectAvatarIcon type="cloud" className="size-[78px] max-[760px]:size-[52px]" />
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
    <aside className="relative z-5 flex h-[min(100%,620px)] w-full flex-col self-center overflow-hidden rounded-3xl border-[1.5px] border-line-card bg-lock-soft shadow-card max-[760px]:absolute max-[760px]:inset-x-2.5 max-[760px]:bottom-2.5 max-[760px]:h-auto max-[760px]:max-h-[calc(100dvh_-_92px)] max-[760px]:w-auto">
      <div className="flex shrink-0 items-center justify-between gap-2.5 bg-primary px-4 py-4 text-white">
        <SubjectAvatarIcon type="cloud" className="size-[38px] rounded-full bg-surface p-[5px]" />
        <div className="min-w-0 flex-1">
          <strong className="block text-lg font-black">Trợ lý AI HocLuc</strong>
          <span className="mt-[3px] block text-[13px] leading-[1.35] font-bold">
            <i className="mr-1.5 inline-block size-2 rounded-full bg-success" /> Đang hoạt động
          </span>
          <small className="mt-0.5 block truncate text-xs font-semibold text-white/85">
            Đang hỗ trợ: {lessonTitle}
          </small>
        </div>
        <Button
          size="icon"
          className="shrink-0 border-0 bg-white/20 text-white shadow-none hover:bg-white/30"
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
              'max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-[1.5]',
              message.role === 'ai'
                ? 'self-start border-[1.5px] border-line-card bg-surface text-text-body shadow-card-soft'
                : 'self-end bg-primary font-semibold text-white'
            )}
          >
            {message.text}
          </p>
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 border-t-[1.5px] border-line bg-surface px-[18px] pt-3.5 pb-2">
        {quickActions.map((action) => (
          <Button
            key={action}
            appearance="outline"
            shape="pill"
            size="sm"
            className="h-auto px-3 py-1.5 text-[13px]"
            onClick={() => onQuickAction(action)}
          >
            {action}
          </Button>
        ))}
      </div>

      <form
        className="grid shrink-0 grid-cols-[minmax(0,1fr)_46px] gap-2 bg-surface px-[18px] pt-2 pb-4"
        onSubmit={onSend}
      >
        <Input
          value={input}
          onChange={(event) => onInput(event.target.value)}
          placeholder="Hỏi trợ lý AI..."
          className="h-[46px] min-w-0 rounded-full px-4 text-[15px]"
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

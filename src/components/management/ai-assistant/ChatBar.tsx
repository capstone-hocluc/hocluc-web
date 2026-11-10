// The assistant as a bar floating at the bottom of the paper, the way a word processor docks its assistant there: one
// line to ask in, the run's progress in its place while it works, and the answer above it once it is done. Escape
// folds it to a button; its menu puts it back beside the paper or turns it off.
import { useRef, useState } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { cn } from '../../../lib/cn'
import { MoreHorizontal, PanelBottom, PanelRight, Sparkles, Square, X } from '../../console/icons'
import { MenuContent, MenuItem } from '../exam-doc/menubar/menu-ui'
import AiOrb from './AiOrb'
import AssistantMessage from './AssistantMessage'
import type { ChatPanelProps } from './ChatPanel'
import AssistantSources from './chat/AssistantSources'
import Composer from './Composer'

const ICON_BUTTON =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'

type ChatBarProps = Pick<
  ChatPanelProps,
  | 'messages'
  | 'mode'
  | 'value'
  | 'pending'
  | 'stages'
  | 'notice'
  | 'onDismissNotice'
  | 'settings'
  | 'onSettingsChange'
  | 'papers'
  | 'papersLoading'
  | 'papersError'
  | 'onReloadPapers'
  | 'onModeChange'
  | 'onValueChange'
  | 'onSend'
  | 'onStop'
  | 'onRegenerate'
  | 'onDownload'
  | 'onAnswerKey'
  | 'onRetry'
  | 'onChooseSubject'
> & {
  /** Puts the assistant back beside the paper, its whole thread in view. */
  onDockSide: () => void
  /** Turns the bar off; "Hỏi AI" brings it back. */
  onHide: () => void
  className?: string
}

export default function ChatBar({
  messages,
  mode,
  value,
  pending,
  stages,
  notice,
  onDismissNotice,
  settings,
  onSettingsChange,
  papers,
  papersLoading,
  papersError,
  onReloadPapers,
  onModeChange,
  onValueChange,
  onSend,
  onStop,
  onRegenerate,
  onDownload,
  onAnswerKey,
  onRetry,
  onChooseSubject,
  onDockSide,
  onHide,
  className,
}: ChatBarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const pill = useRef<HTMLButtonElement>(null)

  // The answer shows above the bar once a run ends, until the viewer puts it away or asks again.
  const [wasPending, setWasPending] = useState(pending)
  const [answerShown, setAnswerShown] = useState(false)
  if (pending !== wasPending) {
    setWasPending(pending)
    setAnswerShown(!pending)
  }
  const answer = answerShown
    ? [...messages].reverse().find((message) => message.role !== 'user')
    : undefined
  const running = stages.find((stage) => stage.state === 'running')

  function expand() {
    setCollapsed(false)
    window.requestAnimationFrame(() => input.current?.focus())
  }

  if (collapsed) {
    return (
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center print:hidden',
          className
        )}
      >
        <button
          ref={pill}
          type="button"
          onClick={expand}
          aria-label="Mở rộng thanh trợ lý AI"
          title="Mở rộng thanh trợ lý AI"
          className="pointer-events-auto grid size-10 place-items-center rounded-full border border-card-border bg-card-background text-primary-text shadow-card-hover transition-colors hover:bg-background-gray-secondary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
        >
          {pending ? <AiOrb active /> : <Sparkles size={18} strokeWidth={1.7} />}
        </button>
      </div>
    )
  }

  const menu = (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        <button
          type="button"
          aria-label="Tùy chọn thanh trợ lý AI"
          title="Thêm"
          className={ICON_BUTTON}
        >
          <MoreHorizontal size={16} className="rotate-90" />
        </button>
      </Menu.Trigger>
      <MenuContent side="top" align="end">
        <MenuItem label="Chuyển sang bảng điều khiển bên" icon={PanelRight} onSelect={onDockSide} />
        <MenuItem label="Tắt thanh dưới cùng" icon={PanelBottom} onSelect={onHide} />
      </MenuContent>
    </Menu.Root>
  )

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4 print:hidden',
        className
      )}
    >
      <section
        aria-label="Thanh trợ lý AI"
        onKeyDown={(event) => {
          // Escape folds the bar, unless something inside answered it first (a chip's menu) or it came from a menu
          // drawn elsewhere on the page.
          if (event.key !== 'Escape' || event.defaultPrevented) return
          if (!event.currentTarget.contains(event.target as Node)) return
          setCollapsed(true)
          window.requestAnimationFrame(() => pill.current?.focus())
        }}
        className="pointer-events-auto w-full max-w-[720px] rounded-[28px] border border-card-border bg-card-background shadow-card-hover"
      >
        {answer && (
          <div className="border-b border-card-border">
            <div className="flex items-center gap-1 pt-2 pr-2 pl-4">
              <Sparkles
                size={16}
                strokeWidth={1.7}
                aria-hidden
                className="mr-auto text-primary-text"
              />
              <button
                type="button"
                onClick={onDockSide}
                aria-label="Chuyển sang bảng điều khiển bên"
                title="Chuyển sang bảng điều khiển bên"
                className={ICON_BUTTON}
              >
                <PanelRight size={17} />
              </button>
              <button
                type="button"
                onClick={() => setAnswerShown(false)}
                aria-label="Ẩn câu trả lời"
                title="Ẩn câu trả lời"
                className={ICON_BUTTON}
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[min(45vh,420px)] overflow-y-auto px-4 pb-3">
              <AssistantMessage
                message={answer}
                onRegenerate={onRegenerate}
                onDownload={onDownload}
                onAnswerKey={onAnswerKey}
                onRetry={onRetry}
                onChooseSubject={onChooseSubject}
              />
            </div>
          </div>
        )}
        {pending ? (
          <div
            role="status"
            aria-live="polite"
            className="flex min-w-0 items-center gap-3 py-2 pr-2 pl-4"
          >
            <AiOrb active />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-secondary">
              {running?.title ?? 'Trợ lý AI đang xử lý'}
            </span>
            <button
              type="button"
              onClick={onStop}
              aria-label="Dừng tạo câu trả lời"
              title="Dừng tạo câu trả lời"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-button-primary-background text-button-primary-text transition-colors hover:bg-button-primary-hover-background focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring"
            >
              <Square size={13} strokeWidth={0} fill="currentColor" />
            </button>
          </div>
        ) : (
          <>
            {mode === 'mock-exam' && (
              <div className="px-3 pt-3">
                <AssistantSources
                  papers={papers}
                  papersLoading={papersLoading}
                  papersError={papersError}
                  onReloadPapers={onReloadPapers}
                  sourceId={settings.bankSourceId}
                  onSourceChange={(bankSourceId) => onSettingsChange({ bankSourceId })}
                  disabled={pending}
                />
              </div>
            )}
            <Composer
              variant="bar"
              trailing={menu}
              mode={mode}
              onModeChange={onModeChange}
              value={value}
              onChange={onValueChange}
              onSend={onSend}
              busy={pending}
              onStop={onStop}
              hasMessages={messages.length > 0}
              notice={notice}
              onDismissNotice={onDismissNotice}
              settings={settings}
              onSettingsChange={onSettingsChange}
              papers={papers}
              papersLoading={papersLoading}
              papersError={papersError}
              onReloadPapers={onReloadPapers}
              inputRef={input}
            />
          </>
        )}
      </section>
    </div>
  )
}

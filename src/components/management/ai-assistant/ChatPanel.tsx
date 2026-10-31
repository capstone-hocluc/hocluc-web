import { cn } from '../../../lib/cn'
import type {
  AiAssistantMessage,
  AiAssistantMode,
} from '../../../services/aiAssistantService'
import Logo from '../../common/Logo'
import Button from '../../console/button'
import { ChevronLeft, Eye, Sparkles, SquarePen, X } from '../../console/icons'
import Composer from './Composer'
import MessageThread from './MessageThread'
import StarterSuggestions from './StarterSuggestions'

interface ChatPanelProps {
  messages: readonly AiAssistantMessage[]
  mode: AiAssistantMode
  value: string
  pending: boolean
  greeting: string
  onModeChange: (mode: AiAssistantMode) => void
  onValueChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  onRegenerate: () => void
  onLoadDemo: () => void
  onStartNew: () => void
  onPickPrompt: (mode: AiAssistantMode, prompt: string) => void
  onJumpToQuestion: (questionId: string) => void
  onCollapse?: () => void
  onClose?: () => void
  className?: string
}

export default function ChatPanel({
  messages,
  mode,
  value,
  pending,
  greeting,
  onModeChange,
  onValueChange,
  onSend,
  onStop,
  onRegenerate,
  onLoadDemo,
  onStartNew,
  onPickPrompt,
  onJumpToQuestion,
  onCollapse,
  onClose,
  className = '',
}: ChatPanelProps) {
  const hasMessages = messages.length > 0

  return (
    <aside aria-label="Trợ lý AI" className={cn('flex-col bg-card-background', className)}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-secondary px-3">
        <Sparkles size={15} strokeWidth={1.7} className="shrink-0 text-primary-text" aria-hidden />
        <span className="min-w-0 truncate text-sm font-semibold text-text-primary">Trợ lý AI</span>
        <div className="ml-auto flex shrink-0 items-center">
          {hasMessages && (
            <button
              type="button"
              onClick={onStartNew}
              aria-label="Bắt đầu đề mới"
              title="Bắt đầu đề mới"
              className="inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
            >
              <SquarePen size={16} strokeWidth={1.7} />
            </button>
          )}
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Thu gọn trợ lý AI"
              title="Thu gọn trợ lý AI"
              className="inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
            >
              <ChevronLeft size={17} strokeWidth={1.7} />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng trợ lý AI"
              title="Đóng trợ lý AI"
              className="inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
            >
              <X size={17} strokeWidth={1.7} />
            </button>
          )}
        </div>
      </header>

      {hasMessages ? (
        <MessageThread
          messages={messages}
          pending={pending}
          onRegenerate={onRegenerate}
          onJumpToQuestion={onJumpToQuestion}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center">
          <Logo size={32} markOnly />
          <h2 className="mt-3 text-2xl leading-tight font-extrabold tracking-[-0.02em] text-text-primary">
            {greeting}
          </h2>
          <Button appearance="outline" size="sm" className="mt-5" onClick={onLoadDemo}>
            <Eye size={15} />
            Xem bản demo
          </Button>
        </div>
      )}

      <Composer
        mode={mode}
        onModeChange={onModeChange}
        value={value}
        onChange={onValueChange}
        onSend={onSend}
        busy={pending}
        onStop={onStop}
        hasMessages={hasMessages}
      />

      {!hasMessages && (
        <StarterSuggestions onModeChange={onModeChange} onPick={onPickPrompt} disabled={pending} />
      )}
    </aside>
  )
}

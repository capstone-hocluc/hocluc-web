import { useRef, type CSSProperties } from 'react'
import { cn } from '../../../lib/cn'
import type { AiAssistantMode } from '../../../services/aiAssistantService'
import type { AiComposeSettings } from '../../../hooks/useAiAssistant'
import type { SelectOption } from '../../console/select-field'
import { EmptyState, EmptyStateGreeting } from '../../assistant-ui/elements/empty-state'
import { ChevronRight, Clock, PanelBottom, Sparkles, SquarePen, X } from '../../console/icons'
import AssistantSources from './chat/AssistantSources'
import ChatThread from './chat/ChatThread'
import Composer from './Composer'
import StarterSuggestions from './StarterSuggestions'
import type { AiChatMessage } from './exam-format'

// Modes whose runs read a bank paper. Compose ignores the source: the hook sends bankSourceId only for
// mock-exam, and the backend treats any source as "Mô phỏng đề".
const SOURCE_MODES: readonly AiAssistantMode[] = ['mock-exam']

const ICON_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:pointer-events-none disabled:opacity-40'

export interface ChatPanelProps {
  messages: readonly AiChatMessage[]
  mode: AiAssistantMode
  /** A send is on its way or a run goes on. */
  pending: boolean
  loading: boolean
  greeting: string
  notice: string | null
  onDismissNotice: () => void
  settings: AiComposeSettings
  onSettingsChange: (patch: Partial<AiComposeSettings>) => void
  papers: SelectOption[]
  papersLoading: boolean
  papersError: string | null
  onReloadPapers: () => void
  onModeChange: (mode: AiAssistantMode) => void
  onStop: () => void
  onStartNew: () => void
  conversationsOpen: boolean
  onOpenConversations: () => void
  /** Fills the composer with a starter prompt (it is not sent). */
  onPickPrompt: (mode: AiAssistantMode, prompt: string) => void
  onCollapse?: () => void
  onClose?: () => void
  /** Moves the assistant to a bar at the bottom of the paper. */
  onDockBottom?: () => void
  /** Beside the paper: a card of its own, apart from the sheet, as a word processor's assistant panel is. */
  card?: boolean
  className?: string
  style?: CSSProperties
}

export default function ChatPanel({
  messages,
  mode,
  pending,
  loading,
  greeting,
  notice,
  onDismissNotice,
  settings,
  onSettingsChange,
  papers,
  papersLoading,
  papersError,
  onReloadPapers,
  onModeChange,
  onStop,
  onStartNew,
  conversationsOpen,
  onOpenConversations,
  onPickPrompt,
  onCollapse,
  onClose,
  onDockBottom,
  card = false,
  className = '',
  style,
}: ChatPanelProps) {
  const hasMessages = messages.length > 0
  const empty = !hasMessages && !loading
  const input = useRef<HTMLTextAreaElement>(null)

  function pickPrompt(pickedMode: AiAssistantMode, prompt: string) {
    onPickPrompt(pickedMode, prompt)
    // Focus once the filled value is rendered, with the caret after the prompt.
    window.requestAnimationFrame(() => {
      const element = input.current
      if (!element) return
      element.focus()
      element.setSelectionRange(element.value.length, element.value.length)
    })
  }

  return (
    // The card keeps the width given to the panel; the room around it is the panel's own.
    <aside
      aria-label="Trợ lý AI"
      className={cn('min-w-0 flex-col', card && 'py-2 pr-2 pl-1', className)}
      style={style}
    >
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col bg-card-background',
          card && 'overflow-hidden rounded-2xl border border-card-border shadow-xs'
        )}
      >
        <header className="flex h-12 shrink-0 items-center gap-2 pr-2 pl-3.5">
          <Sparkles
            size={15}
            strokeWidth={1.7}
            className="shrink-0 text-primary-text"
            aria-hidden
          />
          <h2 className="min-w-0 truncate text-[15px] font-semibold text-text-primary">
            Trợ lý AI soạn đề
          </h2>
          <div className="ml-auto flex shrink-0 items-center">
            <button
              type="button"
              onClick={onOpenConversations}
              aria-expanded={conversationsOpen}
              aria-label="Cuộc trò chuyện"
              title="Cuộc trò chuyện"
              className={ICON_BUTTON}
            >
              <Clock size={16} />
            </button>
            <button
              type="button"
              onClick={onStartNew}
              aria-label="Cuộc trò chuyện mới"
              title="Cuộc trò chuyện mới"
              className={ICON_BUTTON}
            >
              <SquarePen size={16} />
            </button>
            {onDockBottom && (
              <button
                type="button"
                onClick={onDockBottom}
                aria-label="Chuyển sang thanh dưới cùng"
                title="Chuyển sang thanh dưới cùng"
                className={ICON_BUTTON}
              >
                <PanelBottom size={17} />
              </button>
            )}
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                aria-label="Thu gọn trợ lý AI"
                title="Thu gọn trợ lý AI"
                className={ICON_BUTTON}
              >
                <ChevronRight size={17} strokeWidth={1.7} />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng trợ lý AI"
                title="Đóng trợ lý AI"
                className={ICON_BUTTON}
              >
                <X size={17} strokeWidth={1.7} />
              </button>
            )}
          </div>
        </header>

        {empty ? (
          <div className="app-scroll flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 py-6">
            <EmptyState className="my-auto">
              <EmptyStateGreeting className="max-w-[340px]">{greeting}</EmptyStateGreeting>
              <StarterSuggestions mode={mode} onPick={pickPrompt} disabled={pending} />
            </EmptyState>
          </div>
        ) : (
          <ChatThread loading={loading} />
        )}

        <div className="flex shrink-0 flex-col gap-2 px-3 pt-1 pb-2">
          {SOURCE_MODES.includes(mode) && (
            <AssistantSources
              papers={papers}
              papersLoading={papersLoading}
              papersError={papersError}
              onReloadPapers={onReloadPapers}
              sourceId={settings.bankSourceId}
              onSourceChange={(bankSourceId) => onSettingsChange({ bankSourceId })}
              disabled={pending}
            />
          )}
          <Composer
            mode={mode}
            onModeChange={onModeChange}
            busy={pending}
            onStop={onStop}
            hasMessages={hasMessages}
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
          <p className="text-center text-[11px] leading-4 text-text-tertiary">
            Trợ lý AI có thể mắc sai sót. Hãy kiểm tra kỹ nội dung.
          </p>
        </div>
      </div>
    </aside>
  )
}

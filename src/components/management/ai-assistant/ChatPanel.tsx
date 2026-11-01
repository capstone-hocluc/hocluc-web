import { useRef, type CSSProperties } from 'react'
import { cn } from '../../../lib/cn'
import type { AiAssistantMode } from '../../../services/aiAssistantService'
import type { AiComposeSettings } from '../../../hooks/useAiAssistant'
import type { SelectOption } from '../../console/select-field'
import { ChevronRight, RotateCcw, Sparkles, X } from '../../console/icons'
import AssistantSources from './chat/AssistantSources'
import Composer from './Composer'
import MessageThread from './MessageThread'
import StarterSuggestions from './StarterSuggestions'
import type { AiChatMessage, AiTraceStage } from './exam-format'

// Modes whose runs read a bank paper. Compose ignores the source: the hook sends bankSourceId only for
// mock-exam, and the backend treats any source as "Mô phỏng đề".
const SOURCE_MODES: readonly AiAssistantMode[] = ['mock-exam']

const ICON_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:pointer-events-none disabled:opacity-40'

interface ChatPanelProps {
  messages: readonly AiChatMessage[]
  mode: AiAssistantMode
  value: string
  pending: boolean
  stages: readonly AiTraceStage[]
  trace: readonly string[]
  loading: boolean
  greeting: string
  notice: string | null
  onDismissNotice: () => void
  settings: AiComposeSettings
  onSettingsChange: (patch: Partial<AiComposeSettings>) => void
  subjects: SelectOption[]
  subjectsLoading: boolean
  subjectsError: string | null
  onReloadSubjects: () => void
  papers: SelectOption[]
  papersLoading: boolean
  papersError: string | null
  onReloadPapers: () => void
  subjectLocked: boolean
  onModeChange: (mode: AiAssistantMode) => void
  onValueChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  onRegenerate: () => void
  onStartNew: () => void
  onPickPrompt: (mode: AiAssistantMode, prompt: string) => void
  onJumpToQuestion: (questionId: string) => void
  onCollapse?: () => void
  onClose?: () => void
  className?: string
  style?: CSSProperties
}

export default function ChatPanel({
  messages,
  mode,
  value,
  pending,
  stages,
  trace,
  loading,
  greeting,
  notice,
  onDismissNotice,
  settings,
  onSettingsChange,
  subjects,
  subjectsLoading,
  subjectsError,
  onReloadSubjects,
  papers,
  papersLoading,
  papersError,
  onReloadPapers,
  subjectLocked,
  onModeChange,
  onValueChange,
  onSend,
  onStop,
  onRegenerate,
  onStartNew,
  onPickPrompt,
  onJumpToQuestion,
  onCollapse,
  onClose,
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
    <aside aria-label="Trợ lý AI" className={cn('min-w-0 flex-col bg-card-background', className)} style={style}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-secondary pr-2 pl-3.5">
        <Sparkles size={15} strokeWidth={1.7} className="shrink-0 text-primary-text" aria-hidden />
        <h2 className="min-w-0 truncate text-[15px] font-semibold text-text-primary">Trợ lý AI soạn đề</h2>
        <div className="ml-auto flex shrink-0 items-center">
          <button
            type="button"
            onClick={onStartNew}
            disabled={!hasMessages}
            aria-label="Làm mới đoạn chat"
            title="Làm mới đoạn chat"
            className={ICON_BUTTON}
          >
            <RotateCcw size={16} />
          </button>
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
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
          <p className="max-w-[320px] text-[26px] leading-[1.25] font-semibold tracking-[-0.01em] text-balance text-primary-text">
            {greeting}
          </p>
        </div>
      ) : (
        <MessageThread
          messages={messages}
          pending={pending}
          stages={stages}
          trace={trace}
          loading={loading}
          onRegenerate={onRegenerate}
          onJumpToQuestion={onJumpToQuestion}
        />
      )}

      <div className="flex shrink-0 flex-col gap-2 px-3 pt-1 pb-2">
        {empty && <StarterSuggestions mode={mode} onPick={pickPrompt} disabled={pending} />}
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
          value={value}
          onChange={onValueChange}
          onSend={onSend}
          busy={pending}
          onStop={onStop}
          hasMessages={hasMessages}
          notice={notice}
          onDismissNotice={onDismissNotice}
          settings={settings}
          onSettingsChange={onSettingsChange}
          subjects={subjects}
          subjectsLoading={subjectsLoading}
          subjectsError={subjectsError}
          onReloadSubjects={onReloadSubjects}
          papers={papers}
          papersLoading={papersLoading}
          papersError={papersError}
          onReloadPapers={onReloadPapers}
          subjectLocked={subjectLocked}
          inputRef={input}
        />
        <p className="text-center text-[11px] leading-4 text-text-tertiary">
          Trợ lý AI có thể mắc sai sót. Hãy kiểm tra kỹ nội dung.
        </p>
      </div>
    </aside>
  )
}

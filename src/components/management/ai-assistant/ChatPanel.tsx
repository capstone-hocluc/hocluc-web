import { cn } from '../../../lib/cn'
import type { AiAssistantMode } from '../../../services/aiAssistantService'
import type { AiComposeSettings } from '../../../hooks/useAiAssistant'
import type { SelectOption } from '../../console/select-field'
import { ChevronLeft, Sparkles, SquarePen, X } from '../../console/icons'
import Composer from './Composer'
import MessageThread from './MessageThread'
import StarterSuggestions from './StarterSuggestions'
import type { AiChatMessage, AiTraceStage } from './exam-format'

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

      {hasMessages || loading ? (
        <MessageThread
          messages={messages}
          pending={pending}
          stages={stages}
          trace={trace}
          loading={loading}
          onRegenerate={onRegenerate}
          onJumpToQuestion={onJumpToQuestion}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center">
          <h2 className="text-2xl leading-tight font-extrabold tracking-[-0.02em] text-text-primary">
            {greeting}
          </h2>
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
      />

      {!hasMessages && (
        <StarterSuggestions onModeChange={onModeChange} onPick={onPickPrompt} disabled={pending} />
      )}
    </aside>
  )
}

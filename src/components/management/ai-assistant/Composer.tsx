import { useEffect, useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import type { AiAssistantMode } from '../../../services/aiAssistantService'
import {
  ArrowUp,
  Check,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  Plus,
  Shapes,
  Sparkles,
  Square,
  type LucideIcon,
} from '../../console/icons'
import Button from '../../console/button'
import Notice from '../../console/notice'
import type { SelectOption } from '../../console/select-field'
import type { AiComposeSettings } from '../../../hooks/useAiAssistant'
import QuizConfigBar from './QuizConfigBar'

const MODES: {
  id: AiAssistantMode
  label: string
  description: string
  placeholder: string
  icon: LucideIcon
}[] = [
  {
    id: 'ask',
    label: 'Hỏi đáp',
    description: 'Hỏi kiến thức, bài tập hoặc cách dạy',
    placeholder: 'Hỏi về khái niệm, bài tập hoặc cách dạy…',
    icon: Sparkles,
  },
  {
    id: 'compose',
    label: 'Soạn câu hỏi',
    description: 'Tạo câu hỏi mới theo cấu hình',
    placeholder: 'Mô tả câu hỏi cần soạn: chủ đề, mức độ, dạng câu…',
    icon: ClipboardList,
  },
  {
    id: 'mock-exam',
    label: 'Mô phỏng đề',
    description: 'Lấy câu hỏi từ ngân hàng đề có sẵn',
    placeholder: 'Chọn đề mẫu rồi mô tả cấu trúc đề cần tạo…',
    icon: FileCheck2,
  },
]

interface ComposerProps {
  mode: AiAssistantMode
  onModeChange: (mode: AiAssistantMode) => void
  value: string
  onChange: (value: string) => void
  onSend: () => void
  busy: boolean
  onStop: () => void
  hasMessages: boolean
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
}

export default function Composer({
  mode,
  onModeChange,
  value,
  onChange,
  onSend,
  busy,
  onStop,
  hasMessages,
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
}: ComposerProps) {
  const active = MODES.find((item) => item.id === mode) ?? MODES[0]
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const missingConfig =
    mode !== 'ask' && (!settings.subjectId || (mode === 'mock-exam' && !settings.bankSourceId))
  const canSend = Boolean(value.trim()) && !busy && !missingConfig

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`
  }, [value])

  return (
    <div
      className={cn(
        'relative mx-auto w-full shrink-0 px-6',
        hasMessages ? 'max-w-[960px] pt-1 pb-5' : 'max-w-[768px] pb-5'
      )}
    >
      {notice && (
        <Notice tone="danger" className="mb-2.5">
          {notice}
          <Button size="sm" appearance="outline" onClick={onDismissNotice}>
            Đóng
          </Button>
        </Notice>
      )}
      {mode !== 'ask' && (
        <QuizConfigBar
          mode={mode}
          settings={settings}
          onChange={onSettingsChange}
          subjects={subjects}
          subjectsLoading={subjectsLoading}
          subjectsError={subjectsError ?? ''}
          onReloadSubjects={onReloadSubjects}
          papers={papers}
          papersLoading={papersLoading}
          papersError={papersError ?? ''}
          onReloadPapers={onReloadPapers}
          subjectLocked={subjectLocked}
        />
      )}
      <div className="relative">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!busy) onSend()
          }}
          className="relative z-10 rounded-xl border border-card-border bg-card-background shadow-card-soft transition-[border-color,box-shadow] focus-within:border-input-primary-focus-border focus-within:shadow-card"
        >
          <div className="px-4 pt-3.5 pb-2">
            <textarea
              ref={textareaRef}
              aria-label="Tin nhắn cho trợ lý AI"
              rows={1}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  if (canSend) onSend()
                }
              }}
              placeholder={active.placeholder}
              style={{ minHeight: hasMessages ? 28 : 64 }}
              className="block w-full resize-none overflow-hidden bg-transparent text-[15.5px] leading-[1.6] text-text-primary outline-none placeholder:text-input-placeholder-text"
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-3 pt-0.5 pb-2">
            <Button
              variant="ghost"
              size="icon"
              disabled
              aria-label="Đính kèm tệp (chưa hỗ trợ)"
              title="Đính kèm tệp (chưa hỗ trợ)"
              className="size-8 text-icon-tertiary"
            >
              <Plus size={17} strokeWidth={1.7} />
            </Button>
            <Button
              type={busy ? 'button' : 'submit'}
              onClick={busy ? onStop : undefined}
              disabled={!busy && (!value.trim() || missingConfig)}
              aria-label={busy ? 'Dừng tạo câu trả lời' : 'Gửi tin nhắn'}
              title={busy ? 'Dừng tạo câu trả lời' : 'Gửi tin nhắn'}
              size="icon"
              className="size-8 shrink-0"
            >
              {busy ? (
                <Square size={10} strokeWidth={2.6} fill="currentColor" />
              ) : (
                <ArrowUp size={16} strokeWidth={2.2} />
              )}
            </Button>
          </div>
        </form>

        <div className="relative -mt-5 rounded-xl border border-card-border bg-background-gray-secondary px-2 pt-[23px] pb-1">
          <div className="flex items-center gap-0.5">
            <ModeMenu
              mode={mode}
              onModeChange={onModeChange}
              placement={hasMessages ? 'up' : 'down'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ModeMenu({
  mode,
  onModeChange,
  placement,
}: {
  mode: AiAssistantMode
  onModeChange: (mode: AiAssistantMode) => void
  placement: 'up' | 'down'
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const active = MODES.find((item) => item.id === mode) ?? MODES[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={root} className="relative flex min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Chế độ trả lời"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-card-background hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
      >
        <Shapes size={14} strokeWidth={1.7} aria-hidden />
        <span>Chế độ</span>
        <span
          className={cn(
            'max-w-[150px] truncate',
            mode === 'ask' ? 'text-text-tertiary' : 'text-primary-text'
          )}
        >
          {active.label}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={1.8}
          aria-hidden
          className={cn('shrink-0 text-icon-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Chế độ trả lời"
          className={cn(
            'absolute left-0 z-50 w-[328px] max-w-[calc(100vw-2rem)] rounded-xl border border-card-border bg-card-background p-1.5 shadow-card-hover',
            placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
        >
          {MODES.map((item) => {
            const Icon = item.icon
            const selected = item.id === mode
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onModeChange(item.id)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-background-gray-secondary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-lg',
                    selected
                      ? 'bg-badge-primary-background text-primary-text'
                      : 'bg-background-gray-secondary text-icon-tertiary'
                  )}
                >
                  <Icon size={18} strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-text-tertiary">
                    {item.description}
                  </span>
                </span>
                {selected && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-button-primary-background text-button-primary-text">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

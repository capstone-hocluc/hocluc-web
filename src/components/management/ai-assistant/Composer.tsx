import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Gallery, Paperclip2 } from '@tailgrids/icons'
import { cn } from '../../../lib/cn'
import type { AiAssistantMode } from '../../../services/aiAssistantService'
import {
  ArrowUp,
  Check,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  Filter,
  Sparkles,
  Square,
  type LucideIcon,
} from '../../console/icons'
import Button from '../../console/button'
import Notice from '../../console/notice'
import type { SelectOption } from '../../console/select-field'
import type { AiComposeSettings } from '../../../hooks/useAiAssistant'
import QuizConfigBar from './QuizConfigBar'
import { COMPOSE_COUNTS, DIFFICULTIES, MOCK_COUNTS } from './quiz-config-options'

/**
 * Closes a floating menu on a click outside `root` or on Escape. Spread the returned handler on `root`: inside
 * the chat sheet the sheet takes Escape and stops it before the document, so the menu answers it there first.
 */
function useDismiss(open: boolean, setOpen: (open: boolean) => void, root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, setOpen, root])

  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !open) return
    event.stopPropagation()
    setOpen(false)
    // Focus may have been inside the menu, which is about to unmount: hand it back to the chip.
    root.current?.querySelector('button')?.focus()
  }
}

const EXAM_PLACEHOLDER = 'Nhập yêu cầu tạo, sửa, giải đề thi…'

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
    // The subjects come from the request's own words, so the hint shows naming one.
    placeholder: 'Ví dụ: Soạn 10 câu Toán mức trung bình, kèm lời giải…',
    icon: ClipboardList,
  },
  {
    id: 'mock-exam',
    label: 'Mô phỏng đề',
    description: 'Lấy câu hỏi từ ngân hàng đề có sẵn',
    placeholder: EXAM_PLACEHOLDER,
    icon: FileCheck2,
  },
]

// Chips of the composer; below 20rem of composer width the mode chip keeps only its icon.
const CHIP =
  'inline-flex h-8 min-w-0 items-center gap-1 rounded-lg px-1.5 text-[12.5px] font-medium whitespace-nowrap transition-colors hover:bg-background-gray-secondary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'
// The menus open upwards over the composer, as wide as it is (capped), aligned to its right edge.
const MENU =
  'absolute right-0 bottom-full left-0 z-50 mb-2 ml-auto rounded-xl border border-card-border bg-card-background shadow-card-hover'

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
  papers: SelectOption[]
  papersLoading: boolean
  papersError: string | null
  onReloadPapers: () => void
  /** Lets the panel focus the message box, e.g. after a starter card filled it. */
  inputRef?: RefObject<HTMLTextAreaElement | null>
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
  papers,
  papersLoading,
  papersError,
  onReloadPapers,
  inputRef,
}: ComposerProps) {
  const active = MODES.find((item) => item.id === mode) ?? MODES[0]
  const ownRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef ?? ownRef
  const missingConfig = mode === 'mock-exam' && !settings.bankSourceId
  const canSend = Boolean(value.trim()) && !busy && !missingConfig

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`
  }, [value, textareaRef])

  return (
    <div className="w-full shrink-0">
      {notice && (
        <Notice tone="danger" className="mb-2">
          {notice}
          <Button size="sm" appearance="outline" onClick={onDismissNotice}>
            Đóng
          </Button>
        </Notice>
      )}
      {/* The chip menus position against this box, so they never overflow a narrow panel. */}
      <div className="relative">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!busy) onSend()
          }}
          className="@container rounded-xl border border-card-border bg-card-background shadow-card-soft transition-[border-color,box-shadow] focus-within:border-input-primary-focus-border focus-within:shadow-card"
        >
          <div className="px-3 pt-3 pb-1">
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
              style={{ minHeight: hasMessages ? 24 : 48 }}
              className="block w-full resize-none overflow-hidden bg-transparent text-sm leading-6 text-text-primary outline-none placeholder:text-input-placeholder-text"
            />
          </div>
          <div className="flex min-w-0 items-center gap-1.5 px-2 pb-2">
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                appearance="ghost"
                size="icon"
                disabled
                aria-label="Thêm ảnh vào yêu cầu"
                title="Sắp có"
                className="size-8 text-icon-tertiary"
              >
                <Gallery size={17} aria-hidden />
              </Button>
              <Button
                appearance="ghost"
                size="icon"
                disabled
                aria-label="Đính kèm tệp (chưa hỗ trợ)"
                title="Đính kèm tệp (chưa hỗ trợ)"
                className="size-8 text-icon-tertiary"
              >
                <Paperclip2 size={17} aria-hidden />
              </Button>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
              <ModeMenu mode={mode} onModeChange={onModeChange} />
              {mode !== 'ask' && (
                <SettingsMenu
                  summary={settingsSummary(mode, settings)}
                  missing={missingConfig}
                  hasError={Boolean(mode === 'mock-exam' && papersError)}
                >
                  <QuizConfigBar
                    mode={mode}
                    settings={settings}
                    onChange={onSettingsChange}
                  />
                </SettingsMenu>
              )}
            </div>
            <Button
              type={busy ? 'button' : 'submit'}
              onClick={busy ? onStop : undefined}
              disabled={!busy && (!value.trim() || missingConfig)}
              aria-label={busy ? 'Dừng tạo câu trả lời' : 'Gửi tin nhắn'}
              title={busy ? 'Dừng tạo câu trả lời' : 'Gửi (Enter)'}
              size="icon"
              shape="pill"
              // The shared button sizes every icon to 20px and rings it on any focus: here the stop square stays a
              // small glyph and the ring shows for keyboard focus only (a click on Gửi would otherwise keep it).
              className={cn(
                'size-8 shrink-0 focus:ring-0 focus-visible:ring-2',
                busy ? '[&>svg]:size-3.5' : '[&>svg]:size-4'
              )}
            >
              {busy ? (
                <Square strokeWidth={0} fill="currentColor" />
              ) : (
                <ArrowUp size={16} strokeWidth={2.2} />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModeMenu({
  mode,
  onModeChange,
}: {
  mode: AiAssistantMode
  onModeChange: (mode: AiAssistantMode) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const active = MODES.find((item) => item.id === mode) ?? MODES[0]
  const ActiveIcon = active.icon
  const onEscape = useDismiss(open, setOpen, root)

  return (
    <div ref={root} onKeyDown={onEscape} className="flex min-w-0 shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Chế độ trả lời"
        title={`Chế độ trả lời: ${active.label}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(CHIP, mode === 'ask' ? 'text-text-secondary' : 'text-primary-text')}
      >
        <ActiveIcon size={14} strokeWidth={1.7} aria-hidden className="shrink-0" />
        {/* Ask has no settings chip beside it, so its label always fits. */}
        <span className={cn('min-w-0 truncate', mode !== 'ask' && '@max-xs:hidden')}>{active.label}</span>
        <ChevronDown
          size={12}
          strokeWidth={1.8}
          aria-hidden
          className={cn('shrink-0 text-icon-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div role="listbox" aria-label="Chế độ trả lời" className={cn(MENU, 'max-w-[328px] p-1.5')}>
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

const labelOf = (options: readonly SelectOption[], id: string) =>
  options.find((option) => option.id === id)?.label

/**
 * One line telling the current compose settings, e.g. "5 câu · Trung bình". The bank paper of
 * "Mô phỏng đề" is left out: the sources block above the composer already shows it.
 */
function settingsSummary(
  mode: Exclude<AiAssistantMode, 'ask'>,
  settings: AiComposeSettings
) {
  const count = labelOf(mode === 'compose' ? COMPOSE_COUNTS : MOCK_COUNTS, String(settings.questionCount))
  const difficulty = mode === 'compose' ? labelOf(DIFFICULTIES, settings.difficulty) : undefined
  return [count, difficulty].filter(Boolean).join(' · ')
}

/** The compose settings folded into one chip of the composer; the full settings open above it. */
function SettingsMenu({
  summary,
  missing,
  hasError,
  children,
}: {
  summary: string
  missing: boolean
  hasError: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const onEscape = useDismiss(open, setOpen, root)
  const attention = missing || hasError

  return (
    <div ref={root} onKeyDown={onEscape} className="flex min-w-0 shrink">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Cấu hình đề"
        title={summary || 'Cấu hình đề'}
        onClick={() => setOpen((value) => !value)}
        className={cn(CHIP, attention ? 'text-danger' : 'text-text-secondary hover:text-text-primary')}
      >
        <Filter size={14} strokeWidth={1.7} aria-hidden className="shrink-0 @max-xs:hidden" />
        <span className="min-w-0 truncate">{missing ? 'Chọn cấu hình đề' : summary || 'Cấu hình đề'}</span>
        <ChevronDown
          size={12}
          strokeWidth={1.8}
          aria-hidden
          className={cn('shrink-0 text-icon-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        // The selects inside portal their option lists into this box, so picking one is not a click outside.
        <div role="dialog" aria-label="Cấu hình đề" data-select-portal="" className={cn(MENU, 'max-w-[360px] p-2')}>
          {children}
        </div>
      )}
    </div>
  )
}

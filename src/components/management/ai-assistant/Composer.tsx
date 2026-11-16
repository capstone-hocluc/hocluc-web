import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { ComposerPrimitive, useAuiEvent, useAuiState } from '@assistant-ui/react'
import { Gallery, Paperclip2 } from '@tailgrids/icons'
import { cn } from '../../../lib/cn'
import type { AiAssistantMode } from '../../../services/aiAssistantService'
import {
  Check,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  Filter,
  Sparkles,
  type LucideIcon,
} from '../../console/icons'
import { ComposerSend } from '../../assistant-ui/elements/composer'
import { composerChip, composerTool, floating, paper } from '../../assistant-ui/elements/surfaces'
import Button from '../../console/button'
import Notice from '../../console/notice'
import type { SelectOption } from '../../console/select-field'
import type { AiComposeSettings } from '../../../hooks/useAiAssistant'
import QuizConfigBar from './QuizConfigBar'
import { EXAM_FORMATS } from './exam-format'
import { requestedCount } from './revise-request'
import { COMPOSE_COUNTS, MOCK_COUNTS, SOLUTION_STYLES } from './quiz-config-options'

/**
 * Closes a floating menu on a click outside `root` or on Escape. Spread the returned handler on `root`: inside
 * the chat sheet the sheet takes Escape and stops it before the document, so the menu answers it there first.
 */
function useDismiss(
  open: boolean,
  setOpen: (open: boolean) => void,
  root: RefObject<HTMLElement | null>
) {
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
    description: 'Soạn đề mới theo một đề mẫu',
    placeholder: EXAM_PLACEHOLDER,
    icon: FileCheck2,
  },
]

// The menus open upwards over the composer, as wide as it is (capped): aligned to its right edge under the panel's
// chips, to its left edge under the bar's, which sit first.
const MENU = cn(floating, 'absolute right-0 bottom-full left-0 z-50 mb-2 rounded-2xl')
const menuAt = (compact: boolean) => cn(MENU, compact ? 'mr-auto' : 'ml-auto')

interface ComposerProps {
  mode: AiAssistantMode
  onModeChange: (mode: AiAssistantMode) => void
  busy: boolean
  /** Stops the run going on (the send button turns into it). */
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
  /**
   * `bar`: one line, as the assistant's bar at the bottom of the paper is; the mode and settings show as icons before
   * the words.
   */
  variant?: 'panel' | 'bar'
  /** Shown between the words and the send button of the bar (its menu). */
  trailing?: ReactNode
}

/**
 * The box the teacher writes to the assistant in, on assistant-ui's composer: its words live in the chat runtime, so
 * they stay when the box unmounts (the bar shows the run's progress in its place) and come back when a send does not go.
 */
export default function Composer({
  mode,
  onModeChange,
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
  variant = 'panel',
  trailing,
}: ComposerProps) {
  const bar = variant === 'bar'
  const active = MODES.find((item) => item.id === mode) ?? MODES[0]
  const missingConfig = mode === 'mock-exam' && !settings.bankSourceId
  const text = useAuiState(({ composer }) => composer.text)
  // Counts the sends; the settings menu is keyed by it, so it closes and does not cover the progress.
  const [sends, setSends] = useState(0)
  useAuiEvent('composer.send', () => setSends((count) => count + 1))

  const textarea = (
    <ComposerPrimitive.Input
      ref={inputRef}
      aria-label="Tin nhắn cho trợ lý AI"
      placeholder={active.placeholder}
      // Escape belongs to the bar (it folds) and the chip menus, not to stopping the run; the box takes focus only
      // when the teacher puts it there.
      cancelOnEscape={false}
      unstable_focusOnRunStart={false}
      unstable_focusOnScrollToBottom={false}
      unstable_focusOnThreadSwitched={false}
      minRows={bar || hasMessages ? 1 : 2}
      // The bar's box stops growing sooner and scrolls past it.
      maxRows={bar ? 6 : 8}
      className="block w-full resize-none overflow-y-auto bg-transparent text-sm leading-6 text-text-primary outline-none placeholder:text-text-tertiary"
    />
  )
  const settingsMenu = mode !== 'ask' && (
    <SettingsMenu
      key={sends}
      summary={settingsSummary(mode, settings, requestedCount(text))}
      missing={missingConfig}
      hasError={Boolean(mode === 'mock-exam' && papersError)}
      compact={bar}
    >
      <QuizConfigBar
        mode={mode === 'revise' ? 'compose' : mode}
        settings={settings}
        onChange={onSettingsChange}
      />
    </SettingsMenu>
  )
  // Ink once there are words to send; the send primitive turns it off while there are none (or no paper is chosen).
  const sendButton = busy ? (
    <ComposerSend
      streaming
      idle={false}
      onClick={onStop}
      aria-label="Dừng tạo câu trả lời"
      title="Dừng tạo câu trả lời"
    />
  ) : (
    <ComposerPrimitive.Send asChild>
      <ComposerSend
        streaming={false}
        idle={!text.trim() || missingConfig}
        aria-label="Gửi tin nhắn"
        title="Gửi (Enter)"
      />
    </ComposerPrimitive.Send>
  )

  return (
    <div className="w-full shrink-0">
      {notice && (
        <Notice tone="danger" className={bar ? 'mx-3 mt-3' : 'mb-2'}>
          {notice}
          <Button size="sm" appearance="outline" onClick={onDismissNotice}>
            Đóng
          </Button>
        </Notice>
      )}
      {/* The chip menus position against this box, so they never overflow a narrow panel. */}
      <div className="relative">
        <ComposerPrimitive.Root
          className={cn(
            '@container',
            // The bar is the box itself; the panel's composer is a card of its own (Elements' composer bar).
            !bar &&
              cn(
                paper,
                'flex flex-col gap-1 rounded-[24px] p-2.5 shadow-xs transition-colors focus-within:border-text-primary/25'
              )
          )}
        >
          {bar ? (
            <div className="flex min-w-0 items-end gap-0.5 py-1.5 pr-1.5 pl-2">
              <div className="flex shrink-0 items-center gap-0.5">
                <ModeMenu mode={mode} onModeChange={onModeChange} compact />
                {settingsMenu}
              </div>
              <div className="min-w-0 flex-1 px-2 py-1">{textarea}</div>
              {trailing}
              {sendButton}
            </div>
          ) : (
            <>
              <div className="px-2 pt-1">{textarea}</div>
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled
                    aria-label="Thêm ảnh vào yêu cầu"
                    title="Sắp có"
                    className={composerTool}
                  >
                    <Gallery size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-label="Đính kèm tệp (chưa hỗ trợ)"
                    title="Đính kèm tệp (chưa hỗ trợ)"
                    className={composerTool}
                  >
                    <Paperclip2 size={16} aria-hidden />
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
                  <ModeMenu mode={mode} onModeChange={onModeChange} />
                  {settingsMenu}
                </div>
                {sendButton}
              </div>
            </>
          )}
        </ComposerPrimitive.Root>
      </div>
    </div>
  )
}

function ModeMenu({
  mode,
  onModeChange,
  compact = false,
}: {
  mode: AiAssistantMode
  onModeChange: (mode: AiAssistantMode) => void
  /** Only the mode's icon, as the bar shows it. */
  compact?: boolean
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
        className={cn(composerChip, 'gap-1')}
      >
        <ActiveIcon
          size={14}
          strokeWidth={1.7}
          aria-hidden
          className={cn('shrink-0', mode !== 'ask' && 'text-primary-text')}
        />
        {/* Ask has no settings chip beside it, so its label always fits. */}
        <span
          className={cn(
            'min-w-0 truncate',
            compact ? 'sr-only' : mode !== 'ask' && '@max-xs:hidden'
          )}
        >
          {active.label}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={1.8}
          aria-hidden
          className={cn('shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Chế độ trả lời"
          className={cn(menuAt(compact), 'max-w-[328px] p-1.5')}
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
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors outline-none hover:bg-text-primary/[0.05] focus-visible:ring-1 focus-visible:ring-text-primary/25 dark:hover:bg-text-primary/[0.08]"
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-xl',
                    selected
                      ? 'bg-badge-primary-background text-primary-text'
                      : 'bg-text-primary/[0.05] text-text-tertiary'
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
                  <Check size={15} strokeWidth={2.2} aria-hidden className="shrink-0 text-text-primary" />
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
 * One line telling the current compose settings, e.g. "10 câu · VACT 2025 · Dùng lại 20% · Lời giải gọn". The count is
 * the one the typed words ask for when they name one: that is what the run will write. The bank paper of "Mô phỏng
 * đề" is left out: the sources block above the composer already shows it.
 */
function settingsSummary(
  mode: Exclude<AiAssistantMode, 'ask'>,
  settings: AiComposeSettings,
  typedCount: number | null
) {
  const count = typedCount
    ? `${typedCount} câu`
    : (labelOf(mode === 'compose' ? COMPOSE_COUNTS : MOCK_COUNTS, String(settings.questionCount)) ??
      (typeof settings.questionCount === 'number' ? `${settings.questionCount} câu` : undefined))
  const format = mode === 'compose' ? labelOf(EXAM_FORMATS, settings.examFormat) : undefined
  const reuse =
    settings.bankRatio > 0 ? `Dùng lại ${Math.round(settings.bankRatio * 100)}%` : 'Không dùng lại'
  const solution = labelOf(SOLUTION_STYLES, settings.solutionStyle)
  return [count, format, reuse, solution && `Lời giải ${solution.toLowerCase()}`]
    .filter(Boolean)
    .join(' · ')
}

/**
 * The settings a request rarely says in words, behind one small chip of the composer. The chip's title sums up what
 * the run will use, the count the words ask for included.
 */
function SettingsMenu({
  summary,
  missing,
  hasError,
  compact = false,
  children,
}: {
  summary: string
  missing: boolean
  hasError: boolean
  /** Only the icon, as the bar shows it. */
  compact?: boolean
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
        aria-label="Tùy chọn"
        title={summary || 'Tùy chọn'}
        onClick={() => setOpen((value) => !value)}
        className={cn(composerChip, 'gap-1', attention && 'text-danger hover:text-danger')}
      >
        <Filter
          size={14}
          strokeWidth={1.7}
          aria-hidden
          className={cn('shrink-0', !compact && '@max-sm:hidden')}
        />
        <span className={cn('min-w-0 truncate', compact && 'sr-only')}>
          {missing ? 'Chọn cấu hình đề' : 'Tùy chọn'}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={1.8}
          aria-hidden
          className={cn('shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        // The selects inside portal their option lists into this box, so picking one is not a click outside.
        <div
          role="dialog"
          aria-label="Tùy chọn"
          data-select-portal=""
          className={cn(menuAt(compact), 'max-w-[360px] p-2')}
        >
          {children}
        </div>
      )}
    </div>
  )
}

import { cn } from '../../../lib/cn'
import Button from '../../console/button'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  Layers,
  List,
  LoaderCircle,
  Pencil,
  Sparkles,
  SquarePen,
  type LucideIcon,
} from '../../console/icons'
import { useExamDoc, type SaveState } from './exam-doc-context'
import DocMenubar from './menubar/DocMenubar'

interface DocHeaderProps {
  title: string
  editable: boolean
  onTitleChange: (title: string) => void
  onBack: () => void
  backHref: string
  chatOpen: boolean
  onToggleChat: () => void
  outlineOpen: boolean
  onToggleOutline: () => void
  onNew: () => void
}

const PRESSED_CLASS = 'border-primary-text/30 bg-badge-primary-background text-primary-text'
/** Why "Mã đề" is off in the structured mode. */
const FREE_MODE_ONLY = 'Chỉ có ở chế độ Văn bản tự do'

const SAVE_STATES: Record<SaveState, { label: string; icon: LucideIcon; iconClass: string }> = {
  saved: { label: 'Đã lưu', icon: Check, iconClass: 'text-success-500' },
  saving: {
    label: 'Đang lưu…',
    icon: LoaderCircle,
    iconClass: 'text-icon-tertiary motion-safe:animate-spin',
  },
  unsaved: { label: 'Chưa lưu', icon: Pencil, iconClass: 'text-icon-tertiary' },
  error: { label: 'Chưa lưu được', icon: AlertCircle, iconClass: 'text-error-500' },
  conflict: { label: 'Có bản mới hơn', icon: AlertTriangle, iconClass: 'text-warning-500' },
}

/** `error`: why the last save failed, shown as the tooltip of "Chưa lưu được". */
function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  const { label, icon: Icon, iconClass } = SAVE_STATES[state]
  return (
    <span
      role="status"
      title={state === 'error' ? (error ?? undefined) : undefined}
      className="inline-flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-text-tertiary"
    >
      <Icon aria-hidden size={13} className={cn('shrink-0', iconClass)} />
      {label}
    </span>
  )
}

/** Editor header: back link, logo, title with save state, the menubar, and the panel toggles. */
export default function DocHeader({
  title,
  editable,
  onTitleChange,
  onBack,
  backHref,
  chatOpen,
  onToggleChat,
  outlineOpen,
  onToggleOutline,
  onNew,
}: DocHeaderProps) {
  const { saveState, saveError, loading, mode, sourceEditor, variantsOpen, setVariantsOpen } =
    useExamDoc()
  const structured = mode === 'STRUCTURED'

  function commitTitle(value: string) {
    if (!editable) return
    const next = value.trim()
    if (!next || next === title) return
    onTitleChange(next)
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 bg-card-background px-2 sm:gap-2 sm:px-3">
      <a
        href={backHref}
        onClick={(event) => {
          event.preventDefault()
          onBack()
        }}
        aria-label="Về bảng điều khiển"
        title="Về bảng điều khiển"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
      >
        <ArrowLeft size={17} strokeWidth={1.7} className="shrink-0" />
      </a>
      <span aria-hidden className="hidden h-6 w-px shrink-0 bg-card-border sm:block" />
      <img
        src="/hocluc-mark.svg"
        alt=""
        aria-hidden
        width={23}
        height={30}
        className="hidden shrink-0 sm:block"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex min-w-0 items-center gap-2">
          <input
            key={title}
            defaultValue={title}
            disabled={!editable}
            onBlur={(event) => commitTitle(event.currentTarget.value)}
            onKeyDown={(event) => {
              // Enter or Escape that ends an IME composition (Vietnamese Telex…) belongs to the IME; Safari
              // reports that Enter with keyCode 229 only.
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
              if (event.key === 'Escape') {
                event.currentTarget.value = title
                event.currentTarget.blur()
              }
            }}
            aria-label="Tên đề thi"
            title="Tên đề thi"
            placeholder="Đề thi mới"
            className="h-7 max-w-[min(420px,100%)] min-w-[8ch] rounded-md border border-transparent bg-transparent px-2 text-[15px] font-medium text-text-primary outline-none field-sizing-content placeholder:text-text-tertiary hover:border-card-border focus:border-input-primary-focus-border focus:bg-input-background disabled:hover:border-transparent"
          />
          {!loading && <SaveIndicator state={saveState} error={saveError} />}
        </div>
        <DocMenubar
          onNew={onNew}
          outlineOpen={outlineOpen}
          onToggleOutline={onToggleOutline}
          chatOpen={chatOpen}
          onToggleChat={onToggleChat}
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button
          appearance="ghost"
          size="sm"
          onClick={onNew}
          aria-label="Đề mới"
          title="Đề mới"
          className="hidden sm:inline-flex"
        >
          <SquarePen size={15} />
          <span className="hidden lg:inline">Đề mới</span>
        </Button>
        <Button
          appearance={outlineOpen ? 'outline' : 'ghost'}
          size="sm"
          aria-pressed={outlineOpen}
          onClick={onToggleOutline}
          aria-label="Mục lục"
          title="Mục lục"
          className={cn(outlineOpen && PRESSED_CLASS)}
        >
          <List size={15} />
          <span className="hidden lg:inline">Mục lục</span>
        </Button>
        <Button
          appearance={variantsOpen ? 'outline' : 'ghost'}
          size="sm"
          aria-pressed={variantsOpen}
          disabled={!sourceEditor || structured}
          onClick={() => setVariantsOpen(!variantsOpen)}
          aria-label="Tạo nhiều mã đề"
          title={structured ? FREE_MODE_ONLY : 'Mã đề'}
          // Pointer events stay on while disabled so the title says why.
          className={cn(
            'disabled:pointer-events-auto disabled:cursor-not-allowed',
            variantsOpen && PRESSED_CLASS
          )}
        >
          <Layers size={15} />
          <span className="hidden md:inline">Mã đề</span>
        </Button>
        <Button
          appearance={chatOpen ? 'outline' : 'ghost'}
          size="sm"
          aria-pressed={chatOpen}
          onClick={onToggleChat}
          aria-label="Hỏi AI"
          title="Hỏi AI"
          className={cn(chatOpen && PRESSED_CLASS)}
        >
          <Sparkles size={15} />
          <span className="hidden md:inline">Hỏi AI</span>
        </Button>
      </div>
    </header>
  )
}

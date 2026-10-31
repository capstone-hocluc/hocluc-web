import { cn } from '../../../lib/cn'
import Button from '../../console/button'
import { ArrowLeft, FileText, List, Sparkles } from '../../console/icons'
import Status from '../../console/status'

interface ExamTopBarProps {
  title: string
  dirty: boolean
  onTitleChange: (title: string) => void
  onBack: () => void
  backHref: string
  chatOpen: boolean
  onToggleChat: () => void
  outlineOpen: boolean
  onToggleOutline: () => void
}

export default function ExamTopBar({
  title,
  dirty,
  onTitleChange,
  onBack,
  backHref,
  chatOpen,
  onToggleChat,
  outlineOpen,
  onToggleOutline,
}: ExamTopBarProps) {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-1.5 border-b border-card-border bg-card-background px-2 sm:px-3">
      <a
        href={backHref}
        onClick={(event) => {
          event.preventDefault()
          onBack()
        }}
        aria-label="Về bảng điều khiển"
        title="Về bảng điều khiển"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm text-text-secondary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
      >
        <ArrowLeft size={17} strokeWidth={1.7} className="shrink-0 text-icon-tertiary" />
        <span className="hidden sm:inline">Bảng điều khiển</span>
      </a>
      <span aria-hidden className="hidden h-5 w-px shrink-0 bg-card-border sm:block" />

      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        aria-label="Tên đề thi"
        placeholder="Đề thi mới"
        className="h-9 min-w-0 max-w-[380px] flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:bg-background-gray-secondary focus:border-input-primary-focus-border focus:bg-input-background"
      />
      <span className="hidden shrink-0 text-xs text-text-tertiary md:inline">
        {dirty ? 'Chưa lưu' : 'Bản nháp'}
      </span>
      <Status tone="info" className="hidden lg:inline-flex">
        Bản xem trước giao diện
      </Status>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button
          appearance="outline"
          size="sm"
          disabled
          title="Chưa nối máy chủ"
          className="hidden sm:inline-flex"
        >
          <FileText size={15} />
          Xuất đề
        </Button>
        <Button
          appearance={chatOpen ? 'outline' : 'ghost'}
          size="sm"
          aria-pressed={chatOpen}
          onClick={onToggleChat}
          title="Hỏi AI"
          className={cn(chatOpen && 'border-primary-text/30 bg-badge-primary-background text-primary-text')}
        >
          <Sparkles size={15} />
          <span className="hidden md:inline">Hỏi AI</span>
        </Button>
        <Button
          appearance={outlineOpen ? 'outline' : 'ghost'}
          size="sm"
          aria-pressed={outlineOpen}
          onClick={onToggleOutline}
          title="Mục lục"
          className={cn(outlineOpen && 'border-primary-text/30 bg-badge-primary-background text-primary-text')}
        >
          <List size={15} />
          <span className="hidden md:inline">Mục lục</span>
        </Button>
      </div>
    </header>
  )
}

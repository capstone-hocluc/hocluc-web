// The workspace's left panel, laid out like a word processor's document tabs: every exam being composed and every
// paper loaded into the bank, newest first, with the open one lit and its outline (sections, parts, questions)
// hanging under it. The exam templates are a second tab of the free document.
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { cn } from '../../../lib/cn'
import type { AiConversation } from '../../../services/aiAssistantService'
import type { BankIngestStatus, BankSource } from '../../../services/questionBankService'
import { Check, ChevronLeft, ClipboardList, FileText, Pencil, Plus, Trash2, X } from '../../console/icons'
import Status, { type StatusTone } from '../../console/status'
import { Skeleton } from '../../tailgrids/core/skeleton'
import ScrollArea from '../../ui/ScrollArea'
import { TreeRow } from '../exam-doc/doc-tree'

const ICON_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'
const ROW_ACTION =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-icon-tertiary transition-colors hover:bg-card-background hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'
const TAB_CLASS =
  'inline-flex h-8 flex-1 items-center justify-center rounded-lg px-3 text-[13px] font-medium text-text-secondary transition-colors outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border data-[state=active]:bg-card-background data-[state=active]:text-primary-text data-[state=active]:shadow-xs'

const PAPER_STATUS: Record<BankIngestStatus, { label: string; tone: StatusTone } | null> = {
  PENDING: { label: 'Đang chờ', tone: 'neutral' },
  RUNNING: { label: 'Đang đọc', tone: 'info' },
  DONE: null,
  FAILED: { label: 'Lỗi', tone: 'danger' },
}

/** One exam of the list: being composed, or a paper loaded into the bank. */
type Entry =
  | { kind: 'conversation'; id: string; title: string; at: string }
  | { kind: 'paper'; id: string; title: string; at: string; paper: BankSource }

interface WorkspaceTreeProps {
  conversations: readonly AiConversation[]
  /** Papers loaded into the bank, listed with the exams and opened read-only. */
  papers?: readonly BankSource[]
  /** The open exam: a conversation, or a paper when `activePaperId` is set. */
  activeId: string | null
  activePaperId?: string | null
  loading: boolean
  /** The open exam's outline, shown under it. */
  outline?: ReactNode
  /** Content of the "Mẫu đề thi" tab; without it the panel has no tabs. */
  templates?: ReactNode
  onSelect: (id: string) => void
  onSelectPaper?: (id: string) => void
  onNew: () => void
  /** Given when the viewer may load a paper. */
  onImport?: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onCollapse?: () => void
  onClose?: () => void
  className?: string
  style?: CSSProperties
}

export default function WorkspaceTree({
  conversations,
  papers = [],
  activeId,
  activePaperId = null,
  loading,
  outline,
  templates,
  onSelect,
  onSelectPaper,
  onNew,
  onImport,
  onRename,
  onDelete,
  onCollapse,
  onClose,
  className = '',
  style,
}: WorkspaceTreeProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  // The open exam's outline can be folded away, as a document tab's headings can.
  const [outlineFolded, setOutlineFolded] = useState(false)

  const entries = useMemo(() => {
    const list: Entry[] = [
      ...conversations.map((item): Entry => ({ kind: 'conversation', id: item.id, title: item.title, at: item.updatedAt })),
      ...papers.map((paper): Entry => ({ kind: 'paper', id: paper.id, title: paper.title, at: paper.finishedAt ?? paper.createdAt ?? '', paper })),
    ]
    return list.sort((a, b) => b.at.localeCompare(a.at))
  }, [conversations, papers])

  const openKey = activePaperId ? `paper:${activePaperId}` : activeId ? `conversation:${activeId}` : null
  // A new exam not saved yet has no row: its outline is listed on its own.
  const unsavedOpen = openKey === null || !entries.some((entry) => `${entry.kind}:${entry.id}` === openKey)

  function commitRename() {
    if (!editingId) return
    const next = editingTitle.trim()
    if (next) onRename(editingId, next)
    setEditingId(null)
  }

  const tree = (
    <ScrollArea className="h-full">
      <ul aria-label="Đề của tôi" className="flex flex-col gap-0.5 px-2 py-2">
        {unsavedOpen && outline && (
          <li>
            <TreeRow depth={0} label="Đề thi mới" current expanded={!outlineFolded} onToggle={() => setOutlineFolded((value) => !value)} />
            {!outlineFolded && outline}
          </li>
        )}
        {loading && (
          <li aria-hidden className="space-y-1.5 px-2 pt-1">
            <Skeleton className="h-7 w-full rounded-full" />
            <Skeleton className="h-7 w-11/12 rounded-full" />
            <Skeleton className="h-7 w-full rounded-full" />
          </li>
        )}
        {!loading &&
          entries.map((entry) => {
            const key = `${entry.kind}:${entry.id}`
            const open = key === openKey
            if (entry.kind === 'conversation' && editingId === entry.id) {
              return (
                <li key={key}>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      commitRename()
                    }}
                    className="flex items-center gap-1 rounded-full px-2 py-1"
                  >
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') setEditingId(null)
                      }}
                      aria-label="Tên đề"
                      className="h-7 min-w-0 flex-1 rounded-md border border-input-primary-focus-border bg-input-background px-2 text-[13px] text-text-primary outline-none"
                    />
                    <button type="submit" aria-label="Lưu tên" title="Lưu tên" className={ROW_ACTION}>
                      <Check size={13} strokeWidth={2} />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} aria-label="Huỷ đổi tên" title="Huỷ" className={ROW_ACTION}>
                      <X size={13} strokeWidth={2} />
                    </button>
                  </form>
                </li>
              )
            }
            const status = entry.kind === 'paper' ? PAPER_STATUS[entry.paper.status] : null
            return (
              <li key={key}>
                <TreeRow
                  depth={0}
                  label={entry.title || 'Đề thi mới'}
                  icon={entry.kind === 'paper' ? ClipboardList : FileText}
                  current={open}
                  expanded={open && outline ? !outlineFolded : undefined}
                  onToggle={() => setOutlineFolded((value) => !value)}
                  onClick={() => {
                    setOutlineFolded(false)
                    if (entry.kind === 'paper') onSelectPaper?.(entry.id)
                    else onSelect(entry.id)
                  }}
                  trailing={
                    entry.kind === 'paper' ? (
                      status ? (
                        <Status tone={status.tone}>{status.label}</Status>
                      ) : (
                        <span className="shrink-0 pr-1 text-[11px] text-text-tertiary">Nạp đề</span>
                      )
                    ) : (
                      <span className="hidden shrink-0 items-center group-hover/row:flex focus-within:flex">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(entry.id)
                            setEditingTitle(entry.title)
                          }}
                          aria-label={`Đổi tên ${entry.title}`}
                          title="Đổi tên"
                          className={ROW_ACTION}
                        >
                          <Pencil size={13} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(entry.id)}
                          aria-label={`Xoá ${entry.title}`}
                          title="Xoá"
                          className={cn(ROW_ACTION, 'hover:text-badge-error-text')}
                        >
                          <Trash2 size={13} strokeWidth={1.8} />
                        </button>
                      </span>
                    )
                  }
                />
                {open && outline && !outlineFolded && outline}
              </li>
            )
          })}
        {!loading && entries.length === 0 && !outline && (
          <li className="px-3 py-2 text-xs text-text-tertiary">Chưa có đề nào</li>
        )}
      </ul>
    </ScrollArea>
  )

  return (
    <aside aria-label="Mục lục đề thi" className={cn('flex-col bg-card-background', className)} style={style}>
      <header className="flex h-12 shrink-0 items-center gap-1 pr-2 pl-4">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">Đề của tôi</h2>
        <button type="button" onClick={onNew} aria-label="Cuộc trò chuyện mới" title="Đề mới" className={ICON_BUTTON}>
          <Plus size={17} strokeWidth={1.8} />
        </button>
        {onImport && (
          <button type="button" onClick={onImport} aria-label="Nạp đề vào kho" title="Nạp đề" className={ICON_BUTTON}>
            <ClipboardList size={16} />
          </button>
        )}
        {onCollapse && (
          <button type="button" onClick={onCollapse} aria-label="Thu gọn mục lục" title="Thu gọn mục lục" className={ICON_BUTTON}>
            <ChevronLeft size={17} strokeWidth={1.7} />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Đóng mục lục" title="Đóng mục lục" className={ICON_BUTTON}>
            <X size={17} strokeWidth={1.7} />
          </button>
        )}
      </header>

      {templates ? (
        <Tabs.Root defaultValue="exams" className="flex min-h-0 flex-1 flex-col">
          <Tabs.List aria-label="Tài liệu" className="mx-3 flex shrink-0 gap-1 rounded-xl bg-background-gray-secondary p-1">
            <Tabs.Trigger value="exams" title="Đề và mục lục" className={TAB_CLASS}>
              Mục lục
            </Tabs.Trigger>
            <Tabs.Trigger value="templates" title="Mẫu đề thi" className={TAB_CLASS}>
              Mẫu đề thi
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="exams" className="min-h-0 flex-1 outline-none">
            {tree}
          </Tabs.Content>
          <Tabs.Content value="templates" className="min-h-0 flex-1 outline-none">
            <ScrollArea className="h-full">{templates}</ScrollArea>
          </Tabs.Content>
        </Tabs.Root>
      ) : (
        <div className="min-h-0 flex-1">{tree}</div>
      )}
    </aside>
  )
}

// The workspace's left panel, laid out like a word processor's document tabs: every exam being composed and every
// paper loaded into the bank, in groups that fold (drafts, exams that went out through "Xuất bản", loaded papers),
// with the open one lit. Each exam's menu copies its link or unfolds its outline under it (a double click does too).
// The viewer picks the groups shown and the order. The exam templates are a second tab of the free document.
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import * as Tabs from '@radix-ui/react-tabs'
import { cn } from '../../../lib/cn'
import { showErrorToast, showSuccessToast } from '../../../lib/toastBus'
import type { AiConversation, AiPublishedAs } from '../../../services/aiAssistantService'
import type { BankIngestStatus, BankSource } from '../../../services/questionBankService'
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  FileText,
  List,
  ListTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2,
  X,
} from '../../console/icons'
import Status, { type StatusTone } from '../../console/status'
import { Skeleton } from '../../tailgrids/core/skeleton'
import ScrollArea from '../../ui/ScrollArea'
import { TreeRow } from '../exam-doc/doc-tree'
import {
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
} from '../exam-doc/menubar/menu-ui'
import { EXAM_GROUPS, useExamListPrefs, type ExamGroup, type ExamSort } from './use-exam-list-prefs'

const ICON_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'
const ROW_ACTION =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-icon-tertiary transition-colors hover:bg-card-background hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'
const TAB_CLASS =
  'inline-flex h-7 min-w-0 items-center justify-center truncate rounded-lg px-2.5 text-[13px] font-medium text-text-secondary transition-colors outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border data-[state=active]:bg-card-background data-[state=active]:text-primary-text data-[state=active]:shadow-xs'

const PAPER_STATUS: Record<BankIngestStatus, { label: string; tone: StatusTone } | null> = {
  PENDING: { label: 'Đang chờ', tone: 'neutral' },
  RUNNING: { label: 'Đang đọc', tone: 'info' },
  DONE: null,
  FAILED: { label: 'Lỗi', tone: 'danger' },
}

const GROUP_LABEL: Record<ExamGroup, string> = {
  draft: 'Bản nháp',
  published: 'Đã xuất bản',
  papers: 'Đề nạp vào kho',
}

const PUBLISHED_AS: Record<AiPublishedAs, string> = {
  QUIZ: 'Quiz',
  EXAM: 'Đề thi thử',
  DOCX: 'Word',
  PDF: 'PDF',
}

/**
 * The button at the top left of the sheet that brings the list back once it is put away. While the list is open it
 * shows only where the list is a sheet (narrow screens), since beside the paper the list is then in view.
 */
export function ShowExamListButton({
  listOpen,
  onClick,
}: {
  listOpen: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Hiện danh sách đề"
      title="Hiện danh sách đề"
      className={cn(
        ICON_BUTTON,
        'absolute top-2 left-2 z-30 print:hidden',
        listOpen && 'xl:hidden'
      )}
    >
      <List size={18} strokeWidth={1.8} />
    </button>
  )
}

/** One exam of the list: being composed (a draft, or gone out), or a paper loaded into the bank. */
type Entry =
  | {
      kind: 'conversation'
      id: string
      title: string
      at: string
      group: 'draft' | 'published'
      publishedAs: AiPublishedAs | null
    }
  | { kind: 'paper'; id: string; title: string; at: string; group: 'papers'; paper: BankSource }

/** The new exam not saved yet: its outline is kept under this key. */
const UNSAVED_KEY = 'conversation:new'

/** The workspace's address opening this exam (?c=<id>) or paper (?paper=<id>), copied for the viewer to share. */
function copyLink(entry: Entry) {
  const url = new URL(window.location.href)
  url.searchParams.delete('c')
  url.searchParams.delete('paper')
  url.searchParams.set(entry.kind === 'paper' ? 'paper' : 'c', entry.id)
  url.hash = ''
  if (!navigator.clipboard) {
    showErrorToast('Trình duyệt không cho sao chép, hãy sao chép từ thanh địa chỉ')
    return
  }
  navigator.clipboard.writeText(url.toString()).then(
    () => showSuccessToast('Đã sao chép đường liên kết'),
    () => showErrorToast('Không sao chép được đường liên kết')
  )
}

interface RowMenuProps {
  title: string
  /** The open exam's row keeps the button in view. */
  current: boolean
  outlineShown: boolean
  onCopyLink: () => void
  /** Left out where the list has no outlines to show. */
  onToggleOutline?: () => void
  onRename?: () => void
  onDelete?: () => void
}

/** The "⋮" of an exam's row, shown on hover as a document tab's is. */
function RowMenu({
  title,
  current,
  outlineShown,
  onCopyLink,
  onToggleOutline,
  onRename,
  onDelete,
}: RowMenuProps) {
  // Renaming swaps the row for a field and deleting opens a dialog: either takes the focus, so the menu leaves it there.
  const handedOff = useRef(false)
  const handOff = (action: () => void) => () => {
    handedOff.current = true
    action()
  }
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        <button
          type="button"
          aria-label={`Tùy chọn ${title}`}
          title="Tùy chọn"
          className={cn(
            ROW_ACTION,
            !current &&
              'hidden group-focus-within/row:inline-flex group-hover/row:inline-flex data-[state=open]:inline-flex pointer-coarse:inline-flex'
          )}
        >
          <MoreHorizontal size={15} className="rotate-90" />
        </button>
      </Menu.Trigger>
      <MenuContent
        align="start"
        onCloseAutoFocus={(event) => {
          if (handedOff.current) event.preventDefault()
          handedOff.current = false
        }}
      >
        {onRename && <MenuItem label="Đổi tên" icon={Pencil} onSelect={handOff(onRename)} />}
        <MenuItem label="Sao chép đường liên kết" icon={Copy} onSelect={onCopyLink} />
        {onToggleOutline && (
          <MenuItem
            label={outlineShown ? 'Ẩn bố cục' : 'Hiện bố cục'}
            icon={ListTree}
            onSelect={onToggleOutline}
          />
        )}
        {onDelete && (
          <>
            <MenuSeparator />
            <MenuItem label="Xoá" icon={Trash2} onSelect={handOff(onDelete)} />
          </>
        )}
      </MenuContent>
    </Menu.Root>
  )
}

interface WorkspaceTreeProps {
  conversations: readonly AiConversation[]
  /** Papers loaded into the bank, listed with the exams and opened read-only. */
  papers?: readonly BankSource[]
  /** The open exam: a conversation, or a paper when `activePaperId` is set. */
  activeId: string | null
  activePaperId?: string | null
  loading: boolean
  /** Content of the "Mẫu đề thi" tab; without it the panel has no tabs. */
  templates?: ReactNode
  onSelect: (id: string) => void
  onSelectPaper?: (id: string) => void
  /** Starts a new exam, listed first among the drafts until it is saved. */
  onNew: () => void
  /** The viewer may load papers: their group is listed even while it is empty. */
  canImport?: boolean
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  /** The open exam's outline (headings and questions), unfolded under its row on request. */
  outline?: ReactNode
  /** Rows whose outline the viewer unfolded, by `kind:id`; kept by the workspace across its views. */
  outlined?: ReadonlySet<string>
  onOutlineChange?: (key: string, shown: boolean) => void
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
  templates,
  onSelect,
  onSelectPaper,
  onNew,
  canImport = false,
  onRename,
  onDelete,
  outline,
  outlined,
  onOutlineChange,
  onCollapse,
  onClose,
  className = '',
  style,
}: WorkspaceTreeProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const { prefs, toggleHidden, toggleFolded, setSort } = useExamListPrefs()

  const entries = useMemo(() => {
    const list: Entry[] = [
      ...conversations.map((item): Entry => ({
        kind: 'conversation',
        id: item.id,
        title: item.title,
        at: item.updatedAt,
        group: item.publishedAt ? 'published' : 'draft',
        publishedAs: item.publishedAs ?? null,
      })),
      ...papers.map((paper): Entry => ({
        kind: 'paper',
        id: paper.id,
        title: paper.title,
        at: paper.finishedAt ?? paper.createdAt ?? '',
        group: 'papers',
        paper,
      })),
    ]
    return prefs.sort === 'name'
      ? list.sort((a, b) => (a.title || 'Đề thi mới').localeCompare(b.title || 'Đề thi mới', 'vi'))
      : list.sort((a, b) => b.at.localeCompare(a.at))
  }, [conversations, papers, prefs.sort])

  const openKey = activePaperId
    ? `paper:${activePaperId}`
    : activeId
      ? `conversation:${activeId}`
      : null
  const openEntry = entries.find((entry) => `${entry.kind}:${entry.id}` === openKey)
  // A new exam not saved yet has no row of its own: it is listed first among the drafts.
  const unsavedOpen = !loading && !openEntry && !activePaperId && !activeId
  const openGroup: ExamGroup | null = openEntry?.group ?? (unsavedOpen ? 'draft' : null)

  // When the open exam lands in a folded group (it was opened or just published), the group shows it for this visit
  // without changing the fold the viewer keeps.
  const [lastOpenGroup, setLastOpenGroup] = useState(openGroup)
  const [revealed, setRevealed] = useState<ExamGroup | null>(null)
  if (openGroup !== lastOpenGroup) {
    setLastOpenGroup(openGroup)
    setRevealed(openGroup)
  }
  const isExpanded = (group: ExamGroup) => !prefs.folded.includes(group) || revealed === group
  function toggleGroup(group: ExamGroup) {
    if (revealed === group) {
      // The viewer folds a group shown only for the open exam: it goes back to the fold kept.
      setRevealed(null)
      if (!prefs.folded.includes(group)) toggleFolded(group)
    } else {
      toggleFolded(group)
    }
  }

  // Loaded papers are only a group for a viewer who has some or may load one.
  const listedGroups = EXAM_GROUPS.filter(
    (group) => group !== 'papers' || papers.length > 0 || canImport
  )
  const shownGroups = listedGroups.filter((group) => !prefs.hidden.includes(group))
  // Drafts always show (the new exam and the empty list live there); another group only when it has exams.
  const drawnGroups = shownGroups.filter(
    (group) => group === 'draft' || entries.some((entry) => entry.group === group)
  )

  const canOutline = Boolean(outline && onOutlineChange)
  const isOutlined = (key: string) => canOutline && (outlined?.has(key) ?? false)

  function commitRename() {
    if (!editingId) return
    const next = editingTitle.trim()
    if (next) onRename(editingId, next)
    setEditingId(null)
  }

  function renderEntry(entry: Entry) {
    const key = `${entry.kind}:${entry.id}`
    if (entry.kind === 'conversation' && editingId === entry.id) {
      return (
        <li key={key}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              commitRename()
            }}
            className="flex items-center gap-1 rounded-full py-1 pr-2 pl-11"
          >
            <input
              autoFocus
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setEditingId(null)
              }}
              aria-label="Tên đề"
              className="h-8 min-w-0 flex-1 rounded-md border border-input-primary-focus-border bg-input-background px-2 text-sm text-text-primary outline-none"
            />
            <button type="submit" aria-label="Lưu tên" title="Lưu tên" className={ROW_ACTION}>
              <Check size={13} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              aria-label="Huỷ đổi tên"
              title="Huỷ"
              className={ROW_ACTION}
            >
              <X size={13} strokeWidth={2} />
            </button>
          </form>
        </li>
      )
    }
    const status = entry.kind === 'paper' ? PAPER_STATUS[entry.paper.status] : null
    const current = key === openKey
    const outlineShown = current && isOutlined(key)
    const open = () => {
      if (current) return
      if (entry.kind === 'paper') onSelectPaper?.(entry.id)
      else onSelect(entry.id)
    }
    // Showing another exam's outline opens that exam: the outline is read from the open sheet.
    const showOutline = (shown: boolean) => {
      if (shown) open()
      onOutlineChange?.(key, shown)
    }
    return (
      <li key={key}>
        <TreeRow
          depth={1}
          label={entry.title || 'Đề thi mới'}
          icon={entry.kind === 'paper' ? ClipboardList : FileText}
          current={current}
          expanded={current && canOutline ? outlineShown : undefined}
          onToggle={() => showOutline(!outlineShown)}
          onClick={open}
          onDoubleClick={canOutline ? () => showOutline(!outlineShown) : undefined}
          trailing={
            <>
              {entry.kind === 'paper'
                ? // A paper read to the end needs no tag: its group says what it is.
                  status && <Status tone={status.tone}>{status.label}</Status>
                : entry.publishedAs && (
                    <span className="shrink-0 pr-1 text-xs text-text-tertiary">
                      {PUBLISHED_AS[entry.publishedAs]}
                    </span>
                  )}
              <RowMenu
                title={entry.title || 'Đề thi mới'}
                current={current}
                outlineShown={outlineShown}
                onCopyLink={() => copyLink(entry)}
                onToggleOutline={canOutline ? () => showOutline(!outlineShown) : undefined}
                onRename={
                  entry.kind === 'conversation'
                    ? () => {
                        setEditingId(entry.id)
                        setEditingTitle(entry.title)
                      }
                    : undefined
                }
                onDelete={entry.kind === 'conversation' ? () => onDelete(entry.id) : undefined}
              />
            </>
          }
        />
        {outlineShown && outline}
      </li>
    )
  }

  const tree = (
    <ScrollArea className="h-full">
      <ul aria-label="Đề của tôi" className="flex flex-col gap-0.5 px-2 py-2">
        {loading && (
          <li aria-hidden className="space-y-1.5 px-2 pt-1">
            <Skeleton className="h-9 w-full rounded-full" />
            <Skeleton className="h-9 w-11/12 rounded-full" />
            <Skeleton className="h-9 w-full rounded-full" />
          </li>
        )}
        {!loading && drawnGroups.length === 0 && (
          <li className="px-3 py-1.5 text-xs text-text-tertiary">Chưa có đề nào</li>
        )}
        {!loading &&
          drawnGroups.map((group) => {
            const members = entries.filter((entry) => entry.group === group)
            const drafts = group === 'draft'
            const expanded = isExpanded(group)
            return (
              <li key={group}>
                <TreeRow
                  depth={0}
                  label={GROUP_LABEL[group]}
                  icon={null}
                  expanded={expanded}
                  onToggle={() => toggleGroup(group)}
                  onClick={() => toggleGroup(group)}
                  trailing={
                    <span
                      aria-hidden
                      className="shrink-0 pr-2 text-xs text-text-tertiary tabular-nums"
                    >
                      {members.length}
                    </span>
                  }
                />
                {expanded && (
                  <ul aria-label={GROUP_LABEL[group]} className="flex flex-col gap-0.5">
                    {drafts && unsavedOpen && (
                      <li>
                        <TreeRow
                          depth={1}
                          label="Đề thi mới"
                          current
                          expanded={canOutline ? isOutlined(UNSAVED_KEY) : undefined}
                          onToggle={() => onOutlineChange?.(UNSAVED_KEY, !isOutlined(UNSAVED_KEY))}
                          onDoubleClick={
                            canOutline
                              ? () => onOutlineChange?.(UNSAVED_KEY, !isOutlined(UNSAVED_KEY))
                              : undefined
                          }
                        />
                        {isOutlined(UNSAVED_KEY) && outline}
                      </li>
                    )}
                    {members.map(renderEntry)}
                  </ul>
                )}
              </li>
            )
          })}
      </ul>
    </ScrollArea>
  )

  // Beside the list as in a word processor's tabs panel: add an exam, arrange the list.
  const actions = (
    <>
      <button
        type="button"
        onClick={onNew}
        aria-label="Thêm đề"
        title="Thêm đề"
        className={ICON_BUTTON}
      >
        <Plus size={17} strokeWidth={1.8} />
      </button>
      <Menu.Root modal={false}>
        <Menu.Trigger asChild>
          <button
            type="button"
            aria-label="Tùy chỉnh danh sách"
            title="Tùy chỉnh danh sách"
            className={ICON_BUTTON}
          >
            <Settings size={16} />
          </button>
        </Menu.Trigger>
        <MenuContent align="end">
          <MenuLabel>Hiện nhóm</MenuLabel>
          {listedGroups.map((group) => {
            const shown = !prefs.hidden.includes(group)
            return (
              <MenuCheckboxItem
                key={group}
                label={GROUP_LABEL[group]}
                checked={shown}
                // The last group shown stays: the list never hides every exam.
                disabled={shown && shownGroups.length === 1}
                onCheckedChange={() => toggleHidden(group)}
                onSelect={(event) => event.preventDefault()}
              />
            )
          })}
          <MenuSeparator />
          <MenuLabel>Sắp xếp</MenuLabel>
          <MenuRadioGroup value={prefs.sort} onValueChange={(value) => setSort(value as ExamSort)}>
            <MenuRadioItem value="recent" label="Sửa gần nhất" />
            <MenuRadioItem value="name" label="Tên A–Z" />
          </MenuRadioGroup>
        </MenuContent>
      </Menu.Root>
    </>
  )
  const header = 'flex h-12 shrink-0 items-center gap-1 pr-2 pl-3'
  // The arrow that puts the panel away (folds it beside the sheet, or closes it as a sheet), alone on top.
  const hide = onCollapse ?? onClose
  const hideLabel = onCollapse ? 'Thu gọn danh sách đề' : 'Đóng danh sách đề'

  return (
    <aside
      aria-label="Danh sách đề"
      className={cn('flex-col bg-card-background', className)}
      style={style}
    >
      {hide && (
        <div className="flex h-12 shrink-0 items-center px-2">
          <button
            type="button"
            onClick={hide}
            aria-label={hideLabel}
            title={hideLabel}
            className={ICON_BUTTON}
          >
            <ArrowLeft size={18} strokeWidth={1.8} />
          </button>
        </div>
      )}
      {templates ? (
        // The tabs name the panel, so it carries no title of its own.
        <Tabs.Root defaultValue="exams" className="flex min-h-0 flex-1 flex-col">
          <header className={header}>
            <Tabs.List
              aria-label="Tài liệu"
              // Both tabs as wide as the longer name, as a segmented control is.
              className="mr-auto grid min-w-0 grid-cols-2 gap-1 rounded-xl bg-background-gray-secondary p-1"
            >
              <Tabs.Trigger value="exams" title="Đề của tôi" className={TAB_CLASS}>
                Đề
              </Tabs.Trigger>
              <Tabs.Trigger value="templates" title="Mẫu đề thi" className={TAB_CLASS}>
                Mẫu đề thi
              </Tabs.Trigger>
            </Tabs.List>
            {actions}
          </header>
          <Tabs.Content value="exams" className="min-h-0 flex-1 outline-none">
            {tree}
          </Tabs.Content>
          <Tabs.Content value="templates" className="min-h-0 flex-1 outline-none">
            <ScrollArea className="h-full">{templates}</ScrollArea>
          </Tabs.Content>
        </Tabs.Root>
      ) : (
        <>
          <header className={header}>
            <h2 className="min-w-0 flex-1 truncate pl-1 text-sm font-semibold text-text-primary">
              Đề của tôi
            </h2>
            {actions}
          </header>
          <div className="min-h-0 flex-1">{tree}</div>
        </>
      )}
    </aside>
  )
}

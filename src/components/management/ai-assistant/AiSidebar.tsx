import { useMemo, useState } from 'react'
import { cn } from '../../../lib/cn'
import type { AiConversation } from '../../../services/aiAssistantService'
import Button from '../../console/button'
import { Check, Pencil, Search, SquarePen, Trash2, X } from '../../console/icons'
import { Skeleton } from '../../tailgrids/core/skeleton'
import ScrollArea from '../../ui/ScrollArea'

const dayMonthFormat = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })

// Relative time, as DeepTutor's RecordTime renders it; the full timestamp stays on hover.
function relativeTime(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} ngày trước`
  return dayMonthFormat.format(new Date(iso))
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayGroup(iso: string) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000)
  if (days <= 0) return 'Hôm nay'
  if (days === 1) return 'Hôm qua'
  return 'Trước đó'
}

interface AiSidebarProps {
  conversations: readonly AiConversation[]
  activeId: string | null
  loading: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onClose: () => void
  className?: string
}

export default function AiSidebar({
  conversations,
  activeId,
  loading,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onClose,
  className = '',
}: AiSidebarProps) {
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi')
    const matched = needle
      ? conversations.filter((item) => item.title.toLocaleLowerCase('vi').includes(needle))
      : conversations
    const ordered = [...matched].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const sections: { label: string; items: AiConversation[] }[] = []
    for (const item of ordered) {
      const label = dayGroup(item.updatedAt)
      const section = sections.at(-1)
      if (section?.label === label) section.items.push(item)
      else sections.push({ label, items: [item] })
    }
    return sections
  }, [conversations, query])

  function commitRename() {
    if (!editingId) return
    const next = editingTitle.trim()
    if (next) onRename(editingId, next)
    setEditingId(null)
  }

  return (
    <aside
      aria-label="Cuộc trò chuyện trợ lý AI"
      className={cn('h-full flex-col bg-card-background', className)}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border-secondary px-3">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
          Cuộc trò chuyện
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cuộc trò chuyện"
          title="Đóng"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
        >
          <X size={17} strokeWidth={1.7} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pt-3">
        <h2 className="flex items-center justify-between px-2 pb-2 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
          Cuộc trò chuyện
          <span className="font-medium tabular-nums">{conversations.length}</span>
        </h2>
        <label className="relative mb-2 block">
          <Search
            size={14}
            strokeWidth={1.7}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-icon-tertiary"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm cuộc trò chuyện"
            aria-label="Tìm cuộc trò chuyện"
            className="h-9 w-full rounded-lg border border-card-border bg-input-background pr-3 pl-9 text-sm text-text-primary outline-none transition-colors placeholder:text-input-placeholder-text focus:border-input-primary-focus-border"
          />
        </label>
        <ScrollArea className="min-h-0 flex-1 pb-2 [mask-image:linear-gradient(to_bottom,#000_calc(100%_-_16px),transparent)]">
          {loading && (
            <div aria-hidden className="space-y-1.5 px-2 pt-1">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-11/12 rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          )}
          {!loading && groups.length === 0 && (
            <p className="px-2 py-2 text-xs leading-5 text-text-tertiary">
              Không có cuộc trò chuyện phù hợp.
            </p>
          )}
          {!loading &&
            groups.map((group) => (
              <div key={group.label} className="mb-3">
                <h3 className="px-2 py-1 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
                  {group.label}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.id === activeId
                    if (editingId === item.id) {
                      return (
                        <form
                          key={item.id}
                          onSubmit={(event) => {
                            event.preventDefault()
                            commitRename()
                          }}
                          className="flex items-center gap-1 rounded-lg px-2 py-1"
                        >
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') setEditingId(null)
                            }}
                            aria-label="Tên cuộc trò chuyện"
                            className="h-7 min-w-0 flex-1 rounded-md border border-input-primary-focus-border bg-input-background px-2 text-[13px] text-text-primary outline-none"
                          />
                          <button
                            type="submit"
                            aria-label="Lưu tên"
                            title="Lưu tên"
                            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-primary-text hover:bg-background-gray-secondary"
                          >
                            <Check size={13} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            aria-label="Huỷ đổi tên"
                            title="Huỷ"
                            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-icon-tertiary hover:bg-background-gray-secondary hover:text-text-primary"
                          >
                            <X size={13} strokeWidth={2} />
                          </button>
                        </form>
                      )
                    }
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'group/item flex items-center gap-0.5 rounded-lg pr-1 transition-colors',
                          active
                            ? 'bg-sidebar-navigation-nav-item-nav-hover-background'
                            : 'hover:bg-background-gray-secondary'
                        )}
                      >
                        <button
                          type="button"
                          aria-current={active ? 'page' : undefined}
                          onClick={() => onSelect(item.id)}
                          className={cn(
                            'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-input-primary-focus-border',
                            active
                              ? 'font-medium text-primary-text'
                              : 'text-text-secondary hover:text-text-primary'
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'size-2 shrink-0 rounded-full border',
                              active ? 'border-primary-text' : 'border-icon-tertiary'
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                          <time
                            className="shrink-0 text-[11px] text-text-tertiary group-hover/item:hidden"
                            dateTime={item.updatedAt}
                            title={new Date(item.updatedAt).toLocaleString('vi-VN')}
                          >
                            {relativeTime(item.updatedAt)}
                          </time>
                        </button>
                        <span className="hidden shrink-0 items-center group-hover/item:flex focus-within:flex">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id)
                              setEditingTitle(item.title)
                            }}
                            aria-label={`Đổi tên ${item.title}`}
                            title="Đổi tên"
                            className="inline-flex size-6 items-center justify-center rounded-md text-icon-tertiary transition-colors hover:bg-card-background hover:text-text-primary"
                          >
                            <Pencil size={13} strokeWidth={1.8} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            aria-label={`Xoá ${item.title}`}
                            title="Xoá"
                            className="inline-flex size-6 items-center justify-center rounded-md text-icon-tertiary transition-colors hover:bg-card-background hover:text-badge-error-text"
                          >
                            <Trash2 size={13} strokeWidth={1.8} />
                          </button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
        </ScrollArea>
      </div>

      <div className="shrink-0 p-3">
        <Button onClick={onNew} className="w-full">
          <SquarePen size={16} />
          Cuộc trò chuyện mới
        </Button>
      </div>
    </aside>
  )
}

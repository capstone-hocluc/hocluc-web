import { useMemo, useState } from 'react'
import { cn } from '../../../lib/cn'
import type { AiAssistantConversation } from '../../../services/aiAssistantService'
import Logo from '../../common/Logo'
import Button from '../../console/button'
import { SidebarExpandedIcon } from '../../console/layout/sidebar-icons'
import { ArrowLeft, Search, Sparkles, SquarePen } from '../../console/icons'
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
  conversations: readonly AiAssistantConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onBack: () => void
  backHref: string
  onCollapse?: () => void
  className?: string
}

export default function AiSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onBack,
  backHref,
  onCollapse,
  className = '',
}: AiSidebarProps) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi')
    const matched = needle
      ? conversations.filter((item) => item.title.toLocaleLowerCase('vi').includes(needle))
      : conversations
    const ordered = [...matched].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const sections: { label: string; items: AiAssistantConversation[] }[] = []
    for (const item of ordered) {
      const label = dayGroup(item.updatedAt)
      const section = sections.at(-1)
      if (section?.label === label) section.items.push(item)
      else sections.push({ label, items: [item] })
    }
    return sections
  }, [conversations, query])

  return (
    <aside
      aria-label="Thanh bên trợ lý AI"
      className={cn('h-dvh flex-col bg-card-background', className)}
    >
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-card-border px-3">
        <a
          href={backHref}
          onClick={(event) => {
            event.preventDefault()
            onBack()
          }}
          title="Về bảng điều khiển"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-text-primary transition-colors hover:bg-background-gray-secondary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
        >
          <ArrowLeft size={17} strokeWidth={1.7} className="shrink-0 text-icon-tertiary" />
          <Logo size={22} markOnly />
          <span className="min-w-0 truncate text-sm font-bold">Học Lực</span>
        </a>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Thu gọn thanh bên"
            title="Thu gọn thanh bên"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
          >
            <SidebarExpandedIcon />
          </button>
        )}
      </div>

      <div className="px-2 pt-3">
        <button
          type="button"
          aria-current="page"
          className="flex w-full items-center gap-3 rounded-lg bg-sidebar-navigation-nav-item-nav-hover-background px-3 py-2 text-left text-sm font-semibold text-primary-text"
        >
          <Sparkles size={18} strokeWidth={1.7} aria-hidden />
          <span className="min-w-0 flex-1 truncate">Trợ lý AI</span>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pt-5">
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
          {groups.length === 0 && (
            <p className="px-2 py-2 text-xs leading-5 text-text-tertiary">
              Không có cuộc trò chuyện phù hợp.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <h3 className="px-2 py-1 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
                {group.label}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.id === activeId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-input-primary-focus-border',
                        active
                          ? 'bg-sidebar-navigation-nav-item-nav-hover-background font-medium text-primary-text'
                          : 'text-text-secondary hover:bg-background-gray-secondary hover:text-text-primary'
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
                        className="shrink-0 text-[11px] text-text-tertiary"
                        dateTime={item.updatedAt}
                        title={new Date(item.updatedAt).toLocaleString('vi-VN')}
                      >
                        {relativeTime(item.updatedAt)}
                      </time>
                    </button>
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

import { useContext, useId, useRef, useState } from 'react'
import { Bell, BookOpen, CalendarDays, CheckCircle2, RefreshCw } from '../console/icons'
import { NotificationContext, useNotifications } from '../../hooks/useNotifications'
import { cn } from '../../lib/cn'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import Skeleton from '../ui/Skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover'
import NotificationProvider from './NotificationProvider'
import Modal from '../ui/Modal'
import type { UserNotification } from '../../services/notificationService'

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function NotificationControl({ variant }: { variant: 'console' | 'student' }) {
  const feed = useNotifications()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<UserNotification | null>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const descriptionId = useId()
  const loading = feed.status === 'loading' || feed.status === 'idle'
  const hasUnread = (feed.unread ?? 0) > 0 || Boolean(feed.page?.content.some(item => !item.read))
  const disabled = loading || Boolean(feed.busy)
  const detail = feed.page?.content.find(item => item.id === selected?.id) ?? selected

  return <><Popover open={open} onOpenChange={next => {
    setOpen(next)
    if (next) {
      void feed.loadPage(0)
      void feed.refreshCount()
    }
  }}>
    <PopoverTrigger asChild>
      <button ref={bellRef} type="button" aria-label="Thông báo" aria-describedby={descriptionId}
        className={cn('relative grid flex-none cursor-pointer place-items-center border bg-surface text-text-heading transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          variant === 'student' ? 'size-11 rounded-xl border-line' : 'size-10 rounded-lg border-card-border bg-card-background text-icon-primary shadow-xs')}>
        <Bell size={18} />
        {feed.unread !== null && feed.unread > 0 && <span aria-hidden="true"
          className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border border-surface bg-danger px-1 text-[10px] font-bold text-white">
          {feed.unread > 99 ? '99+' : feed.unread}
        </span>}
        <span id={descriptionId} className="sr-only">{feed.countError ? 'Không thể tải số chưa đọc' : feed.unread === null ? 'Đang tải số chưa đọc' : `${feed.unread} thông báo chưa đọc`}</span>
      </button>
    </PopoverTrigger>
    <PopoverContent aria-label="Danh sách thông báo" className="w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border-card-border bg-card-background p-0 text-text-primary">
      <div className="flex items-center justify-between gap-2 border-b border-card-border px-4 py-3">
        <h2 className="text-base font-semibold">Thông báo</h2>
        <Button appearance="ghost" size="icon" aria-label="Tải lại thông báo" disabled={disabled} onClick={() => {
          void feed.loadPage(feed.page?.pageNumber ?? 0)
          void feed.refreshCount()
        }}><RefreshCw size={16} /></Button>
      </div>
      {feed.countError && <div className="border-b border-card-border px-4 py-2 text-xs text-text-secondary" role="status">
        Chưa tải được số chưa đọc. <button type="button" className="font-semibold text-primary-text underline" onClick={() => void feed.refreshCount()}>Thử lại số chưa đọc</button>
      </div>}
      {feed.mutationError && <Notice tone="danger" role="alert" className="m-3 text-xs font-normal">{feed.mutationError}</Notice>}
      <div className="max-h-[min(420px,55vh)] app-scroll overflow-y-auto overscroll-contain" aria-busy={loading}>
        {loading ? <div role="status" aria-label="Đang tải thông báo" className="space-y-3 p-4">
          {[0, 1, 2].map(item => <Skeleton key={item} className="h-16 w-full rounded-xl" />)}
        </div> : feed.status === 'error' ? <div className="space-y-3 p-5 text-center">
          <p role="alert" className="text-sm text-text-secondary">{feed.error}</p>
          <Button size="sm" appearance="outline" onClick={() => void feed.loadPage(feed.page?.pageNumber ?? 0)}>Thử lại</Button>
        </div> : feed.page?.content.length === 0 ? <div className="px-5 py-10 text-center">
          <Bell className="mx-auto mb-3 text-icon-tertiary" size={24} />
          <p className="text-sm text-text-secondary">Chưa có thông báo nào.</p>
        </div> : <ul className="space-y-1 p-2">
          {feed.page?.content.map(item => {
            const Icon = item.entityType === 'COURSE' ? BookOpen : item.entityType === 'LIVE_CLASS' ? CalendarDays : Bell
            return <li key={item.id}>
              <button type="button" aria-label={`Xem thông báo: ${item.title}`} aria-haspopup="dialog"
                disabled={Boolean(feed.busy)} onClick={() => {
                  setOpen(false)
                  setSelected(item)
                  void feed.markRead(item)
                }} className={cn('flex w-full gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-hover disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-focus-ring', !item.read && 'bg-surface-brand')}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-background-gray-secondary text-icon-primary"><Icon size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-sm font-semibold break-words">{item.title}</span>
                    {!item.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary-bright" aria-label="Chưa đọc" />}
                  </span>
                  {item.message && <span className="mt-1 line-clamp-2 text-xs leading-5 break-words whitespace-pre-wrap text-text-secondary">{item.message}</span>}
                  <time dateTime={item.createdAt} className="mt-1 block text-xs text-text-tertiary">{formatTime(item.createdAt)}</time>
                </span>
              </button>
            </li>
          })}
        </ul>}
      </div>
      <div className="space-y-2 border-t border-card-border p-3">
        {feed.page && feed.page.totalPages > 1 && <nav aria-label="Phân trang thông báo" className="flex items-center justify-between gap-2">
          <Button size="sm" appearance="ghost" disabled={disabled || feed.page.pageNumber === 0} onClick={() => void feed.loadPage(feed.page!.pageNumber - 1)}>Trước</Button>
          <span className="text-xs text-text-tertiary">Trang {feed.page.pageNumber + 1}/{feed.page.totalPages}</span>
          <Button size="sm" appearance="ghost" disabled={disabled || feed.page.pageNumber + 1 >= feed.page.totalPages} onClick={() => void feed.loadPage(feed.page!.pageNumber + 1)}>Sau</Button>
        </nav>}
        <Button size="sm" appearance="ghost" className="w-full whitespace-normal" disabled={disabled || !hasUnread} onClick={() => void feed.markAllRead()}>
          <CheckCircle2 size={16} />{feed.busy === 'all' ? 'Đang cập nhật...' : 'Đánh dấu đã đọc tất cả'}
        </Button>
      </div>
    </PopoverContent>
  </Popover>
    <Modal open={detail !== null} title="Chi tiết thông báo" maxWidth={640}
      description={detail ? <time dateTime={detail.createdAt} className="text-xs text-text-tertiary">{formatTime(detail.createdAt)}</time> : undefined}
      className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col overflow-hidden [&>h2]:pr-8"
      onClose={() => {
        setSelected(null)
        requestAnimationFrame(() => bellRef.current?.focus())
      }}>
      {detail && <>
        <div role="region" aria-label="Nội dung thông báo" tabIndex={0}
          className="min-h-0 app-scroll overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-4 focus-visible:outline-2 focus-visible:outline-focus-ring">
          <h3 className="mb-3 text-base font-semibold leading-6 text-text-heading [overflow-wrap:anywhere]">{detail.title}</h3>
          <p className="text-sm leading-7 whitespace-pre-wrap text-text-body [overflow-wrap:anywhere]">{detail.message || 'Thông báo này không có nội dung bổ sung.'}</p>
        </div>
        {feed.mutationError && <Notice tone="danger" role="alert" className="shrink-0 text-xs font-normal">
          {feed.mutationError}
          <Button size="sm" appearance="ghost" disabled={Boolean(feed.busy)} onClick={() => void feed.markRead(detail)}>Thử lại đánh dấu đã đọc</Button>
        </Notice>}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-xs text-text-tertiary" role="status">{feed.busy === detail.id ? 'Đang đánh dấu đã đọc...' : detail.read ? 'Đã đọc' : 'Chưa đọc'}</span>
          <Button size="sm" appearance="outline" onClick={() => {
            setSelected(null)
            requestAnimationFrame(() => bellRef.current?.focus())
          }}>Đóng thông báo</Button>
        </div>
      </>}
    </Modal>
  </>
}

export default function NotificationBell({ variant = 'console' }: { variant?: 'console' | 'student' }) {
  const shared = useContext(NotificationContext)
  return shared ? <NotificationControl variant={variant} />
    : <NotificationProvider><NotificationControl variant={variant} /></NotificationProvider>
}

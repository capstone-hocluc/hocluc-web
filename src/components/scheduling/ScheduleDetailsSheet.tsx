import { CalendarDays, ExternalLink, MapPin } from '../console/icons'
import type { ReactNode } from 'react'
import type { ScheduleCalendarItem } from '../../types/scheduling'
import { itemDateKey, itemLocation, itemMeetingUrl, itemSubtitle, itemTimeLabel, itemTimezone, itemTitle, localDateLabel } from '../../lib/scheduling'
import { Sheet, SheetBody } from '../ui/Sheet'
import StatusBadge from '../ui/StatusBadge'
import ScheduleStatusBadge from './ScheduleStatusBadge'
import Button from '../ui/Button'
import { runWithUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'

interface Props {
  item: ScheduleCalendarItem | null
  onClose: () => void
  timezone?: string
  showMeetingLink?: boolean
  body?: ReactNode
  footer?: ReactNode
}

export default function ScheduleDetailsSheet({ item, onClose, timezone, showMeetingLink = true, body, footer }: Props) {
  const displayTimezone = item ? itemTimezone(item, timezone) : timezone
  const requestClose = () => runWithUnsavedActionGuard(onClose)

  return (
    <Sheet open={Boolean(item)} onClose={requestClose} className="hl-scheduling" closeButtonClassName="max-[767px]:size-11" title="Chi tiết lịch học">
      {item && (
        <SheetBody className="space-y-5 p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ScheduleStatusBadge status={item.item.status} />
              {item.kind === 'classSession' && item.item.overridden && (
                <StatusBadge tone="info" size="sm">Đã điều chỉnh</StatusBadge>
              )}
              <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-[11px] font-medium text-badge-neutral-text">
                {item.kind === 'classSession' ? 'Buổi trong chuỗi' : item.kind === 'liveClass' ? 'Lớp trực tuyến' : 'Lịch đơn'}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-text-heading">{itemTitle(item)}</h2>
            <p className="mt-1 text-sm text-text-muted">{itemSubtitle(item)}</p>
          </div>
          <div className="space-y-3 rounded-2xl bg-surface-soft p-4 text-sm">
            <p className="flex items-start gap-2 text-text-body">
              <CalendarDays size={17} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                {localDateLabel(itemDateKey(item, displayTimezone), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                <span className="mt-1 block text-text-muted">{itemTimeLabel(item, displayTimezone)} ({displayTimezone})</span>
              </span>
            </p>
            {itemLocation(item) && (
              <p className="flex items-start gap-2 text-text-body">
                <MapPin size={17} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <span>{itemLocation(item)}</span>
              </p>
            )}
          </div>
          {showMeetingLink && itemMeetingUrl(item) ? (
            <Button asChild className="w-full max-[767px]:min-h-11">
              <a href={itemMeetingUrl(item) || undefined} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Mở phòng học
              </a>
            </Button>
          ) : (
            <p className="rounded-xl border border-dashed border-border-subtle px-3 py-3 text-sm text-text-muted">
              {itemLocation(item) ? 'Chưa có đường dẫn phòng học trực tuyến.' : 'Địa điểm hoặc đường dẫn chưa được cung cấp.'}
            </p>
          )}
          {body}
          {footer}
        </SheetBody>
      )}
    </Sheet>
  )
}

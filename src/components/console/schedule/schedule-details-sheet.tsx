import { CalendarDays, ExternalLink, MapPin } from '../icons'
import type { ReactNode } from 'react'
import type { ScheduleCalendarItem } from '../../../types/scheduling'
import { itemDateKey, itemLocation, itemMeetingUrl, itemSubtitle, itemTimeLabel, itemTimezone, itemTitle, localDateLabel } from '../../../lib/scheduling'
import ConsoleSheet from '../sheet'
import Button from '../button'
import Status from '../status'
import ScheduleStatusBadge from './schedule-status-badge'
import { scheduleKindLabel } from './schedule-labels'
import { runWithUnsavedActionGuard } from '../../../hooks/useUnsavedActionGuard'

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
  const meetingUrl = item ? itemMeetingUrl(item) : null

  return (
    <ConsoleSheet open={Boolean(item)} onClose={requestClose} title="Chi tiết lịch học">
      {item && (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ScheduleStatusBadge status={item.item.status} />
              {item.kind === 'classSession' && item.item.overridden && <Status tone="info">Đã điều chỉnh</Status>}
              <Status>{scheduleKindLabel(item.kind)}</Status>
            </div>
            <h2 className="mt-3 text-lg font-medium text-text-primary">{itemTitle(item)}</h2>
            <p className="mt-1 text-sm text-text-tertiary">{itemSubtitle(item)}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-lg bg-background-gray-secondary p-4 text-sm text-text-primary">
            <p className="flex items-start gap-2">
              <CalendarDays size={17} className="mt-0.5 shrink-0 text-icon-tertiary" aria-hidden="true" />
              <span>
                {localDateLabel(itemDateKey(item, displayTimezone), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                <span className="mt-1 block text-text-tertiary">{itemTimeLabel(item, displayTimezone)} ({displayTimezone})</span>
              </span>
            </p>
            {itemLocation(item) && (
              <p className="flex items-start gap-2">
                <MapPin size={17} className="mt-0.5 shrink-0 text-icon-tertiary" aria-hidden="true" />
                <span>{itemLocation(item)}</span>
              </p>
            )}
          </div>
          {showMeetingLink && meetingUrl && (
            <Button asChild className="w-full">
              <a href={meetingUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Mở phòng học
              </a>
            </Button>
          )}
          {body}
          {footer}
        </div>
      )}
    </ConsoleSheet>
  )
}

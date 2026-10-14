import { ExternalLink } from '../icons'
import { useState, type ReactNode } from 'react'
import type { ScheduleCalendarItem } from '../../../types/scheduling'
import { itemDateKey, itemLocation, itemMeetingUrl, itemTimeLabel, itemTimezone, itemTitle, localDateLabel } from '../../../lib/scheduling'
import ConsoleSheet from '../sheet'
import Button from '../button'
import Status from '../status'
import DetailHeader from '../detail/detail-header'
import DetailSection from '../detail/detail-section'
import KeyFacts from '../detail/key-facts'
import ScheduleStatusBadge from './schedule-status-badge'
import { scheduleKindLabel } from './schedule-labels'
import { runWithUnsavedActionGuard } from '../../../hooks/useUnsavedActionGuard'

interface Props {
  item: ScheduleCalendarItem | null
  onClose: () => void
  timezone?: string
  showMeetingLink?: boolean
  /** Attendance / recordings panel. Render it `embedded`: the sheet supplies the section title. */
  body?: ReactNode
  footer?: ReactNode
}

function facts(item: ScheduleCalendarItem, displayTimezone: string | undefined) {
  const teacher =
    item.kind === 'schedule' ? item.item.instructorName
    : item.kind === 'classSession' ? item.item.teacherName
    : item.item.instructorName
  return [
    {
      label: 'Thời gian',
      required: true,
      value: (
        <>
          {localDateLabel(itemDateKey(item, displayTimezone), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          <span className="mt-1 block text-xs font-normal text-text-tertiary">
            {itemTimeLabel(item, displayTimezone)} ({displayTimezone})
          </span>
        </>
      ),
    },
    { label: 'Giáo viên', value: teacher },
    item.kind === 'classSession'
      ? { label: 'Phần học', value: item.item.sectionTitle }
      : { label: 'Khóa học', value: item.kind === 'schedule' ? item.item.courseName : null },
    { label: 'Địa điểm', value: itemLocation(item) },
    { label: 'Sĩ số dự kiến', value: item.kind === 'schedule' ? item.item.enrolledStudentsCount : null },
  ]
}

function SheetContent({ item, timezone, showMeetingLink, body, footer }: Omit<Props, 'item' | 'onClose'> & { item: ScheduleCalendarItem }) {
  const displayTimezone = itemTimezone(item, timezone)
  const meetingUrl = itemMeetingUrl(item)
  // Only the sessions that can still be joined get the primary action.
  const joinable = item.kind === 'liveClass' || item.item.status === 'SCHEDULED' || item.item.status === 'ONGOING'
  // Attendance and recordings only matter once the session has begun, so they start folded before that.
  const [started] = useState(() => item.item.status === 'ONGOING' || item.item.status === 'COMPLETED' || Date.parse(item.item.startTime) <= Date.now())

  return (
    <div className="flex flex-col gap-5">
      <DetailHeader
        title={itemTitle(item)}
        chips={
          <>
            <ScheduleStatusBadge status={item.item.status} />
            {item.kind === 'classSession' && item.item.overridden && <Status tone="info">Đã điều chỉnh</Status>}
            <Status>{scheduleKindLabel(item.kind)}</Status>
          </>
        }
        actions={
          showMeetingLink && joinable && meetingUrl ? (
            <Button asChild className="max-sm:w-full">
              <a href={meetingUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Vào lớp
              </a>
            </Button>
          ) : undefined
        }
      />
      <KeyFacts facts={facts(item, displayTimezone)} />
      {body && (
        <DetailSection title={item.kind === 'classSession' ? 'Bản ghi' : 'Điểm danh'} collapsible defaultOpen={started}>
          {body}
        </DetailSection>
      )}
      {footer}
    </div>
  )
}

export default function ScheduleDetailsSheet({ item, onClose, timezone, showMeetingLink = true, body, footer }: Props) {
  const requestClose = () => runWithUnsavedActionGuard(onClose)

  return (
    <ConsoleSheet open={Boolean(item)} onClose={requestClose} title="Chi tiết lịch học">
      {item && (
        <SheetContent
          key={`${item.kind}:${item.sourceId}`}
          item={item}
          timezone={timezone}
          showMeetingLink={showMeetingLink}
          body={body}
          footer={footer}
        />
      )}
    </ConsoleSheet>
  )
}

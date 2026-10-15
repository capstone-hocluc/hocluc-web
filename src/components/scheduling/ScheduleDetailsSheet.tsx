import { ChevronDown, ExternalLink } from '../console/icons'
import { useId, useState, type ReactNode } from 'react'
import type { ScheduleCalendarItem } from '../../types/scheduling'
import { itemDateKey, itemLocation, itemMeetingUrl, itemTimeLabel, itemTimezone, itemTitle, localDateLabel } from '../../lib/scheduling'
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

function facts(item: ScheduleCalendarItem, displayTimezone: string | undefined) {
  const teacher =
    item.kind === 'schedule' ? item.item.instructorName
    : item.kind === 'classSession' ? item.item.teacherName
    : item.item.instructorName
  const subject = item.kind === 'schedule' ? item.item.courseName : item.kind === 'classSession' ? item.item.sectionTitle : null
  const rows: Array<{ label: string; value: ReactNode }> = [
    {
      label: 'Thời gian',
      value: (
        <>
          {localDateLabel(itemDateKey(item, displayTimezone), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          <span className="mt-1 block text-xs font-normal text-text-muted">
            {itemTimeLabel(item, displayTimezone)} ({displayTimezone})
          </span>
        </>
      ),
    },
    { label: 'Giáo viên', value: teacher },
    { label: item.kind === 'classSession' ? 'Phần học' : 'Khóa học', value: subject },
    { label: 'Địa điểm', value: itemLocation(item) },
  ]
  return rows.filter((row) => row.value)
}

function SheetContent({ item, timezone, showMeetingLink, body, footer }: Omit<Props, 'item' | 'onClose'> & { item: ScheduleCalendarItem }) {
  const displayTimezone = itemTimezone(item, timezone)
  const meetingUrl = itemMeetingUrl(item)
  const joinable = item.kind === 'liveClass' || item.item.status === 'SCHEDULED' || item.item.status === 'ONGOING'
  // Attendance only matters once the session has begun, so it starts folded before that.
  const [started] = useState(() => item.item.status === 'ONGOING' || item.item.status === 'COMPLETED' || Date.parse(item.item.startTime) <= Date.now())
  const [open, setOpen] = useState(started)
  const bodyId = useId()
  const canJoin = showMeetingLink && joinable && Boolean(meetingUrl)

  return (
    <SheetBody className="space-y-5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="text-xl font-black tracking-[-0.3px] break-words text-text-heading">{itemTitle(item)}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ScheduleStatusBadge status={item.item.status} />
            {item.kind === 'classSession' && item.item.overridden && (
              <StatusBadge tone="info" size="sm">Đã điều chỉnh</StatusBadge>
            )}
            <span className="rounded-full bg-badge-neutral-bg px-2.5 py-0.5 text-xs font-extrabold text-badge-neutral-text">
              {item.kind === 'classSession' ? 'Buổi trong chuỗi' : item.kind === 'liveClass' ? 'Lớp trực tuyến' : 'Lịch đơn'}
            </span>
          </div>
        </div>
        {canJoin && (
          <Button asChild className="max-[767px]:min-h-11 max-sm:w-full">
            <a href={meetingUrl || undefined} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              Vào lớp
            </a>
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded-3xl border-[1.5px] border-line-card bg-surface-brand p-4 text-sm sm:grid-cols-2">
        {facts(item, displayTimezone).map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-[13px] font-bold text-text-muted">{fact.label}</dt>
            <dd className="mt-1 font-extrabold break-words text-text-heading">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {showMeetingLink && joinable && !meetingUrl && (
        <p className="rounded-xl border border-dashed border-border-subtle px-3 py-3 text-sm text-text-muted">
          {itemLocation(item) ? 'Chưa có đường dẫn phòng học trực tuyến.' : 'Địa điểm hoặc đường dẫn chưa được cung cấp.'}
        </p>
      )}

      {body && (
        <section className="border-t border-border-subtle pt-4">
          <h3 className="text-sm font-semibold text-text-heading">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-2 rounded-md text-left"
            >
              <span>Điểm danh buổi học</span>
              <ChevronDown size={16} aria-hidden className={'shrink-0 text-text-muted transition-transform duration-200' + (open ? '' : ' -rotate-90')} />
            </button>
          </h3>
          <div id={bodyId} hidden={!open} className="mt-3">
            {body}
          </div>
        </section>
      )}
      {footer}
    </SheetBody>
  )
}

export default function ScheduleDetailsSheet({ item, onClose, timezone, showMeetingLink = true, body, footer }: Props) {
  const requestClose = () => runWithUnsavedActionGuard(onClose)

  return (
    <Sheet open={Boolean(item)} onClose={requestClose} className="hl-scheduling" closeButtonClassName="max-[767px]:size-11" title="Chi tiết lịch học">
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
    </Sheet>
  )
}

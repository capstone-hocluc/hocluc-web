import { useState } from 'react'
import type { ConsoleLiveClass, LiveClassBookingItem } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMmYyyy,
  formatTimeRangeFromInstants,
  fullDayLabel,
  initialsOf,
} from '../../../lib/liveScheduleFormat'
import Skeleton from '../../ui/Skeleton'
import Button from '../button'
import ConsoleSheet from '../sheet'
import Notice from '../notice'
import Status from '../status'
import DetailHeader from '../detail/detail-header'
import DetailSection from '../detail/detail-section'
import KeyFacts from '../detail/key-facts'
import { CalendarClock, Trash2, UserRound } from '../icons'
import LiveClassStatus from './live-class-status'

interface Props {
  liveClass: ConsoleLiveClass
  bookings: LiveClassBookingItem[]
  bookingsLoading: boolean
  canManage: boolean
  onClose: () => void
  onReschedule: () => void
  onChangeTeacher: () => void
  onCancel: () => void
}

export default function LiveClassDetailPanel({
  liveClass,
  bookings,
  bookingsLoading,
  canManage,
  onClose,
  onReschedule,
  onChangeTeacher,
  onCancel,
}: Props) {
  const [showAllBookings, setShowAllBookings] = useState(false)
  const dateKey = dateKeyOfInstant(liveClass.startTime)
  const isEditable = canManage && liveClass.status !== 'CANCELLED' && liveClass.status !== 'COMPLETED'
  const bookedTotal = liveClass.bookedCount ?? bookings.length
  const visibleBookings = showAllBookings ? bookings : bookings.slice(0, 3)

  return (
    <ConsoleSheet open onClose={onClose} title="Chi tiết buổi học">
      <div className="flex flex-col gap-5">
        <DetailHeader
          title={liveClass.title}
          chips={
            <>
              <LiveClassStatus status={liveClass.status} />
              {liveClass.needsAttention && liveClass.status !== 'CANCELLED' && <Status tone="warning">Ngoài giờ rảnh</Status>}
            </>
          }
        />

        <KeyFacts
          facts={[
            {
              label: 'Thời gian',
              required: true,
              value: (
                <>
                  {fullDayLabel(dateKey)}, {formatDdMmYyyy(dateKey)}
                  <span className="mt-1 block text-xs font-normal text-text-tertiary">
                    {formatTimeRangeFromInstants(liveClass.startTime, liveClass.endTime)}
                  </span>
                </>
              ),
            },
            { label: 'Khóa học', value: liveClass.courseTitle },
            { label: 'Giảng viên', value: liveClass.teacherName, required: true },
            {
              label: 'Phòng',
              value:
                liveClass.status === 'CANCELLED' ? null : liveClass.teacherName ? `Zoom của ${liveClass.teacherName}` : 'Zoom',
            },
            { label: 'Giữ chỗ', value: liveClass.capacity ? `${bookedTotal} / ${liveClass.capacity}` : bookedTotal, required: true },
          ]}
        />

        {liveClass.needsAttention && liveClass.attentionReason && (
          <Notice tone="warning">{liveClass.attentionReason}</Notice>
        )}

        {isEditable && (
          <div className="flex flex-wrap gap-2">
            <Button appearance="outline" onClick={onReschedule}>
              <CalendarClock size={15} />
              Dời giờ
            </Button>
            <Button appearance="outline" onClick={onChangeTeacher}>
              <UserRound size={15} />
              Đổi giảng viên
            </Button>
            <Button variant="danger" appearance="outline" onClick={onCancel}>
              <Trash2 size={15} />
              Hủy buổi
            </Button>
          </div>
        )}

        <DetailSection title="Học viên giữ chỗ">
          {bookingsLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-text-tertiary">Chưa có học viên giữ chỗ.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2 text-sm">
                {visibleBookings.map((b) => (
                  <li key={b.id} className="flex items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-badge-blue-background text-xs font-semibold text-badge-blue-text">
                      {initialsOf(b.studentName)}
                    </span>
                    <span className="truncate text-text-primary">{b.studentName}</span>
                  </li>
                ))}
              </ul>
              {bookings.length > 3 && (
                <Button size="sm" appearance="ghost" className="self-start" onClick={() => setShowAllBookings((prev) => !prev)}>
                  {showAllBookings ? 'Thu gọn' : `Xem cả ${bookings.length}`}
                </Button>
              )}
            </>
          )}
        </DetailSection>
      </div>
    </ConsoleSheet>
  )
}

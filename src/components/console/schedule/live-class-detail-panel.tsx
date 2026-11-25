import { useState } from 'react'
import { X } from '../icons'
import type { ConsoleLiveClass, LiveClassBookingItem } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMmYyyy,
  formatTimeRangeFromInstants,
  fullDayLabel,
  initialsOf,
} from '../../../lib/liveScheduleFormat'
import Skeleton from '../../ui/Skeleton'

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
  const isEditable =
    canManage && liveClass.status !== 'CANCELLED' && liveClass.status !== 'COMPLETED'
  const bookedTotal = liveClass.bookedCount ?? bookings.length
  const seatsText = liveClass.capacity ? `${bookedTotal} / ${liveClass.capacity}` : `${bookedTotal}`
  const visibleBookings = showAllBookings ? bookings : bookings.slice(0, 3)

  return (
    <aside
      aria-label="Chi tiết buổi"
      className="flex w-full shrink-0 flex-col gap-4 rounded-2xl border border-card-border bg-card-background p-5 lg:w-[340px]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="m-0 text-lg font-bold text-text-primary">{liveClass.title}</h2>
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#f6f9ff] text-[#526984] hover:bg-[#e8eff8]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <dl className="m-0 grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
        <dt className="text-[#526984]">Thời gian</dt>
        <dd className="m-0 text-text-primary">
          {fullDayLabel(dateKey)}, {formatDdMmYyyy(dateKey)}
          <br />
          {formatTimeRangeFromInstants(liveClass.startTime, liveClass.endTime)}
        </dd>
        <dt className="text-[#526984]">Khóa học</dt>
        <dd className="m-0 text-text-primary">{liveClass.courseTitle || '—'}</dd>
        <dt className="text-[#526984]">Giảng viên</dt>
        <dd className="m-0 text-text-primary">{liveClass.teacherName || '—'}</dd>
        <dt className="text-[#526984]">Phòng</dt>
        <dd className="m-0 text-text-primary">
          {liveClass.status === 'CANCELLED'
            ? 'Đã hủy'
            : liveClass.teacherName
              ? `Zoom của ${liveClass.teacherName}`
              : 'Zoom'}
        </dd>
        <dt className="text-[#526984]">Giữ chỗ</dt>
        <dd className="m-0 text-text-primary">{seatsText}</dd>
      </dl>

      {liveClass.needsAttention && liveClass.attentionReason && (
        <div
          role="note"
          className="rounded-xl border border-[#f3c58b] bg-[#fff6ea] p-3 text-[13px] leading-relaxed text-[#7a3d00]"
        >
          {liveClass.attentionReason}
        </div>
      )}

      {isEditable && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onReschedule}
            className="min-h-11 rounded-xl border border-card-border bg-card-background px-3 text-sm font-semibold text-text-primary hover:bg-background-gray-secondary"
          >
            Dời giờ
          </button>
          <button
            type="button"
            onClick={onChangeTeacher}
            className="min-h-11 rounded-xl border border-card-border bg-card-background px-3 text-sm font-semibold text-text-primary hover:bg-background-gray-secondary"
          >
            Đổi giảng viên
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="col-span-2 min-h-11 rounded-xl border border-[#f0b8b0] bg-card-background px-3 text-sm font-semibold text-[#a3261a] hover:bg-[#fff5f5]"
          >
            Hủy buổi
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5 border-t border-card-border pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-[15px] font-semibold text-text-primary">Học viên giữ chỗ</h3>
          {bookings.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllBookings((prev) => !prev)}
              className="min-h-9 text-[13px] font-medium text-[#0b3a82] hover:underline"
            >
              {showAllBookings ? 'Thu gọn' : `Xem cả ${bookings.length}`}
            </button>
          )}
        </div>

        {bookingsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="m-0 text-sm text-text-tertiary">Chưa có học viên giữ chỗ.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {visibleBookings.map((b) => (
              <li key={b.id} className="flex items-center gap-2.5">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#edf5ff] text-xs font-semibold text-[#0b3a82]">
                  {initialsOf(b.studentName)}
                </span>
                <span className="truncate text-text-primary">{b.studentName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

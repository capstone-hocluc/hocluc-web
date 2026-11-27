import { useState } from 'react'
import Button from '../button'
import DetailSection from '../detail/detail-section'
import Notice from '../notice'
import Status from '../status'
import Skeleton from '../../ui/Skeleton'
import type { LiveClassAdmissionItem } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatClockFromInstant,
  formatDdMm,
  initialsOf,
} from '../../../lib/liveScheduleFormat'

interface Props {
  admissions: LiveClassAdmissionItem[]
  loading: boolean
  errorMessage?: string
  onRetry?: () => void
}

/** Shared list of students admitted to a live session (used by staff and teacher views). */
export default function LiveClassAdmissionsSection({
  admissions,
  loading,
  errorMessage,
  onRetry,
}: Props) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? admissions : admissions.slice(0, 5)

  return (
    <DetailSection title="Học viên đã vào lớp">
      {loading ? (
        <div className="flex flex-col gap-2.5" role="status" aria-label="Đang tải danh sách học viên">
          {Array.from({ length: 3 }, (_, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <Notice tone="danger">
          {errorMessage}
          {onRetry && (
            <Button size="sm" appearance="outline" onClick={onRetry}>
              Thử lại
            </Button>
          )}
        </Notice>
      ) : admissions.length === 0 ? (
        <p className="text-sm text-text-tertiary">Chưa có học viên nào vào lớp.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5 text-sm">
            {visible.map((item) => {
              const paidDate = item.paidAt ? formatDdMm(dateKeyOfInstant(item.paidAt)) : ''
              const paidClock = item.paidAt ? formatClockFromInstant(item.paidAt) : ''
              const paidText = paidClock && paidDate ? `Thanh toán ${paidClock} ${paidDate}` : ''
              const minutesText = `${item.attendanceMinutes ?? 0} phút`
              const meta = [paidText, minutesText].filter(Boolean).join(' · ')

              return (
                <li key={item.studentId} className="flex items-center justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-badge-blue-background text-xs font-semibold text-badge-blue-text">
                      {initialsOf(item.studentName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{item.studentName}</p>
                      <p className="truncate text-xs text-text-tertiary">{meta}</p>
                    </div>
                  </div>
                  {item.refundedAt && <Status tone="warning">Đã hoàn Sao</Status>}
                </li>
              )
            })}
          </ul>
          {admissions.length > 5 && (
            <Button size="sm" appearance="ghost" className="self-start" onClick={() => setShowAll((prev) => !prev)}>
              {showAll ? 'Thu gọn' : `Xem cả ${admissions.length}`}
            </Button>
          )}
        </>
      )}
    </DetailSection>
  )
}

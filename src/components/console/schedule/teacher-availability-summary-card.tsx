import { Check } from '../icons'
import type { TeacherAvailabilityResponse } from '../../../types/scheduling'
import type { TeacherZoomAccount } from '../../../services/liveClassService'
import { formatDdMmYyyy, parseClockMinutes, WEEKDAYS_ORDERED } from '../../../lib/liveScheduleFormat'
import LiveScheduleSkeleton from './live-schedule-skeleton'

interface Props {
  teacherName: string
  availability?: TeacherAvailabilityResponse | null
  loading: boolean
  zoomAccount?: TeacherZoomAccount | null
  teachingLoadLabel: string
}

const MIN_MINUTE = 7 * 60
const MAX_MINUTE = 22 * 60
const SPAN_MINUTES = MAX_MINUTE - MIN_MINUTE

export default function TeacherAvailabilitySummaryCard({
  teacherName,
  availability,
  loading,
  zoomAccount,
  teachingLoadLabel,
}: Props) {
  if (loading) {
    return <LiveScheduleSkeleton variant="wizard-sidebar" />
  }

  const busyDates = (availability?.exceptions ?? [])
    .filter((ex) => !ex.isAvailable)
    .map((ex) => formatDdMmYyyy(ex.exceptionDate))
  const recurring = availability?.recurringSlots ?? []

  return (
    <aside
      aria-label="Giờ rảnh của giảng viên"
      className="flex flex-col gap-3.5 rounded-2xl border border-card-border bg-[#f8faff] p-4.5"
    >
      <h2 className="m-0 text-[15px] font-semibold text-text-primary">
        {teacherName ? `Giờ rảnh của ${teacherName}` : 'Giờ rảnh của giảng viên'}
      </h2>

      <div className="flex justify-between pl-9 text-[11px] text-[#526984]">
        <span>07:00</span>
        <span>12:00</span>
        <span>17:00</span>
        <span>22:00</span>
      </div>

      <div className="flex flex-col gap-2 text-[13px]">
        {WEEKDAYS_ORDERED.map((day) => {
          const daySlots = recurring.filter((slot) => slot.dayOfWeek === day.value)
          return (
            <div key={day.value} className="flex items-center gap-2">
              <span className="w-7 text-[#526984]">{day.short}</span>
              <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-[#e8eff8]">
                {daySlots.map((slot, index) => {
                  const start = Math.max(MIN_MINUTE, parseClockMinutes(slot.startTime))
                  const end = Math.min(MAX_MINUTE, parseClockMinutes(slot.endTime))
                  if (end <= start) return null
                  const leftPct = ((start - MIN_MINUTE) / SPAN_MINUTES) * 100
                  const widthPct = ((end - start) / SPAN_MINUTES) * 100
                  return (
                    <span
                      key={index}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className="absolute top-0 bottom-0 rounded bg-[#1e88ff]"
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <dl className="m-0 grid grid-cols-[80px_minmax(0,1fr)] gap-x-2 gap-y-2 border-t border-[#e0e9f5] pt-3 text-[13px]">
        <dt className="text-[#526984]">Ngày bận</dt>
        <dd className="m-0 text-text-primary">
          {busyDates.length ? busyDates.slice(0, 3).join(', ') : 'Không có'}
        </dd>
        <dt className="text-[#526984]">Zoom</dt>
        <dd className="m-0 inline-flex items-center gap-1.5 text-text-primary">
          {!zoomAccount?.zoomEnabled ? (
            <>
              <Check size={14} className="text-[#0b3a82]" aria-hidden="true" />
              Đã kết nối
            </>
          ) : zoomAccount.zoomEmail ? (
            <>
              <Check size={14} className="text-[#0b3a82]" aria-hidden="true" />
              Đã kết nối
            </>
          ) : (
            <span className="text-[#a3261a]">Chưa cấp tài khoản</span>
          )}
        </dd>
        <dt className="text-[#526984]">Đang dạy</dt>
        <dd className="m-0 text-text-primary">{teachingLoadLabel}</dd>
      </dl>
    </aside>
  )
}

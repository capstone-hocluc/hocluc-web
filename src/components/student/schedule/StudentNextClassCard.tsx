import { Video } from '../../console/icons'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMm,
  formatStartsIn,
  formatTimeRangeFromInstants,
  relativeDayLabel,
} from '../../../lib/liveScheduleFormat'
import { localToday } from '../../../lib/scheduling'

interface Props {
  liveClass: ConsoleLiveClass
  nowMs: number
  canJoin: boolean
  joinUrl: string | null
  bookingBusy: boolean
  onBook: () => void
}

export default function StudentNextClassCard({
  liveClass,
  nowMs,
  canJoin,
  joinUrl,
  bookingBusy,
  onBook,
}: Props) {
  const todayKey = localToday()
  const dateKey = dateKeyOfInstant(liveClass.startTime)
  const dayText = `${relativeDayLabel(dateKey, todayKey)}, ${formatDdMm(dateKey)}`
  const timeText = formatTimeRangeFromInstants(liveClass.startTime, liveClass.endTime)

  return (
    <section
      aria-label="Buổi tiếp theo"
      className="flex flex-wrap items-center gap-4.5 rounded-[20px] bg-[#1e88ff] px-6 py-5.5 text-white"
    >
      <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
        <span className="text-[13px] text-[#e3f0ff]">
          Buổi tiếp theo · {formatStartsIn(liveClass.startTime, nowMs)}
        </span>
        <h2 className="m-0 text-[22px] font-bold text-white">{liveClass.title}</h2>
        <span className="text-[15px] text-white/95">
          {dayText} · {timeText}
          {liveClass.teacherName ? ` · ${liveClass.teacherName}` : ''}
        </span>
      </div>

      {liveClass.booked ? (
        canJoin && joinUrl ? (
          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6.5 text-base font-bold text-[#1565c0] no-underline hover:bg-[#e3f0ff]"
          >
            <Video size={20} aria-hidden="true" />
            Vào lớp
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Mở trước giờ bắt đầu 15 phút"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/85 px-6.5 text-base font-bold text-[#1565c0] opacity-70"
          >
            <Video size={20} aria-hidden="true" />
            Vào lớp
          </button>
        )
      ) : (
        <button
          type="button"
          disabled={bookingBusy || liveClass.seatsLeft === 0}
          onClick={onBook}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6.5 text-base font-bold text-[#1565c0] hover:bg-[#e3f0ff] disabled:opacity-60"
        >
          {liveClass.seatsLeft === 0 ? 'Hết chỗ' : bookingBusy ? 'Đang giữ chỗ…' : 'Giữ chỗ'}
        </button>
      )}
    </section>
  )
}

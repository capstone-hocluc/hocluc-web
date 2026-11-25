import { AlertTriangle, Video } from '../console/icons'
import type { ConsoleLiveClass } from '../../services/liveClassService'
import {
  canTeacherStartOrJoin,
  dateKeyOfInstant,
  formatDdMm,
  formatStartsIn,
  formatTimeRangeFromInstants,
  relativeDayLabel,
} from '../../lib/liveScheduleFormat'
import { localToday } from '../../lib/scheduling'

interface Props {
  liveClass: ConsoleLiveClass
  nowMs: number
  busy: boolean
  zoomMissing?: boolean
  onOpenContent: () => void
  onStart: () => void
  onEnd: () => void
}

export default function TeacherNextClassCard({
  liveClass,
  nowMs,
  busy,
  zoomMissing = false,
  onOpenContent,
  onStart,
  onEnd,
}: Props) {
  const todayKey = localToday()
  const dateKey = dateKeyOfInstant(liveClass.startTime)
  const dayText = `${relativeDayLabel(dateKey, todayKey)}, ${formatDdMm(dateKey)}`
  const timeText = formatTimeRangeFromInstants(liveClass.startTime, liveClass.endTime)
  const seatsText = liveClass.capacity
    ? `${liveClass.bookedCount ?? 0}/${liveClass.capacity} học viên giữ chỗ`
    : `${liveClass.bookedCount ?? 0} học viên giữ chỗ`
  const canStart = canTeacherStartOrJoin(liveClass.startTime, liveClass.endTime, liveClass.status, nowMs)
  const isLive = liveClass.status === 'LIVE'

  return (
    <section
      aria-label="Buổi tiếp theo"
      className="flex flex-wrap items-center gap-5 rounded-[18px] bg-[#0b3a82] px-6 py-5.5 text-white"
    >
      <div className="flex min-w-[280px] flex-1 flex-col gap-2">
        <span className="text-[13px] text-[#cfe3ff]">
          Buổi tiếp theo · {formatStartsIn(liveClass.startTime, nowMs)}
        </span>
        <h2 className="m-0 text-[22px] font-bold text-white">{liveClass.title}</h2>
        <span className="text-[15px] text-white/95">
          {dayText} · {timeText} · {seatsText}
        </span>
        {zoomMissing && (
          <a
            href="#teacher-zoom-card"
            className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-[#fff0ee] px-3 py-1 text-[13px] font-semibold text-[#a3261a] underline-offset-2 hover:underline"
          >
            <AlertTriangle size={14} aria-hidden="true" />
            Chưa kết nối Zoom — Kết nối ngay
          </a>
        )}
        {liveClass.needsAttention && (
          <span className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-[#fff1dc] px-2.5 py-1 text-[13px] font-medium text-[#7a3d00]">
            <AlertTriangle size={14} aria-hidden="true" />
            Ngoài giờ rảnh bạn đã khai
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={onOpenContent}
          className="min-h-12 rounded-xl border border-[#6f9bd6] bg-transparent px-4.5 text-[15px] font-semibold text-white hover:bg-white/10 disabled:opacity-50"
        >
          Nội dung buổi
        </button>
        {isLive && (
          <button
            type="button"
            disabled={busy}
            onClick={onEnd}
            className="min-h-12 rounded-xl border border-[#f5b4ad] bg-transparent px-4.5 text-[15px] font-semibold text-white hover:bg-white/10 disabled:opacity-50"
          >
            Kết thúc buổi
          </button>
        )}
        <button
          type="button"
          disabled={busy || !canStart}
          onClick={onStart}
          title={!canStart ? 'Mở trước giờ bắt đầu 15 phút' : undefined}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-bold text-[#0b3a82] hover:bg-[#edf5ff] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Video size={20} aria-hidden="true" />
          Vào dạy
        </button>
      </div>
    </section>
  )
}

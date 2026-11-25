import type { TeacherTodoItem } from '../../hooks/useTeacherSchedule'
import type { ConsoleLiveClass } from '../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMm,
  formatTimeRangeFromInstants,
  relativeDayLabel,
  shortDayLabel,
} from '../../lib/liveScheduleFormat'
import { localToday } from '../../lib/scheduling'

interface Props {
  todos: TeacherTodoItem[]
  onOpenAttendance: (liveClass: ConsoleLiveClass) => void
  onOpenContent: (liveClass: ConsoleLiveClass) => void
}

export default function TeacherTodoPanel({ todos, onOpenAttendance, onOpenContent }: Props) {
  const todayKey = localToday()

  return (
    <aside
      aria-label="Cần làm"
      className="flex w-full shrink-0 flex-col gap-3.5 rounded-2xl border border-card-border bg-card-background p-5 lg:w-[320px]"
    >
      <h2 className="m-0 text-[17px] font-bold text-text-primary">Cần làm</h2>

      {todos.length === 0 ? (
        <p className="m-0 text-sm text-text-tertiary">Không có việc cần xử lý.</p>
      ) : (
        todos.map((item) => {
          const dateKey = dateKeyOfInstant(item.liveClass.startTime)
          if (item.kind === 'attendance') {
            return (
              <div
                key={`att-${item.liveClass.id}`}
                className="flex flex-col gap-2.5 rounded-xl border border-[#e0e9f5] p-3.5"
              >
                <strong className="text-sm text-text-primary">{item.liveClass.title}</strong>
                <span className="text-[13px] text-[#526984]">
                  {relativeDayLabel(dateKey, todayKey)}, {formatDdMm(dateKey)} ·{' '}
                  {formatTimeRangeFromInstants(item.liveClass.startTime, item.liveClass.endTime)}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAttendance(item.liveClass)}
                  className="min-h-11 self-start rounded-xl bg-[#0b3a82] px-4 text-sm font-semibold text-white hover:bg-[#082e68]"
                >
                  Điểm danh
                </button>
              </div>
            )
          }

          return (
            <div
              key={`cnt-${item.liveClass.id}`}
              className="flex flex-col gap-2.5 rounded-xl border border-[#e0e9f5] p-3.5"
            >
              <strong className="text-sm text-text-primary">{item.liveClass.title}</strong>
              <span className="text-[13px] text-[#526984]">
                {shortDayLabel(dateKey)} {formatDdMm(dateKey)} · chưa có nội dung buổi
              </span>
              <button
                type="button"
                onClick={() => onOpenContent(item.liveClass)}
                className="min-h-11 self-start rounded-xl border border-card-border bg-card-background px-4 text-sm font-semibold text-text-primary hover:bg-background-gray-secondary"
              >
                Thêm nội dung
              </button>
            </div>
          )
        })
      )}
    </aside>
  )
}

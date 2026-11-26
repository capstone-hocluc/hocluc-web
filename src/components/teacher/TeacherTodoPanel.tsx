import Button from '../console/button'
import Panel from '../console/panel'
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
    <Panel title="Cần làm" className="w-full">
      {todos.length === 0 ? (
        <p className="text-sm text-text-tertiary">Không có việc cần xử lý.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {todos.map((item) => {
            const dateKey = dateKeyOfInstant(item.liveClass.startTime)
            const attendance = item.kind === 'attendance'
            return (
              <li
                key={`${item.kind}-${item.liveClass.id}`}
                className="flex flex-col gap-2 rounded-xl border border-card-border p-3"
              >
                <strong className="text-sm font-medium text-text-primary">{item.liveClass.title}</strong>
                <span className="text-xs text-text-tertiary">
                  {attendance
                    ? `${relativeDayLabel(dateKey, todayKey)}, ${formatDdMm(dateKey)} · ${formatTimeRangeFromInstants(item.liveClass.startTime, item.liveClass.endTime)}`
                    : `${shortDayLabel(dateKey)} ${formatDdMm(dateKey)} · chưa có nội dung buổi`}
                </span>
                {attendance ? (
                  <Button size="sm" className="self-start" onClick={() => onOpenAttendance(item.liveClass)}>
                    Điểm danh
                  </Button>
                ) : (
                  <Button size="sm" appearance="outline" className="self-start" onClick={() => onOpenContent(item.liveClass)}>
                    Thêm nội dung
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

import Button from '../console/button'
import Panel from '../console/panel'
import type { TeacherTodoItem } from '../../hooks/useTeacherSchedule'
import type { ConsoleLiveClass } from '../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMm,
  shortDayLabel,
} from '../../lib/liveScheduleFormat'

interface Props {
  todos: TeacherTodoItem[]
  onOpenContent: (liveClass: ConsoleLiveClass) => void
}

export default function TeacherTodoPanel({ todos, onOpenContent }: Props) {
  return (
    <Panel title="Cần làm" className="w-full">
      {todos.length === 0 ? (
        <p className="text-sm text-text-tertiary">Không có việc cần xử lý.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {todos.map((item) => {
            const dateKey = dateKeyOfInstant(item.liveClass.startTime)
            return (
              <li
                key={`${item.kind}-${item.liveClass.id}`}
                className="flex flex-col gap-2 rounded-xl border border-card-border p-3"
              >
                <strong className="text-sm font-medium text-text-primary">{item.liveClass.title}</strong>
                <span className="text-xs text-text-tertiary">
                  {`${shortDayLabel(dateKey)} ${formatDdMm(dateKey)} · chưa có nội dung buổi`}
                </span>
                <Button size="sm" appearance="outline" className="self-start" onClick={() => onOpenContent(item.liveClass)}>
                  Thêm nội dung
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

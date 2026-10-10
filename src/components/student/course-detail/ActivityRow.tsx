import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleAlert,
  ClipboardCheck,
  Lock,
  Play,
  Radio,
  Target,
} from '../../console/icons'
import { cva } from 'class-variance-authority'
import { getActivityRouteType } from '../../../data/courseLookup'
import { cn } from '../../../lib/cn'
import StatusBadge from '../../ui/StatusBadge'
import { getActivityMessage, getActivityMeta } from './activityUtils'
import type { CourseActivity } from './types'

const activityIcons = {
  Video: Play,
  'Bài tập': ClipboardCheck,
  'Mini Test': Target,
  'Mock Test': Target,
  'Buổi giải đề': Radio,
}

const statusMeta = {
  completed: { label: 'Đã hoàn thành', icon: CheckCircle2 },
  'in-progress': { label: 'Đang học', icon: Play },
  'not-started': { label: 'Chưa làm', icon: Circle },
  locked: { label: 'Đang khóa', icon: Lock },
  overdue: { label: 'Quá hạn', icon: CircleAlert },
}

// Icon tile colour per activity type. A locked row only greys the tile when its
// type has no colour of its own (the typed colours win, as before).
const typeTone: Record<string, string> = {
  Video: 'bg-primary-soft text-primary',
  'Bài tập': 'bg-practice-soft text-success',
  'Mini Test': 'bg-assess-soft text-violet',
  'Mock Test': 'bg-danger-soft text-danger',
  'Buổi giải đề': 'bg-danger-soft text-danger',
}

const row = cva(
  'grid w-full cursor-pointer grid-cols-[34px_minmax(0,1fr)_auto_18px] items-center gap-[11px] border-b border-lock-soft bg-surface px-3 py-[11px] text-left last:border-b-0 hover:bg-surface-sky max-[760px]:grid-cols-[34px_minmax(0,1fr)]',
  {
    variants: {
      status: {
        completed: '',
        'not-started': '',
        locked: 'cursor-default hover:bg-surface',
        'in-progress':
          'bg-surface-brand shadow-[inset_3px_0_0_var(--color-primary)] hover:bg-surface-brand',
        overdue: 'bg-danger-soft hover:bg-danger-soft',
      },
    },
  }
)

interface ActivityRowProps {
  activity: CourseActivity
  onAction: (message: string) => void
  onOpenActivity: (activity: CourseActivity) => void
}

// One activity (video, exercise, test, live review) of a chapter.
function ActivityRow({ activity, onAction, onOpenActivity }: ActivityRowProps) {
  const Icon = activityIcons[activity.type] || BookOpen
  const StatusIcon = statusMeta[activity.status]?.icon || Circle
  const meta = getActivityMeta(activity)
  const isLocked = activity.status === 'locked'
  const isCurrent = activity.status === 'in-progress'
  const canOpen = !isLocked && getActivityRouteType(activity)
  const lockedText = isLocked ? 'text-text-subtle' : ''

  return (
    <button
      type="button"
      className={cn(row({ status: activity.status as keyof typeof statusMeta }))}
      onClick={() => {
        if (isLocked) {
          onAction('Bạn cần hoàn thành nội dung trước đó để mở khóa.')
          return
        }

        if (!getActivityRouteType(activity)) {
          onAction(getActivityMessage(activity))
          return
        }

        onOpenActivity(activity)
      }}
    >
      <span
        className={cn(
          'grid size-8 place-items-center rounded-[11px]',
          typeTone[activity.type] ??
            (isLocked ? 'bg-lock-soft text-text-subtle' : 'bg-primary-soft text-primary')
        )}
      >
        <Icon size={15} />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <small className={cn('text-[11px] font-semibold text-text-secondary', lockedText)}>
          {activity.type}
        </small>
        <strong
          className={cn('text-[13px] leading-[1.35] font-semibold text-text-heading', lockedText)}
        >
          {activity.title}
        </strong>
        {meta.length > 0 && (
          <em
            className={cn(
              'text-[11.5px] leading-[1.4] font-normal text-text-secondary not-italic',
              lockedText
            )}
          >
            {meta.join(' · ')}
          </em>
        )}
      </span>
      <span className="flex items-center gap-2 justify-self-end whitespace-nowrap max-[760px]:col-start-2 max-[760px]:flex-wrap max-[760px]:justify-self-start max-[760px]:text-center">
        {activity.score && <b className="text-[12px] font-bold text-success">{activity.score}</b>}
        <span className="inline-flex items-center gap-[5px] text-[11px] font-medium text-text-secondary">
          <StatusIcon size={14} />
          {statusMeta[activity.status]?.label || activity.status}
        </span>
        {isCurrent && (
          <StatusBadge tone="primary" size="sm" className="px-[7px] py-1 text-[10px] font-bold">
            Đang học
          </StatusBadge>
        )}
      </span>
      {canOpen && <ChevronRight className="text-text-subtle max-[760px]:hidden" size={16} />}
    </button>
  )
}

export default ActivityRow

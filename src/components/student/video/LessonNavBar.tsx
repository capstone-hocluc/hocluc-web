import { ChevronLeft, ChevronRight, ClipboardList } from '../../console/icons'
import { cn } from '../../../lib/cn'
import Button from '../../ui/Button'
import type { VideoActivity, VideoContext, VideoLessonItem } from './types'

interface LessonNavBarProps {
  context: VideoContext
  previous: VideoLessonItem | null
  next: VideoLessonItem | null
  onOpenDrawer: () => void
  onCourses: () => void
  onNavigateActivity: (activity: VideoActivity) => void
  onComplete: () => void
}

const navButton =
  'h-auto min-h-[34px] gap-[7px] rounded-xl px-3 text-center text-xs leading-normal font-semibold whitespace-normal max-[760px]:px-[9px]'

// Top bar of the video screen: lesson list, breadcrumb, previous / next lesson.
function LessonNavBar({
  context,
  previous,
  next,
  onOpenDrawer,
  onCourses,
  onNavigateActivity,
  onComplete,
}: LessonNavBarProps) {
  return (
    <div className="grid h-[54px] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line-card bg-surface-sky px-5 max-[760px]:h-auto max-[760px]:min-h-14 max-[760px]:grid-cols-[1fr_auto] max-[760px]:gap-2 max-[760px]:px-3 max-[760px]:py-2">
      <Button
        appearance="outline"
        size="sm"
        className={cn(navButton, 'border-line-blue')}
        onClick={onOpenDrawer}
      >
        <ClipboardList />
        Danh sách bài học
      </Button>

      <div className="flex min-w-0 items-center gap-[5px] overflow-hidden text-xs leading-normal text-text-secondary max-[760px]:order-3 max-[760px]:col-span-full">
        <button
          type="button"
          className="cursor-pointer font-semibold whitespace-nowrap text-primary"
          onClick={onCourses}
        >
          Khóa học của tôi
        </button>
        <ChevronRight size={13} />
        <span className="truncate">{context.course.title}</span>
        <ChevronRight size={13} />
        <span className="truncate">{context.subjectTitle}</span>
        <ChevronRight size={13} />
        <span className="truncate">{context.chapterTitle}</span>
        <ChevronRight size={13} />
        <strong className="truncate font-semibold text-text-heading">
          {context.activity.title}
        </strong>
      </div>

      <div className="flex items-center gap-2 max-[760px]:justify-end">
        <Button
          appearance="outline"
          size="sm"
          className={cn(navButton, 'border-line-blue')}
          disabled={!previous}
          onClick={() => previous && onNavigateActivity(previous.activity)}
        >
          <ChevronLeft />
          Bài trước
        </Button>
        <Button
          size="sm"
          className={navButton}
          onClick={() => (next ? onNavigateActivity(next.activity) : onComplete())}
        >
          {next ? 'Bài tiếp' : 'Hoàn thành'}
          {next && <ChevronRight />}
        </Button>
      </div>
    </div>
  )
}

export default LessonNavBar

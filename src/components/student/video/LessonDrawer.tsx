import { useMemo } from 'react'
import { CheckCircle2, Circle, Lock, Play } from '../../console/icons'
import { cn } from '../../../lib/cn'
import { Sheet, SheetBody } from '../../ui/Sheet'
import type { VideoActivity, VideoContext, VideoLessonItem } from './types'

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={18} className="text-practice" />
  if (status === 'locked') return <Lock size={18} />
  if (status === 'in-progress') return <Play size={18} className="text-primary" />
  return <Circle size={18} />
}

interface LessonDrawerProps {
  open: boolean
  context: VideoContext
  lessons: VideoLessonItem[]
  onClose: () => void
  onLockedClick: (message: string) => void
  /** Returns true when the activity could be opened (drawer then closes). */
  onNavigateActivity: (activity: VideoActivity) => boolean
}

// "Nội dung khóa học": every lesson of the course grouped by chapter.
function LessonDrawer({
  open,
  context,
  lessons,
  onClose,
  onLockedClick,
  onNavigateActivity,
}: LessonDrawerProps) {
  const grouped = useMemo(() => {
    const groups = new Map<string, VideoLessonItem[]>()
    lessons.forEach((item) => {
      const key = item.chapterTitle || 'Nội dung học'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)?.push(item)
    })
    return Array.from(groups.entries())
  }, [lessons])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nội dung khóa học"
      closeLabel="Đóng danh sách bài học"
    >
      <SheetBody className="flex flex-col gap-5 p-4">
        {grouped.map(([chapterTitle, items]) => (
          <section className="grid gap-2" key={chapterTitle}>
            <strong className="text-base font-semibold text-text-heading">{chapterTitle}</strong>
            {items.map((item) => {
              const isCurrent = item.activity.id === context.activity.id
              const locked = item.activity.status === 'locked'
              return (
                <button
                  key={item.activity.id}
                  type="button"
                  className={cn(
                    'grid grid-cols-[20px_minmax(0,1fr)] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm leading-[1.4] font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                    isCurrent
                      ? 'border-transparent bg-surface-brand text-primary-text'
                      : 'border-line bg-surface text-text-body hover:border-primary-bright hover:bg-surface-brand',
                    locked
                      ? 'cursor-default bg-surface-soft text-lock hover:border-line hover:bg-surface-soft'
                      : 'cursor-pointer'
                  )}
                  onClick={() => {
                    if (locked) {
                      onLockedClick('Bạn cần hoàn thành nội dung trước đó để mở khóa.')
                      return
                    }
                    if (onNavigateActivity(item.activity)) onClose()
                  }}
                >
                  <StatusIcon status={item.activity.status} />
                  <span>
                    {item.activity.type} · {item.activity.title}
                  </span>
                </button>
              )
            })}
          </section>
        ))}
      </SheetBody>
    </Sheet>
  )
}

export default LessonDrawer

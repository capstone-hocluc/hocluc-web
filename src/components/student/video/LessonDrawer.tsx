import { useMemo } from 'react'
import { CheckCircle2, Circle, Lock, Play } from '../../console/icons'
import { cn } from '../../../lib/cn'
import { Sheet, SheetBody } from '../../ui/Sheet'
import type { VideoActivity, VideoContext, VideoLessonItem } from './types'

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={14} />
  if (status === 'locked') return <Lock size={14} />
  if (status === 'in-progress') return <Play size={14} />
  return <Circle size={14} />
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
      <SheetBody className="flex flex-col gap-3.5 p-3.5">
        {grouped.map(([chapterTitle, items]) => (
          <section className="grid gap-2" key={chapterTitle}>
            <strong className="text-[13px] font-bold text-text-heading">{chapterTitle}</strong>
            {items.map((item) => {
              const isCurrent = item.activity.id === context.activity.id
              const locked = item.activity.status === 'locked'
              return (
                <button
                  key={item.activity.id}
                  type="button"
                  className={cn(
                    'grid grid-cols-[20px_minmax(0,1fr)] items-center gap-2 rounded-xl border px-2.5 py-[9px] text-left text-xs leading-[18px] font-medium',
                    isCurrent
                      ? 'border-line-brand bg-surface-brand text-primary'
                      : 'border-line bg-surface-tint text-text-dim',
                    locked ? 'cursor-default text-lock' : 'cursor-pointer'
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

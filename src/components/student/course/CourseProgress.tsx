import type { ReactNode } from 'react'
import Progress from '../../ui/Progress'
import { cn } from '../../../lib/cn'

interface CourseProgressProps {
  /** 0-100 learning progress; clamped by <Progress>. */
  value: number
  label?: ReactNode
  className?: string
}

// "Tiến độ học tập ........ 33%" with the bar underneath. Used by the course
// cards; the Course Study hero and curriculum headers render their own
// heading layout around <Progress> directly.
function CourseProgress({ value, label = 'Tiến độ học tập', className }: CourseProgressProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2.5 text-[13px] font-extrabold text-text-secondary">
        <span>{label}</span>
        <strong className="text-sm font-black text-primary-text">{value}%</strong>
      </div>
      <Progress value={value} aria-label={typeof label === 'string' ? label : undefined} />
    </div>
  )
}

export default CourseProgress

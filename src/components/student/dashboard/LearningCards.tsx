import type { ReactNode } from 'react'
import { ArrowRight, Star } from '../../console/icons'
import Button from '../../ui/Button'
import { ctaButtonClass } from './cta'

const panel = 'mt-4 rounded-2xl border border-line-card bg-surface p-5 shadow-card'

interface RecentLessonCardProps {
  badge: ReactNode
  title: ReactNode
  /** Line under the title: course, progress and score. */
  meta: ReactNode
  actionLabel: string
  onAction: () => void
}

// "Bài học gần nhất": lesson number tile, title/meta and a green action.
export function RecentLessonCard({
  badge,
  title,
  meta,
  actionLabel,
  onAction,
}: RecentLessonCardProps) {
  return (
    <article
      className={`${panel} grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-5 max-[760px]:grid-cols-1`}
    >
      <div className="grid h-[76px] w-[72px] place-content-center place-items-center rounded-[20px] bg-practice-soft text-center font-bold text-practice">
        <strong className="text-[28px] leading-none">{badge}</strong>
        <span className="mt-1 rounded-md bg-practice px-1.5 py-0.5 text-xs text-surface uppercase">
          Bài học
        </span>
      </div>
      <div>
        <strong className="block text-lg leading-[1.3] font-bold text-text-heading">{title}</strong>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-text-body">{meta}</p>
      </div>
      <Button
        variant="primary"
        className="h-10 gap-1.5 px-4 text-sm max-[760px]:w-full [&>svg]:size-[18px]"
        onClick={onAction}
      >
        {actionLabel} <ArrowRight size={18} />
      </Button>
    </article>
  )
}

export function StarScore({ children }: { children: ReactNode }) {
  return (
    <>
      <Star size={17} className="fill-accent text-accent" /> {children}
    </>
  )
}

interface StudyPlanCardProps {
  text: ReactNode
  actionLabel: string
  onAction: () => void
}

// "Kế hoạch ôn thi": short description with a call-to-action.
export function StudyPlanCard({ text, actionLabel, onAction }: StudyPlanCardProps) {
  return (
    <div className={`${panel} bg-surface-brand`}>
      <p className="mb-4 max-w-[760px] text-[15px] leading-[1.6] text-text-body">{text}</p>
      <Button className={ctaButtonClass} onClick={onAction}>
        {actionLabel} <ArrowRight size={17} />
      </Button>
    </div>
  )
}

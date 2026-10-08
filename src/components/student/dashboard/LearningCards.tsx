import type { ReactNode } from 'react'
import { ArrowRight, Star } from 'lucide-react'
import Button from '../../ui/Button'
import { ctaButtonClass } from './cta'

const panel = 'mt-4 rounded-2xl border border-line-card p-[18px]'

interface RecentLessonCardProps {
  badge: ReactNode
  title: ReactNode
  /** Line under the title: course, progress and score. */
  meta: ReactNode
  actionLabel: string
  onAction: () => void
}

// "Bài học gần nhất": lesson number badge, title/meta and a green text action.
export function RecentLessonCard({
  badge,
  title,
  meta,
  actionLabel,
  onAction,
}: RecentLessonCardProps) {
  return (
    <article
      className={`${panel} grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-[18px] bg-white/92 max-[760px]:grid-cols-1`}
    >
      <div className="grid h-[72px] w-16 place-content-center place-items-center rounded-[20px] border-4 border-success text-center font-black text-success">
        <strong className="text-[26px] leading-none">{badge}</strong>
        <span className="mt-[3px] rounded-md bg-success px-1.5 py-[3px] text-[9px] text-surface uppercase">
          Bài học
        </span>
      </div>
      <div>
        <strong className="block text-base font-extrabold text-text-heading">{title}</strong>
        <p className="mt-2 flex items-center gap-2 text-[13px] text-text-body">{meta}</p>
      </div>
      <Button
        appearance="ghost"
        className="h-auto gap-1.5 border-0 p-0 text-xs leading-normal font-extrabold text-practice hover:bg-transparent max-[760px]:w-full [&>svg]:size-[18px]"
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
    <div className={`${panel} bg-white/72`}>
      <p className="mb-3.5 max-w-[760px] text-sm leading-[1.55] text-text-secondary">{text}</p>
      <Button className={ctaButtonClass} onClick={onAction}>
        {actionLabel} <ArrowRight size={17} />
      </Button>
    </div>
  )
}

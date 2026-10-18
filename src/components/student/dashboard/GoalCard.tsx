import { ArrowRight, Lock, Target } from '../../console/icons'
import Button from '../../ui/Button'
import { ctaButtonClass } from './cta'

interface GoalCardProps {
  title: string
  description: string
  lockedNote: string
  onStart: () => void
}

function GoalCard({ title, description, lockedNote, onStart }: GoalCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line-card bg-surface">
      <div className="flex items-center gap-3 border-b border-line-soft bg-surface-brand px-6 py-4">
        <Target size={20} className="shrink-0 text-primary-text" aria-hidden="true" />
        <h2 className="text-base font-bold text-text-heading">Mục tiêu hôm nay</h2>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between gap-6 max-[760px]:flex-col max-[760px]:items-start">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-text-heading">{title}</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-body">{description}</p>
          </div>
          <Button className={ctaButtonClass} onClick={onStart}>
            Bắt đầu <ArrowRight size={18} />
          </Button>
        </div>
        <p className="mt-6 flex items-start gap-2 border-t border-line-soft pt-4 text-xs leading-5 text-text-muted">
          <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{lockedNote}</span>
        </p>
      </div>
    </section>
  )
}

export default GoalCard

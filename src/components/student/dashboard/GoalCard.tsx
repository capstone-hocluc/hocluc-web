import { ArrowRight, Flame, Lock, Target } from '../../console/icons'
import OwlWelcome from '../../common/OwlWelcome'
import { cn } from '../../../lib/cn'
import Button from '../../ui/Button'
import { ctaButtonClass } from './cta'

interface GoalCardProps {
  title: string
  description: string
  lockedNote: string
  onStart: () => void
}

// "Mục tiêu hôm nay": blue hero card with the owl coach and the daily goal.
function GoalCard({ title, description, lockedNote, onStart }: GoalCardProps) {
  return (
    <section className="relative rounded-[18px] bg-linear-to-b from-primary-bright via-link to-link px-4 pt-5 pb-px shadow-[0_18px_34px_rgba(28, 176, 246,0.16)] after:absolute after:top-2 after:-right-7 after:size-[132px] after:rounded-[46%] after:bg-white/18 after:content-['']">
      <div className="relative z-1 mb-3 grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 max-[760px]:grid-cols-1">
        <div className="inline-flex min-w-0 -translate-y-5 items-center gap-2 text-xl leading-[1.2] font-extrabold text-surface">
          <Flame className="size-4 shrink-0 fill-streak text-streak" />
          <span>Mục tiêu hôm nay</span>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2.5">
          <div className="absolute -top-[38px] right-[105px] z-5 max-w-[298px] rounded-[10px] bg-primary-dark px-3.5 py-2.5 text-[15px] leading-[1.35] font-bold text-surface shadow-[0_8px_18px_rgba(16,72,238,0.22)]">
            Bắt tay vào mục tiêu đầu tiên thôi!
          </div>

          <div className="relative z-1 grid h-[54px] w-[74px] place-items-center self-start justify-self-end max-[760px]:hidden">
            <OwlWelcome className="block h-[150px] w-[150px] max-w-none -translate-x-[42px] -translate-y-[72px] drop-shadow-[0_16px_18px_rgba(17,24,58,0.18)]" />
          </div>
        </div>
      </div>

      <div className="relative z-2 -translate-y-[35px] rounded-[14px] bg-surface px-3.5 pt-2.5 pb-3.5">
        <div className="relative z-1 grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border-2 border-link bg-surface p-3 max-[760px]:grid-cols-1">
          <span className="grid size-[34px] place-items-center rounded-full border-[1.5px] border-dashed border-line text-primary">
            <Target size={22} />
          </span>

          <div>
            <strong className="block text-[15px] leading-[1.3] font-extrabold text-text-heading">
              {title}
            </strong>
            <p className="mt-1 text-xs leading-[1.45] text-text-body">{description}</p>
          </div>

          <Button
            className={cn(ctaButtonClass, 'max-[760px]:w-full [&>svg]:size-[18px]')}
            onClick={onStart}
          >
            Bắt đầu
            <ArrowRight size={18} />
          </Button>
        </div>

        <div className="relative z-1 mt-2.5 mr-0.5 ml-1 flex items-center gap-2 text-xs leading-[1.4] text-text-subtle">
          <Lock size={18} />
          <span>{lockedNote}</span>
        </div>
      </div>
    </section>
  )
}

export default GoalCard

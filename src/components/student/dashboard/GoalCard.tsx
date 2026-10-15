import { ArrowRight, Lock, Target } from '../../console/icons'
import SubjectAvatarIcon from '../../common/SubjectAvatarIcon'
import FlameLottie from '../common/FlameLottie'
import { cn } from '../../../lib/cn'
import Button from '../../ui/Button'
import { ctaButtonClass } from './cta'

interface GoalCardProps {
  title: string
  description: string
  lockedNote: string
  onStart: () => void
}

// "Mục tiêu hôm nay": brand-blue ledge card with a friendly avatar, a speech bubble and the daily goal.
function GoalCard({ title, description, lockedNote, onStart }: GoalCardProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary p-5 shadow-[0_5px_0_#0797d6] after:pointer-events-none after:absolute after:-top-10 after:-right-10 after:size-44 after:rounded-full after:bg-white/15 after:content-['']">
      <div className="relative z-1 mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="inline-flex items-center gap-2 text-2xl leading-[1.2] font-black text-white">
            <FlameLottie className="-my-2 h-11 w-10 shrink-0" />
            <span>Mục tiêu hôm nay</span>
          </div>
          <p className="w-fit max-w-[298px] rounded-2xl border-[1.5px] border-[#d5e8f4] bg-surface px-4 py-2 text-sm leading-[1.4] font-bold text-text-heading">
            Bắt tay vào mục tiêu đầu tiên thôi!
          </p>
        </div>
        <div className="grid size-[76px] shrink-0 place-items-center max-[760px]:hidden">
          <SubjectAvatarIcon
            type="flower"
            className="block size-[76px] drop-shadow-[0_10px_12px_rgba(7,76,120,0.25)]"
          />
        </div>
      </div>

      <div className="relative z-2 rounded-2xl bg-surface p-4">
        <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 max-[760px]:grid-cols-1">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary-text">
            <Target size={22} />
          </span>

          <div>
            <strong className="block text-base leading-[1.3] font-black text-text-heading">
              {title}
            </strong>
            <p className="mt-1 text-sm leading-[1.5] text-text-body">{description}</p>
          </div>

          <Button
            className={cn(ctaButtonClass, 'max-[760px]:w-full [&>svg]:size-[18px]')}
            onClick={onStart}
          >
            Bắt đầu
            <ArrowRight size={18} />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t-[1.5px] border-line-soft pt-3 text-[13px] leading-[1.4] text-text-subtle">
          <Lock size={16} className="shrink-0" />
          <span>{lockedNote}</span>
        </div>
      </div>
    </section>
  )
}

export default GoalCard

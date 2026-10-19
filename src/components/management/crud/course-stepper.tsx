import { cn } from '../../../lib/cn'
import { Check } from '../../console/icons'
import type { CourseStep, CourseStepTab } from './course-steps'

const STATE_TEXT: Record<CourseStep['state'], string> = {
  done: 'đã xong',
  current: 'bước hiện tại',
  todo: 'chưa tới',
  unknown: 'đang tải',
}

// Course route: a track of numbered circles joined by lines, with one small card per step underneath.
// A step with a tab jumps there when clicked. Below `sm` the steps stack as a list.
export default function CourseStepper({
  steps,
  onGo,
}: {
  steps: CourseStep[]
  onGo: (tab: CourseStepTab) => void
}) {
  return (
    <section aria-label="Các bước đưa khóa lên bán">
      <ol className="flex flex-col gap-3 sm:grid sm:grid-cols-5 sm:gap-0">
        {steps.map((step, index) => {
          const done = step.state === 'done'
          const active = step.state === 'current'
          const last = index === steps.length - 1
          const card = (
            <>
              <span className="block text-[11px] leading-4 font-medium tracking-wide text-text-tertiary uppercase">
                Bước {index + 1}
              </span>
              <span
                className={cn(
                  'block text-sm leading-5 font-medium',
                  active || done ? 'text-text-primary' : 'text-text-secondary'
                )}
              >
                {step.title}
                <span className="sr-only"> — {STATE_TEXT[step.state]}</span>
              </span>
            </>
          )
          const cardStyle = cn(
            'block w-full rounded-lg px-3 py-2.5 text-left',
            active ? 'bg-brand-500/10' : 'bg-background-gray-secondary/60'
          )
          return (
            <li
              key={step.id}
              aria-current={active ? 'step' : undefined}
              className={cn('flex items-start gap-3 sm:flex-col sm:gap-3', !last && 'sm:pr-3')}
            >
              <div className="flex items-center sm:w-full sm:-mr-3">
                <span
                  aria-hidden
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium',
                    done && 'border-success bg-success text-white',
                    active && 'border-brand-500 bg-brand-500 text-white',
                    !done && !active && 'border-text-tertiary/50 text-text-secondary'
                  )}
                >
                  {done ? <Check size={16} /> : index + 1}
                </span>
                {!last && (
                  <span
                    aria-hidden
                    className={cn(
                      'mx-2 hidden h-0.5 flex-1 rounded-full sm:block',
                      done ? 'bg-success' : 'bg-text-tertiary/30'
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
                {step.tab ? (
                  <button
                    type="button"
                    onClick={() => onGo(step.tab!)}
                    className={cn(
                      cardStyle,
                      'cursor-pointer transition-colors hover:bg-background-gray-secondary focus-visible:outline-2 focus-visible:outline-brand-500'
                    )}
                  >
                    {card}
                  </button>
                ) : (
                  <div className={cardStyle}>{card}</div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

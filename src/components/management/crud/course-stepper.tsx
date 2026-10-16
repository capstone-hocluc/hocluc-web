import { cn } from '../../../lib/cn'
import { Check } from '../../console/icons'
import type { CourseStep, CourseStepTab } from './course-steps'

const CAPTION: Record<CourseStep['state'], string> = {
  done: 'Hoàn tất',
  current: 'Đang thực hiện',
  todo: 'Chưa tới',
  unknown: 'Đang tải',
}

// Course route as numbered steps, each with a short state caption. A step with a tab jumps there when clicked.
// Wide screens: one row joined by lines. Narrower: a plain list.
export default function CourseStepper({
  steps,
  onGo,
}: {
  steps: CourseStep[]
  onGo: (tab: CourseStepTab) => void
}) {
  return (
    <section aria-label="Các bước đưa khóa lên bán">
      <ol className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5 min-[1400px]:flex min-[1400px]:items-center min-[1400px]:gap-0">
        {steps.map((step, index) => {
          const done = step.state === 'done'
          const active = step.state === 'current'
          const last = index === steps.length - 1
          const body = (
            <>
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
              <span className="flex min-w-0 flex-col text-left">
                <span
                  className={cn(
                    'text-sm leading-5 font-medium whitespace-nowrap',
                    active || done ? 'text-text-primary' : 'text-text-secondary'
                  )}
                >
                  {step.title}
                </span>
                <span
                  className={cn(
                    'text-xs leading-4',
                    active ? 'text-brand-500' : done ? 'text-success' : 'text-text-tertiary'
                  )}
                >
                  {CAPTION[step.state]}
                </span>
              </span>
            </>
          )
          const layout =
            'flex w-full items-center gap-3 rounded-lg p-2 text-left lg:flex-col lg:items-start lg:gap-2 min-[1400px]:flex-row min-[1400px]:items-center min-[1400px]:gap-3'
          return (
            <li
              key={step.id}
              aria-current={active ? 'step' : undefined}
              className={cn('flex items-center', !last && 'min-[1400px]:flex-1')}
            >
              {step.tab ? (
                <button
                  type="button"
                  onClick={() => onGo(step.tab!)}
                  className={cn(
                    layout,
                    'cursor-pointer hover:bg-background-gray-secondary focus-visible:outline-2 focus-visible:outline-brand-500 min-[1400px]:w-auto'
                  )}
                >
                  {body}
                </button>
              ) : (
                <div className={cn(layout, 'min-[1400px]:w-auto')}>{body}</div>
              )}
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    'mx-2 hidden h-0.5 min-w-6 flex-1 rounded-full min-[1400px]:block',
                    done ? 'bg-success' : 'bg-text-tertiary/30'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

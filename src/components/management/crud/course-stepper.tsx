import { cn } from '../../../lib/cn'
import { Check } from '../../console/icons'
import type { CourseStep, CourseStepTab } from './course-steps'

// Course route as numbered steps. A step with a tab jumps there when clicked.
export default function CourseStepper({
  steps,
  onGo,
}: {
  steps: CourseStep[]
  onGo: (tab: CourseStepTab) => void
}) {
  const current = steps.find((step) => step.state === 'current')
  return (
    <section
      aria-label="Các bước đưa khóa lên bán"
      className="rounded-xl border border-card-border bg-card-background p-5"
    >
      <ol className="grid gap-1 sm:grid-cols-5 sm:gap-0">
        {steps.map((step, index) => {
          const done = step.state === 'done'
          const active = step.state === 'current'
          const last = index === steps.length - 1
          const body = (
            <>
              <span className="flex items-center sm:w-full">
                <span
                  aria-hidden
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium',
                    done && 'border-success bg-success text-white',
                    active && 'border-brand-500 bg-brand-500 text-white',
                    !done && !active && 'border-card-border text-text-tertiary'
                  )}
                >
                  {done ? <Check size={16} /> : index + 1}
                </span>
                {!last && (
                  <span
                    aria-hidden
                    className={cn(
                      'mx-2 hidden h-0.5 flex-1 rounded-full sm:block',
                      done ? 'bg-success' : 'bg-card-border'
                    )}
                  />
                )}
              </span>
              <span
                className={cn(
                  'min-w-0 text-left text-sm font-medium sm:mt-2',
                  active || done ? 'text-text-primary' : 'text-text-tertiary'
                )}
              >
                {step.title}
                <span className="sr-only">
                  {done ? ' — đã xong' : active ? ' — bước hiện tại' : ' — chưa tới'}
                </span>
              </span>
            </>
          )
          const layout =
            'flex w-full items-center gap-3 rounded-lg p-2 sm:flex-col sm:items-start sm:gap-0'
          return (
            <li key={step.id} aria-current={active ? 'step' : undefined} className="flex">
              {step.tab ? (
                <button
                  type="button"
                  onClick={() => onGo(step.tab!)}
                  className={cn(
                    layout,
                    'cursor-pointer hover:bg-background-gray-secondary focus-visible:outline-2 focus-visible:outline-brand-500'
                  )}
                >
                  {body}
                </button>
              ) : (
                <div className={layout}>{body}</div>
              )}
            </li>
          )
        })}
      </ol>
      {current?.note && (
        <p className="mt-3 border-t border-card-border pt-3 text-sm text-text-tertiary">
          <strong className="font-medium text-text-primary">Tiếp theo: {current.title}.</strong>{' '}
          {current.note}
        </p>
      )}
    </section>
  )
}

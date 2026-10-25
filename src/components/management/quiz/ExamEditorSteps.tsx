import { cn } from '../../../lib/cn'

const EXAM_EDITOR_STEPS = ['Thông tin và quy định', 'Đề PDF', 'Các phần và câu hỏi'] as const

/** Where the editor is in its three steps, as a row for the workspace's top bar; a step before the current one is marked done. */
export default function ExamEditorSteps({ current, onSelect, disabled }: {
  current: number
  onSelect: (step: number) => void
  disabled?: boolean
}) {
  return (
    <ol aria-label="Các bước soạn đề" className="m-0 flex w-full list-none items-center gap-1 overflow-x-auto p-0 lg:justify-center">
      {EXAM_EDITOR_STEPS.map((label, index) => {
        const active = current === index
        const done = index < current
        const last = index === EXAM_EDITOR_STEPS.length - 1
        return (
          <li key={label} className="flex shrink-0 items-center gap-1">
            <button type="button" aria-current={active ? 'step' : undefined} disabled={disabled} onClick={() => onSelect(index)}
              className={cn(
                'flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-2 py-1.5 text-left hover:bg-background-gray-secondary focus-visible:outline-2 focus-visible:-outline-offset-2! focus-visible:outline-primary',
                disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
              )}>
              <span aria-hidden="true" className={cn('grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                done ? 'border-badge-success-text/40 bg-badge-success-bg text-badge-success-text' : active ? 'border-transparent bg-primary-soft text-primary' : 'border-card-border bg-card-background text-text-tertiary')}>
                {done ? '✓' : index + 1}
              </span>
              <span className={cn('text-sm whitespace-nowrap', active ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary max-sm:sr-only')}>{label}</span>
            </button>
            {!last && <span aria-hidden="true" className={cn('h-0.5 w-6 shrink-0 rounded-full', done ? 'bg-badge-success-text/40' : 'bg-card-border')} />}
          </li>
        )
      })}
    </ol>
  )
}

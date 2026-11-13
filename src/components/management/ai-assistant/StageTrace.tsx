import { useId, useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import type { AiTraceItem, AiTraceStage, AiTraceState } from './exam-format'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Loader2,
} from '../../console/icons'

const STATE_ICON = {
  done: CheckCircle2,
  running: Loader2,
  pending: Circle,
} as const

const STATE_CLASS: Record<AiTraceState, string> = {
  done: 'text-badge-success-text',
  running: 'text-primary-text animate-spin motion-reduce:animate-none',
  pending: 'text-icon-tertiary',
}

function StageIcon({ state = 'done' }: { state?: AiTraceState }) {
  const Icon = STATE_ICON[state]
  return <Icon size={14} strokeWidth={1.8} className={STATE_CLASS[state]} aria-hidden />
}

/**
 * DeepTutor's TracePresentation: explore, plan, write each question, validate and repair. The status line the
 * stages belong to ("Trợ lý AI đang xử lý") is the head of the list and folds it; each stage hangs under it on
 * one rail, its icon in the column of the status orb, so status and stages read as one block.
 */
export default function StageTrace({
  stages,
  header = <span>Quy trình xử lý</span>,
}: {
  stages: readonly AiTraceStage[]
  /** The status line: the orb and its words. */
  header?: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const listId = useId()

  return (
    <section className="min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-lg text-left text-sm leading-none font-semibold text-text-tertiary transition-colors hover:text-text-primary"
      >
        {header}
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          aria-hidden
          className={cn('shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ol id={listId} className="m-0 list-none p-0">
          {stages.map((stage, index) => (
            <StageRow key={stage.id} stage={stage} last={index === stages.length - 1} />
          ))}
        </ol>
      )}
    </section>
  )
}

/**
 * One stage, folded to its title and a line of what it found, the way a coding agent folds its tool calls. A
 * running stage also keeps what it is doing now in sight: its running lines, or else its latest one. Opening it
 * shows everything: the whole summary, what the plan changed, and every step.
 */
function StageRow({ stage, last }: { stage: AiTraceStage; last: boolean }) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const items = stage.items ?? []
  const notes = stage.notes ?? []
  const expandable = Boolean(stage.detail) || notes.length > 0 || items.length > 0
  const running = items.filter((item) => item.state === 'running')
  const live = stage.state === 'running' && !open ? (running.length > 0 ? running : items.slice(-1)) : []

  const head = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs leading-[18px] font-semibold text-text-primary">{stage.title}</span>
        {stage.detail && !open && (
          <span className="block truncate text-[11px] leading-4 text-text-tertiary">{stage.detail}</span>
        )}
      </span>
      {expandable && (
        <ChevronRight
          size={12}
          strokeWidth={2}
          aria-hidden
          className={cn(
            'mt-[3px] shrink-0 text-icon-tertiary transition-transform group-hover:text-text-primary',
            open && 'rotate-90'
          )}
        />
      )}
    </>
  )

  return (
    <li className="flex gap-2.5">
      {/* The rail: a stretch from the line above, the stage's icon, then a stretch down to the next one. */}
      <div aria-hidden className="flex w-[18px] shrink-0 flex-col items-center">
        <span className="h-2 w-px bg-card-border" />
        <span className="grid size-[18px] shrink-0 place-items-center">
          <StageIcon state={stage.state} />
        </span>
        {!last && <span className="w-px flex-1 bg-card-border" />}
      </div>
      <div className="min-w-0 flex-1 pt-2 pb-1">
        {expandable ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((value) => !value)}
            className="group flex w-full min-w-0 items-start gap-1.5 rounded-md text-left"
          >
            {head}
          </button>
        ) : (
          <div className="flex min-w-0 items-start gap-1.5">{head}</div>
        )}

        {live.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {live.map((item) => (
              <ItemLine key={item.id} item={item} truncate />
            ))}
          </ul>
        )}

        {open && (
          <div id={bodyId}>
            {stage.detail && <p className="text-[11px] leading-4 text-text-tertiary">{stage.detail}</p>}
            {notes.map((note) => (
              <p key={note} className="text-[11px] leading-4 text-text-secondary">
                {note}
              </p>
            ))}
            {items.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {items.map((item) => (
                  <ItemLine key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function ItemLine({ item, truncate = false }: { item: AiTraceItem; truncate?: boolean }) {
  return (
    <li className="flex items-start gap-1.5 text-[11px] leading-4 text-text-tertiary">
      <CircleDot size={9} strokeWidth={2} className="mt-1 shrink-0 text-icon-tertiary" aria-hidden />
      <span className={cn('min-w-0', truncate && 'truncate')}>
        <span className="font-medium text-text-secondary">{item.label}</span>
        {item.detail && ` · ${item.detail}`}
      </span>
    </li>
  )
}

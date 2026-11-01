import { useState } from 'react'
import { cn } from '../../../lib/cn'
import type { AiTraceStage, AiTraceState } from './exam-format'
import {
  CheckCircle2,
  ChevronDown,
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

/** DeepTutor's TracePresentation: explore, plan, write each question, validate and repair. */
export default function StageTrace({ stages }: { stages: readonly AiTraceStage[] }) {
  const [open, setOpen] = useState(true)

  return (
    <section className="mt-1 rounded-xl border border-card-border bg-background-gray-secondary/60">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-background-gray-secondary"
      >
        <span className="text-xs font-semibold text-text-secondary">Quy trình xử lý</span>
        <span className="text-[11px] text-text-tertiary">{stages.length} giai đoạn</span>
        <ChevronDown
          size={13}
          strokeWidth={1.8}
          aria-hidden
          className={cn('ml-auto shrink-0 text-icon-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ol className="border-t border-card-border px-3 py-2.5">
          {stages.map((stage, index) => (
            <li key={stage.id} className="flex gap-2.5 pb-2.5 last:pb-0">
              <div className="flex flex-col items-center">
                <span className="grid size-[18px] shrink-0 place-items-center">
                  <StageIcon state={stage.state} />
                </span>
                {index < stages.length - 1 && <span aria-hidden className="mt-0.5 w-px flex-1 bg-card-border" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-5 font-semibold text-text-primary">{stage.title}</p>
                {stage.detail && (
                  <p className="text-[11px] leading-4 text-text-tertiary">{stage.detail}</p>
                )}
                {stage.items && stage.items.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {stage.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-1.5 text-[11px] leading-4 text-text-tertiary">
                        <CircleDot size={9} strokeWidth={2} className="mt-1 shrink-0 text-icon-tertiary" aria-hidden />
                        <span className="min-w-0">
                          <span className="font-medium text-text-secondary">{item.label}</span>
                          {item.detail && ` · ${item.detail}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

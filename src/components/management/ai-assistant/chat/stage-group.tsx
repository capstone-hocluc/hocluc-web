import { useState, type PropsWithChildren } from 'react'
import { BrainIcon } from 'lucide-react'
import { useAuiState, type ThreadAssistantMessagePart } from '@assistant-ui/react'
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from '@/components/assistant-ui/elements/reasoning.aui'
import type { ThreadGroupPart } from '@/components/assistant-ui/elements/thread.aui'
import type { StageHead } from './run-parts'
import { StageActivity, type StageCall } from './stage-activity'
import { stageIcon } from './step-icons'
import { StepRow } from './step-row'
import { useElapsed } from './use-elapsed'

type Parts = readonly ThreadAssistantMessagePart[] | readonly { type: string }[]

/** The stage's reasoning part in the group, and which stage of the message it is. */
function stageOf(parts: Parts, group: ThreadGroupPart) {
  const index = group.indices.find((at) => parts[at]?.type === 'reasoning')
  if (index === undefined) return undefined
  return { index, number: parts.slice(0, index).filter((part) => part.type === 'reasoning').length }
}

/** The last line of a stage's words that says anything. */
function lastLine(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1)
}

/** The stage's last call: the step it is on while it goes on. */
function latestCall(parts: Parts, group: ThreadGroupPart) {
  for (let at = group.indices.length - 1; at >= 0; at--) {
    const part = parts[group.indices[at]]
    if (part?.type === 'tool-call') return part as StageCall
  }
  return undefined
}

/**
 * A run's stage, as the thread's reasoning group: the same Reasoning element, headed by the stage's icon and title
 * (what the run does: "Khảo sát ngân hàng câu hỏi") instead of a generic word, and by how long it took. Each stage is a
 * group of its own (its part has an id), so the heading names it alone and the steps under it are only its own: what
 * it found, then each call on a line of its own.
 *
 * A stage stays folded until the teacher opens it, also while it goes on (assistant-ui's run activity): then its title
 * shimmers and counts up, and the line under it shows only the call it is on, one after another, or before any call
 * the last line of its words (its place in the queue, the parts of a paper read so far).
 */
export function StageGroup({ group, children }: PropsWithChildren<{ group: ThreadGroupPart }>) {
  const [open, setOpen] = useState(false)
  const paperReading = useAuiState(({ message }) => Boolean(message.metadata.custom?.reading))
  const head = useAuiState(({ message }) => {
    const stage = stageOf(message.parts, group)
    const heads = message.metadata.custom?.stageHeads as readonly StageHead[] | undefined
    return stage === undefined ? undefined : heads?.[stage.number]
  })
  const running = useAuiState(({ message }) => message.status?.type === 'running') && head?.running === true
  const startedAt = useAuiState(({ message }) => {
    const stage = stageOf(message.parts, group)
    const part = stage === undefined ? undefined : message.parts[stage.index]
    return part?.type === 'reasoning' ? part.timing?.startedAt : undefined
  })
  const completedAt = useAuiState(({ message }) => {
    const stage = stageOf(message.parts, group)
    const part = stage === undefined ? undefined : message.parts[stage.index]
    return part?.type === 'reasoning' ? part.timing?.completedAt : undefined
  })
  const empty = useAuiState(({ message }) => {
    const stage = stageOf(message.parts, group)
    const part = stage === undefined ? undefined : message.parts[stage.index]
    return group.indices.length === 1 && (part?.type !== 'reasoning' || part.text.trim() === '')
  })
  const latest = useAuiState(({ message }) => latestCall(message.parts, group))
  // A stage with no call (a run waiting its turn, a paper being read) says what it is at in its last line.
  const note = useAuiState(({ message }) => {
    const stage = stageOf(message.parts, group)
    const part = stage === undefined ? undefined : message.parts[stage.index]
    return part?.type === 'reasoning' ? lastLine(part.text) : undefined
  })
  const elapsed = useElapsed(
    startedAt === undefined ? undefined : { startedAt, ...(completedAt !== undefined ? { completedAt } : {}) },
    running
  )
  return (
    <ReasoningRoot variant="ghost" streaming={running} open={open} onOpenChange={setOpen} data-stage-disclosure="">
      <ReasoningTrigger
        active={running}
        icon={stageIcon(head?.id)}
        label={head?.title}
        duration={elapsed === undefined ? undefined : elapsed / 1000}
        disabled={empty}
        durationClassName={paperReading ? undefined : 'text-text-tertiary'}
        className={`max-w-full disabled:cursor-default [&:disabled_[data-slot=reasoning-trigger-chevron]]:hidden ${paperReading ? 'disabled:hover:text-muted-foreground' : 'text-foreground disabled:hover:text-foreground'}`}
      />
      {running && !open && latest && <StageActivity call={latest} />}
      {running && !open && !latest && note && (
        <StepRow data-slot="stage-activity" className="ps-6" icon={BrainIcon} label={note} state="running" />
      )}
      {!empty && (
        <ReasoningContent aria-busy={running} className={paperReading ? undefined : 'text-foreground'}>
          <ReasoningText className="ms-2 border-s border-border ps-3.5 pt-1" contentClassName="space-y-0.5">
            {children}
          </ReasoningText>
        </ReasoningContent>
      )}
    </ReasoningRoot>
  )
}

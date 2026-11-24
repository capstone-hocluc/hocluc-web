import type { PropsWithChildren } from 'react'
import { useAuiState, type ThreadAssistantMessagePart } from '@assistant-ui/react'
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from '@/components/assistant-ui/elements/reasoning.aui'
import type { ThreadGroupPart } from '@/components/assistant-ui/elements/thread.aui'
import type { StageHead } from './run-parts'
import { useElapsed } from './use-elapsed'

type Parts = readonly ThreadAssistantMessagePart[] | readonly { type: string }[]

/** The stage's reasoning part in the group, and which stage of the message it is. */
function stageOf(parts: Parts, group: ThreadGroupPart) {
  const index = group.indices.find((at) => parts[at]?.type === 'reasoning')
  if (index === undefined) return undefined
  return { index, number: parts.slice(0, index).filter((part) => part.type === 'reasoning').length }
}

/**
 * A run's stage, as the thread's reasoning group: the same Reasoning element, headed by the stage's title (what the
 * run does: "Khảo sát ngân hàng câu hỏi") instead of a generic word, and by how long it took. Each stage is a group of
 * its own (its part has an id), so the heading names it alone and the words under it are only what it found. A stage
 * that goes on shimmers and counts up, also once its calls follow it in the thread.
 */
export function StageGroup({ group, children }: PropsWithChildren<{ group: ThreadGroupPart }>) {
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
  const elapsed = useElapsed(
    startedAt === undefined ? undefined : { startedAt, ...(completedAt !== undefined ? { completedAt } : {}) },
    running
  )
  return (
    <ReasoningRoot variant="ghost" streaming={running} data-stage-disclosure="">
      <ReasoningTrigger
        active={running}
        label={head?.title}
        duration={elapsed === undefined ? undefined : elapsed / 1000}
        disabled={empty}
        durationClassName={paperReading ? undefined : 'text-text-tertiary'}
        className={`max-w-full disabled:cursor-default [&:disabled_[data-slot=reasoning-trigger-chevron]]:hidden ${paperReading ? 'disabled:hover:text-muted-foreground' : 'text-foreground disabled:hover:text-foreground'}`}
      />
      {!empty && (
        <ReasoningContent aria-busy={running} className={paperReading ? undefined : 'text-foreground'}>
          <ReasoningText>{children}</ReasoningText>
        </ReasoningContent>
      )}
    </ReasoningRoot>
  )
}

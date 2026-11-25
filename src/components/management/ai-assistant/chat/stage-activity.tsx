import type { ToolCallMessagePart, ToolCallMessagePartStatus } from '@assistant-ui/react'
import type { StepArtifact } from './run-parts'
import { stepState } from './step-call'
import { stepIcon } from './step-icons'
import { StepRow } from './step-row'
import { useElapsed } from './use-elapsed'

export type StageCall = ToolCallMessagePart & { status: ToolCallMessagePartStatus }

/**
 * What a stage still going is doing now, under its folded title: its latest call on one line, in step with the run
 * (assistant-ui's run activity). Opening the stage shows every step instead.
 */
export function StageActivity({ call }: { call: StageCall }) {
  const startedAt = call.timing?.startedAt
  const completedAt = call.timing?.completedAt
  const state = stepState(call)
  const elapsed = useElapsed(
    startedAt === undefined ? undefined : { startedAt, ...(completedAt !== undefined ? { completedAt } : {}) },
    state === 'running'
  )
  const step = (call.artifact ?? {}) as StepArtifact
  return (
    <StepRow
      data-slot="stage-activity"
      className="ps-6"
      icon={stepIcon(step.tool, call.toolName)}
      label={call.toolName}
      detail={step.detail}
      duration={elapsed}
      state={state}
    />
  )
}

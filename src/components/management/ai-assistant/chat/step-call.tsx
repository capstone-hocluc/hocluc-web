import { useToolCallElapsed, type ToolCallMessagePartComponent, type ToolCallMessagePartProps } from '@assistant-ui/react'
import type { StepArtifact } from './run-parts'
import { stepIcon } from './step-icons'
import { StepRow, type StepState } from './step-row'

/** Where a call stands, as its row shows it. */
export function stepState({ status, isError }: Pick<ToolCallMessagePartProps, 'status' | 'isError'>): StepState {
  if (status.type === 'running' || status.type === 'requires-action') return 'running'
  if (status.type === 'incomplete') return status.reason === 'cancelled' ? 'cancelled' : 'failed'
  return isError ? 'failed' : 'done'
}

/**
 * A call of a run as the thread shows it: one line with the icon of its tool, never a disclosure of raw arguments and
 * results (the run's calls carry none worth reading).
 */
export const StepCall: ToolCallMessagePartComponent = ({ toolName, artifact, status, isError }) => {
  const elapsed = useToolCallElapsed()
  const step = (artifact ?? {}) as StepArtifact
  return (
    <StepRow
      icon={stepIcon(step.tool, toolName)}
      label={toolName}
      detail={step.detail}
      duration={elapsed}
      state={stepState({ status, isError })}
    />
  )
}

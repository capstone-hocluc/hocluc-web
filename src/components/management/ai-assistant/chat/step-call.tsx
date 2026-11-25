import { useToolCallElapsed, type ToolCallMessagePartComponent } from '@assistant-ui/react'
import type { StepArtifact } from './run-parts'
import { stepIcon } from './step-icons'
import { StepRow } from './step-row'
import { stepState } from './step-state'

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

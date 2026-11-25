import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import type { StepState } from './step-row'

/** Where a call stands, as its row shows it. */
export function stepState({ status, isError }: Pick<ToolCallMessagePartProps, 'status' | 'isError'>): StepState {
  if (status.type === 'running' || status.type === 'requires-action') return 'running'
  if (status.type === 'incomplete') return status.reason === 'cancelled' ? 'cancelled' : 'failed'
  return isError ? 'failed' : 'done'
}

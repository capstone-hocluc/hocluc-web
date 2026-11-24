import type { PropsWithChildren } from 'react'
import { useAuiState } from '@assistant-ui/react'
import { formatDuration } from '@/components/assistant-ui/elements/format-duration'
import type { ThreadGroupPart } from '@/components/assistant-ui/elements/thread.aui'
import { useElapsed, type StepTiming } from './use-elapsed'

/**
 * Every step of a reply (its stages and the tools they called), headed by how long the whole task took: counting up
 * while it runs. A turn gives that span as `metadata.custom.runTime` (from the request to the reply, or a paper's
 * reading); without it, it is the span of the timed steps.
 */
export function RunStepsGroup({ group, children }: PropsWithChildren<{ group: ThreadGroupPart }>) {
  const runTime = useAuiState(({ message }) => message.metadata.custom?.runTime as StepTiming | undefined)
  const status = useAuiState(({ message }) => message.status?.type)
  const running = status === 'running'
  const elapsed = useElapsed(runTime ?? group.timing, running)
  return (
    <div data-slot="aui_chain-of-thought">
      {elapsed !== undefined && (
        <p data-slot="run-time" className="m-0 py-1 text-xs text-muted-foreground tabular-nums">
          {running
            ? `Đang làm · ${formatDuration(elapsed)}`
            : status === 'incomplete'
              ? `Dừng sau ${formatDuration(elapsed)}`
              : `Đã làm trong ${formatDuration(elapsed)}`}
        </p>
      )}
      {children}
    </div>
  )
}

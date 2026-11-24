import type { PropsWithChildren } from 'react'
import { useAuiState } from '@assistant-ui/react'
import { formatDuration } from '@/components/assistant-ui/elements/format-duration'
import type { ThreadGroupPart } from '@/components/assistant-ui/elements/thread.aui'
import { useElapsed, type StepTiming } from './use-elapsed'

/** Paper readings retain their run timer. Assistant stages show their own times. */
export function RunStepsGroup({ group, children }: PropsWithChildren<{ group: ThreadGroupPart }>) {
  const paperReading = useAuiState(({ message }) => Boolean(message.metadata.custom?.reading))
  const runTime = useAuiState(({ message }) => message.metadata.custom?.runTime as StepTiming | undefined)
  const status = useAuiState(({ message }) => message.status?.type)
  const running = status === 'running'
  const elapsed = useElapsed(paperReading ? runTime ?? group.timing : undefined, paperReading && running)
  return (
    <div data-slot="aui_chain-of-thought">
      {!paperReading && status === 'incomplete' && (
        <p className="m-0 py-1 text-xs text-muted-foreground">Thất bại</p>
      )}
      {paperReading && elapsed !== undefined && (
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

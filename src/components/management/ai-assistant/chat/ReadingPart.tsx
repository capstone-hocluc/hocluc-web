import { useAuiState, type DataMessagePartProps } from '@assistant-ui/react'
import ReadingHeader from '../ReadingHeader'
import { useReadingActions, type ReadingTurn } from '../reading-turn'

/** The head of the reading's turn: the paper, where its reading is, and what can be done about it. */
export default function ReadingPart(_: DataMessagePartProps) {
  const turn = useAuiState(({ message }) => message.metadata.custom?.reading as ReadingTurn | undefined)
  const actions = useReadingActions()
  if (!turn) return null
  return (
    <div className="mb-2 rounded-xl border border-card-border bg-background-gray-secondary_alt_2 p-3" aria-label={`Đọc đề ${turn.title}`} role="group">
      <ReadingHeader
        title={turn.title}
        running={turn.running}
        status={turn.status}
        progress={turn.progress}
        error={turn.error}
        labellingBlocker={turn.labellingBlocker}
        polling={turn.polling}
        onLoadAgain={actions?.onLoadAgain}
        onClose={actions?.onClose}
      />
    </div>
  )
}

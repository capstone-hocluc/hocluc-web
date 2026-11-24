import { cn } from '../../../lib/cn'
import type { LiveReading } from '../question-bank/live-reading'
import ReadingHeader from './ReadingHeader'
import StageTrace from './StageTrace'
import type { ReadingTurn } from './reading-turn'

const LOG_SHOWN = 4

const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const LOG_TONE: Record<LiveReading['log'][number]['tone'], string> = {
  info: 'text-text-secondary',
  success: 'text-badge-success-text',
  warning: 'text-badge-warning-text',
  danger: 'text-badge-error-text',
}

interface PaperReadingCardProps {
  turn: ReadingTurn
  /** The reading's latest events, newest first. */
  log: LiveReading['log']
  /** Given for a failed paper the viewer may load again. */
  onLoadAgain?: () => void
  /** Back to the exam being written. */
  onClose: () => void
  className?: string
}

/**
 * The reading of a loaded paper over the paper itself, for when the assistant's chat (which shows it as its own turn)
 * is out of sight: its stages and latest steps.
 */
export default function PaperReadingCard({ turn, log, onLoadAgain, onClose, className }: PaperReadingCardProps) {
  const latest = log.slice(0, LOG_SHOWN)
  return (
    <section
      aria-label={`Đọc đề ${turn.title}`}
      className={cn('flex min-h-0 flex-col gap-3 overflow-y-auto rounded-xl border border-card-border bg-background-gray-secondary_alt_2 p-3', className)}
    >
      <ReadingHeader
        title={turn.title}
        running={turn.running}
        status={turn.status}
        progress={turn.progress}
        error={turn.error}
        labellingBlocker={turn.labellingBlocker}
        polling={turn.polling}
        onLoadAgain={onLoadAgain}
        onClose={onClose}
      />
      <StageTrace stages={turn.stages} />
      {latest.length > 0 && (
        <ol aria-label="Hoạt động gần nhất" className="m-0 ml-[7px] list-none space-y-1 border-l border-card-border p-0 pl-3">
          {latest.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="flex gap-2 text-xs leading-5">
              <span className="shrink-0 font-mono text-text-tertiary tabular-nums">{time.format(entry.at)}</span>
              <span className={cn('min-w-0 break-words', LOG_TONE[entry.tone])}>{entry.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

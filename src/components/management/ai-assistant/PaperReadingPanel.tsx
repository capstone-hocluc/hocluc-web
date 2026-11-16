import { useState, type CSSProperties } from 'react'
import { cn } from '../../../lib/cn'
import type { BankReading } from '../../../services/questionBankService'
import Button from '../../console/button'
import { ChevronLeft, ChevronRight, Clock, FileText, RefreshCw, X } from '../../console/icons'
import Notice from '../../console/notice'
import {
  ConsoleTabs,
  ConsoleTabsContent,
  ConsoleTabsList,
  ConsoleTabsTrigger,
} from '../../console/tabs'
import type { ReadingStreamState } from '../question-bank/use-paper-reading'
import type { LiveReading } from '../question-bank/live-reading'
import ReadingPaper, { type ShownQuestion } from '../question-bank/ReadingPaper'
import { failureText } from '../question-bank/question-bank-labels'
import AiOrb from './AiOrb'
import StageTrace from './StageTrace'
import type { AiTraceStage } from './exam-format'

const ICON_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:pointer-events-none disabled:opacity-40'

const time = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const LOG_TONE: Record<LiveReading['log'][number]['tone'], string> = {
  info: 'text-text-secondary',
  success: 'text-badge-success-text',
  warning: 'text-badge-warning-text',
  danger: 'text-badge-error-text',
}

interface PaperReadingPanelProps {
  sourceId: string
  reading: BankReading | null
  view: LiveReading
  stages: readonly AiTraceStage[]
  streaming: ReadingStreamState
  busy: boolean
  /** The number the AI works on now, shown on the original page. */
  current: number | null
  shown: Map<number, ShownQuestion>
  onSelect: (number: number) => void
  onLoadAgain?: () => void
  conversationsOpen: boolean
  onOpenConversations: () => void
  onCollapse?: () => void
  onClose?: () => void
  /** A card of its own beside the paper, as the assistant's panel is; a sheet fills its box instead. */
  card?: boolean
  className?: string
  style?: CSSProperties
}

/** The right column while a loaded paper is shown: the run, as the compose run shows its own, and the original pages. */
export default function PaperReadingPanel({
  sourceId,
  reading,
  view,
  stages,
  streaming,
  busy,
  current,
  shown,
  onSelect,
  onLoadAgain,
  conversationsOpen,
  onOpenConversations,
  onCollapse,
  onClose,
  card = false,
  className = '',
  style,
}: PaperReadingPanelProps) {
  const pageCount = reading?.pageCount ?? 0
  const pageOf = (number: number | null) =>
    number === null
      ? null
      : (reading?.regions.find((band) => band.number === number)?.page ??
        reading?.questions.find((question) => question.number === number)?.sourcePage ??
        null)
  const [chosenPage, setChosenPage] = useState<number | null>(null)
  // The page follows the question the AI works on until a page is picked.
  const page = Math.min(Math.max(chosenPage ?? pageOf(current) ?? 1, 1), Math.max(pageCount, 1))
  const error = view.error ?? reading?.error ?? null
  const running = view.status === 'PENDING' || view.status === 'RUNNING'

  return (
    <aside
      aria-label="Tiến trình đọc đề"
      className={cn('min-w-0 flex-col', card && 'py-2 pr-2 pl-1', className)}
      style={style}
    >
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col bg-card-background',
          card && 'overflow-hidden rounded-2xl border border-card-border shadow-xs'
        )}
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-secondary pr-2 pl-3.5">
          <FileText size={15} className="shrink-0 text-primary-text" aria-hidden />
          <h2 className="min-w-0 truncate text-[15px] font-semibold text-text-primary">
            Tiến trình đọc đề
          </h2>
          <div className="ml-auto flex shrink-0 items-center">
            <button
              type="button"
              onClick={onOpenConversations}
              aria-haspopup="dialog"
              aria-expanded={conversationsOpen}
              aria-label="Đề của tôi"
              title="Đề của tôi"
              className={ICON_BUTTON}
            >
              <Clock size={16} />
            </button>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                aria-label="Thu gọn tiến trình"
                title="Thu gọn tiến trình"
                className={ICON_BUTTON}
              >
                <ChevronRight size={17} strokeWidth={1.7} />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng tiến trình"
                title="Đóng tiến trình"
                className={ICON_BUTTON}
              >
                <X size={17} strokeWidth={1.7} />
              </button>
            )}
          </div>
        </header>

        <ConsoleTabs defaultValue="run" className="flex min-h-0 flex-1 flex-col">
          <ConsoleTabsList aria-label="Tiến trình và trang gốc" className="mx-3 mt-2">
            <ConsoleTabsTrigger value="run">Tiến trình</ConsoleTabsTrigger>
            <ConsoleTabsTrigger value="pages" disabled={pageCount === 0}>
              Trang gốc
            </ConsoleTabsTrigger>
          </ConsoleTabsList>

          <ConsoleTabsContent
            value="run"
            className="min-h-0 flex-1 gap-4 overflow-y-auto px-3.5 pt-3 pb-4"
          >
            {running && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2.5 text-sm leading-none font-semibold text-text-tertiary"
              >
                <AiOrb active />
                <span className="animate-pulse motion-reduce:animate-none">
                  {view.status === 'PENDING' ? 'Đề đang chờ AI đọc' : 'AI đang đọc đề'}
                </span>
              </div>
            )}
            {view.progress && running && (
              <p className="m-0 text-sm text-text-secondary">{view.progress}</p>
            )}
            {error && (
              <Notice tone="danger">
                <span className="min-w-0 flex-1 break-words">{failureText(error)}</span>
                {onLoadAgain && (
                  <Button size="sm" appearance="outline" onClick={onLoadAgain}>
                    <RefreshCw size={15} />
                    Nạp lại
                  </Button>
                )}
              </Notice>
            )}
            <StageTrace stages={stages} />
            {streaming === 'polling' && busy && (
              <p className="m-0 text-xs text-text-tertiary">
                Không mở được luồng trực tiếp, đang cập nhật 4 giây một lần.
              </p>
            )}
            {view.log.length > 0 && (
              <ol
                aria-label="Nhật ký hoạt động"
                className="m-0 ml-[7px] list-none space-y-1.5 border-l border-card-border p-0 pl-3"
              >
                {view.log.map((entry, index) => (
                  <li key={`${entry.at}-${index}`} className="flex gap-2 text-xs leading-5">
                    <span className="shrink-0 font-mono text-text-tertiary tabular-nums">
                      {time.format(entry.at)}
                    </span>
                    <span className={cn('min-w-0 break-words', LOG_TONE[entry.tone])}>
                      {entry.text}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </ConsoleTabsContent>

          <ConsoleTabsContent
            value="pages"
            className="min-h-0 flex-1 gap-3 overflow-y-auto px-3.5 pt-3 pb-4"
          >
            {pageCount > 0 && reading && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    disabled={page <= 1}
                    onClick={() => setChosenPage(page - 1)}
                    aria-label="Trang trước"
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-medium text-text-secondary tabular-nums">
                    Trang {page}/{pageCount}
                  </span>
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    disabled={page >= pageCount}
                    onClick={() => setChosenPage(page + 1)}
                    aria-label="Trang sau"
                    title="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                {chosenPage !== null && busy && (
                  <Button size="sm" appearance="outline" onClick={() => setChosenPage(null)}>
                    Theo trang AI đang đọc
                  </Button>
                )}
                <ReadingPaper
                  sourceId={sourceId}
                  page={page}
                  bands={reading.regions.filter((band) => band.page === page)}
                  shown={shown}
                  overlay={false}
                  selected={current}
                  onSelect={onSelect}
                />
              </>
            )}
          </ConsoleTabsContent>
        </ConsoleTabs>
      </div>
    </aside>
  )
}

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ApiError } from '../../../lib/api'
import { cn } from '../../../lib/cn'
import { getErrorMessage } from '../../../lib/errors'
import { BankStreamUnavailable, followBankReading } from '../../../services/bankReadingStream'
import {
  getBankReading,
  type BankReading,
  type BankSource,
} from '../../../services/questionBankService'
import Button from '../../console/button'
import { ChevronLeft, ListTree, RefreshCw } from '../../console/icons'
import Notice from '../../console/notice'
import Status from '../../console/status'
import {
  ConsoleTabs,
  ConsoleTabsContent,
  ConsoleTabsList,
  ConsoleTabsTrigger,
} from '../../console/tabs'
import BankReadingSkeleton from './BankReadingSkeleton'
import {
  STAGE_LABELS,
  applyEvent,
  followedPart,
  initialReading,
  questionsOf,
  type LiveReading,
} from './live-reading'
import { failureText } from './question-bank-labels'
import ReadingAsPaper, { type PaperQuestion } from './ReadingAsPaper'
import type { ShownQuestion } from './ReadingPaper'
import ReadingPipeline, { ReadingSteps } from './ReadingPipeline'
import ReadingStructure from './ReadingStructure'
import { usePaperShare } from './paper-share'
import SplitHandle from './SplitHandle'

const POLL_MS = 4000
/** How soon after a part comes back the cleaned reading is asked for again. */
const REFRESH_MS = 800
const time = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** The reading as stored (pages, bands, finished questions), asked again when the stream says something changed. */
function useStoredReading(sourceId: string) {
  const [reading, setReading] = useState<BankReading | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let cancelled = false
    getBankReading(sourceId)
      .then((next) => {
        if (!cancelled) {
          setReading(next)
          setError('')
        }
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof ApiError && reason.status === 403
              ? 'Bạn không có quyền xem đề này.'
              : getErrorMessage(reason)
          )
      })
    return () => {
      cancelled = true
    }
  }, [sourceId, tick])
  return { reading, error, refresh: () => setTick((t) => t + 1) }
}

/**
 * The live pipeline and the paper reconstructed from the AI reading (server-sent events).
 */
export default function BankReadingView({
  source,
  onClose,
  onLoadAgain,
  onLabel,
  labellingBlocker,
}: {
  source: BankSource
  /** Back to the list of papers. */
  onClose: () => void
  /** Given for a failed paper the viewer may load again. */
  onLoadAgain?: () => void
  /** Given for a finished paper with unlabelled questions the viewer may have labelled. */
  onLabel?: () => void
  /** Why Jev cannot label now (no active Master Data), shown when questions stay unlabelled. */
  labellingBlocker?: string | null
}) {
  const stored = useStoredReading(source.id)
  const [live, setLive] = useState<LiveReading>(() => initialReading(source.status))
  const [streaming, setStreaming] = useState<'connecting' | 'open' | 'polling' | 'closed'>(
    'connecting'
  )
  const [follow, setFollow] = useState(true)
  const [followId, setFollowId] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const refreshTimer = useRef<number | undefined>(undefined)
  const rowRef = useRef<HTMLDivElement>(null)
  const [paperShare, setPaperShare] = usePaperShare()
  const refreshStored = stored.refresh
  const refreshRef = useRef(refreshStored)
  useEffect(() => {
    refreshRef.current = refreshStored
  })

  // ---- the stream
  useEffect(() => {
    const controller = new AbortController()
    const soon = () => {
      window.clearTimeout(refreshTimer.current)
      refreshTimer.current = window.setTimeout(() => refreshRef.current(), REFRESH_MS)
    }
    followBankReading(
      source.id,
      (event) => {
        setStreaming('open')
        setLive((state) => applyEvent(state, event))
        // a part read, or a check done: the stored reading has new questions or new review results
        if (event.type === 'end' || event.type === 'review' || (event.type === 'part' && event.data.status === 'DONE')) soon()
      },
      controller.signal
    )
      .then(() => setStreaming((current) => (current === 'polling' ? current : 'closed')))
      .catch((error) => {
        if (error instanceof BankStreamUnavailable) setStreaming('polling')
      })
    return () => {
      controller.abort()
      window.clearTimeout(refreshTimer.current)
    }
  }, [source.id])

  // ---- without the stream: asked now and then while the paper is busy
  const busy = source.status === 'PENDING' || source.status === 'RUNNING'
  useEffect(() => {
    if (streaming !== 'polling' || !busy) return
    const timer = window.setInterval(() => refreshRef.current(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [streaming, busy])

  const reading = stored.reading
  const view: LiveReading =
    streaming === 'polling' && reading
      ? {
          ...live,
          status: reading.status,
          stage: reading.stage,
          progress: reading.progress,
          error: reading.error,
        }
      : live

  // ---- what is shown on the page: the finished reading, overlaid by what is being written now
  const shown = useMemo(() => {
    const map = new Map<number, ShownQuestion>()
    reading?.questions.forEach((q) =>
      map.set(q.number, { number: q.number, text: q.text, options: q.options, writing: false })
    )
    view.parts
      .filter((part) => part.status === 'READING')
      .forEach((part) => questionsOf(part)?.forEach((q) => map.set(q.number, q)))
    return map
  }, [reading, view.parts])

  // the same, with what the paper also prints: pictures and the passage each question belongs to
  const paperQuestions = useMemo<PaperQuestion[]>(() => {
    const stored = new Map(reading?.questions.map((q) => [q.number, q]) ?? [])
    return [...shown.values()].map((q) => ({
      ...q,
      imageUrl: stored.get(q.number)?.imageUrl ?? null,
      groupKey: stored.get(q.number)?.groupKey ?? null,
      review: stored.get(q.number)?.review ?? null,
      activity:
        q.writing || q.number === view.rewriting ? 'writing' : q.number === view.checking ? ('checking' as const) : null,
    }))
  }, [shown, reading, view.rewriting, view.checking])

  const followed =
    view.parts.find((p) => p.id === followId && p.status === 'READING') ?? followedPart(view.parts)
  const writingNow = useMemo(() => {
    if (!followed) return null
    const written = questionsOf(followed)
    return written && written.length > 0 ? written[written.length - 1] : null
  }, [followed])
  // following: the question being written, else the one read again, else the one being checked
  const shownSelected = follow ? (writingNow?.number ?? view.rewriting ?? view.checking ?? null) : selected

  function select(number: number) {
    setFollow(false)
    setSelected(number)
  }

  const questionCount = [...shown.values()].filter((q) => q.text.trim() !== '').length
  const status = view.status
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={`Đề ${source.title}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button appearance="outline" size="sm" onClick={onClose}>
            <ChevronLeft size={16} />
            Danh sách đề
          </Button>
          <h2 className="m-0 min-w-0 break-words text-lg font-semibold text-text-primary">
            {source.title}
          </h2>
          <Status tone={status === 'FAILED' ? 'danger' : status === 'DONE' ? 'success' : 'info'}>
            {status === 'DONE'
              ? 'Xong'
              : status === 'FAILED'
                ? 'Lỗi'
                : status === 'PENDING'
                  ? 'Đang chờ'
                  : 'Đang đọc'}
          </Status>
          {view.stage && status !== 'DONE' && (
            <span className="text-sm text-text-tertiary">{STAGE_LABELS[view.stage]}</span>
          )}
        </div>
        {onLabel && status === 'DONE' && (
          <Button size="sm" onClick={onLabel}>
            <ListTree size={16} />
            Gán nhãn
          </Button>
        )}
      </div>
      {status === 'DONE' && source.unlabelledCount > 0 && labellingBlocker && (
        <Notice tone="warning">{labellingBlocker}</Notice>
      )}
      {stored.error && !reading ? (
        <Notice tone="danger">{stored.error}</Notice>
      ) : !reading ? (
        <BankReadingSkeleton />
      ) : (
        <div
          ref={rowRef}
          style={{ '--left': `${100 - paperShare}fr`, '--right': `${paperShare}fr` } as CSSProperties}
          className="grid min-w-0 gap-5 lg:h-[calc(100dvh-14rem)] lg:min-h-96 lg:grid-cols-[minmax(0,var(--left))_1.25rem_minmax(0,var(--right))] lg:gap-0"
        >
          <ConsoleTabs defaultValue="pipeline" className="flex min-h-0 min-w-0 flex-col">
            <ConsoleTabsList aria-label="Tiến trình và câu hỏi">
              <ConsoleTabsTrigger value="pipeline">Pipeline</ConsoleTabsTrigger>
              <ConsoleTabsTrigger value="questions">Câu hỏi ({questionCount})</ConsoleTabsTrigger>
            </ConsoleTabsList>
            <ConsoleTabsContent value="pipeline" className="min-h-0 gap-0 overflow-y-auto pt-3 pr-1 lg:flex-1">
              <ReadingPipeline
                reading={view}
                followedId={followed?.id ?? null}
                onFollowPart={(id) => {
                  setFollowId(id)
                  setFollow(true)
                }}
              >
                <section className="mt-3 flex min-w-0 flex-col gap-3" aria-label="Chi tiết tiến trình">
                  {view.progress && status !== 'DONE' && status !== 'FAILED' && (
                    <p className="m-0 text-sm text-text-secondary">{view.progress}</p>
                  )}
                  {(view.error ?? reading.error) && (
                    <Notice tone="danger">
                      <span className="min-w-0 flex-1 break-words">
                        {failureText(view.error ?? reading.error)}
                      </span>
                      {onLoadAgain && (
                        <Button size="sm" appearance="outline" onClick={onLoadAgain}>
                          <RefreshCw size={15} />
                          Nạp lại
                        </Button>
                      )}
                    </Notice>
                  )}
                  {streaming === 'polling' && busy && (
                    <p className="m-0 text-xs text-text-tertiary">
                      Không mở được luồng trực tiếp, đang cập nhật 4 giây một lần.
                    </p>
                  )}
                  <div className="border-t border-card-border pt-3">
                    <h4 className="m-0 mb-2 text-sm font-medium text-text-primary">Nhật ký</h4>
                    {view.log.length === 0 ? (
                      <p className="m-0 text-sm text-text-tertiary">
                        {view.live ? 'Đang chờ AI bắt đầu...' : 'Không có hoạt động đang chạy.'}
                      </p>
                    ) : (
                      <ol
                        className="m-0 flex max-h-64 list-none flex-col gap-1.5 overflow-y-auto p-0 text-sm"
                        aria-label="Nhật ký hoạt động"
                      >
                        {view.log.map((entry, index) => (
                          <li key={`${entry.at}-${index}`} className="flex gap-2">
                            <span className="shrink-0 font-mono text-xs text-text-tertiary tabular-nums">
                              {time.format(entry.at)}
                            </span>
                            <span
                              className={cn(
                                'min-w-0 break-words',
                                entry.tone === 'success' && 'text-badge-success-text',
                                entry.tone === 'warning' && 'text-badge-warning-text',
                                entry.tone === 'danger' && 'text-badge-error-text',
                                entry.tone === 'info' && 'text-text-primary'
                              )}
                            >
                              {entry.text}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </section>
              </ReadingPipeline>
            </ConsoleTabsContent>
            <ConsoleTabsContent value="questions" className="min-h-0 gap-0 overflow-y-auto pt-3 pr-1 lg:flex-1">
              <ReadingStructure
                sections={reading.sections}
                groups={reading.groups}
                questions={paperQuestions}
                selected={shownSelected}
                onSelect={select}
              />
            </ConsoleTabsContent>
          </ConsoleTabs>

          <SplitHandle row={rowRef} share={paperShare} onChange={setPaperShare} />

          <section className="flex min-h-0 min-w-0 flex-col gap-3" aria-label="Bản đề AI đọc được">
            <ReadingSteps reading={view} questionCount={questionCount} unlabelledCount={source.unlabelledCount} />
            <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl bg-background-gray-secondary p-3 sm:p-6">
              <ReadingAsPaper
                title={source.title}
                sections={reading.sections}
                groups={reading.groups}
                questions={paperQuestions}
                selected={shownSelected}
                onSelect={select}
              />
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { ChevronLeft, ChevronRight, ListTree, RefreshCw } from '../../console/icons'
import Notice from '../../console/notice'
import Status from '../../console/status'
import {
  ConsoleTabs,
  ConsoleTabsContent,
  ConsoleTabsList,
  ConsoleTabsTrigger,
} from '../../console/tabs'
import MathText from '../../ui/MathText'
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
import PagedPreview from '../quiz/PagedPreview'
import ReadingAsPaper, { type PaperQuestion } from './ReadingAsPaper'
import ReadingPaper, { type ShownQuestion } from './ReadingPaper'
import ReadingPipeline from './ReadingPipeline'

const POLL_MS = 4000
const PIPELINE_HIDDEN_KEY = 'hocluc.bankReading.pipelineHidden'
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
 * The paper being put into the bank, live: the pipeline of steps and what each is doing on the left, the paper's page
 * on the right with what the AI writes for each question laid over it as it writes (server-sent events).
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
  const [page, setPage] = useState(1)
  const [follow, setFollow] = useState(true)
  const [overlay, setOverlay] = useState(true)
  const [paperMode, setPaperMode] = useState<'pdf' | 'html'>('pdf')
  // whether the pipeline is shown is remembered for this browser; storage may be refused, then it is just shown
  const [showPipeline, setShowPipeline] = useState(() => {
    try {
      return localStorage.getItem(PIPELINE_HIDDEN_KEY) !== '1'
    } catch {
      return true
    }
  })
  function togglePipeline() {
    setShowPipeline((shown) => {
      try {
        localStorage.setItem(PIPELINE_HIDDEN_KEY, shown ? '1' : '0')
      } catch {
        // kept for this visit only
      }
      return !shown
    })
  }
  const [followId, setFollowId] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const refreshTimer = useRef<number | undefined>(undefined)
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
        if (event.type === 'end' || (event.type === 'part' && event.data.status === 'DONE')) soon()
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
    }))
  }, [shown, reading])

  const regionOf = useMemo(
    () => new Map(reading?.regions.map((r) => [r.number, r]) ?? []),
    [reading]
  )
  const pageCount = reading?.pageCount ?? 0
  const followed =
    view.parts.find((p) => p.id === followId && p.status === 'READING') ?? followedPart(view.parts)
  const writingNow = useMemo(() => {
    if (!followed) return null
    const written = questionsOf(followed)
    return written && written.length > 0 ? written[written.length - 1] : null
  }, [followed])

  // follow the AI: the page of the question it is writing in the part followed
  const followPage = writingNow
    ? (regionOf.get(writingNow.number)?.page ?? followed?.firstPage)
    : followed?.firstPage
  const following =
    follow &&
    followPage !== undefined &&
    followPage >= 1 &&
    (pageCount === 0 || followPage <= pageCount)
  // while following, the page and the question are the AI's; otherwise the viewer's own
  const shownPage = following ? (followPage as number) : page
  const shownSelected = following ? (writingNow?.number ?? null) : selected

  function select(number: number) {
    setFollow(false)
    setSelected(number)
    const at =
      regionOf.get(number)?.page ?? reading?.questions.find((q) => q.number === number)?.sourcePage
    setPage(at && at >= 1 && at <= pageCount ? at : shownPage)
  }

  function turn(by: number) {
    setFollow(false)
    setSelected(shownSelected)
    setPage(Math.min(Math.max(1, shownPage + by), pageCount))
  }

  function toggleFollow() {
    if (follow) {
      setPage(shownPage)
      setSelected(shownSelected)
    }
    setFollow((f) => !f)
  }

  const bands = reading?.regions.filter((r) => r.page === shownPage) ?? []
  const read = [...shown.values()].filter((q) => !q.writing).sort((a, b) => a.number - b.number)
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            appearance="outline"
            aria-pressed={!showPipeline}
            onClick={togglePipeline}
          >
            {showPipeline ? 'Ẩn pipeline' : 'Hiện pipeline'}
          </Button>
          {onLabel && status === 'DONE' && (
            <Button size="sm" onClick={onLabel}>
              <ListTree size={16} />
              Gán nhãn
            </Button>
          )}
        </div>
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
          className={cn('grid gap-5', showPipeline && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]')}
        >
          {showPipeline && (
            <section className="flex min-w-0 flex-col gap-3" aria-label="Pipeline">
              <ReadingPipeline
                reading={view}
                followedId={followed?.id ?? null}
                // a question the AI gave back empty was not read
                questionCount={reading.questions.filter((q) => q.text.trim() !== '').length}
                onFollowPart={(id) => {
                  setFollowId(id)
                  setFollow(true)
                }}
              />
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
              <ConsoleTabs defaultValue="log">
                <ConsoleTabsList aria-label="Chi tiết">
                  <ConsoleTabsTrigger value="log">Nhật ký</ConsoleTabsTrigger>
                  <ConsoleTabsTrigger value="questions">
                    Câu đã đọc ({read.length})
                  </ConsoleTabsTrigger>
                </ConsoleTabsList>
                <ConsoleTabsContent value="log" className="gap-0 pt-3">
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
                </ConsoleTabsContent>
                <ConsoleTabsContent value="questions" className="pt-3">
                  {read.length === 0 ? (
                    <p className="m-0 text-sm text-text-tertiary">Chưa có câu nào được đọc.</p>
                  ) : (
                    <ol className="m-0 flex max-h-80 list-none flex-col gap-2 overflow-y-auto p-0 pr-1">
                      {read.map((question) => (
                        <li key={question.number}>
                          <button
                            type="button"
                            aria-pressed={question.number === shownSelected}
                            onClick={() => {
                              setFollow(false)
                              select(question.number)
                            }}
                            className={cn(
                              'w-full cursor-pointer rounded-lg border bg-transparent p-3 text-left text-sm',
                              question.number === shownSelected
                                ? 'border-brand-500 bg-badge-blue-background'
                                : 'border-card-border hover:border-brand-500'
                            )}
                          >
                            <span className="font-semibold text-text-primary">
                              Câu {question.number}
                            </span>
                            <span className="mt-1 block break-words text-text-primary">
                              <MathText>{question.text}</MathText>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </ConsoleTabsContent>
              </ConsoleTabs>
            </section>
          )}

          <section className="flex min-w-0 flex-col gap-3" aria-label="Đề gốc">
            {pageCount > 0 && (
              <div
                className="flex gap-1 self-start rounded-lg border border-card-border p-0.5"
                role="group"
                aria-label="Cách xem đề"
              >
                {(['pdf', 'html'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={paperMode === mode}
                    onClick={() => setPaperMode(mode)}
                    className={cn(
                      'cursor-pointer rounded-md border-0 px-3 py-1.5 text-sm font-medium',
                      paperMode === mode
                        ? 'bg-brand-500 text-white'
                        : 'bg-transparent text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {mode === 'pdf' ? 'Trang gốc' : 'Bản HTML'}
                  </button>
                ))}
              </div>
            )}
            {pageCount === 0 || paperMode === 'html' ? (
              <>
                {pageCount === 0 && (
                  <p className="m-0 text-xs text-text-tertiary">
                    Chưa có file PDF gốc của đề này: đây là bản dựng lại từ những gì AI đọc được.
                  </p>
                )}
                <div className="max-h-[calc(100dvh-14rem)] min-w-0 overflow-auto rounded-xl bg-background-gray-secondary p-3 sm:p-5">
                  {view.live ? (
                    // while the AI writes, one running sheet that grows with it; cut into pages once it is done
                    <ReadingAsPaper
                      title={source.title}
                      sections={reading.sections}
                      groups={reading.groups}
                      questions={paperQuestions}
                      selected={shownSelected}
                      onSelect={(number) => {
                        setFollow(false)
                        select(number)
                      }}
                    />
                  ) : (
                    <PagedPreview
                      label="Bản đề AI đọc được, chia trang A4"
                      version={`${reading.status}:${paperQuestions.length}:${source.finishedAt ?? ''}`}
                      focus={shownSelected}
                    >
                      <ReadingAsPaper
                        title={source.title}
                        sections={reading.sections}
                        groups={reading.groups}
                        questions={paperQuestions}
                        selected={null}
                        onSelect={() => undefined}
                      />
                    </PagedPreview>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      appearance="outline"
                      disabled={shownPage <= 1}
                      onClick={() => turn(-1)}
                      aria-label="Trang trước"
                    >
                      <ChevronLeft size={17} />
                    </Button>
                    <span className="min-w-20 text-center text-sm text-text-tertiary tabular-nums">
                      Trang {shownPage}/{pageCount}
                    </span>
                    <Button
                      appearance="outline"
                      disabled={shownPage >= pageCount}
                      onClick={() => turn(1)}
                      aria-label="Trang sau"
                    >
                      <ChevronRight size={17} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      appearance={follow ? 'fill' : 'outline'}
                      aria-pressed={follow}
                      onClick={toggleFollow}
                    >
                      Theo dõi AI
                    </Button>
                    <Button
                      size="sm"
                      appearance={overlay ? 'fill' : 'outline'}
                      aria-pressed={overlay}
                      onClick={() => setOverlay((o) => !o)}
                    >
                      Hiện chữ AI viết
                    </Button>
                  </div>
                </div>
                <ReadingPaper
                  sourceId={source.id}
                  page={shownPage}
                  bands={bands}
                  shown={shown}
                  overlay={overlay}
                  selected={shownSelected}
                  onSelect={(number) => {
                    setFollow(false)
                    select(number)
                  }}
                />
                {reading.regions.length === 0 && writingNow && (
                  <div
                    className="rounded-lg border border-card-border p-3 text-sm"
                    aria-label="AI đang viết"
                  >
                    <span className="font-semibold text-text-primary">
                      AI đang viết câu {writingNow.number}:{' '}
                    </span>
                    <span className="break-words text-text-primary">{writingNow.text}</span>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </section>
  )
}

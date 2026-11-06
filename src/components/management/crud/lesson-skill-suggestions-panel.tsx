import { useEffect, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import ConfirmDialog from '../../console/confirm-dialog'
import DataTable from '../../console/data-table'
import { FilterToolbar } from '../../console/filter-toolbar'
import { IconAction, RowActions } from '../../console/icon-action'
import { Check, RefreshCw, Sparkles, X } from '../../console/icons'
import Notice from '../../console/notice'
import Slider from '../../console/slider'
import Status from '../../console/status'
import { Skeleton } from '../../tailgrids/core/skeleton'
import {
  acceptSkillSuggestion,
  acceptSkillSuggestionsAbove,
  getSkillSuggestions,
  rejectSkillSuggestion,
  startSkillSuggestions,
} from '../../../services/lessonLabelService'
import type {
  CourseSkillSuggestions,
  LessonSkillSuggestion,
  SkillSuggestionRun,
} from '../../../types/lessonLabels'
import { crudError } from './crud-errors'

const POLL_MS = 5000
const percent = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })
const isRunning = (run: SkillSuggestionRun | null | undefined) =>
  run?.status === 'PENDING' || run?.status === 'RUNNING'

interface Props {
  courseId: string
  /** The chapters whose lessons got skills, so their rows can show them. */
  onLabelsChanged: (chapterIds: string[]) => void
}

/** A suggestion, and whether it is the first of its lesson: the lesson is named once for its group. */
interface Row {
  suggestion: LessonSkillSuggestion
  first: boolean
}

// Same shape as the loaded panel: the threshold bar, the table header, then lessons with a few skills each.
function SuggestionsSkeleton() {
  return (
    <div role="status" aria-label="Đang tải gợi ý kỹ năng">
      <div aria-hidden="true">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-4 py-3">
          <div className="flex w-full flex-col gap-2.5 sm:max-w-72">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-10" />
            </div>
            <Skeleton className="h-1.5 w-full" />
          </div>
          <Skeleton className="h-8.5 w-40 rounded-lg" />
        </div>
        <div className="flex items-center gap-6 bg-background-gray-secondary px-4 py-3.5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="ml-auto h-3 w-14" />
        </div>
        {[2, 1, 2].flatMap((count, group) =>
          Array.from({ length: count }, (_, index) => (
            <div
              key={`${group}-${index}`}
              className="flex items-center gap-6 border-b border-card-border px-4 py-3.5 last:border-b-0"
            >
              <div className="flex w-40 shrink-0 flex-col gap-2">
                {index === 0 && (
                  <>
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </>
                )}
              </div>
              <div className="flex w-48 items-center gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <Skeleton className="h-7 w-14 rounded-lg" />
              <Skeleton className="h-3.5 w-12" />
              <div className="ml-auto flex gap-1">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Skills Jev or the model suggested for the course's lessons, waiting for a person: one run over every lesson,
 * then accept or reject each, or accept at once every suggestion at least as likely as the threshold.
 */
export default function LessonSkillSuggestionsPanel({ courseId, onLabelsChanged }: Props) {
  const [data, setData] = useState<CourseSkillSuggestions | null>(null)
  const [loadError, setLoadError] = useState('')
  const [tick, setTick] = useState(0)
  /** What is being done: 'start', 'all', or the id of the suggestion being decided. */
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [threshold, setThreshold] = useState(0.8)
  const [confirmAll, setConfirmAll] = useState(false)
  const lastRun = useRef<SkillSuggestionRun | null>(null)

  useEffect(() => {
    let cancelled = false
    getSkillSuggestions(courseId, 'PENDING')
      .then((next) => {
        if (cancelled) return
        // A run watched going and now over: say what it did.
        const before = lastRun.current
        lastRun.current = next.run
        if (isRunning(before) && next.run?.jobId === before?.jobId && next.run?.status === 'DONE') {
          setNotice(next.run.progress ?? 'Đã gợi ý xong.')
        }
        setData(next)
        setLoadError('')
      })
      .catch((reason) => {
        if (!cancelled) setLoadError(crudError(reason))
      })
    return () => {
      cancelled = true
    }
  }, [courseId, tick])

  const running = isRunning(data?.run)
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setTick((current) => current + 1), POLL_MS)
    return () => window.clearInterval(timer)
  }, [running])

  const pending = data?.suggestions ?? []
  const level = Math.round(threshold * 100) / 100
  const above = pending.filter((item) => item.confidence >= level)

  async function start() {
    setBusy('start')
    setError('')
    setNotice('')
    try {
      const run = await startSkillSuggestions(courseId)
      lastRun.current = run
      setData((current) => (current ? { ...current, run } : current))
    } catch (reason) {
      setError(crudError(reason))
    } finally {
      setBusy(null)
    }
  }

  async function decide(item: LessonSkillSuggestion, accept: boolean) {
    setBusy(item.id)
    setError('')
    setNotice('')
    try {
      if (accept) await acceptSkillSuggestion(item.id)
      else await rejectSkillSuggestion(item.id)
      setData((current) =>
        current ? { ...current, suggestions: current.suggestions.filter((other) => other.id !== item.id) } : current
      )
      if (accept) onLabelsChanged([item.chapterId])
    } catch (reason) {
      setError(crudError(reason))
      // Someone else may have decided it meanwhile.
      setTick((current) => current + 1)
    } finally {
      setBusy(null)
    }
  }

  async function acceptAll() {
    const taken = above
    setBusy('all')
    setError('')
    setNotice('')
    try {
      const result = await acceptSkillSuggestionsAbove(courseId, level)
      setNotice(`Đã chấp nhận ${result.accepted} gợi ý.`)
      const skipped = new Set(result.skipped.map((item) => item.lessonId))
      if (result.skipped.length) {
        const listed = result.skipped.slice(0, 3).map((item) => `"${item.lessonTitle}": ${item.reason}`)
        if (result.skipped.length > listed.length) listed.push(`và ${result.skipped.length - listed.length} bài khác`)
        setError(`${result.skipped.length} bài học chưa nhận kỹ năng: ${listed.join('; ')}`)
      }
      onLabelsChanged([
        ...new Set(taken.filter((item) => !skipped.has(item.lessonId)).map((item) => item.chapterId)),
      ])
    } catch (reason) {
      setError(crudError(reason))
    } finally {
      setBusy(null)
      setConfirmAll(false)
      setTick((current) => current + 1)
    }
  }

  const rows: Row[] = pending.map((suggestion, index) => ({
    suggestion,
    first: index === 0 || pending[index - 1].lessonId !== suggestion.lessonId,
  }))

  const columns: ColumnDef<Row>[] = [
    {
      id: 'lesson',
      header: 'Bài học',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.first ? (
          <div className="max-w-64 min-w-40">
            <strong className="block font-medium break-words text-text-primary">
              {row.original.suggestion.lessonTitle}
            </strong>
            <span className="mt-1 block text-xs text-text-tertiary">{row.original.suggestion.chapterTitle}</span>
          </div>
        ) : null,
    },
    {
      id: 'skill',
      header: 'Kỹ năng',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-48 break-words">
          <span className="mr-1.5 font-mono text-xs text-text-tertiary">{row.original.suggestion.skillCode}</span>
          {row.original.suggestion.skillName}
        </div>
      ),
    },
    {
      id: 'confidence',
      header: 'Độ tin cậy',
      enableSorting: false,
      cell: ({ row }) => (
        <Status tone={row.original.suggestion.confidence >= level ? 'info' : 'neutral'} className="tabular-nums">
          {percent.format(row.original.suggestion.confidence)}
        </Status>
      ),
    },
    {
      id: 'source',
      header: 'Nguồn',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-text-secondary">{row.original.suggestion.source === 'JEV' ? 'Jev' : 'Mô hình AI'}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      meta: { className: 'w-24 text-right' },
      cell: ({ row }) => (
        <RowActions>
          <IconAction
            label={`Chấp nhận ${row.original.suggestion.skillCode}`}
            icon={Check}
            hover="success"
            disabled={busy !== null}
            onClick={() => void decide(row.original.suggestion, true)}
          />
          <IconAction
            label={`Bỏ qua ${row.original.suggestion.skillCode}`}
            icon={X}
            variant="danger"
            disabled={busy !== null}
            onClick={() => void decide(row.original.suggestion, false)}
          />
        </RowActions>
      ),
    },
  ]

  const run = data?.run
  const messages = [
    running && (
      <Notice key="run" tone="info">
        <span role="status">{run?.progress ?? 'Đang chờ đến lượt gợi ý kỹ năng.'}</span>
      </Notice>
    ),
    run?.status === 'FAILED' && (
      <Notice key="failed" tone="danger">
        Lần gợi ý gần nhất bị lỗi{run.error ? `: ${run.error}` : '.'}
      </Notice>
    ),
    notice && (
      <Notice key="notice" tone="info">
        <span role="status">{notice}</span>
      </Notice>
    ),
    error && (
      <Notice key="error" tone="danger">
        <span role="alert">{error}</span>
      </Notice>
    ),
    loadError && (
      <Notice key="load" tone="danger">
        {loadError}
        <Button size="sm" appearance="outline" onClick={() => setTick((current) => current + 1)}>
          <RefreshCw size={14} />
          Thử lại
        </Button>
      </Notice>
    ),
  ].filter(Boolean)

  return (
    <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      <div className="flex items-center justify-between gap-3 border-b border-card-border px-5 py-4">
        <h2 className="text-lg leading-7 font-medium text-text-primary">Gợi ý kỹ năng</h2>
        <Button size="sm" disabled={!data || running || busy !== null} onClick={() => void start()}>
          <Sparkles size={16} />
          {running ? 'Đang gợi ý...' : 'Gợi ý bằng AI'}
        </Button>
      </div>
      {messages.length > 0 && (
        <div className="flex flex-col gap-2 border-b border-card-border px-4 py-3">{messages}</div>
      )}
      {!data ? (
        !loadError && <SuggestionsSkeleton />
      ) : (
        <>
          {pending.length > 0 && (
            <FilterToolbar>
              <Slider
                label="Ngưỡng tin cậy"
                value={threshold}
                onChange={setThreshold}
                minValue={0.3}
                maxValue={1}
                step={0.05}
                formatOptions={{ style: 'percent' }}
                className="sm:max-w-72"
              />
              <Button
                size="sm"
                appearance="outline"
                disabled={busy !== null || above.length === 0}
                onClick={() => setConfirmAll(true)}
              >
                <Check size={16} />
                Chấp nhận {above.length} gợi ý
              </Button>
            </FilterToolbar>
          )}
          <DataTable
            columns={columns}
            data={rows}
            getRowKey={(row) => row.suggestion.id}
            emptyMessage="Chưa có gợi ý nào chờ duyệt."
          />
        </>
      )}
      {confirmAll && (
        <ConfirmDialog
          title={`Chấp nhận ${above.length} gợi ý?`}
          description={`Kỹ năng có độ tin cậy từ ${percent.format(level)} trở lên được thêm vào nhãn của bài học; nhãn đang có được giữ nguyên.`}
          cancelLabel="Hủy"
          confirmLabel="Chấp nhận"
          busyLabel="Đang lưu..."
          busy={busy === 'all'}
          onCancel={() => setConfirmAll(false)}
          onConfirm={() => void acceptAll()}
        />
      )}
    </section>
  )
}

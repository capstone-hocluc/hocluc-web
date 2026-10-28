import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import {
  deleteBankSource,
  getBankLabelling,
  getBankSources,
  labelBankSource,
  retryBankSource,
  type BankIngestStatus,
  type BankLabelling,
  type BankSource,
} from '../../../services/questionBankService'
import Button from '../../console/button'
import ConfirmDialog from '../../console/confirm-dialog'
import DataTable from '../../console/data-table'
import { Eye, FilePlus2, ListTree, Pencil, RefreshCw, Trash2 } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import Notice from '../../console/notice'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import Status, { type StatusTone } from '../../console/status'
import type { ScheduleResourceStatus } from '../../../hooks/useScheduleResource'
import BankImportDialog from './BankImportDialog'
import BankSourceEditDialog from './BankSourceEditDialog'
import BankReadingSkeleton from './BankReadingSkeleton'
import { failureText } from './question-bank-labels'

// the pipeline graph library is only loaded when a paper is opened
const BankReadingView = lazy(() => import('./BankReadingView'))

const STATUS_LABELS: Record<BankIngestStatus, string> = {
  PENDING: 'Đang chờ',
  RUNNING: 'Đang đọc',
  DONE: 'Xong',
  FAILED: 'Lỗi',
}
const STATUS_TONES: Record<BankIngestStatus, StatusTone> = {
  PENDING: 'neutral',
  RUNNING: 'info',
  DONE: 'success',
  FAILED: 'danger',
}
const POLL_MS = 5000
const number = new Intl.NumberFormat('vi-VN')
const busy = (source: BankSource) => source.status === 'PENDING' || source.status === 'RUNNING'

/** The papers loaded into the bank; while one is queued or being read the list refreshes itself. */
export default function BankSourcesPanel({ readOnly, onFinished }: { readOnly: boolean; onFinished: () => void }) {
  const [sources, setSources] = useState<BankSource[] | null>(null)
  const [status, setStatus] = useState<ScheduleResourceStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [importing, setImporting] = useState(false)
  const [queued, setQueued] = useState<BankSource | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<BankSource | null>(null)
  const [reloading, setReloading] = useState<BankSource | null>(null)
  const [retryBusy, setRetryBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState<BankSource | null>(null)
  const [removing, setRemoving] = useState<BankSource | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [labelTarget, setLabelTarget] = useState<BankSource | null>(null)
  const [labelBusy, setLabelBusy] = useState(false)
  const [labelling, setLabelling] = useState<BankLabelling | null>(null)
  // read by the row actions, which are made once: the latest answer, not the one they were made with
  const labellingRef = useRef<BankLabelling | null>(null)
  useEffect(() => {
    labellingRef.current = labelling
  }, [labelling])
  /** Jev labels what has no label yet, after a confirmation; when it cannot label now, the reason is shown instead. */
  const askLabelling = useCallback((source: BankSource) => {
    setActionError('')
    const now = labellingRef.current
    if (now && !now.ready) setActionError(now.reason ?? 'Jev chưa gán nhãn được.')
    else setLabelTarget(source)
  }, [])
  const [tick, setTick] = useState(0)
  const active = useRef(new Set<string>())
  const finished = useRef(onFinished)
  useEffect(() => {
    finished.current = onFinished
  })

  useEffect(() => {
    let cancelled = false
    getBankSources()
      .then(next => {
        if (cancelled) return
        // A paper that was queued or running in the previous answer and is not any more has new questions.
        const stillActive = new Set(next.filter(busy).map(source => source.id))
        const done = [...active.current].some(id => !stillActive.has(id))
        active.current = stillActive
        setSources(next)
        setStatus('ready')
        if (done) finished.current()
      })
      .catch(error => {
        if (cancelled) return
        setStatus(error instanceof ApiError && error.status === 403 ? 'forbidden' : 'error')
        setErrorMessage(getErrorMessage(error))
      })
    // whether Jev can label is asked along with the list: importing Master Data elsewhere changes it
    getBankLabelling()
      .then(next => {
        if (!cancelled) setLabelling(next)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [tick])

  const refresh = () => setTick(current => current + 1)
  const polling = sources?.some(busy) ?? false
  useEffect(() => {
    if (!polling) return
    const timer = window.setInterval(() => setTick(current => current + 1), POLL_MS)
    return () => window.clearInterval(timer)
  }, [polling])

  const columns = useMemo<ColumnDef<BankSource>[]>(
    () => [
      {
        id: 'source',
        header: 'Đề',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-40">
            <strong className="block font-medium text-text-primary">{row.original.title}</strong>
            <span className="mt-1 block text-xs text-text-tertiary">
              {[row.original.year, row.original.round].filter(Boolean).join(' · ') || row.original.code}
            </span>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex min-w-40 flex-col gap-1">
            <Status tone={STATUS_TONES[row.original.status]}>{STATUS_LABELS[row.original.status]}</Status>
            {(row.original.error ?? (busy(row.original) ? row.original.progress : null)) && (
              <span className="line-clamp-2 max-w-72 break-words text-xs text-text-tertiary" title={failureText(row.original.error) ?? undefined}>
                {failureText(row.original.error) ?? row.original.progress}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'questions',
        header: 'Số câu',
        enableSorting: false,
        cell: ({ row }) => number.format(row.original.questionCount),
      },
      {
        id: 'review',
        header: 'Cần duyệt',
        enableSorting: false,
        cell: ({ row }) => number.format(row.original.needsReviewCount),
      },
      {
        id: 'unlabelled',
        header: 'Chưa gán nhãn',
        enableSorting: false,
        cell: ({ row }) => number.format(row.original.unlabelledCount),
      },
      {
        id: 'duplicates',
        header: 'Trùng',
        enableSorting: false,
        cell: ({ row }) => number.format(row.original.duplicateCount),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        meta: { className: 'w-32 text-right' },
        cell: ({ row }) => (
          <RowActions>
            {!readOnly && row.original.status === 'FAILED' && (
              <IconAction label="Nạp lại" icon={RefreshCw} hover="info" onClick={() => loadAgain(row.original)} />
            )}
            {!readOnly && row.original.status === 'DONE' && row.original.unlabelledCount > 0 && (
              <IconAction label="Gán nhãn" icon={ListTree} hover="success" onClick={() => askLabelling(row.original)} />
            )}
            {!readOnly && (
              <IconAction label="Sửa thông tin" icon={Pencil} hover="info" onClick={() => setEditing(row.original)} />
            )}
            {!readOnly && !busy(row.original) && (
              <IconAction label="Xóa đề" icon={Trash2} variant="danger" onClick={() => askRemoving(row.original)} />
            )}
            <IconAction label="Xem AI đọc đề" icon={Eye} onClick={() => setViewingId(row.original.id)} />
          </RowActions>
        ),
      },
    ],
    [readOnly, askLabelling]
  )
  const viewing = sources?.find(source => source.id === viewingId) ?? null

  /** From the kept files after a confirmation; a paper whose files were not kept is uploaded again. */
  function loadAgain(source: BankSource) {
    setActionError('')
    if (source.retryable) setRetrying(source)
    else setReloading(source)
  }

  function askRemoving(source: BankSource) {
    setActionError('')
    setRemoving(source)
  }

  async function confirmRemoving() {
    if (!removing || removeBusy) return
    setRemoveBusy(true)
    try {
      await deleteBankSource(removing.id)
      if (viewingId === removing.id) setViewingId(null)
      setRemoving(null)
      refresh()
      finished.current()
    } catch (reason) {
      setRemoving(null)
      setActionError(getErrorMessage(reason))
    } finally {
      setRemoveBusy(false)
    }
  }

  async function confirmLabelling() {
    if (!labelTarget || labelBusy) return
    setLabelBusy(true)
    try {
      setQueued(await labelBankSource(labelTarget.id))
      setLabelTarget(null)
      refresh()
    } catch (reason) {
      setLabelTarget(null)
      setActionError(getErrorMessage(reason))
    } finally {
      setLabelBusy(false)
    }
  }

  async function confirmRetry() {
    if (!retrying || retryBusy) return
    setRetryBusy(true)
    try {
      setQueued(await retryBankSource(retrying.id))
      setRetrying(null)
      refresh()
    } catch (reason) {
      setRetrying(null)
      setActionError(getErrorMessage(reason))
    } finally {
      setRetryBusy(false)
    }
  }

  const unlabelled = sources?.some(source => source.unlabelledCount > 0) ?? false

  return (
    <section className="flex flex-col gap-3">
      {viewing ? (
        // the paper opens in the page, in place of the list; back returns to it
        <Suspense fallback={<BankReadingSkeleton />}>
          <BankReadingView
            source={viewing}
            onClose={() => setViewingId(null)}
            onLoadAgain={!readOnly && viewing.status === 'FAILED' ? () => loadAgain(viewing) : undefined}
            onLabel={
              !readOnly && viewing.status === 'DONE' && viewing.unlabelledCount > 0 && labelling?.ready !== false
                ? () => askLabelling(viewing)
                : undefined
            }
            labellingBlocker={labelling && !labelling.ready ? labelling.reason : null}
          />
        </Suspense>
      ) : (
        <>
      {queued && (
        <Notice tone="info">Đã xếp hàng đề {queued.title}. Bảng dưới tự cập nhật khi đề được đọc xong.</Notice>
      )}
      {actionError && <Notice tone="danger">{actionError}</Notice>}
      {unlabelled && labelling && !labelling.ready && <Notice tone="warning">{labelling.reason}</Notice>}
      <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        {!readOnly && (
          <div className="flex justify-end border-b border-card-border px-5 py-4">
            <Button onClick={() => setImporting(true)}>
              <FilePlus2 size={17} />
              Nhập đề
            </Button>
          </div>
        )}
        <ScheduleResourceState
          skeleton="table"
          inset
          status={status}
          errorMessage={errorMessage}
          onRetry={() => {
            setStatus('loading')
            refresh()
          }}
        >
          <DataTable
            columns={columns}
            data={sources ?? []}
            getRowKey={row => row.id}
            onRowClick={row => setViewingId(row.id)}
            emptyMessage="Chưa nạp đề nào."
          />
        </ScheduleResourceState>
      </section>
        </>
      )}

      {(importing || reloading) && (
        <BankImportDialog
          again={reloading ?? undefined}
          onClose={() => {
            setImporting(false)
            setReloading(null)
          }}
          onQueued={source => {
            setImporting(false)
            setReloading(null)
            setQueued(source)
            refresh()
          }}
        />
      )}

      {labelTarget && (
        <ConfirmDialog
          title={`Gán nhãn đề ${labelTarget.title}?`}
          description={`Jev gán nhãn ${labelTarget.unlabelledCount} câu chưa có nhãn theo Master Data đang dùng. Đề không bị đọc lại; Jev tốn ít token.`}
          cancelLabel="Hủy"
          confirmLabel="Gán nhãn"
          busy={labelBusy}
          busyLabel="Đang gửi..."
          onCancel={() => setLabelTarget(null)}
          onConfirm={confirmLabelling}
        />
      )}

      {editing && (
        <BankSourceEditDialog
          source={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title={`Xóa đề ${removing.title}?`}
          description={`Xóa ${removing.questionCount} câu của đề cùng nhãn và file đã lưu. Đề đã chép vào bài kiểm tra thì không bị ảnh hưởng.`}
          variant="danger"
          cancelLabel="Hủy"
          confirmLabel="Xóa"
          busy={removeBusy}
          busyLabel="Đang xóa..."
          onCancel={() => setRemoving(null)}
          onConfirm={confirmRemoving}
        />
      )}

      {retrying && (
        <ConfirmDialog
          title={`Nạp lại đề ${retrying.title}?`}
          description="AI đọc lại đề từ file đã lưu, tốn token cho phần chưa đọc được. Đề được xếp hàng và xử lý nền."
          cancelLabel="Hủy"
          confirmLabel="Nạp lại"
          busy={retryBusy}
          busyLabel="Đang gửi..."
          onCancel={() => setRetrying(null)}
          onConfirm={confirmRetry}
        />
      )}
    </section>
  )
}

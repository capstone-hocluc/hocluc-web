import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import {
  deleteBankSource,
  getBankSources,
  type BankIngestStatus,
  type BankSource,
} from '../../../services/questionBankService'
import { examRoundLabel } from './exam-rounds'
import Button from '../../console/button'
import ConfirmDialog from '../../console/confirm-dialog'
import DataTable from '../../console/data-table'
import { Eye, ListTree, Pencil, RefreshCw, Sparkles, Trash2 } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import Notice from '../../console/notice'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import Status, { type StatusTone } from '../../console/status'
import type { ScheduleResourceStatus } from '../../../hooks/useScheduleResource'
import BankSourceEditDialog from './BankSourceEditDialog'
import { failureText } from './question-bank-labels'
import { useSourceActions } from './use-source-actions'

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
export default function BankSourcesPanel({
  readOnly,
  onFinished,
  onOpenAssistant,
  onOpenPaper,
}: {
  readOnly: boolean
  onFinished: () => void
  /** Papers are loaded in the AI workspace; given when the viewer can open it. */
  onOpenAssistant?: () => void
  /** Opens a paper in the AI workspace, where it is shown as it is read. */
  onOpenPaper?: (id: string) => void
}) {
  const [sources, setSources] = useState<BankSource[] | null>(null)
  const [status, setStatus] = useState<ScheduleResourceStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [queued, setQueued] = useState<BankSource | null>(null)
  const [editing, setEditing] = useState<BankSource | null>(null)
  const [removing, setRemoving] = useState<BankSource | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [tick, setTick] = useState(0)
  const { labelling, refreshLabelling, askLabelling, loadAgain, actionError, setActionError, dialogs } = useSourceActions(
    (source) => {
      setQueued(source)
      setTick((current) => current + 1)
    }
  )
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
    refreshLabelling()
    return () => {
      cancelled = true
    }
  }, [tick, refreshLabelling])

  const refresh = () => setTick(current => current + 1)
  const polling = sources?.some(busy) ?? false
  useEffect(() => {
    if (!polling) return
    const timer = window.setInterval(() => setTick(current => current + 1), POLL_MS)
    return () => window.clearInterval(timer)
  }, [polling])

  const askRemoving = useCallback(
    (source: BankSource) => {
      setActionError('')
      setRemoving(source)
    },
    [setActionError]
  )

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
              {[row.original.year, row.original.round && examRoundLabel(row.original.round)].filter(Boolean).join(' · ') || row.original.code}
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
            {onOpenPaper && (
              <IconAction label="Xem AI đọc đề" icon={Eye} onClick={() => onOpenPaper(row.original.id)} />
            )}
          </RowActions>
        ),
      },
    ],
    [readOnly, askLabelling, loadAgain, askRemoving, onOpenPaper]
  )


  async function confirmRemoving() {
    if (!removing || removeBusy) return
    setRemoveBusy(true)
    try {
      await deleteBankSource(removing.id)
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

  const unlabelled = sources?.some(source => source.unlabelledCount > 0) ?? false

  return (
    <section className="flex flex-col gap-3">
      {queued && (
        <Notice tone="info">Đã xếp hàng đề {queued.title}. Bảng dưới tự cập nhật khi đề được đọc xong.</Notice>
      )}
      {actionError && <Notice tone="danger">{actionError}</Notice>}
      {unlabelled && labelling && !labelling.ready && <Notice tone="warning">{labelling.reason}</Notice>}
      <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        {!readOnly && onOpenAssistant && (
          <div className="flex justify-end border-b border-card-border px-5 py-4">
            <Button onClick={onOpenAssistant}>
              <Sparkles size={17} />
              Nạp đề trong Trợ lý AI
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
            onRowClick={onOpenPaper ? row => onOpenPaper(row.id) : undefined}
            emptyMessage="Chưa nạp đề nào."
          />
        </ScheduleResourceState>
      </section>

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

      {dialogs}
    </section>
  )
}

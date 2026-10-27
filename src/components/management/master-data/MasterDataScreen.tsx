import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { getErrorMessage } from '../../../lib/errors'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getCategories } from '../../../services/categoryService'
import {
  activateMasterDataVersion,
  deleteMasterDataDraft,
  getMasterDataVersions,
  type MasterDataImportResult,
  type MasterDataVersion,
  type MasterDataVersionStatus,
} from '../../../services/masterDataService'
import Button from '../../console/button'
import ConfirmDialog from '../../console/confirm-dialog'
import DataTable from '../../console/data-table'
import { FilterToolbar } from '../../console/filter-toolbar'
import { CheckCircle2, FilePlus2, Trash2 } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import Notice from '../../console/notice'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import SelectField from '../../console/select-field'
import Status, { type StatusTone } from '../../console/status'
import MasterDataImportDialog from './MasterDataImportDialog'

const STATUS_LABELS: Record<MasterDataVersionStatus, string> = {
  ACTIVE: 'Đang dùng',
  DRAFT: 'Bản nháp',
  RETIRED: 'Đã thay thế',
}
const STATUS_TONES: Record<MasterDataVersionStatus, StatusTone> = {
  ACTIVE: 'success',
  DRAFT: 'warning',
  RETIRED: 'neutral',
}

const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '—')

type Pending = { kind: 'activate' | 'delete'; version: MasterDataVersion } | null

export default function MasterDataScreen({ readOnly = false }: { readOnly?: boolean }) {
  const categories = useScheduleResource('md-categories', getCategories)
  const [chosen, setChosen] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<MasterDataImportResult | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // The label set belongs to a subject with no sub-subjects: that is where the server accepts an import.
  const subjects = useMemo(() => {
    const all = categories.data ?? []
    const parents = new Set(all.map(category => category.parentId).filter(Boolean))
    return all.filter(category => !parents.has(category.id)).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [categories.data])
  const categoryId = chosen ?? subjects[0]?.id ?? null

  const versions = useScheduleResource(categoryId ? `md-versions:${categoryId}` : null, () =>
    getMasterDataVersions(categoryId as string)
  )

  const columns = useMemo<ColumnDef<MasterDataVersion>[]>(
    () => [
      {
        id: 'version',
        header: 'Phiên bản',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-28">
            <strong className="block font-medium text-text-primary">{row.original.version}</strong>
            {row.original.codePrefix && (
              <span className="mt-1 block text-xs text-text-tertiary">Mã {row.original.codePrefix}</span>
            )}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        enableSorting: false,
        cell: ({ row }) => (
          <Status tone={STATUS_TONES[row.original.status]}>{STATUS_LABELS[row.original.status]}</Status>
        ),
      },
      {
        id: 'file',
        header: 'File',
        enableSorting: false,
        cell: ({ row }) => <span className="break-all">{row.original.sourceFilename ?? '—'}</span>,
      },
      {
        id: 'importedAt',
        header: 'Ngày nhập',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{dateTime(row.original.importedAt)}</span>,
      },
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        meta: { className: 'w-24 text-right' },
        cell: ({ row }) =>
          readOnly || row.original.status !== 'DRAFT' ? null : (
            <RowActions>
              <IconAction
                label="Kích hoạt"
                icon={CheckCircle2}
                hover="success"
                onClick={() => setPending({ kind: 'activate', version: row.original })}
              />
              <IconAction
                label="Xóa bản nháp"
                icon={Trash2}
                variant="danger"
                onClick={() => setPending({ kind: 'delete', version: row.original })}
              />
            </RowActions>
          ),
      },
    ],
    [readOnly]
  )

  async function confirm() {
    if (!pending || busy) return
    setBusy(true)
    setError('')
    try {
      if (pending.kind === 'activate') await activateMasterDataVersion(pending.version.id)
      else await deleteMasterDataDraft(pending.version.id)
      setPending(null)
      setImported(null)
      versions.reload()
    } catch (reason) {
      setError(getErrorMessage(reason))
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      {imported && (
        <Notice tone="info">
          Đã nhập phiên bản {imported.version} ở dạng bản nháp
          {imported.warnings.length > 0 ? `, ${imported.warnings.length} cảnh báo` : ''}. Kích hoạt để Jev dùng bản này.
        </Notice>
      )}
      {error && <Notice tone="danger">{error}</Notice>}

      <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        <FilterToolbar>
          <SelectField
            // Remount once subjects load, so the select is controlled from its first render with a value.
            key={categoryId ?? 'none'}
            ariaLabel="Môn học"
            className="sm:w-72"
            value={categoryId ?? undefined}
            disabled={!categoryId}
            options={subjects.map(subject => ({ id: subject.id, label: subject.name }))}
            onChange={value => {
              setChosen(value)
              setImported(null)
              setError('')
            }}
          />
          {!readOnly && (
            <Button onClick={() => setImporting(true)} disabled={!categoryId}>
              <FilePlus2 size={17} />
              Nhập file Excel
            </Button>
          )}
        </FilterToolbar>
        <ScheduleResourceState
          skeleton="table"
          inset
          status={categories.status === 'ready' ? versions.status : categories.status}
          errorMessage={categories.status === 'ready' ? versions.errorMessage : categories.errorMessage}
          onRetry={categories.status === 'ready' ? versions.reload : categories.reload}
        >
          <DataTable
            columns={columns}
            data={versions.data ?? []}
            getRowKey={row => row.id}
            emptyMessage="Môn học này chưa có Master Data."
          />
        </ScheduleResourceState>
      </section>

      {importing && categoryId && (
        <MasterDataImportDialog
          categoryId={categoryId}
          onClose={() => setImporting(false)}
          onImported={result => {
            setImporting(false)
            setImported(result)
            setError('')
            versions.reload()
          }}
        />
      )}

      {pending && (
        <ConfirmDialog
          title={pending.kind === 'activate' ? `Kích hoạt phiên bản ${pending.version.version}?` : `Xóa bản nháp ${pending.version.version}?`}
          description={
            pending.kind === 'activate'
              ? 'Phiên bản đang dùng của môn học này sẽ được thay thế.'
              : 'Toàn bộ dữ liệu nhập cùng bản nháp sẽ bị xóa.'
          }
          cancelLabel="Hủy"
          confirmLabel={pending.kind === 'activate' ? 'Kích hoạt' : 'Xóa'}
          variant={pending.kind === 'delete' ? 'danger' : 'primary'}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      )}
    </section>
  )
}

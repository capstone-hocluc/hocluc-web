import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, RefreshCw } from '../../console/icons'
import Button from '../../console/button'
import ListCard from '../../console/list-card'
import Status from '../../console/status'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import CategoryEditorDialog from './category-editor-dialog'
import { getCategories, deleteCategory, type Category } from '../../../services/categoryService'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { crudError, unknownMutation } from './crud-errors'

export default function CategoryManagement({ readOnly = false }: { readOnly?: boolean }) {
  const resource = useScheduleResource('management-categories', getCategories)
  const [editor, setEditor] = useState<{ category: Category | null } | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const rows = useMemo(() => resource.data ?? [], [resource.data])
  const names = useMemo(() => new Map(rows.map((row) => [row.id, row.name])), [rows])
  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Danh mục',
        cell: ({ row }) => (
          <div className="min-w-40">
            <strong className="font-medium">{row.original.name}</strong>
            <p className="mt-1 text-xs text-text-tertiary">{row.original.slug}</p>
          </div>
        ),
      },
      {
        id: 'parent',
        header: 'Danh mục cha',
        accessorFn: (c) => (c.parentId ? (names.get(c.parentId) ?? '—') : '—'),
      },
      { accessorKey: 'sortOrder', header: 'Thứ tự' },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Status tone={row.original.active ? 'success' : 'neutral'}>
            {row.original.active ? 'Đang dùng' : 'Ngừng dùng'}
          </Status>
        ),
      },
      ...(!readOnly
        ? [
            {
              id: 'actions',
              header: 'Thao tác',
              cell: ({ row }: { row: { original: Category } }) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    appearance="outline"
                    disabled={busy}
                    onClick={() => setEditor({ category: row.original })}
                  >
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    appearance="ghost"
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setDeleting(row.original)
                    }}
                  >
                    Xóa
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [readOnly, names, busy]
  )
  async function remove() {
    if (!deleting || busy) return
    setBusy(true)
    setError('')
    try {
      await deleteCategory(deleting.id)
      setDeleting(null)
      setNotice('Đã xóa danh mục.')
      resource.reload()
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        setDeleting(null)
        resource.reload()
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-tertiary">Danh mục dùng chung cho khóa học và nội dung.</p>
        <div className="flex gap-2">
          <Button
            appearance="outline"
            onClick={resource.reload}
            disabled={busy || resource.status === 'loading'}
          >
            <RefreshCw size={16} />
            Làm mới
          </Button>
          {!readOnly && (
            <Button
              onClick={() => setEditor({ category: null })}
              disabled={busy || resource.status !== 'ready'}
            >
              <Plus size={16} />
              Tạo danh mục
            </Button>
          )}
        </div>
      </div>
      {notice && (
        <Notice tone="info">
          <span role="status">{notice}</span>
        </Notice>
      )}
      {error && (
        <Notice tone="danger">
          <span role="alert">{error}</span>
        </Notice>
      )}
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        <ListCard
          data={rows}
          columns={columns}
          getRowKey={(c) => c.id}
          searchPlaceholder="Tìm danh mục..."
          searchText={(c) => `${c.name} ${c.slug}`}
          emptyMessage="Chưa có danh mục. Tạo danh mục đầu tiên để phân loại nội dung."
          filter={{
            ariaLabel: 'Trạng thái danh mục',
            allLabel: 'Tất cả trạng thái',
            options: ['Đang dùng', 'Ngừng dùng'],
            get: (c) => (c.active ? 'Đang dùng' : 'Ngừng dùng'),
          }}
        />
      </ScheduleResourceState>
      {editor && (
        <CategoryEditorDialog
          key={editor.category?.id ?? 'new'}
          category={editor.category}
          categories={rows}
          onClose={() => {
            setEditor(null)
            resource.reload()
          }}
          onSaved={() => {
            setEditor(null)
            setNotice('Đã lưu danh mục.')
            resource.reload()
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Xóa danh mục?"
          description={
            <>
              {deleting.name}. Chỉ xóa khi không còn danh mục con hoặc dữ liệu tham chiếu.
              {error && (
                <span className="mt-2 block text-danger" role="alert">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel="Xóa danh mục"
          variant="danger"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}
    </section>
  )
}

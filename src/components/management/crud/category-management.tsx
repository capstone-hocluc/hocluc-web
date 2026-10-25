import { useCallback, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import PageHeading from '../../console/page-heading'
import { Pencil, Plus, Trash2, XCircle } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import Button from '../../console/button'
import SelectField from '../../console/select-field'
import ListCard from '../../console/list-card'
import Status from '../../console/status'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import CategoryEditorDialog from './category-editor-dialog'
import {
  getCategories,
  deleteCategory,
  saveCategory,
  type Category,
} from '../../../services/categoryService'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { crudError, unknownMutation } from './crud-errors'

// A category cannot move under itself or its own descendants. The backend still enforces cycles and depth.
function blockedParents(category: Category, rows: Category[]) {
  const blocked = new Set([category.id])
  for (let i = 0; i < rows.length; i++) {
    for (const item of rows) if (item.parentId && blocked.has(item.parentId)) blocked.add(item.id)
  }
  return blocked
}

export default function CategoryManagement({ readOnly = false }: { readOnly?: boolean }) {
  const resource = useScheduleResource('management-categories', getCategories)
  const [editor, setEditor] = useState<{ category: Category | null } | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)
  // The select can report one choice twice before `busy` re-renders; this blocks the duplicate request.
  const moving = useRef(false)
  const [quickEditId, setQuickEditId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const rows = useMemo(() => resource.data ?? [], [resource.data])
  const changeParent = useCallback(
    async (category: Category, value: string) => {
      const parentId = value === 'NONE' ? null : value
      if (moving.current || busy || parentId === category.parentId) return
      moving.current = true
      setBusy(true)
      setError('')
      setNotice('')
      try {
        await saveCategory(category.id, {
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
          parentId,
          active: category.active,
          sortOrder: category.sortOrder,
          expectedUpdatedAt: category.updatedAt,
        })
        setNotice(`Đã đổi môn học cha của "${category.name}".`)
        setQuickEditId(null)
        resource.reload()
      } catch (err) {
        setError(crudError(err))
        if (unknownMutation(err)) resource.reload()
      } finally {
        moving.current = false
        setBusy(false)
      }
    },
    [busy, resource]
  )
  const names = useMemo(() => new Map(rows.map((row) => [row.id, row.name])), [rows])
  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Môn học',
        cell: ({ row }) => (
          <div className="min-w-40">
            <strong className="font-medium">{row.original.name}</strong>
          </div>
        ),
      },
      {
        id: 'parent',
        header: 'Môn học cha',
        accessorFn: (c) => (c.parentId ? (names.get(c.parentId) ?? '—') : 'Không có'),
        cell: ({ row }) => {
          const category = row.original
          const parentName = category.parentId ? (names.get(category.parentId) ?? '—') : 'Không có'
          if (readOnly) return parentName
          if (quickEditId !== category.id) {
            return (
              <div className="flex items-center gap-1">
                <span>{parentName}</span>
                <IconAction
                  label={`Sửa nhanh môn học cha của ${category.name}`}
                  icon={Pencil}
                  disabled={busy}
                  onClick={() => setQuickEditId(category.id)}
                />
              </div>
            )
          }
          const blocked = blockedParents(category, rows)
          return (
            <div className="flex items-center gap-1">
              <SelectField
                ariaLabel={`Môn học cha của ${category.name}`}
                value={category.parentId ?? 'NONE'}
                disabled={busy}
                onChange={(value) => void changeParent(category, value)}
                className="min-w-48"
                options={[
                  { id: 'NONE', label: 'Không có' },
                  ...rows
                    .filter((c) => !blocked.has(c.id))
                    .map((c) => ({ id: c.id, label: c.name })),
                ]}
              />
              <IconAction
                label="Hủy sửa nhanh"
                icon={XCircle}
                disabled={busy}
                onClick={() => setQuickEditId(null)}
              />
            </div>
          )
        },
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
              meta: { className: 'w-32 text-right' },
              cell: ({ row }: { row: { original: Category } }) => (
                <RowActions>
                  <IconAction
                    label="Sửa"
                    icon={Pencil}
                    disabled={busy}
                    onClick={() => setEditor({ category: row.original })}
                  />
                  <IconAction
                    label="Xóa"
                    icon={Trash2}
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setDeleting(row.original)
                    }}
                  />
                </RowActions>
              ),
            },
          ]
        : []),
    ],
    [readOnly, names, busy, rows, changeParent, quickEditId]
  )
  async function remove() {
    if (!deleting || busy) return
    setBusy(true)
    setError('')
    try {
      await deleteCategory(deleting.id)
      setDeleting(null)
      setNotice('Đã xóa môn học.')
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
      <PageHeading
        title="Môn học"
        readOnly={readOnly}
        action={
          !readOnly && (
            <Button
              onClick={() => setEditor({ category: null })}
              disabled={busy || resource.status !== 'ready'}
            >
              <Plus size={16} />
              Tạo môn học
            </Button>
          )
        }
      />
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
        skeleton="table"
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        <ListCard
          data={rows}
          columns={columns}
          getRowKey={(c) => c.id}
          searchPlaceholder="Tìm môn học..."
          searchText={(c) => c.name}
          emptyMessage="Chưa có môn học. Tạo môn học đầu tiên để phân loại nội dung."
          filter={{
            ariaLabel: 'Trạng thái môn học',
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
            setNotice('Đã lưu môn học.')
            resource.reload()
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Xóa môn học?"
          description={
            <>
              {deleting.name}. Chỉ xóa khi không còn môn học con hoặc dữ liệu tham chiếu.
              {error && (
                <span className="mt-2 block text-danger" role="alert">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel="Xóa môn học"
          variant="danger"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}
    </section>
  )
}

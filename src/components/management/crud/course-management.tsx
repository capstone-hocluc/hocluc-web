import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import { FilterGroup, FilterSelect, FilterToolbar, SearchInput } from '../../console/filter-toolbar'
import Status from '../../console/status'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Eye, PackageOpen, Pencil, Plus, Send, Trash2 } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import { Pagination } from '../../tailgrids/core/pagination'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getCategories } from '../../../services/categoryService'
import {
  changeCourseStatus,
  deleteAdminCourse,
  getAdminCourses,
  type CourseAdmin,
  type CourseQuery,
  type CourseStatus,
} from '../../../services/courseAdminService'
import { crudError, unknownMutation } from './crud-errors'
import CourseEditorDialog from './course-editor-dialog'
import CourseDetailScreen from './course-detail-screen'

import { COURSE_STATUS_LABELS } from './course-labels'
const price = (course: CourseAdmin) =>
  !course.paid
    ? 'Miễn phí'
    : new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(course.price ?? 0)

export default function CourseManagement({ readOnly = false }: { readOnly?: boolean }) {
  const [query, setQuery] = useState<CourseQuery>({ page: 0, size: 20 })
  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState<{ course: CourseAdmin | null } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{
    course: CourseAdmin
    status?: CourseStatus
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const resource = useScheduleResource(`admin-courses:${JSON.stringify(query)}`, () =>
    getAdminCourses(query)
  )
  const categories = useScheduleResource('course-categories', getCategories)
  const columns = useMemo<ColumnDef<CourseAdmin>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Khóa học',
        enableSorting: false,
        meta: { className: 'w-[34%]' },
        cell: ({ row }) => (
          <strong className="block max-w-80 truncate font-medium" title={row.original.title}>
            {row.original.title}
          </strong>
        ),
      },
      { accessorKey: 'courseType', header: 'Loại', enableSorting: false, meta: { className: 'w-24' } },
      {
        accessorKey: 'categoryName',
        header: 'Danh mục',
        enableSorting: false,
        meta: { className: 'w-44' },
        cell: ({ row }) => row.original.categoryName ?? 'Chưa phân loại',
      },
      {
        id: 'price',
        header: 'Học phí',
        meta: { className: 'w-36 text-right' },
        cell: ({ row }) => <span className="whitespace-nowrap">{price(row.original)}</span>,
      },
      {
        id: 'status',
        header: 'Trạng thái',
        meta: { className: 'w-32' },
        cell: ({ row }) => (
          <Status
            tone={
              row.original.status === 'PUBLISHED'
                ? 'success'
                : row.original.status === 'DRAFT'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {COURSE_STATUS_LABELS[row.original.status]}
          </Status>
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        meta: { className: 'w-44 text-right' },
        cell: ({ row }) => (
          <RowActions>
            <IconAction label="Chi tiết" icon={Eye} onClick={() => setSelectedId(row.original.id)} disabled={busy} />
            {!readOnly && (
              <>
                <IconAction label="Sửa" icon={Pencil} onClick={() => setEditor({ course: row.original })} disabled={busy} />
                <IconAction
                  label={row.original.status === 'PUBLISHED' ? 'Lưu trữ' : 'Xuất bản'}
                  icon={row.original.status === 'PUBLISHED' ? PackageOpen : Send}
                  disabled={busy}
                  onClick={() => {
                    setError('')
                    setConfirmation({
                      course: row.original,
                      status: row.original.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED',
                    })
                  }}
                />
                {row.original.status === 'DRAFT' && (
                  <IconAction
                    label="Xóa"
                    icon={Trash2}
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setConfirmation({ course: row.original })
                    }}
                  />
                )}
              </>
            )}
          </RowActions>
        ),
      },
    ],
    [readOnly, busy]
  )
  const setFilter = (key: 'type' | 'status' | 'categoryId', value: string) =>
    setQuery((old) => ({ ...old, [key]: value === 'ALL' ? undefined : value, page: 0 }))
  async function confirm() {
    if (!confirmation || busy) return
    setBusy(true)
    setError('')
    try {
      if (confirmation.status) await changeCourseStatus(confirmation.course, confirmation.status)
      else await deleteAdminCourse(confirmation.course.id)
      setNotice(confirmation.status ? 'Đã cập nhật trạng thái khóa.' : 'Đã xóa khóa nháp.')
      setConfirmation(null)
      resource.reload()
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        setConfirmation(null)
        resource.reload()
      }
    } finally {
      setBusy(false)
    }
  }
  if (selectedId)
    return (
      <CourseDetailScreen
        id={selectedId}
        readOnly={readOnly}
        onBack={() => {
          setSelectedId(null)
          resource.reload()
        }}
      />
    )
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-tertiary">Khóa trọn bộ và khóa nhỏ, ở mọi trạng thái.</p>
        <div className="flex gap-2">
          {!readOnly && (
            <Button
              onClick={() => setEditor({ course: null })}
              disabled={busy || categories.status !== 'ready' || resource.status !== 'ready'}
            >
              <Plus size={16} />
              Tạo khóa học
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
      {categories.status === 'error' && (
        <Notice tone="warning">
          Không tải được danh mục.{' '}
          <Button appearance="outline" size="sm" onClick={categories.reload}>
            Thử lại
          </Button>
        </Notice>
      )}
      <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        <FilterToolbar>
          <form
            className="w-full sm:max-w-md"
            onSubmit={(e) => {
              e.preventDefault()
              setQuery((old) => ({ ...old, query: search.trim(), page: 0 }))
            }}
          >
            <SearchInput
              ariaLabel="Tìm khóa học"
              placeholder="Tên khóa học... (Enter để tìm)"
              maxLength={200}
              value={search}
              onChange={setSearch}
              className="sm:max-w-none"
            />
          </form>
          <FilterGroup>
            <FilterSelect
              ariaLabel="Loại khóa lọc"
              value={query.type ?? 'ALL'}
              onChange={(v) => setFilter('type', v)}
              options={[
                { id: 'ALL', label: 'Tất cả loại' },
                { id: 'MAIN', label: 'MAIN · Trọn bộ' },
                { id: 'SECTION', label: 'SECTION · Khóa nhỏ' },
              ]}
            />
            <FilterSelect
              ariaLabel="Trạng thái khóa lọc"
              value={query.status ?? 'ALL'}
              onChange={(v) => setFilter('status', v)}
              options={[
                { id: 'ALL', label: 'Tất cả trạng thái' },
                ...Object.entries(COURSE_STATUS_LABELS).map(([id, label]) => ({ id, label })),
              ]}
            />
            <FilterSelect
              ariaLabel="Danh mục lọc"
              value={query.categoryId ?? 'ALL'}
              onChange={(v) => setFilter('categoryId', v)}
              disabled={categories.status !== 'ready'}
              options={[
                { id: 'ALL', label: 'Tất cả danh mục' },
                ...(categories.data ?? []).map((c) => ({ id: c.id, label: c.name })),
              ]}
            />
          </FilterGroup>
        </FilterToolbar>
        <ScheduleResourceState skeleton="table"
          status={resource.status}
          errorMessage={resource.errorMessage}
          onRetry={resource.reload}
        >
          <DataTable
            columns={columns}
            data={resource.data?.content ?? []}
            getRowKey={(c) => c.id}
            emptyMessage="Chưa có khóa học phù hợp."
          />
          <div className="flex flex-col gap-3 border-t border-card-border px-5 py-4">
            <p className="text-sm text-text-tertiary">
              {resource.data?.totalElements ?? 0} khóa học
            </p>
            {(resource.data?.totalPages ?? 0) > 1 && (
              <Pagination
                currentPage={(query.page ?? 0) + 1}
                totalPages={resource.data?.totalPages ?? 1}
                onPageChange={(p) => setQuery((old) => ({ ...old, page: p - 1 }))}
                sideLayout="icon"
              />
            )}
          </div>
        </ScheduleResourceState>
      </section>
      {editor && categories.data && (
        <CourseEditorDialog
          key={editor.course?.id ?? 'new'}
          course={editor.course}
          categories={categories.data}
          onClose={() => {
            setEditor(null)
            resource.reload()
          }}
          onSaved={() => {
            setEditor(null)
            setNotice('Đã lưu khóa học.')
            resource.reload()
          }}
        />
      )}
      {confirmation && (
        <ConfirmDialog
          title={
            confirmation.status === 'PUBLISHED'
              ? 'Xuất bản khóa học?'
              : confirmation.status === 'ARCHIVED'
                ? 'Lưu trữ khóa học?'
                : 'Xóa khóa nháp?'
          }
          description={
            <>
              {confirmation.course.title}.{' '}
              {confirmation.status === 'ARCHIVED'
                ? 'Ẩn khỏi danh sách mở bán; giữ lịch sử và quyền học đã cấp.'
                : confirmation.status === 'PUBLISHED'
                  ? 'Chỉ xuất bản khi nội dung và các SECTION đã sẵn sàng.'
                  : 'Không thể khôi phục; backend sẽ chặn nếu còn tham chiếu.'}
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel={confirmation.status ? 'Xác nhận' : 'Xóa khóa'}
          variant={confirmation.status ? 'primary' : 'danger'}
          busy={busy}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void confirm()}
        />
      )}
    </section>
  )
}

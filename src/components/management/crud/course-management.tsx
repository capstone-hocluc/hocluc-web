import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import { FilterGroup, FilterSelect, FilterToolbar, SearchInput } from '../../console/filter-toolbar'
import Status from '../../console/status'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Plus } from '../../console/icons'
import { Pagination } from '../../tailgrids/core/pagination'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getCategories } from '../../../services/categoryService'
import {
  deleteAdminCourse,
  getAdminCourse,
  getAdminCourses,
  rejectCourseReview,
  type CourseAdmin,
  type CourseQuery,
} from '../../../services/courseAdminService'
import { crudError, unknownMutation } from './crud-errors'
import CourseEditorDialog from './course-editor-dialog'
import CourseDetailScreen from './course-detail-screen'
import CourseRejectDialog from './course-reject-dialog'
import CourseRowActions, { type CourseRowHandlers } from './course-row-actions'
import { ACTION_COPY, runReviewAction, type ReviewAction } from './course-review-actions'

import {
  COURSE_STATUS_LABELS,
  COURSE_TYPE_LABELS,
  courseDisplayStatus,
  REVIEW_STATE_LABELS,
} from './course-labels'
// Backend field when present (it knows per-subject reviewers); otherwise the roles that always review.
const canReviewCourse = (course: CourseAdmin, role?: string) =>
  course.canReview ?? (role === 'ADMINISTRATOR' || role === 'MANAGER')
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
  const [openOnContent, setOpenOnContent] = useState(false)
  const [deleting, setDeleting] = useState<CourseAdmin | null>(null)
  const [reviewing, setReviewing] = useState<{ course: CourseAdmin; action: ReviewAction } | null>(
    null
  )
  const [rejecting, setRejecting] = useState<CourseAdmin | null>(null)
  const { profile } = useCurrentUser()
  const role = profile?.role
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const resource = useScheduleResource(`admin-courses:${JSON.stringify(query)}`, () =>
    getAdminCourses(query)
  )
  const categories = useScheduleResource('course-categories', getCategories)
  const pending = useScheduleResource('admin-courses-pending', () =>
    getAdminCourses({ reviewState: 'PENDING', page: 0, size: 1 })
  )
  const openDetail = (id: string) => {
    setOpenOnContent(false)
    setSelectedId(id)
  }
  const clearError = () => setError('')
  const rowHandlers = useMemo<CourseRowHandlers>(
    () => ({
      onContent: (course) => {
        setOpenOnContent(true)
        setSelectedId(course.id)
      },
      onEdit: (course) => setEditor({ course }),
      onReview: (course, action) => {
        clearError()
        setReviewing({ course, action })
      },
      onReject: (course) => {
        clearError()
        setRejecting(course)
      },
      onDelete: (course) => {
        clearError()
        setDeleting(course)
      },
    }),
    []
  )
  const columns = useMemo<ColumnDef<CourseAdmin>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Khóa học',
        enableSorting: false,
        meta: { className: 'w-[34%]' },
        cell: ({ row }) => (
          <button
            type="button"
            className="block max-w-80 truncate text-left font-medium hover:text-primary focus-visible:underline"
            title={row.original.title}
            onClick={() => openDetail(row.original.id)}
          >
            {row.original.title}
          </button>
        ),
      },
      {
        accessorKey: 'courseType',
        header: 'Loại',
        enableSorting: false,
        meta: { className: 'w-28' },
        cell: ({ row }) => COURSE_TYPE_LABELS[row.original.courseType],
      },
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
          <Status tone={courseDisplayStatus(row.original).tone}>
            {courseDisplayStatus(row.original).label}
          </Status>
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        meta: { className: 'w-64 text-right' },
        cell: ({ row }) => (
          <CourseRowActions
            course={row.original}
            canReview={canReviewCourse(row.original, role)}
            readOnly={readOnly}
            busy={busy}
            handlers={rowHandlers}
          />
        ),
      },
    ],
    [readOnly, busy, role, rowHandlers]
  )
  // One status filter over the two backend fields (status, reviewState).
  const statusFilter =
    query.reviewState ?? (query.status === 'DRAFT' ? 'DRAFT' : (query.status ?? 'ALL'))
  const setStatusFilter = (value: string) =>
    setQuery((old) => ({
      ...old,
      status:
        value === 'PUBLISHED' || value === 'ARCHIVED'
          ? value
          : value === 'DRAFT'
            ? 'DRAFT'
            : undefined,
      reviewState:
        value === 'PENDING' || value === 'REJECTED'
          ? value
          : value === 'DRAFT'
            ? 'NONE'
            : undefined,
      page: 0,
    }))
  const setFilter = (key: 'type' | 'categoryId', value: string) =>
    setQuery((old) => ({ ...old, [key]: value === 'ALL' ? undefined : value, page: 0 }))
  // Runs one change on a course and refreshes the list; false means the dialog should stay open.
  async function perform(work: () => Promise<unknown>, done: string): Promise<boolean> {
    if (busy) return false
    setBusy(true)
    setError('')
    try {
      await work()
      setNotice(done)
      resource.reload()
      pending.reload()
      return true
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        setDeleting(null)
        setReviewing(null)
        setRejecting(null)
        resource.reload()
      }
      return false
    } finally {
      setBusy(false)
    }
  }
  if (selectedId)
    return (
      <CourseDetailScreen
        id={selectedId}
        readOnly={readOnly}
        initialTab={openOnContent ? 'content' : 'overview'}
        onBack={() => {
          setSelectedId(null)
          resource.reload()
          pending.reload()
        }}
      />
    )
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-tertiary">
          Soạn khóa, gửi duyệt và theo dõi trạng thái bán. Bấm vào một khóa để xem chi tiết.
        </p>
        <div className="flex gap-2">
          <Button
            appearance={statusFilter === 'PENDING' ? 'fill' : 'outline'}
            aria-pressed={statusFilter === 'PENDING'}
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          >
            Chờ duyệt{pending.data ? ` (${pending.data.totalElements})` : ''}
          </Button>
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
            className="w-full sm:max-w-sm sm:min-w-40 sm:flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              setQuery((old) => ({ ...old, query: search.trim(), page: 0 }))
            }}
          >
            <SearchInput
              ariaLabel="Tìm khóa học"
              placeholder="Tìm tên khóa học"
              maxLength={200}
              value={search}
              onChange={setSearch}
              className="sm:max-w-none"
            />
          </form>
          <FilterGroup>
            <FilterSelect
              className="sm:w-40"
              ariaLabel="Loại khóa lọc"
              value={query.type ?? 'ALL'}
              onChange={(v) => setFilter('type', v)}
              options={[
                { id: 'ALL', label: 'Tất cả loại' },
                { id: 'MAIN', label: COURSE_TYPE_LABELS.MAIN },
                { id: 'SECTION', label: COURSE_TYPE_LABELS.SECTION },
              ]}
            />
            <FilterSelect
              className="sm:w-40"
              ariaLabel="Trạng thái khóa lọc"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { id: 'ALL', label: 'Tất cả trạng thái' },
                { id: 'DRAFT', label: COURSE_STATUS_LABELS.DRAFT },
                { id: 'PENDING', label: REVIEW_STATE_LABELS.PENDING },
                { id: 'REJECTED', label: REVIEW_STATE_LABELS.REJECTED },
                { id: 'PUBLISHED', label: COURSE_STATUS_LABELS.PUBLISHED },
                { id: 'ARCHIVED', label: COURSE_STATUS_LABELS.ARCHIVED },
              ]}
            />
            <FilterSelect
              className="sm:w-40"
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
        <ScheduleResourceState
          skeleton="table"
          status={resource.status}
          errorMessage={resource.errorMessage}
          onRetry={resource.reload}
        >
          <DataTable
            columns={columns}
            data={resource.data?.content ?? []}
            getRowKey={(c) => c.id}
            onRowClick={(c) => openDetail(c.id)}
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
      {deleting && (
        <ConfirmDialog
          title="Xóa khóa nháp?"
          description={
            <>
              {deleting.title}. Không thể khôi phục; backend sẽ chặn nếu còn tham chiếu.
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel="Xóa khóa"
          variant="danger"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            void perform(() => deleteAdminCourse(deleting.id), 'Đã xóa khóa nháp.').then(
              (ok) => ok && setDeleting(null)
            )
          }
        />
      )}
      {reviewing && (
        <ConfirmDialog
          title={ACTION_COPY[reviewing.action].title}
          description={
            <>
              {reviewing.course.title}. {ACTION_COPY[reviewing.action].body}
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel={ACTION_COPY[reviewing.action].confirm}
          busy={busy}
          onCancel={() => setReviewing(null)}
          onConfirm={() =>
            void perform(
              () => runReviewAction(reviewing.action, reviewing.course.id),
              ACTION_COPY[reviewing.action].done
            ).then((ok) => ok && setReviewing(null))
          }
        />
      )}
      {rejecting && (
        <CourseRejectDialog
          courseTitle={rejecting.title}
          busy={busy}
          error={error}
          onCancel={() => setRejecting(null)}
          onSubmit={(note) =>
            void perform(
              async () => rejectCourseReview(await getAdminCourse(rejecting.id), note),
              'Đã trả lại khóa kèm lý do.'
            ).then((ok) => ok && setRejecting(null))
          }
        />
      )}
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import PageHeading from '../../console/page-heading'
import Button from '../../console/button'
import Card from '../../console/card'
import DataTable from '../../console/data-table'
import Field from '../../console/form-field'
import SelectField from '../../console/select-field'
import { FilterGroup, FilterSelect, FilterToolbar, SearchInput } from '../../console/filter-toolbar'
import Status from '../../console/status'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Plus } from '../../console/icons'
import { Pagination } from '../../tailgrids/core/pagination'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { deleteCategory, getCategories, type Category } from '../../../services/categoryService'
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
import CategoryEditorDialog from './category-editor-dialog'
import CourseDetailScreen from './course-detail-screen'
import CourseCover from './course-cover'
import CourseRejectDialog from './course-reject-dialog'
import CourseRowActions, { type CourseRowHandlers } from './course-row-actions'
import { ACTION_COPY, runReviewAction, type ReviewAction } from './course-review-actions'
import SubjectRail, {
  type SubjectCounts,
  type SubjectGroup,
} from './subject-rail'

import {
  COURSE_STATUS_LABELS,
  COURSE_TYPE_LABELS,
  courseDisplayStatus,
  REVIEW_STATE_LABELS,
} from './course-labels'
// Backend field when present (it knows per-subject reviewers); otherwise the roles that always review.
const canReviewCourse = (course: CourseAdmin, role?: string) =>
  course.canReview ?? (role === 'ADMINISTRATOR' || role === 'MANAGER')
// The old subject page was limited to these roles; teachers only read courses.
const canManageSubjects = (role?: string) =>
  role === 'ADMINISTRATOR' || role === 'STAFF' || role === 'MANAGER'
const price = (course: CourseAdmin) =>
  !course.paid
    ? 'Miễn phí'
    : new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(course.price ?? 0)
const byOrder = (a: Category, b: Category) =>
  Number(!a.active) - Number(!b.active) ||
  a.sortOrder - b.sortOrder ||
  a.name.localeCompare(b.name, 'vi')
// Each top-level subject with the subjects under it; a subject whose parent is missing counts as top-level.
function groupByRoot(categories: Category[]): SubjectGroup[] {
  const ids = new Set(categories.map((category) => category.id))
  const roots = categories.filter((item) => !item.parentId || !ids.has(item.parentId)).sort(byOrder)
  return roots.map((root) => ({
    root,
    children: categories.filter((item) => item.parentId === root.id).sort(byOrder),
  }))
}
function findSubject(groups: SubjectGroup[], id: string): Category | null {
  for (const group of groups) {
    if (group.root.id === id) return group.root
    const child = group.children.find((item) => item.id === id)
    if (child) return child
  }
  return null
}
// Same tree as the rail, for the select shown under 768px.
function buildSubjectOptions(
  groups: SubjectGroup[],
  counts: SubjectCounts | null
): { id: string; label: string }[] {
  const suffix = (id: string, active: boolean) =>
    `${counts ? ` (${counts.byCategory[id] ?? 0})` : ''}${active ? '' : ' · Ngừng dùng'}`
  return [
    { id: 'ALL', label: `Tất cả môn${counts ? ` (${counts.total})` : ''}` },
    ...groups.flatMap(({ root, children }) => [
      { id: root.id, label: `${root.name}${suffix(root.id, root.active)}` },
      ...children.map((child) => ({
        id: child.id,
        label: `– ${child.name}${suffix(child.id, child.active)}`,
      })),
    ]),
  ]
}

export default function CourseManagement({
  readOnly = false,
  title = 'Môn học và khóa học',
}: {
  readOnly?: boolean
  title?: string
}) {
  const [query, setQuery] = useState<CourseQuery>({ page: 0, size: 20 })
  const [search, setSearch] = useState('')
  useEffect(() => {
    const nextQuery = search.trim()
    if (nextQuery === (query.query ?? '')) return

    const timer = window.setTimeout(() => {
      setQuery((old) => ({ ...old, query: nextQuery || undefined, page: 0 }))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, query.query])
  const [subjectId, setSubjectId] = useState('ALL')
  const [editor, setEditor] = useState<{ course: CourseAdmin | null } | null>(null)
  const [categoryEditor, setCategoryEditor] = useState<{
    category: Category | null
    parentId?: string
  } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('courseId'))
  const [openOnContent, setOpenOnContent] = useState(() => Boolean(new URLSearchParams(window.location.search).get('courseId')))
  const [deleting, setDeleting] = useState<CourseAdmin | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [reviewing, setReviewing] = useState<{ course: CourseAdmin; action: ReviewAction } | null>(
    null
  )
  const [rejecting, setRejecting] = useState<CourseAdmin | null>(null)
  const { profile } = useCurrentUser()
  const role = profile?.role
  const manageSubjects = !readOnly && canManageSubjects(role)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const categories = useScheduleResource('course-categories', getCategories)
  const groups = useMemo(() => groupByRoot(categories.data ?? []), [categories.data])
  const subjectCounts = useScheduleResource<SubjectCounts>(
    categories.status === 'ready'
      ? `category-course-counts:${(categories.data ?? []).map((category) => category.id).join(',')}`
      : null,
    async () => {
      const list = categories.data ?? []
      // The category filter is exact, so a parent's count is its own courses only.
      const [all, entries] = await Promise.all([
        getAdminCourses({ size: 1 }),
        Promise.all(
          list.map(async (category) => {
            const page = await getAdminCourses({ categoryId: category.id, size: 1 })
            return [category.id, page.totalElements] as const
          })
        ),
      ])
      return { total: all.totalElements, byCategory: Object.fromEntries(entries) }
    }
  )
  const effectiveQuery = useMemo<CourseQuery>(
    () => ({ ...query, categoryId: subjectId === 'ALL' ? undefined : subjectId }),
    [query, subjectId]
  )
  const resource = useScheduleResource(`admin-courses:${JSON.stringify(effectiveQuery)}`, () =>
    getAdminCourses(effectiveQuery)
  )
  const pending = useScheduleResource('admin-courses-pending', () =>
    getAdminCourses({ reviewState: 'PENDING', page: 0, size: 1 })
  )
  const subjectOptions = useMemo(
    () => buildSubjectOptions(groups, subjectCounts.data),
    [groups, subjectCounts.data]
  )
  const selectedSubject = subjectId === 'ALL' ? null : findSubject(groups, subjectId)
  const selectedRoot = groups.find((group) => group.root.id === subjectId)
  const openDetail = (id: string) => {
    setOpenOnContent(false)
    setSelectedId(id)
  }
  const selectSubject = (id: string) => {
    setSubjectId(id)
    setQuery((old) => ({ ...old, page: 0 }))
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
        meta: { className: 'px-2!' },
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <CourseCover
              imageUrl={row.original.imageUrl}
              title={row.original.title}
              categoryName={row.original.categoryName}
              loading="lazy"
              className="w-10 shrink-0 text-xs"
            />
            <button
              type="button"
              className="line-clamp-2 min-w-0 flex-1 text-left font-medium leading-5 hover:text-primary focus-visible:underline"
              title={row.original.title}
              onClick={() => openDetail(row.original.id)}
            >
              {row.original.title}
            </button>
          </div>
        ),
      },
      {
        accessorKey: 'courseType',
        header: 'Loại',
        enableSorting: false,
        meta: { className: 'w-[4.75rem] px-1.5! whitespace-nowrap' },
        cell: ({ row }) => COURSE_TYPE_LABELS[row.original.courseType],
      },
      ...(subjectId === 'ALL'
        ? [
            {
              accessorKey: 'categoryName',
              header: 'Môn học',
              enableSorting: false,
              meta: { className: 'w-22 px-2!' },
              cell: ({ row }: { row: { original: CourseAdmin } }) => (
                <span
                  className="block truncate"
                  title={row.original.categoryName ?? 'Chưa phân loại'}
                >
                  {row.original.categoryName ?? 'Chưa phân loại'}
                </span>
              ),
            } satisfies ColumnDef<CourseAdmin>,
          ]
        : []),
      {
        id: 'price',
        header: 'Học phí',
        meta: { className: 'w-24 px-2! text-right' },
        cell: ({ row }) => (
          <span className="block truncate" title={price(row.original)}>
            {price(row.original)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        meta: { className: 'w-32 px-1.5!' },
        cell: ({ row }) => (
          <Status tone={courseDisplayStatus(row.original).tone}>
            {courseDisplayStatus(row.original).label}
          </Status>
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        meta: { className: 'w-41 px-2! text-right' },
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
    [readOnly, busy, role, rowHandlers, subjectId]
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
  const setTypeFilter = (value: string) =>
    setQuery((old) => ({ ...old, type: value === 'ALL' ? undefined : (value as CourseQuery['type']), page: 0 }))
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
      subjectCounts.reload()
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
  async function removeSubject() {
    if (!deletingCategory || busy) return
    setBusy(true)
    setError('')
    try {
      await deleteCategory(deletingCategory.id)
      if (subjectId === deletingCategory.id) setSubjectId('ALL')
      setDeletingCategory(null)
      setNotice('Đã xóa môn học.')
      categories.reload()
      subjectCounts.reload()
      resource.reload()
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        setDeletingCategory(null)
        categories.reload()
      }
    } finally {
      setBusy(false)
    }
  }
  const categorySaved = () => {
    setCategoryEditor(null)
    setNotice('Đã lưu môn học.')
    categories.reload()
    subjectCounts.reload()
    resource.reload()
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
  const courseList = (
    <>
      <FilterToolbar>
        <form
          className="w-full sm:max-w-sm sm:min-w-40 sm:flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            setQuery((old) => ({ ...old, query: search.trim() || undefined, page: 0 }))
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
            onChange={setTypeFilter}
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
        </FilterGroup>
      </FilterToolbar>
      <ScheduleResourceState
        skeleton="table"
        inset
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        {/* Floor for the fixed layout: on mobile the title column would collapse, so the table scrolls instead. */}
        <div className="[&_table]:w-full [&_table]:min-w-[40rem] [&_table]:table-fixed">
          <DataTable
            columns={columns}
            data={resource.data?.content ?? []}
            getRowKey={(course) => course.id}
            onRowClick={(course) => openDetail(course.id)}
            emptyMessage="Chưa có khóa học phù hợp."
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-card-border px-5 py-4">
          <p className="text-sm text-text-tertiary">
            {resource.data?.totalElements ?? 0} khóa học
          </p>
          {(resource.data?.totalPages ?? 0) > 1 && (
            <Pagination
              currentPage={(query.page ?? 0) + 1}
              totalPages={resource.data?.totalPages ?? 1}
              onPageChange={(page) => setQuery((old) => ({ ...old, page: page - 1 }))}
              sideLayout="icon"
            />
          )}
        </div>
      </ScheduleResourceState>
    </>
  )
  return (
    <section className="flex flex-col gap-5">
      <PageHeading
        title={title}
        readOnly={readOnly}
        action={
          <>
            <Button
              appearance={statusFilter === 'PENDING' ? 'fill' : 'outline'}
              aria-pressed={statusFilter === 'PENDING'}
              onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            >
              Chờ duyệt{pending.data ? ` (${pending.data.totalElements})` : ''}
            </Button>
            {manageSubjects && (
              <Button
                appearance="outline"
                onClick={() => setCategoryEditor({ category: null })}
                disabled={busy || categories.status !== 'ready'}
              >
                <Plus size={16} />
                Tạo môn học
              </Button>
            )}
            {!readOnly && (
              <Button
                onClick={() => setEditor({ course: null })}
                disabled={busy || categories.status !== 'ready' || resource.status !== 'ready'}
              >
                <Plus size={16} />
                Tạo khóa học
              </Button>
            )}
          </>
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
      <div className="flex flex-col gap-2 md:hidden">
        <Field label="Môn học">
          <SelectField
            ariaLabel="Môn học"
            value={subjectId}
            onChange={selectSubject}
            options={subjectOptions}
            disabled={categories.status !== 'ready'}
          />
        </Field>
        {categories.status !== 'ready' && categories.status !== 'loading' && (
          <Notice tone="warning">
            Không tải được môn học.{' '}
            <Button appearance="outline" size="sm" onClick={categories.reload}>
              Thử lại
            </Button>
          </Notice>
        )}
      </div>
      <div className="grid items-start gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
        <SubjectRail
          className="hidden md:flex"
          status={categories.status}
          errorMessage={categories.errorMessage}
          onRetry={categories.reload}
          groups={groups}
          counts={subjectCounts.data}
          countsLoading={subjectCounts.status === 'loading' || subjectCounts.status === 'idle'}
          selectedId={subjectId}
          onSelect={selectSubject}
        />
        <Card padding="none" className="flex min-w-0 flex-col overflow-hidden">
          {/* The rail already names the subject and counts its courses; only its own actions are left here. */}
          {manageSubjects && selectedSubject && (
          <header className="flex flex-wrap items-center justify-end gap-2 border-b border-card-border px-5 py-3">
            {!selectedSubject.active && <Status tone="neutral">Ngừng dùng</Status>}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  appearance="outline"
                  disabled={busy}
                  onClick={() => setCategoryEditor({ category: selectedSubject })}
                >
                  Sửa môn
                </Button>
                {selectedRoot && (
                  <Button
                    size="sm"
                    appearance="outline"
                    disabled={busy}
                    onClick={() =>
                      setCategoryEditor({ category: null, parentId: selectedRoot.root.id })
                    }
                  >
                    Thêm môn con
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  appearance="outline"
                  disabled={busy}
                  onClick={() => {
                    clearError()
                    setDeletingCategory(selectedSubject)
                  }}
                >
                  Xóa
                </Button>
              </div>
          </header>
          )}
          {courseList}
        </Card>
      </div>
      {editor && categories.data && (
        <CourseEditorDialog
          key={editor.course?.id ?? `new-${subjectId}`}
          course={editor.course}
          categories={categories.data}
          initialCategoryId={subjectId === 'ALL' ? undefined : subjectId}
          onClose={() => {
            setEditor(null)
            resource.reload()
          }}
          onSaved={() => {
            setEditor(null)
            setNotice('Đã lưu khóa học.')
            resource.reload()
            subjectCounts.reload()
          }}
        />
      )}
      {categoryEditor && categories.data && (
        <CategoryEditorDialog
          key={categoryEditor.category?.id ?? `new-${categoryEditor.parentId ?? ''}`}
          category={categoryEditor.category}
          initialParentId={categoryEditor.parentId}
          categories={categories.data}
          onClose={() => {
            setCategoryEditor(null)
            categories.reload()
          }}
          onSaved={categorySaved}
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
      {deletingCategory && (
        <ConfirmDialog
          title="Xóa môn học?"
          description={
            <>
              {deletingCategory.name}. Chỉ xóa khi không còn môn học con hoặc dữ liệu tham chiếu.
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel="Xóa môn học"
          variant="danger"
          busy={busy}
          onCancel={() => setDeletingCategory(null)}
          onConfirm={() => void removeSubject()}
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

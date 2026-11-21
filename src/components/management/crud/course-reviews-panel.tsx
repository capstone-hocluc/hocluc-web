import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import DataTable from '../../console/data-table'
import Field, { textareaControlClass } from '../../console/form-field'
import { FilterGroup, FilterSelect, FilterToolbar } from '../../console/filter-toolbar'
import { Eye, EyeOff, Star } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import Status from '../../console/status'
import { Pagination } from '../../tailgrids/core/pagination'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getErrorMessage } from '../../../lib/errors'
import { showErrorToast, showSuccessToast } from '../../../lib/toastBus'
import {
  getAdminReviews,
  setReviewVisibility,
  type AdminReviewFilter,
  type CourseReviewAdmin,
} from '../../../services/courseReviewService'
import { formatDate } from './crud-format'

const RATING_OPTIONS = [
  { id: 'ALL', label: 'Tất cả số sao' },
  ...[5, 4, 3, 2, 1].map((star) => ({ id: String(star), label: `${star} sao` })),
]
const VISIBILITY_OPTIONS = [
  { id: 'ALL', label: 'Đang hiện và đã ẩn' },
  { id: 'false', label: 'Đang hiện' },
  { id: 'true', label: 'Đã ẩn' },
]

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-medium text-text-primary" aria-label={`${value} sao`}>
      <Star size={15} aria-hidden="true" className="fill-warning text-warning" />
      {value}
    </span>
  )
}

/** The reviews students left on this course; staff hide the ones that break the rules, with a reason. */
export default function CourseReviewsPanel({ courseId }: { courseId: string }) {
  const [filter, setFilter] = useState<AdminReviewFilter>({})
  const [page, setPage] = useState(0)
  const [hiding, setHiding] = useState<CourseReviewAdmin | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const key = `course-reviews:${courseId}:${filter.rating ?? ''}:${filter.hidden ?? ''}:${page}`
  const resource = useScheduleResource(key, () => getAdminReviews(courseId, filter, page))

  const show = async (review: CourseReviewAdmin) => {
    setBusy(true)
    try {
      await setReviewVisibility(review.id, false)
      showSuccessToast('Đã hiện lại đánh giá.')
      resource.reload()
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const hide = async () => {
    if (!hiding || !reason.trim()) return
    setBusy(true)
    try {
      await setReviewVisibility(hiding.id, true, reason.trim())
      showSuccessToast('Đã ẩn đánh giá.')
      setHiding(null)
      resource.reload()
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo<ColumnDef<CourseReviewAdmin>[]>(
    () => [
      {
        id: 'student',
        header: 'Học viên',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-40 max-w-60">
            <span className="block truncate font-medium text-text-primary">{row.original.authorName}</span>
            <span className="mt-1 block truncate text-xs text-text-tertiary">{row.original.authorEmail}</span>
          </div>
        ),
      },
      {
        id: 'rating',
        header: 'Số sao',
        enableSorting: false,
        cell: ({ row }) => <Stars value={row.original.rating} />,
      },
      {
        id: 'comment',
        header: 'Nhận xét',
        enableSorting: false,
        cell: ({ row }) => (
          <p className="min-w-60 max-w-xl whitespace-pre-line text-sm text-text-secondary">
            {row.original.comment ?? '—'}
          </p>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.hidden ? (
            <div className="grid max-w-56 gap-1">
              <Status tone="warning">Đã ẩn</Status>
              {row.original.hiddenReason && (
                <span className="text-xs text-text-tertiary">{row.original.hiddenReason}</span>
              )}
            </div>
          ) : (
            <Status tone="success">Đang hiện</Status>
          ),
      },
      {
        id: 'date',
        header: 'Ngày gửi',
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions>
            {row.original.hidden ? (
              <IconAction label="Hiện lại" icon={Eye} disabled={busy} onClick={() => show(row.original)} />
            ) : (
              <IconAction
                label="Ẩn đánh giá"
                icon={EyeOff}
                variant="danger"
                disabled={busy}
                onClick={() => {
                  setReason('')
                  setHiding(row.original)
                }}
              />
            )}
          </RowActions>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy]
  )

  const changeFilter = (next: AdminReviewFilter) => {
    setFilter(next)
    setPage(0)
  }

  return (
    <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      <FilterToolbar className="justify-start">
        <FilterGroup>
          <FilterSelect
            ariaLabel="Số sao lọc"
            value={filter.rating ? String(filter.rating) : 'ALL'}
            onChange={(value) => changeFilter({ ...filter, rating: value === 'ALL' ? undefined : Number(value) })}
            options={RATING_OPTIONS}
          />
          <FilterSelect
            ariaLabel="Trạng thái đánh giá lọc"
            value={filter.hidden === undefined ? 'ALL' : String(filter.hidden)}
            onChange={(value) => changeFilter({ ...filter, hidden: value === 'ALL' ? undefined : value === 'true' })}
            options={VISIBILITY_OPTIONS}
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
        <DataTable
          columns={columns}
          data={resource.data?.content ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="Chưa có đánh giá phù hợp."
        />
        <div className="flex flex-col gap-3 border-t border-card-border px-5 py-4">
          <p className="text-sm text-text-tertiary">{resource.data?.totalElements ?? 0} đánh giá</p>
          {(resource.data?.totalPages ?? 0) > 1 && (
            <Pagination
              currentPage={page + 1}
              totalPages={resource.data?.totalPages ?? 1}
              onPageChange={(next) => setPage(next - 1)}
              sideLayout="icon"
            />
          )}
        </div>
      </ScheduleResourceState>

      <ConsoleDialog
        open={hiding !== null}
        onClose={() => setHiding(null)}
        dismissable={!busy}
        title="Ẩn đánh giá"
        description="Đánh giá bị ẩn không còn hiện trên trang khóa học và không tính vào điểm trung bình. Học viên vẫn thấy đánh giá của mình kèm lý do."
        onSubmit={(event) => {
          event.preventDefault()
          void hide()
        }}
        footer={
          <>
            <Button type="button" appearance="outline" disabled={busy} onClick={() => setHiding(null)}>
              Hủy
            </Button>
            <Button type="submit" variant="danger" disabled={busy || !reason.trim()}>
              {busy ? 'Đang ẩn…' : 'Ẩn đánh giá'}
            </Button>
          </>
        }
      >
        <Field label="Lý do" required>
          <textarea
            className={textareaControlClass}
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </Field>
      </ConsoleDialog>
    </section>
  )
}

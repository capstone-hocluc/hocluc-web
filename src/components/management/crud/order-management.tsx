import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import SelectField from '../../console/select-field'
import Status from '../../console/status'
import Notice from '../../console/notice'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { RefreshCw, Search } from '../../console/icons'
import { Input } from '../../tailgrids/core/input'
import { Pagination } from '../../tailgrids/core/pagination'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getAdminCourses } from '../../../services/courseAdminService'
import {
  getAdminOrders,
  ORDER_STATUSES,
  type OrderAdmin,
  type OrderQuery,
} from '../../../services/orderAdminService'
import { EMPTY, formatDateTime, formatVnd } from './crud-format'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from './order-labels'
import OrderDetailScreen from './order-detail-screen'

const LIST_KEY = 'admin-orders'

export default function OrderManagement({
  readOnly = false,
  canConfirm = false,
}: {
  readOnly?: boolean
  canConfirm?: boolean
}) {
  const [query, setQuery] = useState<OrderQuery>({ page: 0, size: 20 })
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const resource = useScheduleResource(`${LIST_KEY}:${JSON.stringify(query)}`, () =>
    getAdminOrders(query)
  )
  const courses = useScheduleResource(`${LIST_KEY}-courses`, () => getAdminCourses({ size: 100 }))
  const columns = useMemo<ColumnDef<OrderAdmin>[]>(
    () => [
      {
        accessorKey: 'orderCode',
        header: 'Mã đơn',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-36">
            <strong className="block font-medium text-text-primary">{row.original.orderCode}</strong>
            <span className="mt-1 block truncate text-xs text-text-tertiary">
              {row.original.paymentCode ?? 'Chưa tạo mã'}
            </span>
          </div>
        ),
      },
      {
        id: 'student',
        header: 'Học viên',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-44 max-w-64">
            <span className="block truncate font-medium text-text-primary">
              {row.original.studentName ?? row.original.studentEmail}
            </span>
            <span className="mt-1 block truncate text-xs text-text-tertiary">
              {row.original.studentEmail}
            </span>
          </div>
        ),
      },
      {
        id: 'courses',
        header: 'Khóa học',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-40 max-w-72 text-text-tertiary">
            {row.original.items.length
              ? row.original.items.map((item) => (
                  <span key={item.courseId} className="block truncate">
                    {item.courseTitle}
                  </span>
                ))
              : EMPTY}
          </div>
        ),
      },
      {
        id: 'totalAmount',
        header: 'Số tiền',
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatVnd(row.original.totalAmount)}</span>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Status tone={ORDER_STATUS_TONES[row.original.status]}>
            {ORDER_STATUS_LABELS[row.original.status]}
          </Status>
        ),
      },
      {
        id: 'createdAt',
        header: 'Tạo lúc',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            appearance="outline"
            onClick={() => setSelectedId(row.original.id)}
          >
            Chi tiết
          </Button>
        ),
      },
    ],
    []
  )

  if (selectedId)
    return (
      <OrderDetailScreen
        id={selectedId}
        readOnly={readOnly}
        canConfirm={canConfirm}
        onBack={() => {
          setSelectedId(null)
          resource.reload()
        }}
      />
    )

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-tertiary">
          Đơn của học viên, kèm mọi lần thanh toán và dấu vết xử lý.
        </p>
        <Button
          appearance="outline"
          onClick={resource.reload}
          disabled={resource.status === 'loading'}
        >
          <RefreshCw size={16} />
          Làm mới
        </Button>
      </div>
      <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <form
            className="flex w-full gap-2 sm:w-auto sm:flex-1"
            onSubmit={(event) => {
              event.preventDefault()
              setQuery((old) => ({ ...old, reference: search.trim() || undefined, page: 0 }))
            }}
          >
            <Input
              aria-label="Tìm mã đơn hoặc mã thanh toán"
              placeholder="Mã đơn hoặc mã thanh toán..."
              maxLength={50}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1"
            />
            <Button type="submit" appearance="outline" aria-label="Tìm kiếm">
              <Search size={16} />
            </Button>
          </form>
          <SelectField
            ariaLabel="Trạng thái đơn lọc"
            value={query.status ?? 'ALL'}
            onChange={(value) =>
              setQuery((old) => ({
                ...old,
                status: value === 'ALL' ? undefined : (value as OrderAdmin['status']),
                page: 0,
              }))
            }
            options={[
              { id: 'ALL', label: 'Tất cả trạng thái' },
              ...ORDER_STATUSES.map((id) => ({ id, label: ORDER_STATUS_LABELS[id] })),
            ]}
          />
          <SelectField
            ariaLabel="Khóa học lọc"
            value={query.courseId ?? 'ALL'}
            onChange={(value) =>
              setQuery((old) => ({ ...old, courseId: value === 'ALL' ? undefined : value, page: 0 }))
            }
            disabled={courses.status !== 'ready'}
            options={[
              { id: 'ALL', label: 'Tất cả khóa học' },
              ...(courses.data?.content ?? []).map((course) => ({ id: course.id, label: course.title })),
            ]}
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-text-tertiary">
            Từ ngày
            <Input
              type="date"
              aria-label="Từ ngày tạo"
              value={query.from ?? ''}
              onChange={(event) =>
                setQuery((old) => ({ ...old, from: event.target.value || undefined, page: 0 }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-tertiary">
            Đến ngày
            <Input
              type="date"
              aria-label="Đến ngày tạo"
              value={query.to ?? ''}
              onChange={(event) =>
                setQuery((old) => ({ ...old, to: event.target.value || undefined, page: 0 }))
              }
            />
          </label>
        </div>
        {courses.status === 'error' && (
          <Notice tone="warning" className="mx-5 mb-4">
            Không tải được danh sách khóa để lọc.{' '}
            <Button appearance="outline" size="sm" onClick={courses.reload}>
              Thử lại
            </Button>
          </Notice>
        )}
        <ScheduleResourceState
          status={resource.status}
          errorMessage={resource.errorMessage}
          onRetry={resource.reload}
        >
          <DataTable
            columns={columns}
            data={resource.data?.content ?? []}
            getRowKey={(order) => order.id}
            emptyMessage="Chưa có đơn hàng phù hợp."
          />
          <div className="flex flex-col gap-3 border-t border-card-border px-5 py-4">
            <p className="text-sm text-text-tertiary">
              {resource.data?.totalElements ?? 0} đơn hàng
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
      </section>
    </section>
  )
}

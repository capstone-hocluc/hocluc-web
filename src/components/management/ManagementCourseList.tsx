import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpen, RefreshCw } from '../console/icons'
import type { ColumnDef } from '@tanstack/react-table'
import { getMainCourses, type Course } from '../../services/courseService'
import Button from '../console/button'
import DataTable from '../console/data-table'
import Status from '../console/status'

const TRACK_LABELS: Record<string, string> = {
  LONG: 'Dài hạn',
  STANDARD: 'Tiêu chuẩn',
  SPRINT_ROUND2: 'Nước rút đợt 2',
}

function formatEnum(value?: string) {
  if (!value) return '—'
  return value
    .toLocaleLowerCase('vi-VN')
    .split('_')
    .map((part) => part.charAt(0).toLocaleUpperCase('vi-VN') + part.slice(1))
    .join(' ')
}

function formatDate(value?: string) {
  if (!value) return 'Chưa đặt'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date)
}

function formatPrice(value?: number) {
  if (value === undefined || value === null) return '—'
  if (value === 0) return 'Miễn phí'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function ManagementCourseList() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCourses = useCallback(async () => {
    const response = await getMainCourses()
    return response.data ?? []
  }, [])

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCourses(await fetchCourses())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải danh sách khóa học.')
    } finally {
      setLoading(false)
    }
  }, [fetchCourses])

  useEffect(() => {
    let active = true

    fetchCourses()
      .then((data) => {
        if (active) setCourses(data)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error ? requestError.message : 'Không thể tải danh sách khóa học.'
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchCourses])

  const columns = useMemo<ColumnDef<Course>[]>(
    () => [
      {
        id: 'course',
        header: 'Khóa học',
        cell: ({ row }) => (
          <div className="min-w-56">
            <strong className="block font-semibold text-text-primary">{row.original.title}</strong>
            <span className="mt-1 block max-w-[360px] truncate text-sm text-text-tertiary">
              {row.original.description || 'Chưa có mô tả'}
            </span>
          </div>
        ),
      },
      {
        id: 'track',
        header: 'Lộ trình',
        cell: ({ row }) => TRACK_LABELS[row.original.track ?? ''] ?? formatEnum(row.original.track),
      },
      {
        id: 'targetExam',
        header: 'Kỳ thi',
        cell: ({ row }) => formatEnum(row.original.targetExam),
      },
      {
        id: 'schedule',
        header: 'Thời gian',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-text-body">
            {formatDate(row.original.startDate)} – {formatDate(row.original.endDate)}
          </span>
        ),
      },
      {
        id: 'price',
        header: 'Học phí',
        cell: ({ row }) => <span className="whitespace-nowrap">{formatPrice(row.original.price)}</span>,
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: () => <Status tone="success">Đang mở</Status>,
      },
    ],
    []
  )

  return (
    <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-card-border px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-badge-info-bg text-primary">
            <BookOpen size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Danh sách khóa học</h2>
            <p className="mt-1 text-sm text-text-tertiary">
              Các khóa học đang mở được trả về từ catalog hiện tại.
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          appearance="outline"
          size="sm"
          onClick={() => void loadCourses()}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : undefined} />
          Làm mới
        </Button>
      </div>

      <div className="flex items-start gap-3 border-b border-card-border bg-badge-warning-bg px-5 py-4 text-sm text-badge-warning-text sm:px-6">
        <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Backend hiện chưa có API tạo, chỉnh sửa, xuất bản hoặc xóa khóa học. Màn này chỉ hiển thị dữ liệu
          catalog thật, không dùng dữ liệu mẫu.
        </p>
      </div>

      {error && (
        <div role="alert" className="border-b border-card-border bg-badge-danger-bg px-5 py-4 text-sm text-danger sm:px-6">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={loading ? [] : courses}
        getRowKey={(course) => course.id}
        emptyMessage={
          loading ? 'Đang tải danh sách khóa học...' : error ? 'Không thể tải dữ liệu.' : 'Chưa có khóa học đang mở.'
        }
      />
    </section>
  )
}

export default ManagementCourseList

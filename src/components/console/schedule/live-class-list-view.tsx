import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpRight } from '../icons'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMmYyyy,
  formatTimeRangeFromInstants,
  fullDayLabel,
} from '../../../lib/liveScheduleFormat'
import { cn } from '../../../lib/cn'
import Button from '../button'
import DataTable from '../data-table'
import Status from '../status'
import LiveClassStatus from './live-class-status'

interface Props {
  classes: ConsoleLiveClass[]
  selectedId?: string | null
  onSelect: (liveClass: ConsoleLiveClass) => void
  emptyMessage?: string
}

export default function LiveClassListView({
  classes,
  selectedId,
  onSelect,
  emptyMessage = 'Không có buổi học nào trong tuần này.',
}: Props) {
  const columns = useMemo<ColumnDef<ConsoleLiveClass>[]>(
    () => [
      {
        id: 'date',
        header: 'Ngày',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const dateKey = dateKeyOfInstant(row.original.startTime)
          return (
            <div>
              <p>{formatDdMmYyyy(dateKey)}</p>
              <p className="text-xs text-text-tertiary">{fullDayLabel(dateKey)}</p>
            </div>
          )
        },
      },
      {
        id: 'time',
        header: 'Giờ',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <time dateTime={row.original.startTime}>
            {formatTimeRangeFromInstants(row.original.startTime, row.original.endTime)}
          </time>
        ),
      },
      {
        id: 'title',
        header: 'Buổi học',
        cell: ({ row }) => {
          const item = row.original
          const isCancelled = item.status === 'CANCELLED'
          const isAttention = !isCancelled && item.status !== 'COMPLETED' && Boolean(item.needsAttention)
          return (
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('font-medium', isCancelled && 'line-through')}>{item.title}</span>
              {item.refunded && <Status tone="warning">Đã hoàn Sao</Status>}
              {isAttention && <Status tone="warning">Ngoài giờ rảnh</Status>}
              {item.hostZoomReconnectRequired && <Status tone="danger">Zoom GV cần kết nối lại</Status>}
            </div>
          )
        },
      },
      {
        id: 'teacher',
        header: 'Giáo viên',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.teacherName ?? '—',
      },
      {
        id: 'course',
        header: 'Khóa học',
        meta: { className: 'min-w-56 text-text-secondary' },
        cell: ({ row }) => row.original.courseTitle ?? '—',
      },
      {
        id: 'admitted',
        header: 'Đã vào lớp',
        meta: { className: 'whitespace-nowrap tabular-nums' },
        cell: ({ row }) => row.original.admittedCount ?? 0,
      },
      {
        id: 'status',
        header: 'Trạng thái',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => <LiveClassStatus status={row.original.status} />,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Thao tác</span>,
        meta: { className: 'w-12 text-right' },
        cell: ({ row }) => (
          <Button
            size="icon"
            appearance="ghost"
            aria-label={'Xem chi tiết ' + row.original.title}
            aria-pressed={selectedId === row.original.id}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(row.original)
            }}
          >
            <ArrowUpRight size={17} />
          </Button>
        ),
      },
    ],
    [onSelect, selectedId]
  )

  return (
    <DataTable
      columns={columns}
      data={classes}
      getRowKey={(item) => item.id}
      onRowClick={onSelect}
      emptyMessage={emptyMessage}
    />
  )
}

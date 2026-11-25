import { AlertTriangle } from '../icons'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMmYyyy,
  formatTimeRangeFromInstants,
  fullDayLabel,
} from '../../../lib/liveScheduleFormat'
import { cn } from '../../../lib/cn'

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
  if (!classes.length) {
    return (
      <div className="flex-1 rounded-2xl border border-dashed border-card-border bg-card-background px-5 py-12 text-center">
        <p className="m-0 text-sm font-medium text-text-tertiary">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <section aria-label="Danh sách buổi học" className="min-w-0 flex-1 space-y-2">
      {classes.map((item) => {
        const dateKey = dateKeyOfInstant(item.startTime)
        const isCancelled = item.status === 'CANCELLED'
        const isAttention = !isCancelled && item.status !== 'COMPLETED' && Boolean(item.needsAttention)
        const isSelected = selectedId === item.id
        const seatsLabel = item.capacity ? `${item.bookedCount ?? 0} / ${item.capacity} chỗ` : `${item.bookedCount ?? 0} giữ chỗ`

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(item)}
            className={cn(
              'flex w-full min-h-14 flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors',
              isSelected
                ? 'border-[#0b3a82] bg-[#edf5ff]'
                : isAttention
                  ? 'border-[#f3c58b] bg-[#fffaf3] hover:bg-[#fff6ea]'
                  : 'border-card-border bg-card-background hover:bg-background-gray-secondary'
            )}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <strong className={cn('text-sm font-semibold text-text-primary', isCancelled && 'line-through text-text-tertiary')}>
                  {item.title}
                </strong>
                {isAttention && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1dc] px-2.5 py-0.5 text-xs font-medium text-[#7a3d00]">
                    <AlertTriangle size={12} aria-hidden="true" />
                    Ngoài giờ rảnh
                  </span>
                )}
                {isCancelled && (
                  <span className="rounded-full bg-[#f3f5f8] px-2.5 py-0.5 text-xs font-medium text-[#526984]">
                    Đã hủy
                  </span>
                )}
                {item.status === 'LIVE' && (
                  <span className="rounded-full bg-[#0b3a82] px-2.5 py-0.5 text-xs font-medium text-white">
                    Đang dạy
                  </span>
                )}
              </div>
              <p className="m-0 text-xs text-text-tertiary">
                {fullDayLabel(dateKey)}, {formatDdMmYyyy(dateKey)} · {formatTimeRangeFromInstants(item.startTime, item.endTime)}
                {item.teacherName ? ` · ${item.teacherName}` : ''}
                {item.courseTitle ? ` · ${item.courseTitle}` : ''}
              </p>
            </div>
            <span className="text-xs font-semibold text-[#526984]">{seatsLabel}</span>
          </button>
        )
      })}
    </section>
  )
}

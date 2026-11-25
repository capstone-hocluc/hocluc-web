import Skeleton from '../../ui/Skeleton'

export type LiveScheduleSkeletonVariant =
  | 'management'
  | 'teacher'
  | 'availability'
  | 'student'
  | 'wizard-sidebar'

export default function LiveScheduleSkeleton({ variant }: { variant: LiveScheduleSkeletonVariant }) {
  if (variant === 'wizard-sidebar') {
    return (
      <div className="space-y-3 rounded-2xl border border-card-border bg-card-background p-4" role="status" aria-label="Đang tải giờ rảnh">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-7" />
            <Skeleton className="h-3.5 flex-1" />
          </div>
        ))}
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (variant === 'teacher') {
    return (
      <div className="space-y-5" role="status" aria-label="Đang tải lịch dạy">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="flex flex-wrap gap-5">
          <Skeleton className="h-96 min-w-0 flex-1 rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl lg:w-80" />
        </div>
      </div>
    )
  }

  if (variant === 'availability') {
    return (
      <div className="flex flex-wrap gap-5" role="status" aria-label="Đang tải giờ rảnh">
        <Skeleton className="h-[480px] min-w-0 flex-1 rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl lg:w-80" />
      </div>
    )
  }

  if (variant === 'student') {
    return (
      <div className="space-y-5" role="status" aria-label="Đang tải lịch học">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-5" role="status" aria-label="Đang tải lịch dạy">
      <Skeleton className="h-[520px] min-w-0 flex-1 rounded-2xl" />
      <Skeleton className="h-[420px] w-full rounded-2xl lg:w-80" />
    </div>
  )
}

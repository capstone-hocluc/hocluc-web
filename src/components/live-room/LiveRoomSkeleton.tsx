import Button from '../console/button'
import { Skeleton } from '../tailgrids/core/skeleton'

export default function LiveRoomSkeleton({ teacher, onLeave }: { teacher: boolean; onLeave: () => void }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-gray-secondary" role="status" aria-label="Đang tải phòng học">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-card-border p-3">
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" appearance="outline" onClick={onLeave}>Rời lớp</Button>
          {teacher && <Skeleton className="h-8 w-32" aria-hidden="true" />}
        </div>
      </div>
      <Skeleton className="min-h-0 w-full flex-1 rounded-none" aria-hidden="true" />
    </div>
  )
}

import Card from '../console/card'
import Button from '../console/button'
import { Skeleton } from '../tailgrids/core/skeleton'

export default function LiveRoomSkeleton({ teacher, onLeave }: { teacher: boolean; onLeave: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-8 w-48 sm:w-72" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Button appearance="outline" onClick={onLeave}>Rời lớp</Button>
          {teacher && <Skeleton className="h-10 w-32 rounded-lg" aria-hidden="true" />}
        </div>
      </div>
      <Card padding="none" className="flex min-h-96 flex-1" role="status" aria-label="Đang tải phòng học">
        <Skeleton className="h-auto w-full rounded-xl" aria-hidden="true" />
      </Card>
    </div>
  )
}

import Button from '../console/button'
import Logo from '../common/Logo'
import { Skeleton } from '../tailgrids/core/skeleton'
import RoomControlsSkeleton from './RoomControlsSkeleton'
import RoomSidePanelSkeleton from './RoomSidePanelSkeleton'

export default function LiveRoomSkeleton({ teacher, onLeave }: { teacher: boolean; onLeave: () => void }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-gray-secondary" role="status" aria-label="Đang tải phòng học">
      <div className="flex shrink-0 items-center gap-3 border-b border-card-border bg-card-background px-4 py-2.5">
        <span className="hidden sm:inline-flex"><Logo wordmarkSize={20} /></span>
        <span className="sm:hidden"><Logo markOnly wordmarkSize={20} /></span>
        <span className="h-8 w-px shrink-0 bg-card-border" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-2" aria-hidden="true">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-3 w-40 max-w-full" />
        </div>
        <Button size="sm" shape="pill" variant="danger" appearance="outline" onClick={onLeave}>Rời lớp</Button>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 p-3" aria-hidden="true">
        <Skeleton className="h-full min-w-0 flex-1 rounded-2xl" />
        <RoomSidePanelSkeleton teacher={teacher} />
      </div>
      <RoomControlsSkeleton teacher={teacher} />

    </div>
  )
}

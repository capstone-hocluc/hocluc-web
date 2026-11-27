import { Skeleton } from '../tailgrids/core/skeleton'

/** Placeholder with the side panel's shape (tabs, rows, chat box) while the room connects. */
export default function RoomSidePanelSkeleton({ teacher }: { teacher: boolean }) {
  return (
    <div className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-card-border bg-card-background md:flex" aria-hidden="true">
      <div className="flex items-center gap-2 border-b border-card-border p-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="size-8" />
      </div>
      <div className="flex-1 space-y-4 p-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      {!teacher && (
        <div className="flex items-center gap-2 border-t border-card-border p-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="size-9" />
        </div>
      )}
    </div>
  )
}

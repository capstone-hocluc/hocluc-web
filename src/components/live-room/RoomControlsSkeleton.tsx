import { Skeleton } from '../tailgrids/core/skeleton'

/** Placeholder with the control bar's shape while the room connects. */
export default function RoomControlsSkeleton({ teacher }: { teacher: boolean }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-card-border bg-card-background px-4 py-2 lg:grid lg:grid-cols-[1fr_auto_1fr]" aria-hidden="true">
      <div className="hidden lg:block" />
      <div className="flex items-center justify-center gap-1">
        {Array.from({ length: teacher ? 7 : 6 }, (_, index) => (
          <div key={index} className="flex min-w-16 flex-col items-center gap-1.5 px-1.5 py-1">
            <Skeleton className="size-11" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 lg:justify-self-end">
        <Skeleton className="h-8.5 w-24" />
        {teacher && <Skeleton className="h-8.5 w-28" />}
      </div>
    </div>
  )
}

import Skeleton from '../../ui/Skeleton'

export default function RoadmapSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Đang tải lộ trình học">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {[0, 1].map((phase) => (
            <div
              key={phase}
              className="space-y-3 rounded-2xl border border-line bg-surface p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-6 w-52" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
              <div className="space-y-2.5 pt-2">
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            <Skeleton className="h-6 w-40" />
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            <Skeleton className="h-6 w-36" />
            {[0, 1].map((item) => (
              <Skeleton key={item} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

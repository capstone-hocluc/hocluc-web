import { Skeleton } from '../../tailgrids/core/skeleton'

/** The reading view while it loads: the pipeline and its log on the left, the page on the right. */
export default function BankReadingSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" role="status" aria-label="Đang tải bản đọc">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[420px] w-full rounded-xl" />
        <Skeleton className="h-9 w-56" />
        {[0, 1, 2, 3].map(line => (
          <Skeleton key={line} className="h-4 w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="aspect-[210/297] w-full rounded-lg" />
      </div>
    </div>
  )
}

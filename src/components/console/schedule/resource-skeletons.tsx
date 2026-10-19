import { Skeleton } from '../../tailgrids/core/skeleton'

export type ResourceSkeletonVariant = 'list' | 'table' | 'detail' | 'cards' | 'schedule'

const rows = (count: number) => Array.from({ length: count }, (_, index) => index)

// Rough column weights so the placeholder reads like a data table.
const TABLE_COLUMNS = ['w-1/4', 'w-1/6', 'w-1/6', 'w-1/5', 'w-16']

function TableSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <div className="flex items-center gap-6 border-b border-card-border px-5 py-3">
        {TABLE_COLUMNS.map((width, index) => (
          <Skeleton key={index} className={`h-3 ${width}`} />
        ))}
      </div>
      {rows(6).map((row) => (
        <div key={row} className="flex items-center gap-6 border-b border-card-border px-5 py-4 last:border-b-0">
          {TABLE_COLUMNS.map((width, index) => (
            <Skeleton key={index} className={`${index === 0 ? 'h-4' : 'h-3'} ${width}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <div className="flex flex-col gap-3 rounded-xl border border-card-border p-5">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          {rows(3).map((cell) => (
            <div key={cell} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-card-border p-5">
        <Skeleton className="h-5 w-40" />
        {rows(3).map((row) => (
          <Skeleton key={row} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {rows(3).map((card) => (
        <div key={card} className="flex flex-col gap-3 rounded-xl border border-card-border p-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {rows(4).map((row) => (
        <div key={row} className="flex items-center gap-4 rounded-xl border border-card-border p-4">
          <div className="flex w-16 shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {rows(3).map((row) => (
        <div key={row} className="flex items-center gap-3 rounded-xl border border-card-border p-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ResourceSkeleton({ variant }: { variant: ResourceSkeletonVariant }) {
  switch (variant) {
    case 'table':
      return <TableSkeleton />
    case 'detail':
      return <DetailSkeleton />
    case 'cards':
      return <CardsSkeleton />
    case 'schedule':
      return <ScheduleSkeleton />
    default:
      return <ListSkeleton />
  }
}

import PageHeading from '../page-heading'
import Skeleton from '../../ui/Skeleton'

export default function SchedulingPageFallback({ title }: { title: string }) {
  return (
    <section className="space-y-4" aria-busy="true">
      <PageHeading title={title} />
      <div
        className="space-y-3 rounded-2xl border border-card-border bg-card-background p-4"
        role="status"
        aria-label={`Đang tải ${title}`}
      >
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </section>
  )
}

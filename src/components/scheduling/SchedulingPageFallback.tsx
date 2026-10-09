import PageHeading from '../ui/PageHeading'
import Skeleton from '../ui/Skeleton'

export default function SchedulingPageFallback({ title }: { title: string }) {
  return (
    <section className="space-y-4" aria-busy="true">
      <PageHeading title={title} subtitle="Đang mở màn hình lịch học…" />
      <div
        className="space-y-3 rounded-xl border border-card-border bg-card-background p-4"
        role="status"
        aria-label={'Đang tải ' + title}
      >
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </section>
  )
}

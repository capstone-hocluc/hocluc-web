import Skeleton from '../../ui/Skeleton'
export default function AiSettingsSkeleton() {
  return (
    <div aria-label="Đang tải cấu hình AI" className="flex flex-col gap-5">
      <Skeleton className="h-9 w-44" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

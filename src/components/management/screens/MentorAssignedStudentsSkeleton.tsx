export default function MentorAssignedStudentsSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-xl border border-card-border bg-card-background"
      role="status"
      aria-label="Đang tải danh sách học viên"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border p-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-background-gray-secondary" />
      </div>
      <div className="divide-y divide-card-border">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="grid grid-cols-5 items-center gap-4 px-4 py-3.5">
            <div className="space-y-1.5">
              <div className="h-4 w-32 animate-pulse rounded bg-background-gray-secondary" />
              <div className="h-3 w-40 animate-pulse rounded bg-background-gray-secondary" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-lg bg-background-gray-secondary" />
            <div className="h-4 w-36 animate-pulse rounded bg-background-gray-secondary" />
            <div className="h-6 w-16 animate-pulse rounded-lg bg-background-gray-secondary" />
            <div className="h-4 w-24 animate-pulse rounded bg-background-gray-secondary" />
          </div>
        ))}
      </div>
      <div className="border-t border-card-border px-4 py-3">
        <div className="h-4 w-16 animate-pulse rounded bg-background-gray-secondary" />
      </div>
    </section>
  )
}

export default function StudentLearningDiagnosticSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải năng lực học viên">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div
            key={tile}
            className="space-y-2 rounded-lg border border-card-border bg-card-background px-3 py-2.5"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-background-gray-secondary" />
            <div className="h-6 w-12 animate-pulse rounded bg-background-gray-secondary" />
          </div>
        ))}
      </div>

      <div className="inline-flex gap-2 rounded-lg bg-background-gray-secondary p-1">
        <div className="h-8 w-28 animate-pulse rounded-md bg-card-background" />
        <div className="h-8 w-28 animate-pulse rounded-md bg-card-background/60" />
        <div className="h-8 w-24 animate-pulse rounded-md bg-card-background/60" />
      </div>

      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="space-y-2 rounded-lg border border-card-border bg-card-background p-3.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-48 animate-pulse rounded bg-background-gray-secondary" />
              <div className="h-5 w-16 animate-pulse rounded bg-background-gray-secondary" />
            </div>
            <div className="h-3 w-3/4 animate-pulse rounded bg-background-gray-secondary" />
          </div>
        ))}
      </div>
    </div>
  )
}

import { Skeleton } from '../../tailgrids/core/skeleton'

/** Stands in for the page of every question while it is being built: the same article layout, three times. */
export default function ExamQuestionListSkeleton() {
  return (
    <div role="status" aria-label="Đang dựng danh sách câu hỏi" className="mx-auto flex w-full max-w-3xl flex-col">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex flex-col gap-4 border-b border-card-border p-4 last:border-b-0 sm:p-6">
          <Skeleton className="h-5 w-14" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((option) => (
              <div key={option} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <Skeleton className="size-6 shrink-0 rounded-md" />
                <Skeleton className="h-10 flex-1 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

import { Skeleton } from '../../tailgrids/core/skeleton'

function QuestionCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-background p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-20 w-full rounded-lg" />
      {[0, 1, 2, 3].map(option => <Skeleton key={option} className="h-10 w-full rounded-lg" />)}
    </div>
  )
}

/**
 * Placeholder with the editor's own layout while a saved quiz loads: the shared top bar, then the question list and
 * contents rail of an exam, or the single column of question cards of a lesson or chapter quiz.
 */
export default function MockExamEditorSkeleton({ rail = true }: { rail?: boolean }) {
  return (
    <section className="flex h-dvh flex-col bg-card-surface-area" aria-busy="true" aria-label="Đang tải bài kiểm tra">
      <header className="flex shrink-0 items-center gap-4 border-b border-card-border px-4 py-2.5 sm:px-6">
        <div className="flex flex-1 items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-lg max-sm:hidden" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg max-sm:hidden" />
        </div>
      </header>
      {rail ? (
        <div className="flex min-h-0 flex-1 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="hidden flex-col gap-2 border-r border-card-border p-4 lg:flex">
            <Skeleton className="h-5 w-32" />
            {[0, 1, 2, 3, 4, 5].map(row => <Skeleton key={row} className="h-9 w-full rounded-lg" />)}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
            <Skeleton className="h-9 w-56 rounded-lg" />
            <div className="mx-auto w-full max-w-3xl"><QuestionCard /></div>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
            <QuestionCard />
            <QuestionCard />
          </div>
        </div>
      )}
    </section>
  )
}

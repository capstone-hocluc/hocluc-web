import { cn } from '../../../lib/cn'
import { Skeleton } from '../../tailgrids/core/skeleton'
import EditorFrame from './EditorFrame'
import { useEditorLayout } from './editor-layout'

export default function QuizEditorSkeleton({ paper }: { paper: boolean }) {
  const [layout] = useEditorLayout()
  const workspace = layout === 'workspace'
  const header = (
    <header
      className={cn(
        'flex shrink-0 items-center gap-4',
        workspace ? 'h-14 bg-card-background px-2 sm:px-3' : 'border-b border-card-border px-4 py-2.5 sm:px-6'
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        <Skeleton className="size-9 rounded-lg" />
        {workspace && <Skeleton className="hidden h-7 w-6 rounded-md sm:block" />}
        <Skeleton className={workspace ? 'h-5 w-44' : 'h-6 w-48'} />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-lg max-sm:hidden" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg max-sm:hidden" />
        <Skeleton className="size-10 rounded-lg" />
      </div>
    </header>
  )
  return (
    <EditorFrame
      layout={layout}
      header={header}
      label="Đang tải bài kiểm tra"
      busy
      paper={paper}
      rail={(
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-5 w-32" />
          {[0, 1, 2, 3, 4, 5].map(row => <Skeleton key={row} className="h-9 w-full rounded-lg" />)}
        </div>
      )}
    >
      {paper ? (
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden bg-background-gray-secondary p-4">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <div className="mx-auto aspect-[210/297] w-full max-w-3xl space-y-4 rounded-sm bg-card-background p-10">
            <Skeleton className="mx-auto h-5 w-2/5" />
            {[0, 1, 2, 3, 4, 5].map((row) => <Skeleton key={row} className="h-4 w-4/5" />)}
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-card-border bg-card-background p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-lg" />
            {[0, 1, 2, 3].map((option) => <Skeleton key={option} className="h-10 w-full rounded-lg" />)}
          </div>
        </div>
      )}
    </EditorFrame>
  )
}

import ConsoleSheet from '../../console/sheet'
import { Skeleton } from '../../tailgrids/core/skeleton'

export default function QuizDockSkeleton({ open, docked, onClose }: {
  open: boolean
  docked: boolean
  onClose: () => void
}) {
  return (
    <ConsoleSheet open={open} docked={docked} title="Trợ lý AI" onClose={onClose}>
      <div className="flex min-h-64 flex-col gap-3" role="status" aria-label="Đang tải cuộc trò chuyện">
        <Skeleton className="ml-auto h-9 w-2/5 rounded-xl" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-auto h-20 w-full rounded-2xl" />
      </div>
    </ConsoleSheet>
  )
}

import type { ReactNode } from 'react'
import { AlertCircle, LockKeyhole, RefreshCw } from 'lucide-react'
import type { ScheduleResourceStatus } from '../../hooks/useScheduleResource'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import Skeleton from '../ui/Skeleton'

interface Props {
  status: ScheduleResourceStatus
  errorMessage?: string
  empty?: boolean
  emptyMessage?: string
  onRetry?: () => void
  children: ReactNode
}

export default function ScheduleResourceState({
  status,
  errorMessage,
  empty = false,
  emptyMessage = 'Chưa có lịch trong khoảng thời gian này.',
  onRetry,
  children,
}: Props) {
  if (status === 'idle') return null
  if (status === 'loading') {
    return (
      <div className="space-y-3" aria-label="Đang tải lịch" role="status">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }
  if (status === 'forbidden') {
    return (
      <Notice tone="warning">
        <LockKeyhole size={17} aria-hidden="true" />
        Tài khoản hiện tại chưa được cấp quyền xem dữ liệu này.
      </Notice>
    )
  }
  if (status === 'not-found') {
    return (
      <Notice tone="warning">
        <AlertCircle size={17} aria-hidden="true" />
        Không tìm thấy dữ liệu lịch này. Tải lại danh sách để kiểm tra.
        {onRetry && (
          <Button size="sm" appearance="outline" className="max-[767px]:min-h-11" onClick={onRetry}>
            <RefreshCw size={14} />
            Tải lại
          </Button>
        )}
      </Notice>
    )
  }
  if (status === 'error') {
    return (
      <Notice tone="danger">
        <AlertCircle size={17} aria-hidden="true" />
        {errorMessage || 'Không thể tải dữ liệu lịch.'}
        {onRetry && (
          <Button size="sm" appearance="outline" className="max-[767px]:min-h-11" onClick={onRetry}>
            <RefreshCw size={14} />
            Thử lại
          </Button>
        )}
      </Notice>
    )
  }
  if (empty) {
    return (
      <div className="rounded-2xl border border-dashed border-border-primary bg-surface px-5 py-10 text-center" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-text-heading">{emptyMessage}</p>
      </div>
    )
  }
  return <>{children}</>
}

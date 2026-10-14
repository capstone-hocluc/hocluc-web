import type { ReactNode } from 'react'
import { AlertCircle, LockKeyhole, RefreshCw } from '../icons'
import type { ScheduleResourceStatus } from '../../../hooks/useScheduleResource'
import Button from '../button'
import Notice from '../notice'
import ResourceSkeleton, { type ResourceSkeletonVariant } from './resource-skeletons'

interface Props {
  status: ScheduleResourceStatus
  errorMessage?: string
  empty?: boolean
  emptyMessage?: string
  onRetry?: () => void
  /** Shape of the loading placeholder; match it to what the section renders once loaded. */
  skeleton?: ResourceSkeletonVariant
  children: ReactNode
}

export default function ScheduleResourceState({
  status,
  errorMessage,
  empty = false,
  emptyMessage = 'Chưa có lịch trong khoảng thời gian này.',
  onRetry,
  skeleton = 'list',
  children,
}: Props) {
  if (status === 'idle') return null
  if (status === 'loading') {
    return (
      <div aria-label="Đang tải" role="status">
        <ResourceSkeleton variant={skeleton} />
      </div>
    )
  }
  if (status === 'forbidden') {
    return (
      <Notice tone="warning">
        <LockKeyhole size={17} aria-hidden="true" />
        Tài khoản chưa được cấp quyền xem dữ liệu này.
      </Notice>
    )
  }
  if (status === 'not-found' || status === 'error') {
    const notFound = status === 'not-found'
    return (
      <Notice tone={notFound ? 'warning' : 'danger'}>
        <AlertCircle size={17} aria-hidden="true" />
        {notFound ? 'Không tìm thấy dữ liệu.' : errorMessage || 'Không thể tải dữ liệu.'}
        {onRetry && (
          <Button size="sm" appearance="outline" onClick={onRetry}>
            <RefreshCw size={14} />
            {notFound ? 'Tải lại' : 'Thử lại'}
          </Button>
        )}
      </Notice>
    )
  }
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-card-border px-5 py-10 text-center" role="status" aria-live="polite">
        <p className="text-sm font-medium text-text-tertiary">{emptyMessage}</p>
      </div>
    )
  }
  return <>{children}</>
}

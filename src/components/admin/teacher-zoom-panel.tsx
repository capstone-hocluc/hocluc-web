import Notice from '../console/notice'
import { Skeleton } from '../tailgrids/core/skeleton'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getTeacherZoomAccount } from '../../services/liveClassService'

/** Read-only view of the teacher's self-connected personal Zoom account. */
export default function TeacherZoomPanel({ userId }: { userId: string }) {
  const resource = useScheduleResource(`teacher-zoom:${userId}`, () => getTeacherZoomAccount(userId))

  if (resource.status === 'loading' || resource.status === 'idle') {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  if (resource.status !== 'ready' || !resource.data) {
    return <Notice tone="danger">{resource.errorMessage || 'Không tải được tài khoản Zoom.'}</Notice>
  }

  const account = resource.data
  const planLabel =
    account.planType === 'BASIC'
      ? 'Miễn phí (tối đa 40 phút/buổi)'
      : account.planType === 'LICENSED'
        ? 'Trả phí (License)'
        : null

  if (!account.connected) {
    if (account.status === 'ERROR' || account.status === 'REVOKED') {
      return (
        <div className="flex flex-col gap-2">
          <Notice tone="danger">
            {account.lastError || 'Kết nối Zoom của giảng viên cần được kết nối lại.'}
          </Notice>
          {account.zoomEmail && (
            <p className="m-0 text-xs text-text-tertiary">Tài khoản gần nhất: {account.zoomEmail}</p>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        <Notice tone="warning">Chưa kết nối Zoom.</Notice>
        <p className="m-0 text-xs text-text-tertiary">
          Giảng viên tự kết nối tài khoản Zoom cá nhân trong trang Lịch dạy.
        </p>
      </div>
    )
  }

  return (
    <dl className="m-0 grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
      <dt className="text-text-tertiary">Trạng thái</dt>
      <dd className="m-0 font-medium text-text-primary">Đã kết nối</dd>
      <dt className="text-text-tertiary">Email Zoom</dt>
      <dd className="m-0 break-all text-text-primary">{account.zoomEmail || '—'}</dd>
      {planLabel && (
        <>
          <dt className="text-text-tertiary">Gói tài khoản</dt>
          <dd className="m-0 text-text-primary">{planLabel}</dd>
        </>
      )}
    </dl>
  )
}

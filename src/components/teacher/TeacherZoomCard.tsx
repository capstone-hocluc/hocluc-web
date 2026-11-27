import Button from '../console/button'
import Notice from '../console/notice'
import Panel from '../console/panel'
import Status from '../console/status'
import { Skeleton } from '../tailgrids/core/skeleton'
import type { TeacherZoomAccount } from '../../services/liveClassService'

interface Props {
  zoomAccount?: TeacherZoomAccount | null
  loading: boolean
  busy: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export default function TeacherZoomCard({ zoomAccount, loading, busy, onConnect, onDisconnect }: Props) {
  const connected = Boolean(zoomAccount?.connected)
  const needsReconnect = !connected && (zoomAccount?.status === 'ERROR' || zoomAccount?.status === 'REVOKED')
  const planLabel =
    zoomAccount?.planType === 'BASIC'
      ? 'Gói miễn phí (tối đa 40 phút/buổi)'
      : zoomAccount?.planType === 'LICENSED'
        ? 'Gói trả phí'
        : null

  return (
    <div id="teacher-zoom-card" className="w-full">
      <Panel
        title="Tài khoản Zoom"
        action={
          loading ? (
            <Skeleton className="h-7 w-24 rounded-lg" />
          ) : connected ? (
            <Status tone="success">Đã kết nối</Status>
          ) : needsReconnect ? (
            <Status tone="danger">Cần kết nối lại</Status>
          ) : (
            <Status tone="warning">Chưa kết nối</Status>
          )
        }
      >
        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Đang tải tài khoản Zoom">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {connected ? (
              <>
                <div className="flex flex-col gap-1 text-sm">
                  <strong className="font-medium break-all text-text-primary">
                    {zoomAccount?.zoomEmail || 'Tài khoản Zoom cá nhân'}
                  </strong>
                  {planLabel && <span className="text-xs text-text-tertiary">{planLabel}</span>}
                </div>
                {zoomAccount?.planType === 'BASIC' && (
                  <Notice tone="warning">Buổi học dài hơn 40 phút trên Zoom miễn phí sẽ tự ngắt sau 40 phút.</Notice>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button appearance="outline" className="flex-1" disabled={busy} onClick={onConnect}>
                    Đổi tài khoản
                  </Button>
                  <Button variant="danger" appearance="outline" disabled={busy} onClick={onDisconnect}>
                    Ngắt kết nối
                  </Button>
                </div>
              </>
            ) : (
              <>
                {needsReconnect && <p className="text-sm text-text-tertiary">Kết nối Zoom đã hết hạn hoặc bị thu hồi.</p>}
                <Button className="w-full" disabled={busy} onClick={onConnect}>
                  {busy ? 'Đang chuyển tới Zoom…' : needsReconnect ? 'Kết nối lại Zoom' : 'Kết nối Zoom'}
                </Button>
              </>
            )}
            {zoomAccount && !zoomAccount.zoomEnabled && (
              <p className="text-xs text-text-tertiary">Chế độ thử nghiệm: đang tạo phòng Zoom mô phỏng.</p>
            )}
          </div>
        )}
      </Panel>
    </div>
  )
}

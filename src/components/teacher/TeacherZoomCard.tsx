import { AlertTriangle, CheckCircle2, Video } from '../console/icons'
import { Skeleton } from '../tailgrids/core/skeleton'
import type { TeacherZoomAccount } from '../../services/liveClassService'

interface Props {
  zoomAccount?: TeacherZoomAccount | null
  loading: boolean
  busy: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export default function TeacherZoomCard({
  zoomAccount,
  loading,
  busy,
  onConnect,
  onDisconnect,
}: Props) {
  if (loading) {
    return (
      <section
        id="teacher-zoom-card"
        aria-label="Tài khoản Zoom"
        className="flex w-full flex-col gap-3 rounded-2xl border border-card-border bg-card-background p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </section>
    )
  }

  const connected = Boolean(zoomAccount?.connected)
  const needsReconnect =
    !connected && (zoomAccount?.status === 'ERROR' || zoomAccount?.status === 'REVOKED')
  const planLabel =
    zoomAccount?.planType === 'BASIC'
      ? 'Gói miễn phí (tối đa 40 phút/buổi)'
      : zoomAccount?.planType === 'LICENSED'
        ? 'Gói trả phí'
        : null

  return (
    <section
      id="teacher-zoom-card"
      aria-label="Tài khoản Zoom"
      className="flex w-full flex-col gap-3.5 rounded-2xl border border-card-border bg-card-background p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 inline-flex items-center gap-2 text-[17px] font-bold text-text-primary">
          <Video size={18} className="text-[#0b3a82]" aria-hidden="true" />
          Tài khoản Zoom
        </h2>
        {connected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#edf5ff] px-2.5 py-1 text-xs font-semibold text-[#0b3a82]">
            <CheckCircle2 size={13} aria-hidden="true" />
            Đã kết nối
          </span>
        ) : needsReconnect ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0ee] px-2.5 py-1 text-xs font-semibold text-[#a3261a]">
            <AlertTriangle size={13} aria-hidden="true" />
            Cần kết nối lại
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff6ea] px-2.5 py-1 text-xs font-semibold text-[#7a3d00]">
            <AlertTriangle size={13} aria-hidden="true" />
            Chưa kết nối
          </span>
        )}
      </div>

      {connected ? (
        <>
          <div className="flex flex-col gap-1 text-sm">
            <strong className="break-all text-text-primary">
              {zoomAccount?.zoomEmail || 'Tài khoản Zoom cá nhân'}
            </strong>
            {planLabel && <span className="text-[13px] text-[#526984]">{planLabel}</span>}
          </div>

          {zoomAccount?.planType === 'BASIC' && (
            <p className="m-0 rounded-xl border border-[#f3c58b] bg-[#fff6ea] px-3 py-2 text-[13px] leading-relaxed text-[#7a3d00]">
              Buổi học dài hơn 40 phút trên Zoom miễn phí sẽ tự ngắt sau 40 phút.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onConnect}
              className="min-h-11 flex-1 rounded-xl border border-card-border bg-card-background px-3.5 text-sm font-semibold text-text-primary hover:bg-background-gray-secondary disabled:opacity-50"
            >
              Đổi tài khoản
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDisconnect}
              className="min-h-11 rounded-xl border border-[#f5b4ad] bg-card-background px-3.5 text-sm font-semibold text-[#a3261a] hover:bg-[#fff0ee] disabled:opacity-50"
            >
              Ngắt kết nối
            </button>
          </div>
        </>
      ) : (
        <>
          {needsReconnect && (
            <p className="m-0 text-sm leading-relaxed text-[#526984]">
              Kết nối Zoom đã hết hạn hoặc bị thu hồi.
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onConnect}
            className="min-h-11 w-full rounded-xl bg-[#0b3a82] px-4 text-sm font-semibold text-white hover:bg-[#082e68] disabled:opacity-50"
          >
            {busy ? 'Đang chuyển tới Zoom…' : needsReconnect ? 'Kết nối lại Zoom' : 'Kết nối Zoom'}
          </button>
        </>
      )}

      {zoomAccount && !zoomAccount.zoomEnabled && (
        <p className="m-0 text-xs text-text-tertiary">
          Chế độ thử nghiệm: đang tạo phòng Zoom mô phỏng.
        </p>
      )}
    </section>
  )
}

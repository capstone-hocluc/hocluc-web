import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { getAccessToken } from '../../lib/api'
import { useSessionRestore } from '../../hooks/useSessionRestore'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import PurchaseLayout from './PurchaseLayout'
import { purchaseLoginPath } from '../../lib/purchaseSession'

export default function PurchaseGuard({
  children,
  onNavigate,
}: {
  children: ReactNode
  onNavigate: (path: string) => void
}) {
  const { status, profile, loadCurrentUser } = useCurrentUser()
  const session = useSessionRestore()
  const token = getAccessToken()
  const redirecting = useRef(false)
  useEffect(() => {
    if (session.checking || session.error) return
    if (!token && !redirecting.current) {
      redirecting.current = true
      onNavigate(purchaseLoginPath())
    } else if (token && status === 'idle') void loadCurrentUser().catch(() => undefined)
  }, [token, status, loadCurrentUser, onNavigate, session.checking, session.error])
  if (session.checking || (!session.error && (!token || status === 'idle' || status === 'loading')))
    return (
      <PurchaseLayout title="Đang xác thực tài khoản">
        <p role="status">Vui lòng chờ trong giây lát…</p>
      </PurchaseLayout>
    )
  if (session.error || status === 'error' || !profile)
    return (
      <PurchaseLayout title="Chưa tải được tài khoản">
        <div className="purchase-panel">
          <p role="alert">Không thể tải thông tin người mua. Kiểm tra kết nối rồi thử lại.</p>
          <button className="btn" onClick={() => { if (session.error) session.retry(); else void loadCurrentUser().catch(() => undefined) }}>
            Thử lại
          </button>
        </div>
      </PurchaseLayout>
    )
  if (profile.role !== 'STUDENT')
    return (
      <PurchaseLayout title="Mua khóa học bằng tài khoản học viên">
        <p>Vui lòng chuyển sang vai trò học viên để tiếp tục.</p>
      </PurchaseLayout>
    )
  return children
}

import { useEffect, useRef, type ReactNode } from 'react'
import { ShieldAlert } from '../console/icons'
import { getAccessToken } from '../../lib/api'
import { useSessionRestore } from '../../hooks/useSessionRestore'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import Button from '../ui/Button'
import { useActiveRole } from '../../hooks/useActiveRole'
import { roleHome } from '../../lib/role-home'

interface Props {
  children: ReactNode
  onLogin: () => void
  onGoToRole: (path: string) => void
}

/**
 * While the session is checked the page stays empty on the student area's own background: the check takes a moment on
 * a reload, and a loader flashing in front of every page only got in the way. Screen readers still hear what it waits on.
 */
function Waiting({ children }: { children: string }) {
  return (
    <main aria-busy="true" className="min-h-screen bg-app-bg">
      <p role="status" className="sr-only">
        {children}
      </p>
    </main>
  )
}

export default function StudentRouteGuard({ children, onLogin, onGoToRole }: Props) {
  const { profile, status, loadCurrentUser } = useCurrentUser()
  const session = useSessionRestore()
  const { activeRole } = useActiveRole()
  const redirecting = useRef(false)

  useEffect(() => {
    if (session.checking || session.error) return
    if (!getAccessToken()) {
      if (!redirecting.current) {
        redirecting.current = true
        onLogin()
      }
      return
    }
    if (status === 'idle') void loadCurrentUser().catch(() => undefined)
  }, [loadCurrentUser, onLogin, status, session.checking, session.error])

  if (session.checking || (!session.error && !getAccessToken())) {
    return <Waiting>{session.checking ? 'Đang kiểm tra phiên đăng nhập' : 'Đang chuyển đến đăng nhập'}</Waiting>
  }

  if (session.error || status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-soft px-4 py-8">
        <section className="w-full max-w-[460px] rounded-2xl border border-line-card bg-surface p-8 text-center shadow-card">
          <ShieldAlert size={24} className="mx-auto text-danger" aria-hidden="true" />
          <h1 className="mt-4 text-[22px] font-bold text-text-heading">
            Không thể xác thực phiên đăng nhập
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-text-body">
            Kiểm tra kết nối mạng rồi thử xác thực lại tài khoản.
          </p>
          <Button
            variant="danger"
            className="mt-5"
            onClick={() => {
              if (session.error) session.retry()
              else void loadCurrentUser().catch(() => undefined)
            }}
          >
            Thử lại
          </Button>
        </section>
      </main>
    )
  }

  if (status === 'idle' || status === 'loading' || !profile) return <Waiting>Đang xác thực quyền học viên</Waiting>

  const effectiveRole = activeRole ?? profile.role
  if (effectiveRole !== 'STUDENT') {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-soft px-4 py-8">
        <section className="w-full max-w-[460px] rounded-2xl border border-line-card bg-surface p-8 text-center shadow-card">
          <ShieldAlert size={24} className="mx-auto text-danger" aria-hidden="true" />
          <h1 className="mt-4 text-[22px] font-bold text-text-heading">
            Trang này dành cho học viên
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-text-body">
            Tài khoản hiện tại không có quyền mở lịch học viên.
          </p>
          <Button
            variant="primary"
            className="mt-5"
            onClick={() => onGoToRole(roleHome(effectiveRole))}
          >
            Về khu vực của tôi
          </Button>
        </section>
      </main>
    )
  }

  return <>{children}</>
}

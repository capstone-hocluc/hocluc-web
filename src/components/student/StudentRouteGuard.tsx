import { useEffect, useRef, type ReactNode } from 'react'
import { LoaderCircle, ShieldAlert } from '../console/icons'
import { clearTokens, getAccessToken } from '../../lib/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import Button from '../ui/Button'
import { useActiveRole } from '../../hooks/useActiveRole'
import { roleHome } from '../../lib/role-home'

interface Props {
  children: ReactNode
  onLogin: () => void
  onGoToRole: (path: string) => void
}

export default function StudentRouteGuard({ children, onLogin, onGoToRole }: Props) {
  const { profile, status, loadCurrentUser, clearCurrentUser } = useCurrentUser()
  const { activeRole } = useActiveRole()
  const redirecting = useRef(false)

  useEffect(() => {
    if (!getAccessToken()) {
      if (!redirecting.current) {
        redirecting.current = true
        onLogin()
      }
      return
    }
    if (status === 'idle') void loadCurrentUser().catch(() => undefined)
  }, [loadCurrentUser, onLogin, status])

  if (!getAccessToken()) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-soft px-4 py-8">
        <p className="text-sm text-text-muted" role="status">Đang chuyển đến đăng nhập...</p>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-soft px-4 py-8">
        <section className="w-full max-w-[460px] rounded-2xl border border-border-subtle bg-surface p-8 text-center">
          <ShieldAlert size={24} className="mx-auto text-danger" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-text-heading">Không thể xác thực phiên đăng nhập</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">Đăng nhập lại để xác nhận quyền truy cập khu vực học viên.</p>
          <Button
            variant="danger"
            className="mt-5"
            onClick={() => {
              clearTokens()
              clearCurrentUser()
              onLogin()
            }}
          >
            Đăng nhập lại
          </Button>
        </section>
      </main>
    )
  }

  if (status === 'idle' || status === 'loading' || !profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-soft px-4 py-8">
        <span className="inline-flex items-center gap-2 text-sm text-text-muted" role="status">
          <LoaderCircle size={18} className="animate-spin text-primary" aria-hidden="true" />
          Đang xác thực quyền học viên...
        </span>
      </main>
    )
  }

  const effectiveRole = activeRole ?? profile.role
  if (effectiveRole !== 'STUDENT') {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-soft px-4 py-8">
        <section className="w-full max-w-[460px] rounded-2xl border border-border-subtle bg-surface p-8 text-center">
          <ShieldAlert size={24} className="mx-auto text-danger" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-text-heading">Trang này dành cho học viên</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">Tài khoản hiện tại không có quyền mở lịch học viên.</p>
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

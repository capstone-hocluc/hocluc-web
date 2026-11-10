import { ROLE_LABELS } from '../../lib/role-home'
import { useEffect, useRef, type ReactNode } from 'react'
import { getAccessToken } from '../../lib/api'
import { useSessionRestore } from '../../hooks/useSessionRestore'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useActiveRole } from '../../hooks/useActiveRole'
import type { UserRole } from '../../services/userService'
import Button from '../console/button'
import { AuthErrorStatusPage, MaintenanceStatusPage, NoAccessStatusPage } from '../console/status-page'

export type ManagementRole = Extract<
  UserRole,
  'ADMINISTRATOR' | 'MANAGER' | 'STAFF' | 'TEACHER' | 'MENTOR'
>

interface ManagementRouteGuardProps {
  allowedRoles: readonly ManagementRole[]
  onLogin: () => void
  onExit: () => void
  children: ReactNode
}

/**
 * While the session is checked the page stays empty on the console's own background: the check takes a moment on a
 * reload, and a loader flashing in front of every page only got in the way.
 */
function LoadingState() {
  return (
    <main aria-busy="true" className="min-h-screen bg-background-gray-secondary_alt_2">
      <p role="status" className="sr-only">
        Đang xác thực quyền truy cập
      </p>
    </main>
  )
}

function ManagementRouteGuard({
  allowedRoles,
  onLogin,
  onExit,
  children,
}: ManagementRouteGuardProps) {
  const { profile, status, loadCurrentUser } = useCurrentUser()
  const session = useSessionRestore()
  const { activeRole, roles, switchRole, switching, error } = useActiveRole()
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

    if (status === 'idle') {
      void loadCurrentUser().catch(() => undefined)
    }
  }, [loadCurrentUser, onLogin, status, session.checking, session.error])

  if (session.checking) return <LoadingState />
  if (session.unavailable) return <MaintenanceStatusPage onRetry={session.retry} />
  if (session.error || status === 'error') return <AuthErrorStatusPage
    onRetry={() => { if (session.error) session.retry(); else void loadCurrentUser().catch(() => undefined) }} />
  if (!getAccessToken()) return <LoadingState />

  if (status === 'idle' || status === 'loading' || !profile) return <LoadingState />

  if (!allowedRoles.includes((activeRole ?? profile.role) as ManagementRole)) {
    const available = roles.filter((role) => allowedRoles.includes(role as ManagementRole))
    if (available.length) return (
      <main className="grid min-h-screen place-items-center bg-card-background px-5 py-10">
        <section className="w-full max-w-[460px] rounded-xl border border-card-border bg-card-background p-8 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Chuyển vai trò để tiếp tục</h1>
          <p className="mt-2 text-sm text-text-tertiary">Bạn đang dùng vai trò {ROLE_LABELS[profile.role]}. Chuyển vai trò sẽ kết thúc các phiên đăng nhập khác.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {available.map((role) => <Button key={role} disabled={switching} onClick={() => switchRole(role)}>{switching ? 'Đang chuyển...' : ROLE_LABELS[role]}</Button>)}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-badge-error-text">{error}</p>}
          <Button appearance="outline" className="mt-4" disabled={switching} onClick={onExit}>Đăng xuất</Button>
        </section>
      </main>
    )
    return <NoAccessStatusPage onExit={onExit} />
  }

  return <>{children}</>
}

export default ManagementRouteGuard

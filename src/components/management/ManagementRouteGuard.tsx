import { useEffect, useRef, type ReactNode } from 'react'
import { ShieldAlert, LoaderCircle } from 'lucide-react'
import { clearTokens, getAccessToken } from '../../lib/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useActiveRole } from '../../hooks/useActiveRole'
import type { UserRole } from '../../services/userService'
import Button from '../ui/Button'

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

function AccessState({
  title,
  description,
  actionLabel,
  onAction,
  danger = false,
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  danger?: boolean
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-surface-soft px-4 py-8">
      <section className="w-full max-w-[460px] rounded-2xl border border-border-subtle bg-surface p-8 text-center">
        <span
          className={
            danger
              ? 'mx-auto grid size-12 place-items-center rounded-full bg-badge-danger-bg text-danger'
              : 'mx-auto grid size-12 place-items-center rounded-full bg-badge-info-bg text-primary'
          }
        >
          <ShieldAlert size={24} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-text-heading">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>
        <Button
          variant={danger ? 'danger' : 'primary'}
          appearance="fill"
          size="md"
          className="mt-6"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </section>
    </main>
  )
}

function LoadingState() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface-soft px-4 py-8">
      <div className="inline-flex items-center gap-2 text-sm text-text-muted" role="status">
        <LoaderCircle size={18} className="animate-spin text-primary" aria-hidden="true" />
        Đang xác thực quyền truy cập...
      </div>
    </main>
  )
}

function ManagementRouteGuard({
  allowedRoles,
  onLogin,
  onExit,
  children,
}: ManagementRouteGuardProps) {
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

    if (status === 'idle') {
      void loadCurrentUser().catch(() => undefined)
    }
  }, [loadCurrentUser, onLogin, status])

  if (!getAccessToken()) return <LoadingState />
  if (status === 'error') {
    return (
      <AccessState
        title="Không thể xác thực phiên đăng nhập"
        description="Phiên làm việc không còn hợp lệ hoặc máy chủ chưa phản hồi. Vui lòng đăng nhập lại."
        actionLabel="Đăng nhập lại"
        onAction={() => {
          clearTokens()
          clearCurrentUser()
          onLogin()
        }}
        danger
      />
    )
  }

  if (status === 'idle' || status === 'loading' || !profile) return <LoadingState />

  if (!allowedRoles.includes((activeRole ?? profile.role) as ManagementRole)) {
    return (
      <AccessState
        title="Bạn không có quyền truy cập"
        description="Tài khoản hiện tại không được phép mở khu vực quản lý này."
        actionLabel="Đăng xuất"
        onAction={onExit}
        danger
      />
    )
  }

  return <>{children}</>
}

export default ManagementRouteGuard

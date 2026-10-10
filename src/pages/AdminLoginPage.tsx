import { useState, type FormEvent } from 'react'
import { LockKeyhole } from '../components/console/icons'
import AuthShell from '../components/auth/AuthShell'
import Button from '../components/ui/Button'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { clearTokens } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { grantedRoles, ROLE_LABELS, roleHome } from '../lib/role-home'
import { login as loginAccount, switchRole as switchRoleRequest } from '../services/authService'
import type { UserProfile, UserRole } from '../services/userService'

interface AdminLoginPageProps {
  onBack: () => void
  onSuccess: (profile: UserProfile) => void
  allowedRoles?: readonly UserRole[]
  title?: string
  rejectedRoleMessage?: string
}

const ADMINISTRATOR_ONLY: readonly UserRole[] = ['ADMINISTRATOR']

// Tạm thời, chỉ chạy local: bấm để điền sẵn tài khoản dev. Không hiện ở bản production.
const DEV_ACCOUNTS = [
  { label: 'Admin', email: 'admin@gmail.com' },
  { label: 'Manager', email: 'manager@gmail.com' },
  { label: 'Staff', email: 'staff@gmail.com' },
  { label: 'Teacher', email: 'teacher@gmail.com' },
] as const
const DEV_PASSWORD = '123456'

function AdminLoginPage({
  onBack,
  onSuccess,
  allowedRoles = ADMINISTRATOR_ONLY,
  title = 'Đăng nhập quản trị',
  rejectedRoleMessage = 'Tài khoản này không có quyền quản trị viên.',
}: AdminLoginPageProps) {
  const { loadCurrentUser, clearCurrentUser } = useCurrentUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [roleChoices, setRoleChoices] = useState<UserRole[]>([])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await loginAccount({ email: trimmedEmail, password })
      const profile = await loadCurrentUser()

      if (!allowedRoles.includes(profile.role)) {
        const available = grantedRoles(profile).filter((role) => allowedRoles.includes(role))
        if (available.length) { setRoleChoices(available); return }
        clearTokens()
        clearCurrentUser()
        setError(rejectedRoleMessage)
        return
      }

      onSuccess(profile)
    } catch (requestError) {
      clearTokens()
      clearCurrentUser()
      setError(getErrorMessage(requestError) || 'Email hoặc mật khẩu không đúng.')
    } finally {
      setLoading(false)
    }
  }

  const chooseRole = async (role: UserRole) => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      await switchRoleRequest(role)
      window.location.assign(roleHome(role))
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  if (roleChoices.length) return (
    <AuthShell onBack={() => { clearTokens(); clearCurrentUser(); setRoleChoices([]); onBack() }} backLabel="Quay lại trang chủ" showThemeToggle>
      <section>
        <h1 className="text-center text-xl font-semibold text-text-heading">Chọn vai trò để tiếp tục</h1>
        <p className="my-4 text-sm text-text-muted">Chuyển vai trò sẽ kết thúc các phiên đăng nhập khác.</p>
        <div className="grid gap-3">
          {roleChoices.map((role) => <Button key={role} disabled={loading} onClick={() => void chooseRole(role)}>{loading ? 'Đang chuyển...' : ROLE_LABELS[role]}</Button>)}
          <Button appearance="outline" disabled={loading} onClick={() => { clearTokens(); clearCurrentUser(); setRoleChoices([]) }}>Dùng tài khoản khác</Button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </section>
    </AuthShell>
  )

  return (
    <AuthShell onBack={onBack} backLabel="Quay lại trang chủ" showThemeToggle>
      <section aria-labelledby="admin-login-title">
        <h1
          id="admin-login-title"
          className="mb-5 text-center text-[24px] font-black leading-tight tracking-[-0.03em] text-text-heading"
        >
          {title}
        </h1>

        {import.meta.env.DEV && (
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {DEV_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                title={`${account.email} / ${DEV_PASSWORD}`}
                onClick={() => {
                  setEmail(account.email)
                  setPassword(DEV_PASSWORD)
                  setShowPassword(true)
                  setError('')
                }}
                className="rounded-full border border-border-primary px-3 py-1 text-[12px] font-bold text-text-label transition-colors hover:bg-surface-hover"
              >
                {account.label}
              </button>
            ))}
          </div>
        )}

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <label htmlFor="admin-email" className="text-[12px] font-bold text-text-label">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="admin@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              className="h-10 w-full rounded-xl border border-border-primary bg-surface-hover px-3.5 text-[14px] text-text-heading outline-none transition-colors placeholder:text-text-subtle focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="admin-password" className="text-[12px] font-bold text-text-label">
              Mật khẩu
            </label>
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="h-10 w-full rounded-xl border border-border-primary bg-surface-hover px-3.5 text-[14px] text-text-heading outline-none transition-colors placeholder:text-text-subtle focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {error && (
            <p className="mt-2 text-[13px] leading-5 text-danger" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="md"
            className="mt-1 h-11 w-full rounded-xl bg-primary text-[13px] font-extrabold text-white shadow-[0_4px_0_var(--color-primary-dark)] transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_5px_0_var(--color-primary-dark)] active:translate-y-0.5 active:shadow-none"
            disabled={loading}
          >
            <LockKeyhole size={16} aria-hidden="true" />
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>
      </section>
    </AuthShell>
  )
}

export default AdminLoginPage

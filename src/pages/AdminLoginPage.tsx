import { useState, type FormEvent } from 'react'
import { LockKeyhole } from 'lucide-react'
import AuthShell from '../components/auth/AuthShell'
import Button from '../components/ui/Button'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { clearTokens } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { login as loginAccount } from '../services/authService'
import type { UserProfile, UserRole } from '../services/userService'

interface AdminLoginPageProps {
  onBack: () => void
  onSuccess: (profile: UserProfile) => void
  allowedRoles?: readonly UserRole[]
  title?: string
  rejectedRoleMessage?: string
}

const ADMINISTRATOR_ONLY: readonly UserRole[] = ['ADMINISTRATOR']

function AdminLoginPage({
  onBack,
  onSuccess,
  allowedRoles = ADMINISTRATOR_ONLY,
  title = 'Đăng nhập quản trị',
  rejectedRoleMessage = 'Tài khoản này không có quyền quản trị viên.',
}: AdminLoginPageProps) {
  const { loadCurrentUser } = useCurrentUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        clearTokens()
        setError(rejectedRoleMessage)
        return
      }

      onSuccess(profile)
    } catch (requestError) {
      clearTokens()
      setError(getErrorMessage(requestError) || 'Email hoặc mật khẩu không đúng.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell onBack={onBack} backLabel="Quay lại trang chủ" showThemeToggle>
      <section aria-labelledby="admin-login-title">
        <h1
          id="admin-login-title"
          className="mb-5 text-center text-[24px] font-black leading-tight tracking-[-0.03em] text-text-heading"
        >
          {title}
        </h1>

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
              type="password"
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

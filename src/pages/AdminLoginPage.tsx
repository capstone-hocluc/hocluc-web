import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail } from '../components/console/icons'
import AuthShell from '../components/auth/AuthShell'
import DevQuickLogin from '../components/auth/DevQuickLogin'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import Button from '../components/console/button'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { getErrorMessage } from '../lib/errors'
import { showErrorToast } from '../lib/toastBus'
import { grantedRoles, ROLE_LABELS, roleHome } from '../lib/role-home'
import {
  googleConsoleAuth,
  login as loginAccount,
  logout,
  switchRole as switchRoleRequest,
} from '../services/authService'
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
  { label: 'Mentor', email: 'mentor@gmail.com' },
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
    await signIn(email, password)
  }

  const signIn = async (rawEmail: string, rawPassword: string) => {
    if (loading) return

    const trimmedEmail = rawEmail.trim()
    const password = rawPassword
    if (!trimmedEmail || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await loginAccount({ email: trimmedEmail, password, audience: 'CONSOLE' })
      const profile = await loadCurrentUser()

      if (!allowedRoles.includes(profile.role)) {
        const available = grantedRoles(profile).filter((role) => allowedRoles.includes(role))
        if (available.length) {
          setRoleChoices(available)
          return
        }
        try { await logout() } finally { clearCurrentUser() }
        setError(rejectedRoleMessage)
        return
      }

      onSuccess(profile)
    } catch (requestError) {
      setError(getErrorMessage(requestError) || 'Email hoặc mật khẩu không đúng.')
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async (idToken: string) => {
    if (loading) return

    setLoading(true)
    setError('')
    try {
      await googleConsoleAuth({ idToken })
      const profile = await loadCurrentUser()

      if (!allowedRoles.includes(profile.role)) {
        const available = grantedRoles(profile).filter((role) => allowedRoles.includes(role))
        if (available.length) {
          setRoleChoices(available)
          return
        }
        try { await logout() } finally { clearCurrentUser() }
        setError(rejectedRoleMessage)
        return
      }

      onSuccess(profile)
    } catch (requestError) {
      setError(
        getErrorMessage(requestError) || 'Đăng nhập với Google không thành công. Vui lòng thử lại.'
      )
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

  const discardRoleSession = async (onDone: () => void) => {
    if (loading) return
    setLoading(true)
    try { await logout() } catch (error) { showErrorToast(getErrorMessage(error)) }
    finally {
      clearCurrentUser()
      setRoleChoices([])
      setLoading(false)
      onDone()
    }
  }

  if (roleChoices.length)
    return (
      <AuthShell
        onBack={() => void discardRoleSession(onBack)}
        backLabel="Quay lại trang chủ"
        showThemeToggle
      >
        <section>
          <div className="hl-auth-heading">
            <h1>Chọn vai trò để tiếp tục</h1>
            <p>Chuyển vai trò sẽ kết thúc các phiên đăng nhập khác.</p>
          </div>
          <div className="brand-auth-role-choices">
            {roleChoices.map((role) => (
              <Button
                className="hl-auth-submit"
                key={role}
                disabled={loading}
                onClick={() => void chooseRole(role)}
              >
                {loading ? 'Đang chuyển...' : ROLE_LABELS[role]}
              </Button>
            ))}
            <Button
              className="brand-auth-alternate"
              appearance="outline"
              disabled={loading}
              onClick={() => void discardRoleSession(() => undefined)}
            >
              Dùng tài khoản khác
            </Button>
          </div>
          {error && (
            <p role="alert" className="hl-auth-error">
              {error}
            </p>
          )}
        </section>
      </AuthShell>
    )

  return (
    <AuthShell onBack={onBack} backLabel="Quay lại trang chủ" showThemeToggle>
      <section aria-labelledby="admin-login-title">
        <div className="hl-auth-heading">
          <h1 id="admin-login-title">{title}</h1>
          <p>Truy cập không gian làm việc dành cho đội ngũ Học Lực.</p>
        </div>
        <form onSubmit={handleSubmit} aria-busy={loading}>
          <label className="hl-auth-label" htmlFor="admin-email">
            Email
            <span className="hl-auth-input">
              <Mail size={19} aria-hidden="true" />
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                placeholder="ban@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                autoFocus
              />
            </span>
          </label>
          <label className="hl-auth-label" htmlFor="admin-password">
            Mật khẩu
            <span className="hl-auth-input">
              <LockKeyhole size={19} aria-hidden="true" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="hl-auth-eye"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                disabled={loading}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>

          {error && (
            <p className="hl-auth-error" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" size="md" className="hl-auth-submit" disabled={loading}>
            <LockKeyhole size={16} aria-hidden="true" />
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>
        <div className="hl-auth-divider" aria-hidden="true">
          <span />
          hoặc
          <span />
        </div>
        <GoogleSignInButton
          isSignup={false}
          disabled={loading}
          onCredential={signInWithGoogle}
        />
        <p className="hl-auth-switch">
          Bạn là học viên? <a href="/login">Đăng nhập tại đây</a>
        </p>
        {import.meta.env.DEV && (
          <DevQuickLogin
            accounts={DEV_ACCOUNTS}
            disabled={loading}
            onSelect={(account) => {
              setEmail(account.email)
              setPassword(DEV_PASSWORD)
              setShowPassword(false)
              setError('')
              void signIn(account.email, DEV_PASSWORD)
            }}
          />
        )}
      </section>
    </AuthShell>
  )
}

export default AdminLoginPage

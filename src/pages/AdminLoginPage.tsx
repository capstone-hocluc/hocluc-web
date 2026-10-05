import { useState, type FormEvent } from 'react'
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react'
import Logo from '../components/common/Logo'
import Button from '../components/ui/Button'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { clearTokens } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { login as loginAccount } from '../services/authService'
import type { UserProfile, UserRole } from '../services/userService'
import ThemeToggle from '../components/ui/ThemeToggle'

interface AdminLoginPageProps {
  onBack: () => void
  onSuccess: (profile: UserProfile) => void
  allowedRoles?: readonly UserRole[]
  eyebrow?: string
  title?: string
  description?: string
  rejectedRoleMessage?: string
}

const ADMINISTRATOR_ONLY: readonly UserRole[] = ['ADMINISTRATOR']

function AdminLoginPage({
  onBack,
  onSuccess,
  allowedRoles = ADMINISTRATOR_ONLY,
  eyebrow = 'KHU VỰC QUẢN TRỊ',
  title = 'Đăng nhập quản trị',
  description = 'Đăng nhập bằng tài khoản administrator để tiếp tục.',
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
    <main
      className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-7"
      style={{
        backgroundColor: '#f0faff',
        backgroundImage:
          'linear-gradient(rgba(28,176,246,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(28,176,246,.045) 1px, transparent 1px), radial-gradient(circle at 50% 0%, rgba(88,204,237,.2), transparent 42%)',
        backgroundSize: '40px 40px, 40px 40px, auto',
      }}
    >
      <ThemeToggle className="absolute top-4 right-4 border border-[#bde8f8] bg-white/90 text-[#0b76a8]" />
      <section
        className="relative z-10 w-full max-w-[390px] rounded-[26px] border border-[#d5eef9] bg-white/95 p-6 shadow-[0_28px_70px_-42px_rgba(0,125,181,.38)] sm:p-7"
        aria-labelledby="admin-login-title"
      >
        <div className="mb-4 flex min-h-7 w-full justify-center">
          <Logo size={34} />
        </div>

        <div className="mb-5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf8fc] px-3 py-1 text-[10px] font-extrabold tracking-[0.12em] text-[#0b76a8]">
            <ShieldCheck size={13} aria-hidden="true" />
            {eyebrow}
          </span>
          <h1 id="admin-login-title" className="mt-3 text-[24px] font-black leading-tight tracking-[-0.03em] text-[#14264a]">
            {title}
          </h1>
          <p className="mx-auto mt-2 max-w-[305px] text-[13px] leading-5 text-text-body">
            {description}
          </p>
        </div>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <label htmlFor="admin-email" className="text-[12px] font-bold text-[#334b5d]">
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
              className="h-10 w-full rounded-xl border border-[#d5eef9] bg-[#f8fdff] px-3.5 text-[14px] text-text-heading outline-none transition-colors placeholder:text-text-subtle focus:border-[#1cb0f6] focus:ring-3 focus:ring-[#1cb0f6]/15 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="admin-password" className="text-[12px] font-bold text-[#334b5d]">
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
              className="h-10 w-full rounded-xl border border-[#d5eef9] bg-[#f8fdff] px-3.5 text-[14px] text-text-heading outline-none transition-colors placeholder:text-text-subtle focus:border-[#1cb0f6] focus:ring-3 focus:ring-[#1cb0f6]/15 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="mt-1 h-11 w-full rounded-xl bg-[#1cb0f6] text-[13px] font-extrabold text-white shadow-[0_4px_0_#078fc4] transition hover:-translate-y-0.5 hover:bg-[#1cb0f6] hover:shadow-[0_5px_0_#078fc4] active:translate-y-0.5 active:shadow-none"
            disabled={loading}
          >
            <LockKeyhole size={16} aria-hidden="true" />
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <button
          type="button"
          className="mx-auto mt-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold text-text-body transition-colors hover:text-primary-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={onBack}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Quay lại trang chủ
        </button>
      </section>
    </main>
  )
}

export default AdminLoginPage

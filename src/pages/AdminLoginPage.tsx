import { useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from '../components/console/icons'
import AuthShell from '../components/auth/AuthShell'
import DevQuickLogin from '../components/auth/DevQuickLogin'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import Button from '../components/console/button'
import Notice from '../components/console/notice'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../components/tailgrids/core/input-group'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { ApiError } from '../lib/api'
import { cn } from '../lib/cn'
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

// Console accounts may use internal addresses, so only the shape is checked here; the server decides the rest.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/
const CREDENTIALS_REJECTED = 'Email hoặc mật khẩu không đúng.'

type FieldName = 'email' | 'password'
type FieldErrors = Partial<Record<FieldName, string>>

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email) errors.email = 'Vui lòng nhập email.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Email không hợp lệ.'
  if (!password) errors.password = 'Vui lòng nhập mật khẩu.'
  return errors
}

// The API answers a wrong email/password pair in English; every other message is shown as sent.
function isCredentialRejection(error: unknown) {
  return error instanceof ApiError && error.code === 'INVALID_CREDENTIALS'
}

function loginErrorMessage(error: unknown) {
  return isCredentialRejection(error) ? CREDENTIALS_REJECTED : getErrorMessage(error) || CREDENTIALS_REJECTED
}

function focusField(form: HTMLFormElement | null, name: FieldName, selectText = false) {
  const field = form?.elements.namedItem(name)
  if (!(field instanceof HTMLInputElement)) return
  field.focus()
  if (selectText) field.select()
  // A field remembers its last selection, so put the caret at the end instead of re-selecting the
  // text of an earlier failed attempt. (Email inputs cannot report a selection at all.)
  else if (field.type !== 'email') field.setSelectionRange(field.value.length, field.value.length)
}

// Typing straight into the first field is the point of this page, but a phone's keyboard would cover
// the form the moment it opens, so only pointer-and-keyboard devices start with the cursor in it.
const focusEmailOnOpen = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches

interface LoginFieldProps extends Omit<ComponentProps<typeof InputGroupInput>, 'id' | 'className'> {
  id: string
  label: string
  icon: ReactNode
  error?: string
  /** Control that sits inside the field's right edge (the password reveal button). */
  trailing?: ReactNode
}

function LoginField({ id, label, icon, error, trailing, ...inputProps }: LoginFieldProps) {
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-text-primary">
        {label}
      </label>
      <InputGroup className="h-11 focus-within:ring-4 focus-within:ring-input-primary-focus-border/20">
        <InputGroupAddon className="pr-0 text-icon-tertiary">{icon}</InputGroupAddon>
        <InputGroupInput
          id={id}
          className="h-full pl-2"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {trailing}
      </InputGroup>
      {error && (
        <p id={errorId} className="text-sm text-badge-error-text">
          {error}
        </p>
      )}
    </div>
  )
}

function AdminLoginPage({
  onBack,
  onSuccess,
  allowedRoles = ADMINISTRATOR_ONLY,
  title = 'Đăng nhập quản trị',
  rejectedRoleMessage = 'Tài khoản này không có quyền quản trị viên.',
}: AdminLoginPageProps) {
  const { loadCurrentUser, clearCurrentUser } = useCurrentUser()
  const formRef = useRef<HTMLFormElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [roleChoices, setRoleChoices] = useState<UserRole[]>([])
  const [switchingRole, setSwitchingRole] = useState<UserRole | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await signIn(email, password)
  }

  const editField = (name: FieldName, value: string) => {
    if (name === 'email') setEmail(value)
    else setPassword(value)
    // An error about a field goes away as soon as that field is edited.
    setFieldErrors((current) => (current[name] ? { ...current, [name]: undefined } : current))
  }

  // Inputs stay enabled (read-only while busy) so focus never drops to <body>; the button that was
  // pressed is the only thing that becomes disabled, so the outcome always hands focus back to a field.
  const signIn = async (rawEmail: string, rawPassword: string) => {
    if (loading) return

    const trimmedEmail = rawEmail.trim()
    const invalid = validate(trimmedEmail, rawPassword)
    setFieldErrors(invalid)
    if (invalid.email || invalid.password) {
      setError('')
      focusField(formRef.current, invalid.email ? 'email' : 'password')
      return
    }

    setLoading(true)
    setError('')
    try {
      await loginAccount({ email: trimmedEmail, password: rawPassword, audience: 'CONSOLE' })
      const profile = await loadCurrentUser()

      if (!allowedRoles.includes(profile.role)) {
        const available = grantedRoles(profile).filter((role) => allowedRoles.includes(role))
        if (available.length) {
          setRoleChoices(available)
          return
        }
        try { await logout() } finally { clearCurrentUser() }
        setError(rejectedRoleMessage)
        focusField(formRef.current, 'email', true)
        return
      }

      onSuccess(profile)
    } catch (requestError) {
      setError(loginErrorMessage(requestError))
      focusField(formRef.current, 'password', isCredentialRejection(requestError))
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
    setSwitchingRole(role)
    setError('')
    try {
      await switchRoleRequest(role)
      window.location.assign(roleHome(role))
    } catch (err) {
      setError(getErrorMessage(err))
      setSwitchingRole(null)
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
      <AuthShell onBack={() => void discardRoleSession(onBack)}>
        <section aria-labelledby="admin-role-title">
          <h1
            id="admin-role-title"
            className="text-center text-2xl leading-8 font-semibold tracking-[-0.5px] text-balance text-text-primary"
          >
            Chọn vai trò để tiếp tục
          </h1>
          <p className="mt-2 text-center text-sm leading-6 text-text-secondary">
            Chuyển vai trò sẽ kết thúc các phiên đăng nhập khác.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {roleChoices.map((role, index) => (
              <Button
                key={role}
                size="lg"
                className="w-full"
                disabled={loading}
                autoFocus={index === 0}
                onClick={() => void chooseRole(role)}
              >
                {switchingRole === role ? (
                  <>
                    <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
                    Đang chuyển...
                  </>
                ) : (
                  ROLE_LABELS[role]
                )}
              </Button>
            ))}
            <Button
              appearance="outline"
              size="lg"
              className="w-full"
              disabled={loading}
              onClick={() => void discardRoleSession(() => undefined)}
            >
              Dùng tài khoản khác
            </Button>
          </div>
          {error && (
            <Notice tone="danger" role="alert" className="mt-4">
              {error}
            </Notice>
          )}
        </section>
      </AuthShell>
    )

  return (
    <AuthShell onBack={onBack}>
      <section aria-labelledby="admin-login-title">
        <h1
          id="admin-login-title"
          className="text-center text-2xl leading-8 font-semibold tracking-[-0.5px] text-balance text-text-primary"
        >
          {title}
        </h1>
        <form
          ref={formRef}
          noValidate
          onSubmit={handleSubmit}
          aria-busy={loading}
          className="mt-6 flex flex-col gap-4"
        >
          <LoginField
            id="admin-email"
            name="email"
            label="Email"
            icon={<Mail size={18} aria-hidden="true" />}
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ban@example.com"
            value={email}
            onChange={(event) => editField('email', event.target.value)}
            readOnly={loading}
            autoFocus={focusEmailOnOpen}
            error={fieldErrors.email}
          />
          <LoginField
            id="admin-password"
            name="password"
            label="Mật khẩu"
            icon={<LockKeyhole size={18} aria-hidden="true" />}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(event) => editField('password', event.target.value)}
            readOnly={loading}
            error={fieldErrors.password}
            trailing={
              <InputGroupAddon align="inline-end" className="pr-1.5 pl-0">
                <InputGroupButton
                  size="icon-sm"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="size-10 text-icon-tertiary hover:bg-background-gray-secondary hover:text-text-primary"
                  onPress={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </InputGroupButton>
              </InputGroupAddon>
            }
          />

          {error && (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          )}

          <Button
            type="submit"
            size="lg"
            // Busy, not unavailable: keep the brand colour instead of the kit's greyed-out look.
            className={cn(
              'w-full',
              loading &&
                'disabled:bg-button-primary-background disabled:text-button-primary-text disabled:opacity-70'
            )}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-text-tertiary" aria-hidden="true">
          <span className="h-px flex-1 bg-card-border" />
          hoặc
          <span className="h-px flex-1 bg-card-border" />
        </div>
        <GoogleSignInButton
          variant="console"
          isSignup={false}
          disabled={loading}
          onCredential={signInWithGoogle}
        />
        <p className="mt-6 text-center text-sm text-text-secondary">
          Bạn là học viên?{' '}
          <a
            href="/login"
            // The pseudo-element lifts the touch target to 43px without changing the line or the focus box.
            className="relative rounded-sm font-semibold text-button-primary-outline-text underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-3 hover:underline"
          >
            Đăng nhập tại đây
          </a>
        </p>
        {import.meta.env.DEV && (
          <DevQuickLogin
            variant="console"
            accounts={DEV_ACCOUNTS}
            disabled={loading}
            onSelect={(account) => {
              setEmail(account.email)
              setPassword(DEV_PASSWORD)
              setShowPassword(false)
              setFieldErrors({})
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

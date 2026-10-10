import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, NotebookPen } from '../console/icons'
import AuthShell from './AuthShell'
import GoogleSignInButton from './GoogleSignInButton'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { getErrorMessage } from '../../lib/errors'
import { clearTokens } from '../../lib/api'
import { getPasswordHelper, getPasswordIssues, validatePassword } from '../../lib/passwordRules'
import { showSuccessToast } from '../../lib/toastBus'
import type { UserRole } from '../../services/userService'
import {
  confirmAccount,
  forgotPassword,
  googleAuth,
  login as loginAccount,
  registerStudent,
  resendOtp,
  resetPassword,
} from '../../services/authService'

const DEFAULT_ALLOWED_ROLES: readonly UserRole[] = ['STUDENT', 'MENTOR']

function AuthPage({
  mode: initialMode = 'login',
  verificationEmail = '',
  onModeChange,
  onContinue,
  onBack,
  allowedRoles = DEFAULT_ALLOWED_ROLES,
  rejectedRoleMessage = 'Tài khoản này không có quyền truy cập khu vực học tập.',
}) {
  const { loadCurrentUser } = useCurrentUser()
  const [mode, setMode] = useState(initialMode)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    confirmPassword: '',
  })
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({})
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState('')
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [recoveryStep, setRecoveryStep] = useState(1)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoverySuccess, setRecoverySuccess] = useState('')
  const [recoveryForm, setRecoveryForm] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: '',
  })
  const [recoveryErrors, setRecoveryErrors] = useState<Record<string, string>>({})
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [verificationSuccess, setVerificationSuccess] = useState('')
  const [verificationCountdown, setVerificationCountdown] = useState(60)
  const recoveryTimers = useRef([])
  const recoveryIntervals = useRef([])
  const verificationTimers = useRef([])
  const verificationIntervals = useRef([])
  const isSignup = mode === 'signup'
  const isEmailVerification = mode === 'verify-email'
  const isRecovery = mode === 'forgot-password' || mode === 'reset-password'

  const clearRecoveryTimers = () => {
    recoveryTimers.current.forEach((timer) => window.clearTimeout(timer))
    recoveryTimers.current = []
    recoveryIntervals.current.forEach((interval) => window.clearInterval(interval))
    recoveryIntervals.current = []
  }

  const resetRecovery = () => {
    clearRecoveryTimers()
    setRecoveryStep(1)
    setResendCountdown(0)
    setRecoveryLoading(false)
    setRecoverySuccess('')
    setRecoveryErrors({})
    setRecoveryForm({
      email: '',
      otp: '',
      password: '',
      confirmPassword: '',
    })
    setShowPassword(false)
  }

  const clearVerificationTimers = () => {
    verificationTimers.current.forEach((timer) => window.clearTimeout(timer))
    verificationTimers.current = []
    verificationIntervals.current.forEach((interval) => window.clearInterval(interval))
    verificationIntervals.current = []
  }

  const startVerificationCountdown = () => {
    verificationIntervals.current.forEach((interval) => window.clearInterval(interval))
    verificationIntervals.current = []
    setVerificationCountdown(60)
    const interval = window.setInterval(() => {
      setVerificationCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          return 0
        }
        return current - 1
      })
    }, 1000)
    verificationIntervals.current.push(interval)
  }

  const resetVerification = () => {
    clearVerificationTimers()
    setVerificationCode('')
    setVerificationLoading(false)
    setVerificationError('')
    setVerificationSuccess('')
    setVerificationCountdown(60)
  }

  useEffect(() => {
    setMode(initialMode)
    if (initialMode === 'verify-email') {
      resetRecovery()
      resetVerification()
      startVerificationCountdown()
    } else if (initialMode === 'forgot-password') {
      resetRecovery()
    } else if (initialMode === 'reset-password') {
      clearRecoveryTimers()
      setRecoveryStep(2)
      setRecoveryLoading(false)
      setRecoverySuccess('')
      setRecoveryErrors({})
    } else {
      resetRecovery()
    }
  }, [initialMode])

  useEffect(
    () => () => {
      clearRecoveryTimers()
      clearVerificationTimers()
    },
    []
  )

  const switchMode = (nextMode) => {
    setLoginError('')
    setLoginErrors({})
    setMode(nextMode)
    onModeChange?.(nextMode)
  }
  const openRecovery = () => {
    resetRecovery()
    switchMode('forgot-password')
  }
  const backToLogin = () => {
    clearVerificationTimers()
    resetRecovery()
    switchMode('login')
  }
  const updateRecovery = (key, value) => {
    setRecoveryForm((current) => ({ ...current, [key]: value }))
    setRecoveryErrors((current) => ({ ...current, [key]: '' }))
    setRecoverySuccess('')
  }
  const updateSignup = (key, value) => {
    setSignupForm((current) => ({ ...current, [key]: value }))
    setRegisterErrors((current) => ({ ...current, [key]: '', general: '' }))
    setRegisterSuccess('')
  }
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  const passwordIssues = getPasswordIssues
  const passwordHelper = getPasswordHelper(authPassword)
  const recoveryPasswordHelper = getPasswordHelper(recoveryForm.password)
  const currentVerificationEmail = verificationEmail || authEmail
  const verificationCountdownLabel = `00:${String(verificationCountdown).padStart(2, '0')}`

  const submitRecoveryEmail = async () => {
    if (recoveryLoading) return
    const email = recoveryForm.email.trim()
    const nextErrors: Record<string, string> = {}
    if (!email) nextErrors.email = 'Vui lòng nhập email đã đăng ký.'
    else if (!isValidEmail(email)) nextErrors.email = 'Email chưa đúng định dạng.'
    setRecoveryErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setRecoveryLoading(true)
    setRecoverySuccess('')
    clearRecoveryTimers()
    try {
      const response = await forgotPassword({ email })
      setRecoveryForm((current) => ({ ...current, email }))
      setRecoverySuccess(
        response?.message || 'Mã xác nhận đặt lại mật khẩu đã được gửi tới email của bạn.'
      )
      setRecoveryStep(2)
      setResendCountdown(60)
      const interval = window.setInterval(() => {
        setResendCountdown((current) => {
          if (current <= 1) {
            window.clearInterval(interval)
            return 0
          }
          return current - 1
        })
      }, 1000)
      recoveryIntervals.current.push(interval)
    } catch (error) {
      const fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {}
      setRecoveryErrors({
        email:
          fieldErrors.email ||
          getErrorMessage(error) ||
          'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.',
      })
    } finally {
      setRecoveryLoading(false)
    }
  }

  const resendResetOtp = async () => {
    if (recoveryLoading || resendCountdown > 0) return
    const email = recoveryForm.email.trim()
    if (!email) {
      setRecoveryErrors((current) => ({
        ...current,
        otp: 'Không tìm thấy email khôi phục. Vui lòng quay lại và nhập email.',
      }))
      return
    }

    setRecoveryLoading(true)
    setRecoverySuccess('')
    clearRecoveryTimers()
    try {
      const response = await forgotPassword({ email })
      setRecoverySuccess(response?.message || 'Mã xác nhận mới đã được gửi tới email của bạn.')
      setResendCountdown(60)
      const interval = window.setInterval(() => {
        setResendCountdown((current) => {
          if (current <= 1) {
            window.clearInterval(interval)
            return 0
          }
          return current - 1
        })
      }, 1000)
      recoveryIntervals.current.push(interval)
    } catch (error) {
      setRecoveryErrors((current) => ({
        ...current,
        otp: getErrorMessage(error) || 'Không thể gửi lại mã. Vui lòng thử lại.',
      }))
    } finally {
      setRecoveryLoading(false)
    }
  }

  const submitResetPassword = async () => {
    if (recoveryLoading) return
    const email = recoveryForm.email.trim()
    const otp = recoveryForm.otp.trim()
    const nextErrors: Record<string, string> = {}

    if (!email) nextErrors.otp = 'Không tìm thấy email khôi phục. Vui lòng yêu cầu mã mới.'
    else if (!otp) nextErrors.otp = 'Vui lòng nhập mã xác nhận.'

    const issues = passwordIssues(recoveryForm.password)
    if (!recoveryForm.password) nextErrors.password = 'Vui lòng nhập mật khẩu mới.'
    else if (issues.length) nextErrors.password = issues.join(' · ')
    if (!recoveryForm.confirmPassword)
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.'
    else if (recoveryForm.password !== recoveryForm.confirmPassword)
      nextErrors.confirmPassword = 'Hai mật khẩu chưa khớp.'

    setRecoveryErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setRecoveryLoading(true)
    setRecoverySuccess('')
    clearRecoveryTimers()
    try {
      const response = await resetPassword({ email, otp, newPassword: recoveryForm.password })
      showSuccessToast(
        response?.message || 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.'
      )
      backToLogin()
    } catch (error) {
      const fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {}
      const hasFieldErrors = Boolean(fieldErrors.otp || fieldErrors.newPassword || fieldErrors.password)
      setRecoveryErrors({
        otp: fieldErrors.otp || (!hasFieldErrors ? getErrorMessage(error) : '') || '',
        password: fieldErrors.newPassword || fieldErrors.password || '',
      })
    } finally {
      setRecoveryLoading(false)
    }
  }

  const submitVerification = async () => {
    if (verificationLoading) return
    const code = verificationCode.trim()
    if (!code) {
      setVerificationError('Vui lòng nhập mã xác nhận.')
      return
    }
    if (!currentVerificationEmail) {
      setVerificationError('Không tìm thấy email đăng ký. Vui lòng đăng ký lại.')
      return
    }

    setVerificationLoading(true)
    setVerificationError('')
    setVerificationSuccess('')
    clearVerificationTimers()
    try {
      await confirmAccount({
        email: currentVerificationEmail,
        otp: code,
      })
      setVerificationCode('')
      clearVerificationTimers()
      resetRecovery()
      switchMode('login')
    } catch (error) {
      const fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {}
      setVerificationError(
        fieldErrors.otp ||
          fieldErrors.code ||
          fieldErrors.OTP ||
          getErrorMessage(error) ||
          'Xác nhận tài khoản không thành công. Vui lòng kiểm tra mã và thử lại.'
      )
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleVerificationResend = async () => {
    if (verificationLoading || verificationCountdown > 0) return
    if (!currentVerificationEmail) {
      setVerificationError('Không tìm thấy email đăng ký. Vui lòng đăng ký lại.')
      return
    }

    setVerificationLoading(true)
    setVerificationError('')
    try {
      const response = await resendOtp({ email: currentVerificationEmail })
      showSuccessToast(response?.message || 'Mã xác nhận mới đã được gửi tới email của bạn.')
      // The previous code is no longer valid once a new one is issued.
      setVerificationCode('')
      startVerificationCountdown()
    } catch (error) {
      const fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {}
      setVerificationError(
        fieldErrors.email || getErrorMessage(error) || 'Không thể gửi lại mã. Vui lòng thử lại.'
      )
    } finally {
      setVerificationLoading(false)
    }
  }

  const submitLogin = async () => {
    if (loginLoading) return
    const email = authEmail.trim()
    const nextErrors: Record<string, string> = {}

    if (!email) nextErrors.email = 'Vui lòng nhập email.'
    else if (!isValidEmail(email)) nextErrors.email = 'Email không hợp lệ.'
    if (!authPassword) nextErrors.password = 'Vui lòng nhập mật khẩu.'

    setLoginErrors(nextErrors)
    setLoginError('')
    if (Object.keys(nextErrors).length) return

    setLoginLoading(true)
    try {
      await loginAccount({ email, password: authPassword })
      const profile = await loadCurrentUser()
      if (!allowedRoles.includes(profile.role)) {
        clearTokens()
        setLoginError(rejectedRoleMessage)
        return
      }
      onContinue?.(profile)
    } catch (error) {
      const fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {}
      setLoginErrors(fieldErrors)
      setLoginError(
        getErrorMessage(error) ||
          'Đăng nhập không thành công. Vui lòng kiểm tra email và mật khẩu.'
      )
    } finally {
      setLoginLoading(false)
    }
  }

  // Same post-auth path as submitLogin: tokens are already stored by
  // googleAuth() through the shared ensureTokenData() helper, so from here
  // on this is identical to a normal login - load the profile, gate on
  // role, then hand off to the same onContinue navigation. The backend
  // alone decides whether this credential was a login or a first-time
  // registration; nothing here branches on that.
  const handleGoogleCredential = async (idToken: string) => {
    if (googleLoading) return
    setGoogleLoading(true)
    setLoginError('')
    try {
      await googleAuth({ idToken })
      const profile = await loadCurrentUser()
      if (!allowedRoles.includes(profile.role)) {
        clearTokens()
        setLoginError(rejectedRoleMessage)
        return
      }
      onContinue?.(profile)
    } catch (error) {
      setLoginError(
        getErrorMessage(error) || 'Đăng nhập với Google không thành công. Vui lòng thử lại.'
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  const submitRegister = async () => {
    if (registerLoading) return

    const email = authEmail.trim()
    const firstName = signupForm.firstName.trim()
    const lastName = signupForm.lastName.trim()
    const phone = signupForm.phone.trim()
    const nextErrors: Record<string, string> = {}

    if (!lastName) nextErrors.lastName = 'Vui lòng nhập họ.'
    if (!firstName) nextErrors.firstName = 'Vui lòng nhập tên.'
    if (!email) nextErrors.email = 'Vui lòng nhập email.'
    else if (!isValidEmail(email)) nextErrors.email = 'Email chưa đúng định dạng.'
    if (!phone) nextErrors.phone = 'Vui lòng nhập số điện thoại.'
    nextErrors.password = validatePassword(authPassword)
    if (!signupForm.confirmPassword) nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    else if (authPassword !== signupForm.confirmPassword)
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) delete nextErrors[key]
    })
    setRegisterErrors(nextErrors)
    setRegisterSuccess('')
    if (Object.keys(nextErrors).length) return

    setRegisterLoading(true)
    try {
      const response = await registerStudent({
        email,
        password: authPassword,
        firstName,
        lastName,
        phone,
        role: 'STUDENT',
      })

      setRegisterSuccess(
        response?.message || 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.'
      )
      onContinue?.(email)
    } catch (error) {
      const fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {}
      setRegisterErrors({
        ...fieldErrors,
        general: getErrorMessage(error) || 'Đăng ký không thành công. Vui lòng thử lại.',
      })
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleRecoverySubmit = () => {
    if (recoveryLoading) return
    if (recoveryStep === 1) {
      submitRecoveryEmail()
      return
    }
    submitResetPassword()
  }

  const renderRecoveryStep = () => {
    const isStepOne = recoveryStep === 1
    const resendCountdownLabel = `00:${String(resendCountdown).padStart(2, '0')}`
    const buttonLabel = recoveryLoading
      ? isStepOne
        ? 'Đang gửi mã...'
        : 'Đang đặt lại...'
      : isStepOne
        ? 'Gửi mã xác nhận'
        : 'Đặt lại mật khẩu'

    return (
      <div className={`hl-auth-recovery ${recoveryLoading ? 'is-loading' : ''}`}>
        <div className="hl-auth-heading hl-auth-heading--compact">
          <h1>Quên mật khẩu</h1>
          <p>
            {isStepOne ? (
              'Nhập email để nhận mã xác nhận.'
            ) : (
              <>
                Mã đã gửi tới <strong>{recoveryForm.email || 'email của bạn'}</strong>.
              </>
            )}
          </p>
        </div>

        {isStepOne && recoverySuccess && (
          <div className="hl-auth-success" role="status">
            {recoverySuccess}
          </div>
        )}

        <div className="hl-auth-step" key={recoveryStep}>
          {isStepOne ? (
            <label className="hl-auth-label">
              Email
              <span className={`hl-auth-input ${recoveryErrors.email ? 'has-error' : ''}`}>
                <Mail size={19} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={recoveryForm.email}
                  onChange={(event) => updateRecovery('email', event.target.value)}
                  autoComplete="email"
                />
              </span>
              {recoveryErrors.email && (
                <small className="hl-auth-error">{recoveryErrors.email}</small>
              )}
            </label>
          ) : (
            <>
              <label className="hl-auth-label hl-auth-verification-label">
                Mã xác nhận
                <span
                  className={`hl-auth-input hl-auth-verification-code ${recoveryErrors.otp ? 'has-error' : ''}`}
                >
                  <LockKeyhole size={19} />
                  <input
                    placeholder="Nhập mã xác nhận"
                    value={recoveryForm.otp}
                    onChange={(event) => updateRecovery('otp', event.target.value)}
                    autoComplete="one-time-code"
                    aria-label="Mã xác nhận đặt lại mật khẩu"
                  />
                </span>
                {recoveryErrors.otp && (
                  <small className="hl-auth-error">{recoveryErrors.otp}</small>
                )}
              </label>
              <div className="hl-auth-verification-resend">
                <span>Chưa nhận được mã?</span>
                <button
                  type="button"
                  onClick={resendResetOtp}
                  disabled={recoveryLoading || resendCountdown > 0}
                >
                  {resendCountdown > 0 ? `Gửi lại sau ${resendCountdownLabel}` : 'Gửi lại mã'}
                </button>
              </div>
              <label className="hl-auth-label">
                Mật khẩu mới
                <span className={`hl-auth-input ${recoveryErrors.password ? 'has-error' : ''}`}>
                  <LockKeyhole size={19} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu mới"
                    value={recoveryForm.password}
                    onChange={(event) => updateRecovery('password', event.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="hl-auth-eye"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </span>
                {recoveryErrors.password ? (
                  <small className="hl-auth-error">{recoveryErrors.password}</small>
                ) : (
                  recoveryPasswordHelper.text && (
                    <small
                      className={`hl-auth-password-note ${
                        recoveryPasswordHelper.isError ? 'is-error' : ''
                      }`}
                    >
                      {recoveryPasswordHelper.text}
                    </small>
                  )
                )}
              </label>
              <label className="hl-auth-label">
                Xác nhận mật khẩu mới
                <span
                  className={`hl-auth-input ${recoveryErrors.confirmPassword ? 'has-error' : ''}`}
                >
                  <LockKeyhole size={19} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={recoveryForm.confirmPassword}
                    onChange={(event) => updateRecovery('confirmPassword', event.target.value)}
                    autoComplete="new-password"
                  />
                </span>
                {recoveryErrors.confirmPassword && (
                  <small className="hl-auth-error">{recoveryErrors.confirmPassword}</small>
                )}
              </label>
            </>
          )}
        </div>

        <div className="hl-auth-recovery-actions">
          <button
            type="button"
            className="hl-auth-submit"
            onClick={handleRecoverySubmit}
            disabled={recoveryLoading}
          >
            {buttonLabel}
          </button>
          <button
            type="button"
            className="hl-auth-recovery-back"
            onClick={backToLogin}
            disabled={recoveryLoading}
          >
            <ArrowLeft size={15} />
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    )
  }

  const renderEmailVerification = () => (
    <div className={`hl-auth-recovery ${verificationLoading ? 'is-loading' : ''}`}>
      <div className="hl-auth-heading hl-auth-heading--compact">
        <h1>Xác thực email</h1>
        <p>
          Mã đã gửi tới <strong>{currentVerificationEmail || 'email của bạn'}</strong>.
        </p>
      </div>

      <div className="hl-auth-step">
        <label className="hl-auth-label hl-auth-verification-label">
          Mã xác thực
          <span
            className={`hl-auth-input hl-auth-verification-code ${verificationError ? 'has-error' : ''}`}
          >
            <LockKeyhole size={19} />
            <input
              placeholder="Nhập mã xác nhận"
              value={verificationCode}
              onChange={(event) => {
                setVerificationCode(event.target.value)
                setVerificationError('')
                setVerificationSuccess('')
              }}
              autoComplete="one-time-code"
              aria-label="Mã xác nhận tài khoản"
            />
          </span>
          {verificationError && <small className="hl-auth-error">{verificationError}</small>}
        </label>
      </div>

      <div className="hl-auth-verification-resend">
        <span>Chưa nhận được mã?</span>
        <button
          type="button"
          onClick={handleVerificationResend}
          disabled={verificationLoading || verificationCountdown > 0}
          title={
            verificationCountdown > 0 ? `Có thể gửi lại sau ${verificationCountdownLabel}` : undefined
          }
        >
          {verificationLoading
            ? 'Đang gửi...'
            : verificationCountdown > 0
              ? `Gửi lại sau ${verificationCountdownLabel}`
              : 'Gửi lại mã'}
        </button>
      </div>

      <div className="hl-auth-recovery-actions">
        <button
          type="button"
          className="hl-auth-submit"
          onClick={submitVerification}
          disabled={verificationLoading || Boolean(verificationSuccess)}
        >
          {verificationLoading ? 'Đang xác nhận...' : 'Xác nhận tài khoản'}
        </button>
        <button
          type="button"
          className="hl-auth-recovery-back"
          onClick={backToLogin}
          disabled={verificationLoading}
        >
          <ArrowLeft size={15} />
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  )

  return (
    <AuthShell
      variant="dialog"
      onBack={onBack}
      className={`${isEmailVerification ? 'is-verification' : ''} ${isRecovery ? 'is-recovery' : ''}`}
    >
            {isEmailVerification ? (
              renderEmailVerification()
            ) : isRecovery ? (
              renderRecoveryStep()
            ) : (
              <>
                <div className="hl-auth-heading">
                  <h1>{isSignup ? 'Tạo tài khoản' : 'Chào mừng trở lại'}</h1>
                </div>
                <GoogleSignInButton
                  isSignup={isSignup}
                  disabled={googleLoading}
                  onCredential={handleGoogleCredential}
                />
                <div className="hl-auth-divider">
                  <span />
                  HOẶC
                  <span />
                </div>
                {isSignup && (
                  <div className="hl-auth-name-row">
                    <label className="hl-auth-label">
                      Họ
                      <span className={`hl-auth-input ${registerErrors.lastName ? 'has-error' : ''}`}>
                        <NotebookPen size={19} />
                        <input
                          type="text"
                          placeholder="Nguyễn"
                          value={signupForm.lastName}
                          onChange={(event) => updateSignup('lastName', event.target.value)}
                          autoComplete="family-name"
                        />
                      </span>
                      {registerErrors.lastName && (
                        <small className="hl-auth-error">{registerErrors.lastName}</small>
                      )}
                    </label>
                    <label className="hl-auth-label">
                      Tên
                      <span className={`hl-auth-input ${registerErrors.firstName ? 'has-error' : ''}`}>
                        <NotebookPen size={19} />
                        <input
                          type="text"
                          placeholder="An"
                          value={signupForm.firstName}
                          onChange={(event) => updateSignup('firstName', event.target.value)}
                          autoComplete="given-name"
                        />
                      </span>
                      {registerErrors.firstName && (
                        <small className="hl-auth-error">{registerErrors.firstName}</small>
                      )}
                    </label>
                  </div>
                )}
                <label className="hl-auth-label">
                  Email
                  <span
                    className={`hl-auth-input ${
                      isSignup
                        ? registerErrors.email
                          ? 'has-error'
                          : ''
                        : loginErrors.email
                          ? 'has-error'
                          : ''
                    }`}
                  >
                    <Mail size={19} />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={authEmail}
                      onChange={(event) => {
                        setAuthEmail(event.target.value)
                        setLoginError('')
                        setLoginErrors((current) => ({ ...current, email: '' }))
                        setRegisterErrors((current) => ({ ...current, email: '', general: '' }))
                        setRegisterSuccess('')
                      }}
                      autoComplete="email"
                    />
                  </span>
                  {isSignup && registerErrors.email && (
                    <small className="hl-auth-error">{registerErrors.email}</small>
                  )}
                  {!isSignup && loginErrors.email && (
                    <small className="hl-auth-error">{loginErrors.email}</small>
                  )}
                </label>
                {isSignup && (
                  <label className="hl-auth-label">
                    Số điện thoại
                    <span className={`hl-auth-input ${registerErrors.phone ? 'has-error' : ''}`}>
                      <NotebookPen size={19} />
                      <input
                        type="tel"
                        placeholder="0901234567"
                        value={signupForm.phone}
                        onChange={(event) => updateSignup('phone', event.target.value)}
                        autoComplete="tel"
                      />
                    </span>
                    {registerErrors.phone && (
                      <small className="hl-auth-error">{registerErrors.phone}</small>
                    )}
                  </label>
                )}
                <label className="hl-auth-label">
                  Mật khẩu
                  <span
                    className={`hl-auth-input ${
                      isSignup
                        ? registerErrors.password
                          ? 'has-error'
                          : ''
                        : loginErrors.password
                          ? 'has-error'
                          : ''
                    }`}
                  >
                    <LockKeyhole size={19} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu"
                      value={authPassword}
                      onChange={(event) => {
                        setAuthPassword(event.target.value)
                        setLoginError('')
                        setLoginErrors((current) => ({ ...current, password: '' }))
                        setRegisterErrors((current) => ({
                          ...current,
                          password: '',
                          confirmPassword: '',
                          general: '',
                        }))
                        setRegisterSuccess('')
                      }}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      className="hl-auth-eye"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </span>
                  {isSignup && registerErrors.password && (
                    <small className="hl-auth-error">{registerErrors.password}</small>
                  )}
                  {!isSignup && loginErrors.password && (
                    <small className="hl-auth-error">{loginErrors.password}</small>
                  )}
                  {isSignup && !registerErrors.password && passwordHelper.text && (
                    <small
                      className={`hl-auth-password-note ${
                        passwordHelper.isError ? 'is-error' : ''
                      }`}
                    >
                      {passwordHelper.text}
                    </small>
                  )}
                </label>
                {isSignup && (
                  <label className="hl-auth-label">
                    Xác nhận mật khẩu
                    <span
                      className={`hl-auth-input ${registerErrors.confirmPassword ? 'has-error' : ''}`}
                    >
                      <LockKeyhole size={19} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu"
                        value={signupForm.confirmPassword}
                        onChange={(event) => updateSignup('confirmPassword', event.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="hl-auth-eye"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                      </button>
                    </span>
                    {registerErrors.confirmPassword && (
                      <small className="hl-auth-error">{registerErrors.confirmPassword}</small>
                    )}
                  </label>
                )}
                {!isSignup && loginError && <small className="hl-auth-error">{loginError}</small>}
                {isSignup && registerSuccess && (
                  <div className="hl-auth-success" role="status">
                    {registerSuccess}
                  </div>
                )}
                {isSignup && registerErrors.general && (
                  <small className="hl-auth-error">{registerErrors.general}</small>
                )}
                {!isSignup && (
                  <button type="button" className="hl-auth-forgot" onClick={openRecovery}>
                    Quên mật khẩu?
                  </button>
                )}
                <button
                  type="button"
                  className="hl-auth-submit"
                  disabled={isSignup ? registerLoading : loginLoading}
                  onClick={isSignup ? submitRegister : submitLogin}
                >
                  {isSignup
                    ? registerLoading
                      ? 'Đang đăng ký...'
                      : 'Đăng ký ngay'
                    : loginLoading
                      ? 'Đang đăng nhập...'
                      : 'Đăng nhập'}
                </button>
                <p className="hl-auth-switch">
                  {isSignup ? 'Bạn đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
                  <button type="button" onClick={() => switchMode(isSignup ? 'login' : 'signup')}>
                    {isSignup ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                </p>
              </>
            )}
    </AuthShell>
  )
}

export default AuthPage

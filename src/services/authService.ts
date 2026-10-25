import {
  ApiError,
  type ApiResponse,
  clearTokens,
  getAccessToken,
  accessTokenIdentity,
  authSessionStamp,
  authSessionGeneration,
  assertAuthSessionStamp,
  ensureFreshAccessToken,
  withAuthSessionLock,
  request,
  setTokens,
  type TokenData,
} from '../lib/api'
import type { UserRole } from './userService'

export interface RegisterStudentRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  role: string
}

export interface ConfirmRegistrationRequest {
  email: string
  otp: string
}

export interface LoginRequest {
  email: string
  password: string
  /** Sign-in page the request came from; the server rejects accounts that don't belong there. */
  audience?: 'LEARNER' | 'CONSOLE'
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
  otp: string
  newPassword: string
}

export interface GoogleAuthRequest {
  idToken: string
}

export interface ResendOtpRequest {
  email: string
}

function ensureTokenData(response: ApiResponse<TokenData>, fallbackMessage: string) {
  const { accessToken } = response.data || {}
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new ApiError(fallbackMessage, 0)
  }

  setTokens({ accessToken }, true)
  return response
}

function authenticate(path: string, body: unknown, fallback: string, auth = false) {
  const generation = authSessionGeneration()
  return withAuthSessionLock(async () => {
    if (generation !== authSessionGeneration()) throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
    const stamp = authSessionStamp()
    try {
      const response = await request<TokenData>(path, { method: 'POST', body, auth, retryOnUnauthorized: false })
      assertAuthSessionStamp(stamp)
      return ensureTokenData(response, fallback)
    } catch (error) {
      assertAuthSessionStamp(stamp)
      throw error
    }
  })
}

export async function registerStudent(payload: RegisterStudentRequest) {
  return request('/api/v1/auth/student-register', { method: 'POST', body: payload })
}

export async function confirmRegistration(payload: ConfirmRegistrationRequest) {
  return request('/api/v1/auth/confirm', { method: 'POST', body: payload })
}

export function confirmAccount(payload: ConfirmRegistrationRequest) {
  return confirmRegistration(payload)
}

export async function login({ email, password, audience }: LoginRequest) {
  return authenticate('/api/v1/auth/login', { email: email.trim(), password, audience },
    'Đăng nhập không thành công. Máy chủ chưa trả về access token.')
}

// Sends only the Google ID token, obtained from Google's own sign-in flow -
// never an access token or profile fields collected client-side. Backend
// decides whether this is a login or a first-time registration; the
// The browser receives the HttpOnly refresh cookie; JS stores the access token only.
export async function googleAuth({ idToken }: GoogleAuthRequest) {
  return authenticate('/api/v1/auth/google', { idToken } satisfies GoogleAuthRequest,
    'Đăng nhập với Google không thành công. Máy chủ chưa trả về access token.')
}

export async function googleConsoleAuth({ idToken }: GoogleAuthRequest) {
  return authenticate('/api/v1/auth/google/console', { idToken } satisfies GoogleAuthRequest,
    'Đăng nhập với Google không thành công. Máy chủ chưa trả về access token.')
}

export async function forgotPassword({ email }: ForgotPasswordRequest) {
  return request<string>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
  })
}

export async function resetPassword({ email, otp, newPassword }: ResetPasswordRequest) {
  return request<string>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: { email: email.trim(), otp, newPassword },
  })
}

export async function resendOtp({ email }: ResendOtpRequest) {
  return request<string>('/api/v1/auth/resend-otp', {
    method: 'POST',
    body: { email: email.trim() } satisfies ResendOtpRequest,
  })
}

export async function logout() {
  const token = getAccessToken()
  // Invalidate pending responses immediately, before waiting for cookie rotation.
  // Keep restoration blocked even when offline: only BE can remove its HttpOnly cookie.
  clearTokens()
  try {
    await withAuthSessionLock(() => request('/api/v1/auth/logout', {
        method: 'POST',
        retryOnUnauthorized: false,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }))
  } catch {
    throw new Error('Đã đăng xuất trên thiết bị này nhưng chưa xác nhận đăng xuất phía máy chủ. Vui lòng kiểm tra kết nối mạng.')
  }
}

// Role in use is stored server-side; the response carries fresh tokens for it.
export async function switchRole(role: UserRole) {
  const generation = authSessionGeneration()
  const identity = accessTokenIdentity()
  if (!await ensureFreshAccessToken() || identity !== accessTokenIdentity()) {
    throw new ApiError('Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.', 409)
  }
  return withAuthSessionLock(async () => {
    if (identity !== accessTokenIdentity() || generation !== authSessionGeneration()) throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
    const stamp = authSessionStamp()
    const response = await request<TokenData>('/api/v1/auth/switch-role', {
      method: 'POST', auth: true, retryOnUnauthorized: false, body: { role },
    })
    assertAuthSessionStamp(stamp)
    return ensureTokenData(response, 'Không đổi được vai trò. Máy chủ chưa trả về access token.')
  })
}

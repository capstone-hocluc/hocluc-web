import {
  ApiError,
  type ApiResponse,
  clearTokens,
  getRefreshToken,
  request,
  refreshToken as refreshTokenRequest,
  setTokens,
  type TokenData,
} from '../lib/api'

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
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
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
  const { accessToken, refreshToken } = response.data || {}
  if (!accessToken || !refreshToken) {
    throw new ApiError(fallbackMessage, 0)
  }

  setTokens({ accessToken, refreshToken })
  return response
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

export async function login({ email, password }: LoginRequest) {
  const response = await request<TokenData>('/api/v1/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  })

  return ensureTokenData(
    response,
    'Đăng nhập không thành công. Máy chủ chưa trả về đầy đủ token.'
  )
}

// Sends only the Google ID token, obtained from Google's own sign-in flow -
// never an access token or profile fields collected client-side. Backend
// decides whether this is a login or a first-time registration; the
// response shape (accessToken/refreshToken) is identical to login(), so it
// goes through the same ensureTokenData() storage path.
export async function googleAuth({ idToken }: GoogleAuthRequest) {
  const response = await request<TokenData>('/api/v1/auth/google', {
    method: 'POST',
    body: { idToken } satisfies GoogleAuthRequest,
  })

  return ensureTokenData(
    response,
    'Đăng nhập với Google không thành công. Máy chủ chưa trả về đầy đủ token.'
  )
}

export async function refreshSession() {
  const response = await refreshTokenRequest(getRefreshToken())
  return ensureTokenData(response, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
}

export function refreshToken() {
  return refreshSession()
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
  const storedRefreshToken = getRefreshToken()

  try {
    if (storedRefreshToken) {
      await request('/api/v1/auth/logout', {
        auth: true,
        method: 'POST',
        body: { refreshToken: storedRefreshToken } satisfies LogoutRequest,
      })
    }
  } finally {
    clearTokens()
  }
}

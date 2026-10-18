import { CONSOLE_LOGIN_PATH, isConsolePath } from './console-routes'
import { purchaseLoginPath, safePurchaseReturnTo } from './purchaseSession'
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://developments.hocluc.com'
const BASE_URL = API_BASE_URL

const ACCESS_TOKEN_KEY = 'hocluc.accessToken'
const REFRESH_TOKEN_KEY = 'hocluc.refreshToken'
const REFRESH_PATH = '/api/v1/auth/refresh'
let refreshPromise: Promise<unknown> | null = null
let authEpoch = 0
export const AUTH_TOKENS_EVENT = 'hocluc:tokens-changed'

export interface ApiResponse<T = unknown> {
  success: boolean
  status: number
  message?: string
  data?: T
  errors?: Record<string, string>
  code?: string
  path?: string
  timestamp?: string
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string>
  code?: string

  constructor(message: string, status: number, errors?: Record<string, string>, code?: string) {
    super(message)
    this.status = status
    this.errors = errors
    this.code = code
  }
}

export interface RequestOptions {
  headers?: Record<string, string>
  timeoutMs?: number
  method?: string
  body?: unknown
  auth?: boolean
  retryOnUnauthorized?: boolean
  // For endpoints that must stay browsable by guests (e.g. public course
  // catalog/detail) but return richer data for a logged-in caller: attaches
  // a token the same way `auth` does, but a 401 here means "no personalized
  // data available" - it must never clear tokens or force-redirect to
  // /login the way an actual expired-session 401 does.
  optionalAuth?: boolean
}

function createHeaders(auth: boolean, isFormData: boolean) {
  const headers: Record<string, string> = {}
  // Leave Content-Type unset for FormData bodies so the browser can add the
  // multipart boundary itself - setting it manually breaks the upload.
  if (!isFormData) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function tokenIdentity(token: string | null): string | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub) return null
    return JSON.stringify([payload.sub, payload.role ?? payload.roles ?? null])
  } catch {
    return null
  }
}

export async function request<T = unknown>(
  path: string,
  {
    method = 'GET',
    body,
    auth = false,
    retryOnUnauthorized = true,
    optionalAuth = false,
    headers = {},
    timeoutMs,
  }: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const attachesToken = auth || optionalAuth
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const tokenAtStart = getAccessToken()
  let response: Response
  const signal = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...createHeaders(attachesToken, isFormData), ...headers },
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch {
    if (signal?.aborted)
      throw new Error(
        'Máy chủ phản hồi quá lâu. Bạn có thể thử lại để kiểm tra kết quả của yêu cầu này.'
      )
    // fetch itself threw: no network / server unreachable, there is no response to read.
    throw new Error('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.')
  }

  const data = await response.json().catch(() => null)
  if (attachesToken && response.status === 401 && tokenAtStart !== getAccessToken()) {
    // A sibling HTTP/socket refresh may already have rotated this same actor's JWT.
    // Never replay across a logout, account change, or active-role switch.
    const identity = tokenIdentity(tokenAtStart)
    if (retryOnUnauthorized && identity && identity === tokenIdentity(getAccessToken())) {
      return request<T>(path, {
        method,
        body,
        auth,
        retryOnUnauthorized: false,
        optionalAuth,
        headers,
        timeoutMs,
      })
    }
    throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
  }
  if (attachesToken && response.status === 401 && retryOnUnauthorized && path !== REFRESH_PATH) {
    const refreshed = await refreshStoredTokens(optionalAuth)
    if (refreshed) {
      return request<T>(path, {
        method,
        body,
        auth,
        retryOnUnauthorized: false,
        optionalAuth,
        headers,
        timeoutMs,
      })
    }
    if (!optionalAuth) handleSessionExpired()
  }

  if (!response.ok || data?.success === false) {
    if (auth && response.status === 401) {
      handleSessionExpired()
    }
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data?.errors,
      data?.code
    )
  }
  return data
}

/** Fetch authenticated binary content with the same token rotation rules as request(). */
export async function requestBlob(
  path: string,
  { auth = false, retryOnUnauthorized = true, optionalAuth = false }: RequestOptions = {}
): Promise<Blob> {
  const attachesToken = auth || optionalAuth
  const tokenAtStart = getAccessToken()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: createHeaders(attachesToken, false),
    })
  } catch {
    throw new Error('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.')
  }

  if (attachesToken && response.status === 401 && tokenAtStart !== getAccessToken()) {
    const identity = tokenIdentity(tokenAtStart)
    if (retryOnUnauthorized && identity && identity === tokenIdentity(getAccessToken())) {
      return requestBlob(path, { auth, retryOnUnauthorized: false, optionalAuth })
    }
    throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
  }
  if (attachesToken && response.status === 401 && retryOnUnauthorized && path !== REFRESH_PATH) {
    const refreshed = await refreshStoredTokens(optionalAuth)
    if (refreshed) return requestBlob(path, { auth, retryOnUnauthorized: false, optionalAuth })
    if (!optionalAuth) handleSessionExpired()
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    if (auth && response.status === 401) handleSessionExpired()
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data?.errors
    )
  }
  return response.blob()
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens({
  accessToken,
  refreshToken,
}: {
  accessToken?: string
  refreshToken?: string
}) {
  authEpoch++
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  window.dispatchEvent(new Event(AUTH_TOKENS_EVENT))
}

export function clearTokens() {
  authEpoch++
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.dispatchEvent(new Event(AUTH_TOKENS_EVENT))
}

function getSessionLoginPath() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/'
  if (isConsolePath(pathname)) return CONSOLE_LOGIN_PATH
  if (safePurchaseReturnTo(pathname + window.location.search)) return purchaseLoginPath()
  return '/login'
}

function handleSessionExpired() {
  clearTokens()
  const loginPath = getSessionLoginPath()
  if (window.location.pathname !== loginPath) {
    sessionStorage.setItem(
      'hocluc.pendingToast',
      'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
    )
    window.location.href = loginPath
  }
}

async function refreshStoredTokens(optionalAuth = false) {
  try {
    return Boolean(await ensureFreshAccessToken(true, !optionalAuth))
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
    throw error
  }
}

export interface TokenData {
  accessToken: string
  refreshToken: string
}

export async function refreshToken(storedRefreshToken = getRefreshToken()) {
  if (!storedRefreshToken) {
    throw new ApiError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 401)
  }

  const epoch = authEpoch
  const accessAtStart = getAccessToken()

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${REFRESH_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    })
  } catch {
    throw new Error('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.')
  }

  const data = await response.json().catch(() => null)
  const { accessToken, refreshToken: nextRefreshToken } = data?.data || {}

  // Also guard failed responses: an old role's rejected refresh cannot log out a new session.
  if (
    epoch !== authEpoch ||
    getRefreshToken() !== storedRefreshToken ||
    getAccessToken() !== accessAtStart
  ) {
    throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
  }
  if (!response.ok || data?.success !== true || !accessToken || !nextRefreshToken) {
    throw new ApiError(
      data?.message || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
      response.status,
      data?.errors
    )
  }

  setTokens({ accessToken, refreshToken: nextRefreshToken })
  return data
}

export function accessTokenExpiresAt(token = getAccessToken()): number | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/** Shared by HTTP retry and STOMP; network failures leave the session intact. */
export async function ensureFreshAccessToken(
  force = false,
  expireSession = true
): Promise<string | null> {
  const token = getAccessToken()
  if (!token) return null
  const expiresAt = accessTokenExpiresAt(token)
  if (!force && (expiresAt === null || expiresAt > Date.now() + 60_000)) return token
  if (!getRefreshToken()) {
    if (expireSession) handleSessionExpired()
    return null
  }
  if (!refreshPromise) {
    const refreshAtStart = getRefreshToken()
    const run = async () => {
      // Another tab may have rotated the refresh token while this tab waited for its lock.
      if (getRefreshToken() !== refreshAtStart)
        throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
      await refreshToken(refreshAtStart)
    }
    const refresh =
      typeof navigator !== 'undefined' && navigator.locks
        ? navigator.locks.request('hocluc-token-refresh', run)
        : run()
    refreshPromise = refresh.finally(() => {
      refreshPromise = null
    })
  }
  try {
    await refreshPromise
    return getAccessToken()
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) throw error
    if (
      expireSession &&
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    )
      handleSessionExpired()
    throw error
  }
}

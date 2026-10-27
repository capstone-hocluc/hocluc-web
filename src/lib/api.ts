import { CONSOLE_LOGIN_PATH, isConsolePath } from './console-routes'
import { purchaseLoginPath, safePurchaseReturnTo } from './purchaseSession'
import { loginPathFor } from './auth-return-to'
import { clearPendingAuthEmails } from './auth-email'
export const API_BASE_URL =
  import.meta.env.DEV && import.meta.env.VITE_DEV_API_PROXY === 'true'
    ? window.location.origin
    : import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      'https://developments.hocluc.com'
const BASE_URL = API_BASE_URL

const ACCESS_TOKEN_KEY = 'hocluc.accessToken'
const REFRESH_TOKEN_KEY = 'hocluc.refreshToken'
const SESSION_GENERATION_KEY = 'hocluc.sessionGeneration'
const SESSION_REVISION_KEY = 'hocluc.sessionRevision'
const COOKIE_SESSION_BLOCKED_KEY = 'hocluc.cookieSessionBlocked'
const REFRESH_PATH = '/api/v1/auth/refresh'
let refreshPromise: Promise<string | null> | null = null
let restorePromise: Promise<string | null> | null = null
let authQueue: Promise<unknown> = Promise.resolve()
let authEpoch = 0
export const AUTH_TOKENS_EVENT = 'hocluc:tokens-changed'

// Cookie rotation and other Set-Cookie responses must be serialized, not merely
// discarded after fetch: the browser applies Set-Cookie before JS sees a response.
export async function withAuthSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return await navigator.locks.request('hocluc-token-refresh', operation)
  }
  const queued = authQueue.then(operation, operation)
  authQueue = queued.catch(() => undefined)
  return queued
}

export function authSessionStamp() {
  return JSON.stringify([authEpoch, localStorage.getItem(SESSION_GENERATION_KEY), getAccessToken()])
}

export function authSessionGeneration() {
  return localStorage.getItem(SESSION_GENERATION_KEY)
}

export function assertAuthSessionStamp(stamp: string) {
  if (stamp !== authSessionStamp()) throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
}

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
  /** The response's `data` on a failure, when the backend sends one (a validation report, say). */
  data?: unknown
  /** Backwards-compatible alias used by older callers. */
  details?: unknown

  constructor(message: string, status: number, errors?: Record<string, string>, code?: string, details?: unknown) {
    super(message)
    this.status = status
    this.errors = errors
    this.code = code
    this.details = details
    this.data = details
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
  /** Discard late console responses after logout/account/active-role changes. */
  guardIdentity?: boolean
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

/** UI guard only. The API still authenticates the token and enforces its own scopes. */
export function accessTokenRole(): string | null {
  try {
    const token = getAccessToken()
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    // AuthServiceImpl.issueTokens writes Spring authorities (e.g. ROLE_STAFF),
    // while profile responses and the FE permission table use enum names (STAFF).
    return typeof payload.role === 'string' ? payload.role.replace(/^ROLE_/, '') : null
  } catch { return null }
}

export function accessTokenIdentity(): string | null {
  return tokenIdentity(getAccessToken())
}

export async function request<T = unknown>(
  path: string,
  {
    method = 'GET',
    body,
    auth = false,
    retryOnUnauthorized = true,
    optionalAuth = false,
    guardIdentity = false,
    headers = {},
    timeoutMs,
  }: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const attachesToken = auth || optionalAuth
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const tokenAtStart = getAccessToken()
  const generationAtStart = localStorage.getItem(SESSION_GENERATION_KEY)
  const assertSameIdentity = () => {
    if (attachesToken && generationAtStart !== localStorage.getItem(SESSION_GENERATION_KEY)) {
      throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
    }
    if (!guardIdentity || !attachesToken || tokenAtStart === getAccessToken()) return
    const identity = tokenIdentity(tokenAtStart)
    if (!identity || identity !== tokenIdentity(getAccessToken())) {
      throw new ApiError('Phiên đăng nhập đã thay đổi. Hãy mở lại màn hình.', 409)
    }
  }
  let response: Response
  const signal = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: path.startsWith('/api/v1/auth/') ? 'include' : 'same-origin',
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
  assertSameIdentity()
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
        guardIdentity,
        headers,
        timeoutMs,
      })
    }
    throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
  }
  if (attachesToken && response.status === 401 && retryOnUnauthorized && path !== REFRESH_PATH) {
    const refreshed = await refreshStoredTokens(optionalAuth)
    if (refreshed) {
      assertSameIdentity()
      return request<T>(path, {
        method,
        body,
        auth,
        retryOnUnauthorized: false,
        optionalAuth,
        guardIdentity,
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
      data?.code,
      data?.data
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
  const generationAtStart = localStorage.getItem(SESSION_GENERATION_KEY)
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: createHeaders(attachesToken, false),
    })
  } catch {
    throw new Error('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.')
  }

  if (generationAtStart !== localStorage.getItem(SESSION_GENERATION_KEY) && attachesToken) {
    throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
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
    if (refreshed) {
      if (generationAtStart !== localStorage.getItem(SESSION_GENERATION_KEY)) throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
      return requestBlob(path, { auth, retryOnUnauthorized: false, optionalAuth })
    }
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

export function setTokens({
  accessToken,
}: {
  accessToken?: string
}, replaceSession = false) {
  authEpoch++
  if (accessToken) {
    const previousIdentity = tokenIdentity(getAccessToken())
    if (replaceSession || (previousIdentity && tokenIdentity(accessToken) !== previousIdentity)) {
      localStorage.setItem(SESSION_GENERATION_KEY, crypto.randomUUID())
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(SESSION_REVISION_KEY, crypto.randomUUID())
    localStorage.removeItem(COOKIE_SESSION_BLOCKED_KEY)
  }
  // Migration only: refresh credentials are never read or retained by JS.
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.dispatchEvent(new Event(AUTH_TOKENS_EVENT))
}

export function clearTokens() {
  authEpoch++
  clearPendingAuthEmails()
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.setItem(COOKIE_SESSION_BLOCKED_KEY, '1')
  localStorage.setItem(SESSION_GENERATION_KEY, crypto.randomUUID())
  localStorage.setItem(SESSION_REVISION_KEY, crypto.randomUUID())
  window.dispatchEvent(new Event(AUTH_TOKENS_EVENT))
}

function getSessionLoginPath() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/'
  if (isConsolePath(pathname)) return CONSOLE_LOGIN_PATH
  if (safePurchaseReturnTo(pathname + window.location.search)) return purchaseLoginPath()
  return loginPathFor(pathname)
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

/**
 * For a long-lived connection (a server-sent event stream) that got 401: refreshes the session the way a request
 * does. True when there is a fresh token to connect again with; false sends the user to log in again.
 */
export async function refreshAfterUnauthorized(): Promise<boolean> {
  const refreshed = await refreshStoredTokens()
  if (!refreshed) handleSessionExpired()
  return refreshed
}

export interface TokenData {
  accessToken: string
}

async function rotateCookieAccessToken(): Promise<string> {
  const stamp = authSessionStamp()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${REFRESH_PATH}`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    throw new Error('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.')
  }

  const data = await response.json().catch(() => null)
  const { accessToken } = data?.data || {}

  // Also guard failed responses: an old role's rejected refresh cannot log out a new session.
  assertAuthSessionStamp(stamp)
  if (!response.ok || data?.success !== true) {
    throw new ApiError(
      data?.message || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
      response.status,
      data?.errors
    )
  }
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new ApiError('Máy chủ chưa trả về access token hợp lệ.', 502)
  }
  setTokens({ accessToken })
  return accessToken
}

/** Protected entry points share a silent cookie restore; guests are not redirected here. */
export function restoreCookieSession(): Promise<string | null> {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  if (!restorePromise) {
    restorePromise = ensureFreshAccessToken(false, false).catch(error => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearTokens()
        return null
      }
      if (error instanceof ApiError && error.status === 409) return getAccessToken()
      throw error
    }).finally(() => { restorePromise = null })
  }
  return restorePromise
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
  if (!token && localStorage.getItem(COOKIE_SESSION_BLOCKED_KEY)) return null
  const expiresAt = accessTokenExpiresAt(token)
  if (token && !force && (expiresAt === null || expiresAt > Date.now() + 60_000)) return token
  if (!refreshPromise) {
    const generation = localStorage.getItem(SESSION_GENERATION_KEY)
    const revision = localStorage.getItem(SESSION_REVISION_KEY)
    const run = async () => {
      if (generation !== localStorage.getItem(SESSION_GENERATION_KEY))
        throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
      // A sibling tab may have rotated the cookie while we waited for the lock.
      if (revision !== localStorage.getItem(SESSION_REVISION_KEY) && getAccessToken()) return getAccessToken()
      if (!getAccessToken() && localStorage.getItem(COOKIE_SESSION_BLOCKED_KEY)) return null
      return rotateCookieAccessToken()
    }
    const refresh = withAuthSessionLock(run)
    refreshPromise = refresh.finally(() => {
      refreshPromise = null
    })
  }
  try {
    return await refreshPromise
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

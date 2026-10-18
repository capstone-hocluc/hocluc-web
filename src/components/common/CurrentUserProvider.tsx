import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CurrentUserContext, type CurrentUserStatus } from '../../hooks/useCurrentUser'
import { getCurrentProfile, type UserProfile } from '../../services/userService'
import { ApiError, AUTH_TOKENS_EVENT, getAccessToken } from '../../lib/api'

function sessionIdentity() {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return JSON.stringify([payload.sub, payload.role ?? payload.roles])
  } catch {
    return token
  }
}

function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [status, setStatus] = useState<CurrentUserStatus>('idle')

  // Single-flight: concurrent callers (e.g. React StrictMode's double effect
  // or two components hydrating at once) share one GET /users/profiles.
  const inFlight = useRef<Promise<UserProfile> | null>(null)
  const epoch = useRef(0)
  const identity = useRef(sessionIdentity())

  const loadCurrentUser = useCallback(() => {
    if (inFlight.current) return inFlight.current
    const requestEpoch = epoch.current
    setStatus('loading')
    const request = (async () => {
      try {
        const response = await getCurrentProfile()
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Không thể tải thông tin người dùng.')
        }
        if (requestEpoch !== epoch.current) throw new ApiError('Phiên đăng nhập đã thay đổi.', 409)
        if (requestEpoch === epoch.current) {
          setProfile(response.data)
          setStatus('ready')
        }
        return response.data
      } catch (error) {
        if (requestEpoch === epoch.current) setStatus('error')
        throw error
      } finally {
        if (requestEpoch === epoch.current) inFlight.current = null
      }
    })()
    inFlight.current = request
    return request
  }, [])

  const clearCurrentUser = useCallback(() => {
    epoch.current++
    inFlight.current = null
    setProfile(null)
    setStatus('idle')
  }, [])

  useEffect(() => {
    const sync = () => {
      const next = sessionIdentity()
      if (next !== identity.current) {
        identity.current = next
        clearCurrentUser()
      }
    }
    window.addEventListener(AUTH_TOKENS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_TOKENS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [clearCurrentUser])

  const value = useMemo(
    () => ({ profile, status, loadCurrentUser, clearCurrentUser }),
    [profile, status, loadCurrentUser, clearCurrentUser]
  )

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}

export default CurrentUserProvider

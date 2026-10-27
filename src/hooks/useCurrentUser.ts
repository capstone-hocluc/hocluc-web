import { createContext, useContext, useEffect } from 'react'
import { getAccessToken } from '../lib/api'
import type { StudentProfile, UserProfile } from '../services/userService'

export type CurrentUserStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CurrentUserContextValue {
  profile: UserProfile | null
  status: CurrentUserStatus
  // Fetches the current authenticated user's profile and stores it here so
  // Header/Sidebar/Dashboard/Profile all read one shared value instead of
  // each issuing its own GET /users/profiles.
  loadCurrentUser: () => Promise<UserProfile>
  clearCurrentUser: () => void
  applyStudentProfile: (userId: string, studentProfile: StudentProfile) => void
}

export const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function useCurrentUser() {
  const context = useContext(CurrentUserContext)
  if (!context) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider')
  }
  return context
}

// Single place that restores the signed-in user after a full page reload
// (F5 on /student/...): if a session token exists and nothing has loaded the
// profile yet, fetch it once. Pages read the result from useCurrentUser()
// and never fetch the profile themselves. Failures are silent here - an
// expired session is already handled centrally by lib/api.ts (401 -> /login).
export function useHydrateCurrentUser() {
  const { status, loadCurrentUser } = useCurrentUser()

  useEffect(() => {
    if (status === 'idle' && getAccessToken()) {
      loadCurrentUser().catch(() => {})
    }
    // Run once on mount: later status changes (login/logout) manage themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

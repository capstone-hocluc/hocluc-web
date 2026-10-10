import { useCallback, useMemo, useRef, useState } from 'react'
import { useCurrentUser } from './useCurrentUser'
import { grantedRoles, roleHome } from '../lib/role-home'
import { switchRole as switchRoleRequest } from '../services/authService'
import { runWithUnsavedActionGuard } from './useUnsavedActionGuard'
import type { UserRole } from '../services/userService'

// Role is account-wide. The server replaces tokens and ends other sessions.
export function useActiveRole() {
  const { profile } = useCurrentUser()
  const [switching, setSwitching] = useState(false)
  const inFlight = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const roles = useMemo(() => profile ? grantedRoles(profile) : [], [profile])
  const activeRole = profile?.role ?? null

  const switchRole = useCallback((role: UserRole) => {
    if (inFlight.current || !roles.includes(role) || role === activeRole || activeRole === 'STUDENT') return
    runWithUnsavedActionGuard(() => {
      if (inFlight.current) return
      inFlight.current = true
      setSwitching(true)
      setError(null)
      void switchRoleRequest(role).then(() => {
        window.location.assign(roleHome(role))
      }).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Không đổi được vai trò.')
        inFlight.current = false
        setSwitching(false)
      })
    })
  }, [roles, activeRole])

  return { roles, activeRole, switchRole, switching, error }
}

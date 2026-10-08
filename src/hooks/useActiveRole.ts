import { useCallback, useMemo, useState } from 'react'
import { useCurrentUser } from './useCurrentUser'
import { roleHome } from '../lib/role-home'
import { switchRole as switchRoleRequest } from '../services/authService'
import type { UserRole } from '../services/userService'

// The backend owns the active role: profile.role is the role in use and
// profile.roles lists the roles the account may switch between (only
// administrator / staff / mentor accounts ever have more than one).

// App registers its router here so the switcher can leave the current area
// without every dashboard needing a navigate prop.
let navigateToPath: ((path: string) => void) | null = null
export function registerRoleNavigator(navigate: ((path: string) => void) | null) {
  navigateToPath = navigate
}

export function useActiveRole() {
  const { profile, loadCurrentUser } = useCurrentUser()
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roles = useMemo<UserRole[]>(
    () => (profile ? Array.from(new Set([profile.role, ...(profile.roles ?? [])])) : []),
    [profile]
  )
  const activeRole: UserRole | null = profile?.role ?? null

  const switchRole = useCallback(
    async (role: UserRole) => {
      if (switching || !roles.includes(role) || role === activeRole) return
      setSwitching(true)
      setError(null)
      try {
        await switchRoleRequest(role)
        await loadCurrentUser()
        navigateToPath?.(roleHome(role))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không đổi được vai trò.')
      } finally {
        setSwitching(false)
      }
    },
    [switching, roles, activeRole, loadCurrentUser]
  )

  return { roles, activeRole, switchRole, switching, error }
}

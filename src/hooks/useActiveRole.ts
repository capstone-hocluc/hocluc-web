import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useCurrentUser } from './useCurrentUser'
import { roleHome } from '../lib/role-home'
import { USER_ROLES, type UserRole } from '../services/userService'

// Role switching is UI-only until the backend exposes a user's role list and
// an "active role" endpoint. Until then:
//  - available roles = profile.roles (when the API starts sending it) or just
//    profile.role;
//  - the chosen role is remembered client-side; route guards read it, the
//    backend still enforces real permissions on every call.
// Dev preview: in `npm run dev`, set localStorage `hocluc.devRoles` to a JSON
// array (e.g. ["TEACHER","MANAGER"]) to see the switcher with several roles.
const ACTIVE_ROLE_KEY = 'hocluc.activeRole'
const DEV_ROLES_KEY = 'hocluc.devRoles'

const isRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function readDevRoles(): UserRole[] {
  if (!import.meta.env.DEV) return []
  try {
    const parsed: unknown = JSON.parse(readStorage(DEV_ROLES_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isRole) : []
  } catch {
    return []
  }
}

// Tiny external store so every guard/switcher sees the same chosen role.
const listeners = new Set<() => void>()
let storedRole: string | null = readStorage(ACTIVE_ROLE_KEY)

function setStoredRole(role: UserRole | null) {
  storedRole = role
  try {
    if (role) window.localStorage.setItem(ACTIVE_ROLE_KEY, role)
    else window.localStorage.removeItem(ACTIVE_ROLE_KEY)
  } catch {
    // Storage blocked: the choice just lasts until reload.
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const getSnapshot = () => storedRole

// App registers its router here so the switcher can leave the current area
// without every dashboard needing a navigate prop.
let navigateToPath: ((path: string) => void) | null = null
export function registerRoleNavigator(navigate: ((path: string) => void) | null) {
  navigateToPath = navigate
}

export function useActiveRole() {
  const { profile } = useCurrentUser()
  const stored = useSyncExternalStore(subscribe, getSnapshot)

  const roles = useMemo<UserRole[]>(
    () =>
      profile
        ? Array.from(new Set([profile.role, ...(profile.roles ?? []), ...readDevRoles()]))
        : [],
    [profile]
  )
  const activeRole: UserRole | null = profile
    ? isRole(stored) && roles.includes(stored)
      ? stored
      : profile.role
    : null

  // Forget the choice on sign-out so the next account starts on its own role.
  useEffect(() => {
    if (!profile && storedRole) setStoredRole(null)
  }, [profile])

  const switchRole = useCallback(
    (role: UserRole) => {
      if (!roles.includes(role) || role === activeRole) return
      setStoredRole(role)
      navigateToPath?.(roleHome(role))
    },
    [roles, activeRole]
  )

  return { roles, activeRole, switchRole }
}

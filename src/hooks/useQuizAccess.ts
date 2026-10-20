import { useSyncExternalStore } from 'react'
import { accessTokenIdentity, accessTokenRole, AUTH_TOKENS_EVENT } from '../lib/api'
import { can } from '../lib/permissions'
import { useCurrentUser } from './useCurrentUser'

function subscribe(onChange: () => void) {
  window.addEventListener(AUTH_TOKENS_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(AUTH_TOKENS_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Use the active role, never the account's other granted roles or subject scopes. */
export function useQuizAccess() {
  const { profile, status } = useCurrentUser()
  const identity = useSyncExternalStore(subscribe, accessTokenIdentity, () => null)
  const tokenUserId = identity ? JSON.parse(identity)[0] : null
  const current = status === 'ready' && profile && profile.id === tokenUserId && profile.role === accessTokenRole()
  return {
    identity,
    role: current ? profile.role : null,
    canRead: Boolean(current && can(profile.role, 'QUIZ_READ')),
    canWrite: Boolean(current && can(profile.role, 'QUIZ_WRITE')),
  }
}

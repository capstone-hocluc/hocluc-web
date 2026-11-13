import { AUTH_TOKENS_EVENT, accessTokenIdentity } from './api'

/*
 * Lists a page shows again right after a reload (F5), from this tab's sessionStorage, while they are asked for again.
 * Kept per signed-in user and role: signing out, or signing in as someone else in this tab, drops them all. Only for
 * data that may show a moment stale and is always replaced by the server's answer, never for anything being edited.
 */

/** Raised when a cached list changes shape, so a tab reloaded onto new code does not read the old one. */
const PREFIX = 'hocluc.cache.v1.'

function storageKey(name: string): string | null {
  const identity = accessTokenIdentity()
  return identity ? `${PREFIX}${identity}:${name}` : null
}

export function readSessionCache<T>(name: string): T | null {
  const key = storageKey(name)
  if (!key) return null
  try {
    const raw = sessionStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

export function writeSessionCache(name: string, value: unknown) {
  const key = storageKey(name)
  if (!key) return
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Full or blocked: the next reload simply waits for the server.
  }
}

/** What another user or role (or no one, after signing out) left in this tab goes. */
function dropOtherSessions() {
  const identity = accessTokenIdentity()
  const own = identity ? `${PREFIX}${identity}:` : null
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index)
      if (key?.startsWith('hocluc.cache.') && (!own || !key.startsWith(own))) sessionStorage.removeItem(key)
    }
  } catch {
    // Storage blocked: nothing was kept either.
  }
}

if (typeof window !== 'undefined') window.addEventListener(AUTH_TOKENS_EVENT, dropOtherSessions)

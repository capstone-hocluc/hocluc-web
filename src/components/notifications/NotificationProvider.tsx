import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { accessTokenIdentity, ApiError, AUTH_TOKENS_EVENT } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { NotificationContext, type NotificationFeed } from '../../hooks/useNotifications'
import {
  getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead,
  type NotificationPage, type UserNotification,
} from '../../services/notificationService'

function subscribe(onChange: () => void) {
  window.addEventListener(AUTH_TOKENS_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(AUTH_TOKENS_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

function errorMessage(error: unknown) {
  return error instanceof ApiError && error.status === 403
    ? 'Bạn không có quyền thực hiện thao tác thông báo này.'
    : getErrorMessage(error)
}

function NotificationSession({ identity, children }: { identity: string | null; children: ReactNode }) {
  const [page, setPage] = useState<NotificationPage | null>(null)
  const [status, setStatus] = useState<NotificationFeed['status']>('idle')
  const [error, setError] = useState('')
  const [unread, setUnread] = useState<number | null>(null)
  const [countError, setCountError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState('')
  const mounted = useRef(false)
  const countSequence = useRef(0)
  const pageSequence = useRef(0)
  const writing = useRef(false)
  const current = useCallback(() => mounted.current && identity !== null && accessTokenIdentity() === identity, [identity])

  const refreshCount = useCallback(async () => {
    if (!current()) return
    const sequence = ++countSequence.current
    try {
      const count = await getUnreadNotificationCount()
      if (current() && sequence === countSequence.current) {
        setUnread(count)
        setCountError(false)
      }
    } catch {
      if (current() && sequence === countSequence.current) {
        setUnread(null)
        setCountError(true)
      }
    }
  }, [current])

  const loadPage = useCallback(async (number = 0) => {
    if (!current() || writing.current) return
    const sequence = ++pageSequence.current
    setStatus('loading')
    setError('')
    setMutationError('')
    try {
      const result = await getNotifications(number)
      if (current() && sequence === pageSequence.current) {
        setPage(result)
        setStatus('ready')
      }
    } catch (cause) {
      if (current() && sequence === pageSequence.current) {
        setStatus('error')
        setError(errorMessage(cause))
      }
    }
  }, [current])

  const invalidateRequests = useCallback(() => {
    mounted.current = false
    countSequence.current++
    pageSequence.current++
  }, [])

  useEffect(() => {
    mounted.current = true
    void Promise.resolve().then(refreshCount)
    const onFocus = () => { void refreshCount() }
    window.addEventListener('focus', onFocus)
    return () => {
      invalidateRequests()
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshCount, invalidateRequests])

  const mutate = async (id: string, operation: () => Promise<UserNotification | void>) => {
    if (!current() || writing.current || status === 'loading') return
    writing.current = true
    setBusy(id)
    setMutationError('')
    pageSequence.current++
    countSequence.current++
    try {
      const saved = await operation()
      if (!current()) return
      setPage(previous => previous ? { ...previous, content: previous.content.map(item =>
        saved ? item.id === saved.id ? saved : item : { ...item, read: true }) } : previous)
      await refreshCount()
    } catch (cause) {
      if (current()) setMutationError(errorMessage(cause))
    } finally {
      writing.current = false
      if (current()) setBusy(null)
    }
  }

  return <NotificationContext.Provider value={{ page, status, error, unread, countError, busy, mutationError,
    loadPage, refreshCount,
    markRead: async notification => {
      if (!current()) return
      setMutationError('')
      if (!notification.read) await mutate(notification.id, () => markNotificationRead(notification.id))
    },
    markAllRead: () => mutate('all', markAllNotificationsRead),
  }}>{children}</NotificationContext.Provider>
}

/** Desktop/mobile share one feed. A new session never inherits the previous account's data. */
export default function NotificationProvider({ children }: { children: ReactNode }) {
  const identity = useSyncExternalStore(subscribe, accessTokenIdentity, () => null)
  return <NotificationSession key={identity ?? 'guest'} identity={identity}>{children}</NotificationSession>
}

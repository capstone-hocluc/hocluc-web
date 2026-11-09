import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { accessTokenIdentity, accessTokenRole, ApiError, AUTH_TOKENS_EVENT } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { notificationTarget } from '../../lib/notificationTarget'
import { showInfoToast } from '../../lib/toastBus'
import { NotificationContext, type NotificationFeed } from '../../hooks/useNotifications'
import { useActiveRole } from '../../hooks/useActiveRole'
import {
  getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead,
  type NotificationPage, type UserNotification,
} from '../../services/notificationService'
import { openNotificationStream } from '../../services/notificationStream'
import type { UserRole } from '../../services/userService'
import NotificationDetail from './NotificationDetail'

/** How often the unread count is asked for while the live stream cannot be followed. */
const POLL_MS = 60_000

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

interface Opened {
  item: UserNotification
  switchTo: UserRole | null
  returnFocus: HTMLElement | null
}

function NotificationSession({ identity, children }: { identity: string | null; children: ReactNode }) {
  const { roles } = useActiveRole()
  const [page, setPage] = useState<NotificationPage | null>(null)
  const [status, setStatus] = useState<NotificationFeed['status']>('idle')
  const [error, setError] = useState('')
  const [unread, setUnread] = useState<number | null>(null)
  const [countError, setCountError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState('')
  const [opened, setOpened] = useState<Opened | null>(null)
  const [polling, setPolling] = useState(false)
  const mounted = useRef(false)
  const countSequence = useRef(0)
  const pageSequence = useRef(0)
  const writing = useRef(false)
  const listOpen = useRef(false)
  const shownPage = useRef<NotificationPage | null>(null)
  const received = useRef(new Set<string>())
  const receive = useRef<(notification: UserNotification) => void>(() => undefined)
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

  useEffect(() => { shownPage.current = page }, [page])

  useEffect(() => {
    if (identity === null) return
    return openNotificationStream({
      onReady: () => {
        if (!current()) return
        setPolling(false)
        void refreshCount()
        if (shownPage.current) void loadPage(shownPage.current.pageNumber)
      },
      onNotification: notification => {
        if (current()) receive.current(notification)
      },
      onGiveUp: () => {
        if (!current()) return
        setPolling(true)
        void refreshCount()
      },
    })
  }, [identity, current, refreshCount, loadPage])

  useEffect(() => {
    if (!polling) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshCount()
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [polling, refreshCount])

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
      const settle = (item: UserNotification) => saved ? item.id === saved.id ? saved : item : { ...item, read: true }
      setPage(previous => previous ? { ...previous, content: previous.content.map(settle) } : previous)
      setOpened(previous => previous && { ...previous, item: settle(previous.item) })
      await refreshCount()
    } catch (cause) {
      if (current()) setMutationError(errorMessage(cause))
    } finally {
      writing.current = false
      if (current()) setBusy(null)
    }
  }

  const markRead = async (notification: UserNotification) => {
    if (!current()) return
    setMutationError('')
    if (!notification.read) await mutate(notification.id, () => markNotificationRead(notification.id))
  }

  const open = (item: UserNotification, returnFocus: HTMLElement | null = null) => {
    if (!current()) return
    const target = notificationTarget(item, accessTokenRole() as UserRole | null, roles)
    void markRead(item)
    if (target && 'href' in target) {
      setOpened(null)
      window.dispatchEvent(new CustomEvent('hl-navigate', { detail: { path: target.href } }))
    } else {
      setOpened({ item, switchTo: target && 'switchTo' in target ? target.switchTo : null, returnFocus })
    }
  }

  const closeDetail = () => {
    const returnFocus = opened?.returnFocus ?? null
    setOpened(null)
    requestAnimationFrame(() => returnFocus?.focus())
  }

  // Kept current for the stream and for toasts, which outlive the render that made them.
  const openLatest = useRef(open)
  useEffect(() => {
    openLatest.current = open
    receive.current = notification => {
      if (received.current.has(notification.id)) return
      received.current.add(notification.id)
      setPage(previous => {
        if (!previous || previous.pageNumber !== 0 || previous.content.some(item => item.id === notification.id)) return previous
        const totalElements = previous.totalElements + 1
        return { ...previous, content: [notification, ...previous.content].slice(0, previous.pageSize), totalElements,
          totalPages: Math.ceil(totalElements / previous.pageSize), last: previous.pageSize >= totalElements }
      })
      if (!notification.read) setUnread(count => count === null ? count : count + 1)
      void refreshCount()
      if (!listOpen.current) showInfoToast(notification.title, {
        label: `Mở thông báo: ${notification.title}`,
        onClick: () => openLatest.current(notification),
      })
    }
  })

  const detail = opened ? page?.content.find(item => item.id === opened.item.id) ?? opened.item : null

  return <NotificationContext.Provider value={{ page, status, error, unread, countError, busy, mutationError,
    loadPage, refreshCount, markRead,
    markAllRead: () => mutate('all', markAllNotificationsRead),
    open,
    setListOpen: next => { listOpen.current = next },
  }}>
    {children}
    <NotificationDetail notification={detail} switchTo={opened?.switchTo ?? null} onClose={closeDetail} />
  </NotificationContext.Provider>
}

/** Desktop/mobile share one feed. A new session never inherits the previous account's data. */
export default function NotificationProvider({ children }: { children: ReactNode }) {
  const identity = useSyncExternalStore(subscribe, accessTokenIdentity, () => null)
  return <NotificationSession key={identity ?? 'guest'} identity={identity}>{children}</NotificationSession>
}

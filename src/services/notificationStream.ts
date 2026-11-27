import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { API_BASE_URL, getAccessToken, refreshAfterUnauthorized } from '../lib/api'
import type { UserNotification } from './notificationService'

export interface NotificationStreamHandlers {
  /** Connected again: what was sent meanwhile may have been missed, so what is shown should be reloaded. */
  onReady: () => void
  onNotification: (notification: UserNotification) => void
  /** Not followed for now: ask for the count now and then instead, until the next `onReady`. */
  onGiveUp: () => void
}

const FAILURES_BEFORE_GIVING_UP = 5
const FIRST_RETRY_MS = 2_000
const LONGEST_RETRY_MS = 30_000
const RETRY_AFTER_GIVING_UP_MS = 60_000
const RECONNECT_AFTER_END_MS = 1_000
/** A little under the server's shortest stream (10s): one that ends sooner is a failure, not its token running out. */
const HEALTHY_MS = 8_000

/** Never connect again from this screen: signed out, or this server does not offer the stream. */
class Refused extends Error {}
/** Another screen of the user took this one's place; connect again only when this screen is shown again. */
class Replaced extends Error {}
class Refreshed extends Error {}
class Ended extends Error {}

/**
 * Follows the signed-in user's notifications while the page is shown: a hidden page closes its stream and opens
 * a new one when shown again. Returns a function that closes it for good.
 */
export function openNotificationStream(handlers: NotificationStreamHandlers): () => void {
  let session: AbortController | null = null
  let closed = false
  let failures = 0
  let gaveUp = false
  let connectedAt = 0

  const giveUp = () => {
    if (gaveUp) return
    gaveUp = true
    handlers.onGiveUp()
  }

  const start = () => {
    if (closed || session || document.hidden) return
    const controller = new AbortController()
    session = controller
    connectedAt = 0
    fetchEventSource(`${API_BASE_URL}/api/v1/notifications/stream`, {
      signal: controller.signal,
      // visibility is handled here, so a retry waiting meanwhile cannot open a second connection
      openWhenHidden: true,
      // the token is read at each connection, so one refreshed meanwhile is used
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          credentials: 'same-origin',
          headers: { ...(init?.headers as Record<string, string>), Authorization: `Bearer ${getAccessToken() ?? ''}` },
        }),
      async onopen(response) {
        if (response.ok && response.headers.get('content-type')?.startsWith(EventStreamContentType)) {
          connectedAt = Date.now()
          return
        }
        if (response.status === 401) {
          if (await refreshAfterUnauthorized()) throw new Refreshed()
          throw new Refused('signed out')
        }
        if (response.status === 429 || response.status >= 500) throw new Error(`stream answered ${response.status}`)
        throw new Refused(`stream answered ${response.status}`)
      },
      onmessage(message) {
        if (message.event === 'ready') {
          gaveUp = false
          handlers.onReady()
        } else if (message.event === 'notification' && message.data) {
          handlers.onNotification(JSON.parse(message.data) as UserNotification)
        } else if (message.event === 'replaced') {
          throw new Replaced()
        }
      },
      onclose() {
        throw new Ended()
      },
      onerror(error) {
        if (error instanceof Refused || error instanceof Replaced) throw error
        const healthy = connectedAt > 0 && Date.now() - connectedAt >= HEALTHY_MS
        connectedAt = 0
        if (healthy) failures = 0
        if (error instanceof Ended && healthy) return RECONNECT_AFTER_END_MS
        failures += 1
        if (error instanceof Refreshed && failures === 1) return 0
        if (failures >= FAILURES_BEFORE_GIVING_UP) {
          giveUp()
          return RETRY_AFTER_GIVING_UP_MS
        }
        return Math.min(FIRST_RETRY_MS * 2 ** (failures - 1), LONGEST_RETRY_MS)
      },
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      session = null
      if (error instanceof Refused) closed = true
      if (!(error instanceof Refused && error.message === 'signed out')) giveUp()
    })
  }

  const stop = () => {
    session?.abort()
    session = null
  }

  const onVisibilityChange = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVisibilityChange)
  start()

  return () => {
    closed = true
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stop()
  }
}

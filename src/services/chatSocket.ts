import { Client } from '@stomp/stompjs'
import { API_BASE_URL, AUTH_TOKENS_EVENT, accessTokenExpiresAt, ensureFreshAccessToken, getAccessToken } from '../lib/api'
import type { ChatEvent } from '../types/chat'

export type ChatSocketState = 'connecting' | 'connected' | 'offline'
export interface ChatSocketOptions {
  onState: (state: ChatSocketState) => void
  onEvent: (event: ChatEvent) => void
}

function socketUrl() {
  const url = new URL('/ws/chat', API_BASE_URL)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

/** Missing backend endpoint degrades to offline after five bounded attempts. */
export function createChatSocket({ onState, onEvent }: ChatSocketOptions) {
  let client: Client | null = null
  let active = false
  let generation = 0
  let attempts = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let expiryTimer: ReturnType<typeof setTimeout> | undefined
  let tokenUsed: string | null = null
  let preparingToken = false
  let lastTypingAt = 0
  const eventIds = new Set<string>()
  const validTypes = new Set(['message.created', 'conversation.assigned', 'conversation.resolved', 'message.read', 'typing'])

  function clearTimers() {
    clearTimeout(retryTimer)
    clearTimeout(expiryTimer)
  }

  function retry(stamp: number) {
    if (!active || stamp !== generation) return
    clearTimeout(expiryTimer)
    onState('offline')
    if (attempts >= 5 || !getAccessToken() || retryTimer) return
    retryTimer = setTimeout(() => { retryTimer = undefined; void start() }, Math.min(1000 * 2 ** attempts, 30_000))
  }

  async function start() {
    if (!active) return
    const stamp = ++generation
    attempts++
    clearTimers()
    retryTimer = undefined
    const oldClient = client
    client = null
    if (oldClient) await oldClient.deactivate()
    if (!active || stamp !== generation) return
    onState('connecting')
    let token: string | null
    preparingToken = true
    try { token = await ensureFreshAccessToken() } catch { retry(stamp); return }
    finally { preparingToken = false }
    if (!active || stamp !== generation) return
    if (!token) { onState('offline'); return }
    tokenUsed = token
    const connection = new Client({
      brokerURL: socketUrl(), connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 0, connectionTimeout: 10_000,
      heartbeatIncoming: 20_000, heartbeatOutgoing: 20_000,
      // Tokens and frames must never reach the debug console.
      debug: () => {},
      onConnect: () => {
        if (!active || stamp !== generation) { void connection.deactivate(); return }
        attempts = 0
        onState('connected')
        connection.subscribe('/user/queue/chat-events', frame => {
          if (!active || stamp !== generation) return
          try {
            const raw = JSON.parse(frame.body)
            if (!validTypes.has(raw.type) || typeof raw.conversationId !== 'string') return
            if (raw.eventId && eventIds.has(raw.eventId)) return
            if (typeof raw.eventId === 'string') {
              eventIds.add(raw.eventId)
              if (eventIds.size > 500) eventIds.delete(eventIds.values().next().value!)
            }
            // Explicit projection: never forward body, attachments, or signed URLs.
            const event: ChatEvent = { type: raw.type, conversationId: raw.conversationId }
            if (typeof raw.eventId === 'string') event.eventId = raw.eventId
            if (typeof raw.userId === 'string') event.userId = raw.userId
            if (Number.isSafeInteger(raw.sequence)) event.sequence = raw.sequence
            if (Number.isSafeInteger(raw.assignmentVersion)) event.assignmentVersion = raw.assignmentVersion
            if (Number.isSafeInteger(raw.lastReadSequence)) event.lastReadSequence = raw.lastReadSequence
            if (typeof raw.isTyping === 'boolean') event.isTyping = raw.isTyping
            onEvent(event)
          } catch { /* Malformed events do not break the connection. */ }
        })
        const expiresAt = accessTokenExpiresAt(token)
        if (expiresAt !== null) expiryTimer = setTimeout(() => { void start() }, Math.max(1000, expiresAt - Date.now() - 60_000))
      },
      onWebSocketClose: () => retry(stamp),
      onStompError: () => {
        void connection.deactivate()
        retry(stamp)
      },
    })
    client = connection
    connection.activate()
  }

  function authChanged() {
    const token = getAccessToken()
    if (!active || token === tokenUsed) return
    // Clear old identity's metadata immediately. New role/token opens a new session.
    eventIds.clear()
    attempts = 0
    if (!token) {
      generation++
      clearTimers()
      retryTimer = undefined
      const oldClient = client
      client = null
      void oldClient?.deactivate()
      onState('offline')
    } else if (!preparingToken) { void start() }
  }

  return {
    connect() {
      if (active) return
      active = true
      attempts = 0
      window.addEventListener(AUTH_TOKENS_EVENT, authChanged)
      window.addEventListener('storage', authChanged)
      void start()
    },
    disconnect() {
      active = false
      generation++
      clearTimers()
      retryTimer = undefined
      window.removeEventListener(AUTH_TOKENS_EVENT, authChanged)
      window.removeEventListener('storage', authChanged)
      const oldClient = client
      client = null
      eventIds.clear()
      void oldClient?.deactivate()
    },
    sendTyping(conversationId: string, isTyping = true) {
      if (!client?.connected || Date.now() - lastTypingAt < 1000) return
      lastTypingAt = Date.now()
      client.publish({ destination: '/app/chat/typing', body: JSON.stringify({ conversationId, isTyping }) })
    },
  }
}

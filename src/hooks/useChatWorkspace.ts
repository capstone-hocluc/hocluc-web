import { useCallback, useEffect, useRef, useState } from 'react'
import { AUTH_TOKENS_EVENT, ApiError, getAccessToken } from '../lib/api'
import { chatService } from '../services/chatService'
import { createChatSocket, type ChatSocketState } from '../services/chatSocket'
import type { ChatCapabilities, ChatConversation, ChatConversationFilters, ChatMessage } from '../types/chat'

export function chatIdentity() {
  try {
    const raw = getAccessToken()?.split('.')[1]
    if (!raw) return ''
    const payload = JSON.parse(atob(raw.replace(/-/g, '+').replace(/_/g, '/')))
    return `${payload.sub ?? ''}:${payload.role ?? payload.roles ?? ''}`
  } catch { return getAccessToken() ?? '' }
}
export function chatError(error: unknown) {
  if (error instanceof ApiError && error.status === 404) return 'Dịch vụ hỗ trợ chưa khả dụng hoặc yêu cầu không còn truy cập được.'
  return error instanceof Error ? error.message : 'Không thể tải dữ liệu. Vui lòng thử lại.'
}
export function mergeMessages(old: ChatMessage[], incoming: ChatMessage[]) {
  const entries = new Map(old.map(message => [message.id, message]))
  incoming.forEach(message => entries.set(message.id, message))
  return [...entries.values()].sort((a, b) => a.sequence - b.sequence).filter((message, index, list) => index === 0 || message.sequence !== list[index - 1].sequence)
}

/**
 * Fetch every committed message above the contiguous cursor. A sparse POST
 * sequence (e.g. display 100, POST returns 106) must not skip 101-105: the gap
 * is filled with ascending afterSequence pages before the new message merges.
 */
async function fetchAfter(conversationId: string, cursor: number, target: number, valid: () => boolean) {
  let batch: ChatMessage[] = []
  let guard = 0
  while (cursor < target && guard++ < 50) {
    const page = await chatService.listMessages(conversationId, { afterSequence: cursor, limit: 100 })
    if (!valid()) return null
    const items = page.data?.items ?? []
    if (!items.length) break
    batch = mergeMessages(batch, items)
    const next = Math.max(...items.map(message => message.sequence))
    if (next <= cursor) break
    cursor = next
  }
  return { messages: batch, cursor }
}

export function useChatWorkspace(conversationId: string | undefined, filters: ChatConversationFilters) {
  const [identity, setIdentity] = useState(chatIdentity)
  const [capabilities, setCapabilities] = useState<ChatCapabilities | null>(null)
  const [inbox, setInbox] = useState<ChatConversation[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [detail, setDetail] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // Published with the valid REST batch, not a sparse locally rendered POST.
  const [readableSequence, setReadableSequence] = useState(0)
  const [hasOlder, setHasOlder] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [socketState, setSocketState] = useState<ChatSocketState>('connecting')
  const generation = useRef(0)
  const inboxVersion = useRef(0)
  const inboxPages = useRef({ scope: '', count: 1 })
  const detailVersion = useRef(0)
  // Highest sequence whose messages are contiguously known from the REST API.
  // Displayed messages are never used as a cursor: a locally rendered message
  // can carry a sequence above a pristine gap that still needs backfilling.
  const fetchedRef = useRef(0)
  // Set when a 403 proved access was revoked; in-flight reads must not repaint
  // the transcript the purge already removed.
  const revokedRef = useRef(false)
  const messagesRef = useRef(messages)
  const selection = useRef(conversationId)
  const socket = useRef<ReturnType<typeof createChatSocket> | null>(null)
  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { selection.current = conversationId }, [conversationId])
  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    const changed = () => {
      const current = chatIdentity()
      if (current !== identity) {
        generation.current++
        fetchedRef.current = 0
        revokedRef.current = false
        setInbox([]); setMessages([]); setReadableSequence(0); messagesRef.current = []; setDetail(null); setCapabilities(null)
        setHasOlder(false)
        setError(''); setDetailError(''); setIdentity(current)
      }
    }
    window.addEventListener(AUTH_TOKENS_EVENT, changed)
    window.addEventListener('storage', changed)
    return () => { window.removeEventListener(AUTH_TOKENS_EVENT, changed); window.removeEventListener('storage', changed) }
  }, [identity])

  const refreshInbox = useCallback(async (next?: string, background = false) => {
    const stamp = generation.current
    const version = ++inboxVersion.current
    const scope = chatIdentity()
    const valid = () => stamp === generation.current && scope === chatIdentity() && version === inboxVersion.current
    const pageScope = `${scope}:${filterKey}`
    setLoading(true)
    try {
      // Reconcile all loaded pages against the active server filter. Appending
      // only page one leaves read/closed conversations in filtered lists.
      const requestedPages = background && inboxPages.current.scope === pageScope ? inboxPages.current.count : 1
      let items: ChatConversation[] = []
      let nextCursor: string | null = next ?? null
      let fetchedPages = 0
      do {
        const result = await chatService.listConversations({ ...JSON.parse(filterKey), cursor: nextCursor ?? undefined, limit: 30 })
        if (!valid()) return
        if (!result.data) throw new Error('Máy chủ không trả danh sách hội thoại.')
        items = [...new Map([...items, ...result.data.items].map(item => [item.id, item])).values()]
        nextCursor = result.data.nextCursor
        fetchedPages++
      } while (!next && nextCursor != null && fetchedPages < requestedPages)
      if (!valid()) return
      setInbox(previous => next ? [...new Map([...previous, ...items].map(item => [item.id, item])).values()] : items)
      inboxPages.current = { scope: pageScope, count: next && inboxPages.current.scope === pageScope ? inboxPages.current.count + 1 : fetchedPages }
      setCursor(nextCursor)
      setError('')
    } catch (cause) { if (stamp === generation.current && scope === chatIdentity() && version === inboxVersion.current) setError(chatError(cause)) }
    finally { if (stamp === generation.current && scope === chatIdentity() && version === inboxVersion.current) setLoading(false) }
  }, [filterKey])

  const refreshDetail = useCallback(async (catchup = true) => {
    if (!conversationId) return
    const stamp = generation.current
    const version = ++detailVersion.current
    const scope = chatIdentity()
    const valid = () => stamp === generation.current && scope === chatIdentity() && selection.current === conversationId && version === detailVersion.current
    try {
      const result = await chatService.getConversation(conversationId)
      if (!valid()) return
      if (!result.data) throw new Error('Không có dữ liệu hội thoại.')
      setDetail(result.data)
      let batch: ChatMessage[] = []
      let fetchedCursor = fetchedRef.current
      let older: boolean | undefined
      const firstLoad = !catchup || fetchedRef.current === 0
      if (firstLoad) {
        // First load of this selection: latest page. The contiguous cursor stops
        // just below the oldest message of the page so any pristine hole above
        // it is filled by fetchAfter instead of being skipped. More history
        // below only comes from the page cursor or a page that starts past 1.
        const initial = await chatService.listMessages(conversationId, { limit: 100 })
        if (!valid()) return
        const items = initial.data?.items ?? []
        older = initial.data?.nextCursor != null || (items[0]?.sequence ?? 1) > 1
        batch = items
        const first = items[0]?.sequence
        fetchedCursor = first !== undefined && first <= 1 ? items[items.length - 1]?.sequence ?? 0 : Math.max(0, (first ?? 1) - 1)
      }
      // Backfill every committed sequence above the contiguous cursor. Ascending
      // catch-up says nothing about older history, so it must not toggle hasOlder.
      const caughtUp = await fetchAfter(conversationId, fetchedCursor, result.data.lastSequence, valid)
      if (!valid() || !caughtUp) return
      batch = mergeMessages(batch, caughtUp.messages)
      // Commit the cursor with the batch, never during an incomplete or stale fetch.
      fetchedRef.current = caughtUp.cursor
      setReadableSequence(caughtUp.cursor)
      if (older !== undefined) setHasOlder(older)
      setMessages(previous => {
        const merged = mergeMessages(catchup ? previous : [], batch)
        messagesRef.current = merged
        return merged
      })
      setDetailError('')
      revokedRef.current = false
    } catch (cause) {
      if (!valid()) return
      if (cause instanceof ApiError && cause.status === 403) {
        // Access revoked (reassignment or account change): purge the transcript
        // and composer rather than leave revoked data on screen.
        revokedRef.current = true
        fetchedRef.current = 0
        setDetail(null); setMessages([]); setReadableSequence(0); messagesRef.current = []; setHasOlder(false)
        setDetailError('Bạn không còn quyền truy cập hội thoại này.')
        return
      }
      setDetailError(chatError(cause))
      if (cause instanceof ApiError && cause.status === 404) {
        fetchedRef.current = 0
        setDetail(null); setMessages([]); setReadableSequence(0); messagesRef.current = []
      }
    } finally { if (valid()) setDetailLoading(false) }
  }, [conversationId])

  useEffect(() => {
    generation.current++
    // Purge transcript synchronously on a route/account boundary; this is a
    // security reset, not state derived for presentation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetail(null); setMessages([]); setReadableSequence(0); messagesRef.current = []; setDetailError(''); setHasOlder(false)
    fetchedRef.current = 0
    revokedRef.current = false
    setDetailLoading(Boolean(conversationId))
    if (identity) void refreshDetail(false)
    const counter = generation
    return () => { counter.current++ }
  }, [conversationId, identity, refreshDetail])
  useEffect(() => {
    if (!identity) return
    const scope = identity
    void chatService.capabilities().then(result => { if (scope === chatIdentity()) setCapabilities(result.data ?? null) }).catch(cause => { if (scope === chatIdentity()) setError(chatError(cause)) })
    // Search is debounced; version invalidation prevents the preceding filter's
    // response from repopulating the current list during this delay.
    inboxVersion.current++
    const timer = window.setTimeout(() => { void refreshInbox() }, 250)
    return () => clearTimeout(timer)
  }, [identity, refreshInbox])
  const refreshCallbacks = useRef({ refreshInbox, refreshDetail })
  useEffect(() => { refreshCallbacks.current = { refreshInbox, refreshDetail } }, [refreshInbox, refreshDetail])
  useEffect(() => {
    if (!identity) return
    let refreshTimer: number | undefined
    let detailPending = false
    const reconcile = (detail = false) => {
      detailPending ||= detail
      if (refreshTimer !== undefined) return
      // One REST reconciliation per metadata burst, not one pair per read/message event.
      // Keep the first deadline (bounded latency), and retain selected-detail recovery.
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined
        const needsDetail = detailPending
        detailPending = false
        void refreshCallbacks.current.refreshInbox(undefined, true)
        if (needsDetail) void refreshCallbacks.current.refreshDetail()
      }, 350)
    }
    const connection = createChatSocket({
      onState: state => { setSocketState(state); if (state === 'connected') reconcile(true) },
      onEvent: event => {
        if (event.type === 'typing') return
        if (event.type === 'message.read') {
          // Cursor/unread are actor-specific. A peer read changes neither my inbox nor transcript.
          // My cursor can advance in another tab, so reconcile inbox only (never fetch message bodies).
          if (!event.userId || event.userId === identity.split(':')[0]) reconcile()
          return
        }
        reconcile(event.conversationId === selection.current)
      },
    })
    socket.current = connection; connection.connect()
    // A connected socket can still miss an event. Reconcile the active detail
    // independently of inbox filters/pages, including silent access revocation.
    // refreshDetail only fetches messages when its REST cursor trails lastSequence.
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      reconcile(true)
    }, 15_000)
    const visible = () => { if (document.visibilityState === 'visible') reconcile(true) }
    document.addEventListener('visibilitychange', visible)
    return () => {
      connection.disconnect(); socket.current = null; clearInterval(interval)
      if (refreshTimer !== undefined) clearTimeout(refreshTimer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [identity])

  async function loadOlder() {
    if (!conversationId || !messages.length) return false
    const stamp = generation.current, scope = chatIdentity()
    try {
      // Walking backwards from the oldest rendered message; nextCursor (when the
      // backend provides one) only signals that more history exists.
      const page = await chatService.listMessages(conversationId, { beforeSequence: messages[0].sequence, limit: 100 })
      // A purge may have run while this page was in flight: never repaint a
      // transcript whose access was revoked or whose selection changed.
      if (stamp !== generation.current || scope !== chatIdentity() || revokedRef.current || !page.data) return false
      setMessages(previous => mergeMessages(previous, page.data!.items))
      setHasOlder(page.data.nextCursor != null)
      return true
    } catch (cause) { if (stamp === generation.current && scope === chatIdentity() && !revokedRef.current) setDetailError(chatError(cause)); return false }
  }
  function clearMessages() {
    fetchedRef.current = 0
    setMessages([]); setReadableSequence(0); messagesRef.current = []
  }
  return { identity, capabilities, inbox, cursor, detail, messages, readableSequence, loading, detailLoading, error, detailError, socketState, hasOlder, loadOlder,
    refreshInbox, refreshDetail, setMessages, clearMessages, isAccessRevoked: () => revokedRef.current,
    sendTyping: () => conversationId && socket.current?.sendTyping(conversationId) }
}

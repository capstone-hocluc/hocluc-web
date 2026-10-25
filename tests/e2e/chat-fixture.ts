import type { Page } from '@playwright/test'
import type { ChatConversation, ChatMessage, MentorWorkingHours } from '../../src/types/chat'

export const CHAT_ID = 'd0000000-0000-0000-0000-000000000001'
export const CHAT_ID_2 = 'd0000000-0000-0000-0000-000000000002'
export const MENTOR_ID = '40000000-0000-0000-0000-000000000003'

export const SUBJECT_ID = '20000000-0000-0000-0000-000000000001'
const tokens: Record<string, Record<string, unknown>> = {
  STUDENT: { sub: 'student', role: 'STUDENT' },
  MENTOR: { sub: MENTOR_ID, role: 'MENTOR' },
  STAFF: { sub: '50000000-0000-0000-0000-000000000005', role: 'STAFF' },
  ADMINISTRATOR: { sub: '60000000-0000-0000-0000-000000000006', role: 'ADMINISTRATOR' },
  MANAGER: { sub: '70000000-0000-0000-0000-000000000007', role: 'MANAGER' },
}
const encodeToken = (claims: Record<string, unknown>, exp = Math.floor(Date.now() / 1000) + 3600) =>
  btoa(JSON.stringify({ ...claims, exp }))

interface FixtureMessage extends ChatMessage { senderRole?: string }
interface FixtureRequest { method: string; path: string; query: Record<string, string>; body: Record<string, unknown>; authorization: string | null }
interface FixtureUpload { method: string; path: string; authorization: string | null; contentType: string | null; bytes: number }

export async function installChatFixture(page: Page, role = 'STUDENT', options: { socketMock?: boolean } = {}) {
  const rows = new Map<string, ChatConversation>()
  const transcripts = new Map<string, FixtureMessage[]>()
  const reservations = new Map<string, { name: string; mimeType: string; sizeBytes: number }>()
  const uploaded = new Set<string>()
  let attachmentCounter = 0
  const row = (id: string, title: string): ChatConversation => ({
    id, title, status: 'IN_PROGRESS', student: { id: 'student', displayName: 'Học viên QA' },
    mentor: { id: MENTOR_ID, displayName: 'Mentor QA' }, subjectCategoryId: SUBJECT_ID,
    subjectName: 'Toán', lastSequence: 1, lastReadSequence: 0, unreadCount: 1,
    canSend: true, assignmentVersion: 3, updatedAt: '2026-10-10T12:00:00Z',
    mentorAvailability: { isWorkingNow: false, label: 'Chưa thiết lập lịch hỗ trợ' },
  })
  const message = (conversationId: string, sequence = 1, senderName = 'Mentor QA', body = 'Lời giải riêng tư QA'): FixtureMessage =>
    ({ id: `${conversationId}-${sequence}`, conversationId, sequence, senderId: MENTOR_ID, senderName, body,
      createdAt: '2026-10-10T12:00:00Z', attachments: [] })
  for (const id of [CHAT_ID, CHAT_ID_2]) { rows.set(id, row(id, id === CHAT_ID ? 'Bài toán xác suất QA' : 'Bài toán hình học QA')); transcripts.set(id, [message(id)]) }
  const localStorageFixture = { value: { access: '' } as { access: string; refresh?: string } }
  const encoded = encodeToken(tokens[role as keyof typeof tokens] ?? tokens.STUDENT)
  localStorageFixture.value = { access: `fixture.${encoded}.fixture` }
  let sentinelAccess = localStorageFixture.value.access
  // Minimal STOMP bridge used only when `socketMock` is on: accept the socket,
  // answer CONNECT, and let tests push raw MESSAGE frames on demand.
  const socketBridge = { send: (_body: string) => {} }
  const state = {
    canCreate: true, canSend: true, canSendReason: 'Tài khoản đang tạm ngừng gửi tin.',
    unavailable: false, loseSendResponse: false, loseSendAfterCommit: false, conflictAssignment: false,
    slowAuth: false, sendDelayMs: 0, listDelayMs: 0, conversationPageSize: 0 as number,
    listDelayBySearch: {} as Record<string, number>, loseCreateResponse: false, role,
    attachmentsEnabled: true, maxFileBytes: 10 * 1024 * 1024, maxAttachments: 3,
    failUpload: false, uploadDelayMs: 0, uploadFailAt: -1, assignmentDelayMs: 0,
    beforeDelayMs: 0,
    hoursFail: null as 'load' | 'save' | null, hoursDelayMs: 0,
    managementExtras: false, mentorPageSize: 0,
    downloadUrl: null as string | null,
    revoked: new Set<string>(),
    workingHours: { timezone: 'Asia/Ho_Chi_Minh', intervals: [] } as MentorWorkingHours,
    mentors: [{ id: MENTOR_ID, displayName: 'Mentor QA' }],
    get conversations() { return [...rows.values()] },
    rows, transcripts,
    requests: [] as FixtureRequest[],
    uploads: [] as FixtureUpload[],
    timeline: [] as string[],
    unmatched: [] as string[],
    pageErrors: [] as string[],
    socketAttempts: 0,
    socketConnections: [] as { authorization: string; subscribed: boolean; disconnected: boolean }[],
    sent: new Map<string, ChatMessage>(),
    /** Seed extra queue rows so pagination can be exercised past a full page. */
    addConversations(count: number, prefix = 'Yêu cầu QA') {
      for (let index = 0; index < count; index++) {
        const id = `d1000000-0000-0000-0000-${String(index).padStart(12, '0')}`
        rows.set(id, row(id, `${prefix} ${index + 1}`))
        transcripts.set(id, [message(id)])
      }
    },
    /** Inject a committed message without a matching client request (socket/poller catch-up). */
    injectMessage(conversationId: string, sequence: number, body: string, senderName = 'Mentor QA') {
      const list = transcripts.get(conversationId) ?? []
      const next = message(conversationId, sequence, senderName, body)
      list.push(next); transcripts.set(conversationId, list)
      const detail = rows.get(conversationId)
      if (detail) detail.lastSequence = Math.max(detail.lastSequence, sequence)
      return next
    },
    /** Rotate the storage tokens of one account, simulating login into a fresh session. */
    login(account: keyof typeof tokens = role as keyof typeof tokens) {
      const nextEncoded = encodeToken(tokens[account] ?? tokens.STUDENT)
      sentinelAccess = `fixture.${nextEncoded}.fixture`
      localStorageFixture.value = { access: sentinelAccess }
    },
    /** Push a raw chat-event JSON as a STOMP MESSAGE frame (socketMock mode only). */
    sendSocketFrame(body: string) { socketBridge.send(body) },
  }
  page.on('pageerror', error => state.pageErrors.push(error.message))
  await page.addInitScript(({ access }: { access: string }) => {
    localStorage.setItem('hocluc.accessToken', access)
  }, localStorageFixture.value)
  await page.context().addCookies([{ name: 'hocluc_refresh', value: `refresh-${role}`, domain: '127.0.0.1', path: '/api/v1/auth', httpOnly: true, sameSite: 'Lax' }])
  // Download links open in a popup that has no page-level route; fulfil them at
  // the context level so the short-lived URL never reaches the dev server.
  await page.context().route('**/__download/**', route => route.fulfill({ status: 200, contentType: 'application/pdf', body: 'fixture-download' }))
  // Prevent any socket from reaching a backend or remote service.
  await page.routeWebSocket('**/*', rawSocket => {
    state.socketAttempts++
    if (!options.socketMock) { rawSocket.close(); return }
    let opened = false
    let subscriptionId = ''
    const queued: string[] = []
    let connection: (typeof state.socketConnections)[number] | undefined
    const deliver = (body: string) => rawSocket.send(`MESSAGE\ndestination:/user/queue/chat-events\nsubscription:${subscriptionId}\ncontent-type:application/json\n\n${body}\0`)
    rawSocket.onMessage(message => {
      const frame = typeof message === 'string' ? message : message.toString()
      if (frame.startsWith('CONNECT')) {
        connection = { authorization: frame.match(/\nAuthorization:([^\n]+)/)?.[1] ?? '', subscribed: false, disconnected: false }
        state.socketConnections.push(connection)
        opened = true; rawSocket.send('CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0'); return
      }
      if (frame.startsWith('SUBSCRIBE')) {
        if (connection) connection.subscribed = true
        subscriptionId = frame.match(/\nid:([^\n]+)/)?.[1] ?? ''
        while (queued.length) deliver(queued.shift()!)
      }
      if (frame.startsWith('DISCONNECT')) {
        if (connection) connection.disconnected = true
        opened = false
        const receipt = frame.match(/\nreceipt:([^\n]+)/)?.[1]
        if (receipt) rawSocket.send(`RECEIPT\nreceipt-id:${receipt}\n\n\0`)
      }
    })
    socketBridge.send = body => { if (opened && subscriptionId) deliver(body); else queued.push(body) }
  })
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  const managementExtras = {
    lastMessagePreview: 'Bản xem trước bí mật QA',
    contextSnapshot: { source: 'transcript', problem: 'Bí mật ngữ cảnh QA' },
  }
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    const method = request.method()
    state.timeline.push(`${method} ${path}`)
    // Staging uploads land on the app origin without a JWT; record the headers
    // so tests can assert the token never leaks to file storage.
    if (path.startsWith('/__upload/')) {
      state.uploads.push({
        method, path, authorization: request.headers()['authorization'] ?? null,
        contentType: request.headers()['content-type'] ?? null, bytes: request.postDataBuffer()?.length ?? 0,
      })
      const attachmentId = path.slice('/__upload/'.length).split('?')[0] ?? ''
      const attempt = state.uploads.length - 1
      if (state.failUpload || attempt === state.uploadFailAt) return route.fulfill({ status: 500, contentType: 'text/plain', body: 'Upload failed' })
      if (state.uploadDelayMs) await sleep(state.uploadDelayMs)
      uploaded.add(attachmentId)
      return route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' })
    }
    if (!path.startsWith('/api/')) {
      if (url.origin === 'http://127.0.0.1:5192') return route.continue()
      return route.abort('blockedbyclient')
    }
    const body = request.postDataJSON() ?? {}
    const authorization = request.headers()['authorization'] ?? null
    state.requests.push({ method, path, query: Object.fromEntries(url.searchParams.entries()), body, authorization })
    const answer = (data: unknown, status = 200, message = 'OK') => route.fulfill({ status,
      contentType: 'application/json', body: JSON.stringify({ success: status < 400, status, message, data }) })
    if (path === '/api/v1/notifications/unread-count') return answer({ unread: 0 })
    const contentAttachment = path.match(/attachments\/([^/]+)\/content$/)?.[1]
    if (contentAttachment) {
      if (authorization !== `Bearer ${sentinelAccess}`) return answer(null, 401, 'Access token is required.')
      return route.fulfill({ status: 200, contentType: 'application/pdf', body: 'fixture-download' })
    }
    if (path === '/api/v1/auth/refresh') {
      const refresh = (await request.allHeaders()).cookie?.match(/(?:^|;\s*)hocluc_refresh=([^;]+)/)?.[1] ?? ''
      if (!/^(refresh|rotated)-/.test(refresh)) return answer(null, 401, 'Refresh cookie không hợp lệ.')
      const account = refresh.replace(/^(refresh|rotated)-/, '')
      const nextAccess = `fixture.${encodeToken(tokens[account] ?? tokens.STUDENT)}.fixture`
      sentinelAccess = nextAccess
      localStorageFixture.value = { access: nextAccess, refresh: `rotated-${account}` }
      return route.fulfill({ json: { success: true, status: 200, data: { accessToken: nextAccess } },
        headers: { 'set-cookie': `hocluc_refresh=rotated-${account}; HttpOnly; Path=/api/v1/auth; SameSite=Lax` } })
    }
    // Test-only probe used by the transport race tests: a delayed check against
    // the currently issued token, so a sibling refresh can rotate it mid-flight.
    if (path.startsWith('/api/v1/chat/probe-')) {
      await sleep(300)
      if (authorization !== `Bearer ${sentinelAccess}`) return answer(null, 401, 'Access token đã hết hạn.')
      return answer({ ready: true })
    }
    if (state.slowAuth) {
      await sleep(300)
      if (authorization !== `Bearer ${sentinelAccess}`) return answer(null, 401, 'Access token đã hết hạn.')
    }
    if (path === '/api/v1/users/profiles') return answer({ id: tokens[role as keyof typeof tokens]?.sub ?? 'student',
      role, roles: [role], status: 'ACTIVE', firstName: 'QA', lastName: 'Local', displayName: 'QA', email: 'qa@example.invalid', emailVerified: true })
    if (state.unavailable && path.startsWith('/api/v1/chat')) return answer(null, 404, 'Not found')
    if (path === '/api/v1/chat/capabilities') return answer({ canCreate: state.canCreate, canSend: state.canSend,
      reason: state.canCreate ? (state.canSend ? undefined : state.canSendReason) : 'Khóa học đã hết hiệu lực.',
      attachmentsEnabled: state.attachmentsEnabled,
      maxFileBytes: state.maxFileBytes, maxAttachments: state.maxAttachments })
    if (path === '/api/v1/chat/subjects') return answer([{ id: SUBJECT_ID, name: 'Toán' }])
    if (path === '/api/v1/chat/management/mentors') {
      const search = url.searchParams.get('search') ?? ''
      const filtered = state.mentors.filter(mentor => !search || mentor.displayName.includes(search))
      if (!state.mentorPageSize) return answer({ items: filtered, nextCursor: null })
      const offset = Number(url.searchParams.get('cursor') ?? 0)
      const page = filtered.slice(offset, offset + state.mentorPageSize)
      return answer({ items: page, nextCursor: offset + state.mentorPageSize < filtered.length ? String(offset + state.mentorPageSize) : null })
    }
    if (path.endsWith('/working-hours')) {
      if (method === 'GET') {
        if (state.hoursFail === 'load') return answer(null, 503, 'Dịch vụ lịch hỗ trợ tạm thời không khả dụng.')
        return answer(state.workingHours)
      }
      if (state.hoursFail === 'save') return answer(null, 503, 'Không lưu được lịch hỗ trợ.')
      if (state.hoursDelayMs) await sleep(state.hoursDelayMs)
      state.workingHours = {
        timezone: String(body.timezone ?? ''),
        intervals: Array.isArray(body.intervals) ? body.intervals as MentorWorkingHours['intervals'] : [],
      }
      return answer(state.workingHours)
    }
    if (path === '/api/v1/auth/logout') return answer(null)
    if (path === '/api/v1/chat/conversations' || path === '/api/v1/chat/management/conversations') {
      if (method === 'POST') {
        if (state.loseCreateResponse) { state.loseCreateResponse = false; return route.abort('connectionfailed') }
        const created = row('d0000000-0000-0000-0000-000000000003', String(body.title))
        rows.set(created.id, created); transcripts.set(created.id, [message(created.id, 1, 'Học viên QA', String(body.initialMessage))])
        return answer(created)
      }
      if (state.listDelayMs) await sleep(state.listDelayMs)
      let items = [...rows.values()]
      if (url.searchParams.get('unread') === 'true') items = items.filter(item => item.unreadCount > 0)
      const status = url.searchParams.get('status')
      if (status) items = items.filter(item => item.status === status)
      const search = url.searchParams.get('search')
      if (search && state.listDelayBySearch[search] !== undefined) await sleep(state.listDelayBySearch[search])
      if (search) items = items.filter(item => item.title.includes(search))
      // Tempting extras only for management: the console must still render just
      // the explicit metadata fields, never a preview or snapshot.
      if (path.startsWith('/api/v1/chat/management') && state.managementExtras) {
        items = items.map(item => ({ ...item, ...managementExtras }))
      }
      if (state.conversationPageSize) {
        const offset = Number(url.searchParams.get('cursor') ?? 0)
        const page = items.slice(offset, offset + state.conversationPageSize)
        return answer({ items: page, nextCursor: offset + state.conversationPageSize < items.length ? String(offset + state.conversationPageSize) : null })
      }
      return answer({ items, nextCursor: null })
    }
    const id = path.match(/conversations\/([^/]+)/)?.[1]
    const detail = rows.get(id ?? '')
    if (detail) {
      const management = path.startsWith('/api/v1/chat/management/')
      // Reassignment revokes both sides of the transcript for the old mentor.
      if (state.revoked.has(detail.id) && !management) return answer(null, 403, 'Bạn không còn quyền truy cập hội thoại này.')
      if (path.endsWith('/attachments/upload-url') && method === 'POST') {
        if (!state.attachmentsEnabled) return answer(null, 403, 'Tệp đính kèm chưa khả dụng.')
        const attachmentId = `att-${++attachmentCounter}`
        reservations.set(attachmentId, { name: String(body.name ?? ''), mimeType: String(body.mimeType ?? ''), sizeBytes: Number(body.sizeBytes ?? 0) })
        return answer({ attachmentId, uploadUrl: `http://127.0.0.1:5192/__upload/${attachmentId}`,
          expiresAt: new Date(Date.now() + 300_000).toISOString(), headers: {} })
      }
      const completedAttachment = path.match(/attachments\/([^/]+)\/complete/)?.[1]
      if (completedAttachment) {
        const reservation = reservations.get(completedAttachment)
        if (!reservation || !uploaded.has(completedAttachment)) return answer(null, 409, 'Tệp chưa được tải lên.')
        return answer({ id: completedAttachment, ...reservation })
      }
      const downloadAttachment = path.match(/attachments\/([^/]+)\/download-url/)?.[1]
      if (downloadAttachment) {
        return answer({ downloadUrl: state.downloadUrl ?? `http://127.0.0.1:1/api/v1/chat/conversations/${detail.id}/attachments/${downloadAttachment}/content`,
          expiresAt: new Date(Date.now() + 300_000).toISOString() })
      }
      if (path.endsWith('/messages')) {
        const list = transcripts.get(detail.id) ?? []
        if (method === 'GET') {          const limit = Math.min(Number(url.searchParams.get('limit') ?? 100) || 100, 100)
          const after = url.searchParams.get('afterSequence')
          const before = url.searchParams.get('beforeSequence')
          if (before !== null && state.beforeDelayMs) await sleep(state.beforeDelayMs)
          if (after !== null) {
            const items = list.filter(row => row.sequence > Number(after)).sort((a, b) => a.sequence - b.sequence).slice(0, limit)
            return answer({ items, nextCursor: null })
          }
          const descending = list.filter(row => before === null || row.sequence < Number(before)).sort((a, b) => b.sequence - a.sequence)
          const page = descending.slice(0, limit)
          return answer({ items: page.sort((a, b) => a.sequence - b.sequence), nextCursor: descending.length > limit ? `before-${page[page.length - 1]?.sequence}` : null })
        }
        const key = String(body.clientMessageId)
        let saved = state.sent.get(key)
        if (state.loseSendResponse) { state.loseSendResponse = false; return route.abort('connectionfailed') }
        if (!saved) {
          const sequence = body.sequence ? Number(body.sequence) : detail.lastSequence + 1
          saved = { id: `sent-${key}`, conversationId: detail.id, sequence,
            senderId: 'student', senderName: 'Học viên QA', body: String(body.body), createdAt: '2026-10-10T12:01:00Z',
            attachments: (Array.isArray(body.attachmentIds) ? body.attachmentIds : []).map((attachmentId: unknown) => {
              const reservation = reservations.get(String(attachmentId))
              return { id: String(attachmentId), name: reservation?.name ?? 'tệp', mimeType: reservation?.mimeType ?? 'application/octet-stream', sizeBytes: reservation?.sizeBytes ?? 0 }
            }) }
          state.sent.set(key, saved); list.push(saved as FixtureMessage); transcripts.set(detail.id, list)
          detail.lastSequence = Math.max(detail.lastSequence, sequence)
        }
        if (state.loseSendAfterCommit) { state.loseSendAfterCommit = false; return route.abort('connectionfailed') }
        if (state.sendDelayMs) await sleep(state.sendDelayMs)
        return answer(saved)
      }
      if (path.endsWith('/read')) { detail.lastReadSequence = Number(body.lastReadSequence); detail.unreadCount = 0; return answer(null) }
      if (path.endsWith('/status')) { detail.status = 'RESOLVED'; detail.canSend = false; return answer(detail) }
      if (path.endsWith('/assignment')) {
        if (state.assignmentDelayMs) await sleep(state.assignmentDelayMs)
        if (state.conflictAssignment) { state.conflictAssignment = false; detail.assignmentVersion++; return answer(null, 409, 'Phân công đã thay đổi. Tải lại trước khi lưu.') }
        detail.assignmentVersion++; return answer(detail)
      }
      if (management && state.managementExtras) return answer({ ...detail, ...managementExtras })
      return answer(detail)
    }
    state.unmatched.push(`${method} ${path}`)
    return answer(null, 501, 'Unmatched fixture request')
  })
  return state
}

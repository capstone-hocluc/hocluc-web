import { expect, test, type Page } from '@playwright/test'
import { CHAT_ID, CHAT_ID_2, MENTOR_ID, SUBJECT_ID, installChatFixture } from './chat-fixture'
import { mkdir } from 'node:fs/promises'

test('NextAdmin mentor chat separates sender bubbles and uses real avatar initials', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  const peer = state.injectMessage(CHAT_ID, 2, 'Câu hỏi từ học sinh', 'Học viên QA')
  peer.senderId = 'student'
  const reply = state.injectMessage(CHAT_ID, 3, 'Mentor phản hồi tiếp')
  reply.createdAt = '2026-10-11T12:00:00Z'
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.locator('article[data-chat-direction="outgoing"]')).toHaveCount(2)
  await expect(page.locator('article[data-chat-direction="incoming"]')).toHaveCount(1)
  await expect(page.locator('article[data-chat-direction="incoming"]')).toContainText('Câu hỏi từ học sinh')
  await expect(page.locator('article[data-chat-direction="outgoing"]').last()).toContainText('Mentor phản hồi tiếp')
  await expect(page.getByText('Enter để gửi · Shift+Enter để xuống dòng', { exact: true })).toBeVisible()
  await expect(page.getByText('Online', { exact: true })).toHaveCount(0)
  await mkdir('.pi/qa/chat-ui', { recursive: true })
  await page.screenshot({ path: '.pi/qa/chat-ui/mentor-desktop.png', fullPage: true })
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('NextAdmin mentor filters and mobile back navigation remain functional', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Chưa đọc', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Chưa đọc', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click()
  const statusTrigger = page.getByRole('button', { name: /Trạng thái hội thoại$/ })
  await statusTrigger.click()
  await page.getByRole('option', { name: 'Đang hỗ trợ', exact: true }).click()
  await expect(statusTrigger).toContainText('Đang hỗ trợ')
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(page.getByLabel('Danh sách hội thoại', { exact: true })).toBeHidden()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await mkdir('.pi/qa/chat-ui', { recursive: true })
  await page.screenshot({ path: '.pi/qa/chat-ui/mentor-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Quay lại danh sách hội thoại', exact: true }).click()
  await expect(page.getByLabel('Danh sách hội thoại', { exact: true })).toBeVisible()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('manager deep link renders metadata without requesting transcript', async ({ page }) => {
  const state = await installChatFixture(page, 'MANAGER')
  await page.goto(`/manager/chat-monitoring?conversationId=${CHAT_ID}`)
  await expect(page.getByRole('heading', { name: 'Bài toán xác suất QA', exact: true })).toBeVisible()
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Đổi Mentor', exact: true })).toHaveCount(0)
  expect(state.requests.filter(request => request.path.endsWith('/messages'))).toHaveLength(0)
  expect(state.requests.filter(request => request.method !== 'GET')).toHaveLength(0)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('staff assignment conflict reloads version before a deliberate retry', async ({ page }) => {
  const state = await installChatFixture(page, 'STAFF')
  await page.goto(`/staff/chat-queue?conversationId=${CHAT_ID}`)
  await page.getByRole('button', { name: 'Đổi Mentor', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Phân công Mentor', exact: true })
  await expect(dialog.getByRole('option', { name: 'Mentor QA', exact: true })).toBeAttached()
  expect(state.requests.find(request => request.path === '/api/v1/chat/management/mentors')?.query.conversationId).toBe(CHAT_ID)
  await dialog.getByRole('combobox', { name: 'Mentor phụ trách', exact: true }).selectOption(MENTOR_ID)
  await dialog.getByRole('textbox', { name: 'Lý do phân công', exact: true }).fill('Điều phối theo môn Toán')
  state.conflictAssignment = true
  await dialog.getByRole('button', { name: 'Lưu phân công', exact: true }).click()
  await expect(dialog.getByText(/Phân công đã thay đổi/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Lưu phân công', exact: true })).toBeEnabled()
  expect(state.requests.filter(request => request.path.endsWith('/assignment'))).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Lưu phân công', exact: true }).click()
  await expect(dialog).toBeHidden()
  const writes = state.requests.filter(request => request.path.endsWith('/assignment'))
  expect(writes.map(request => request.body.expectedAssignmentVersion)).toEqual([3, 4])
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('console back navigation restores selected request', async ({ page }) => {
  const state = await installChatFixture(page, 'MANAGER')
  await page.goto(`/manager/chat-monitoring?conversationId=${CHAT_ID}`)
  await expect(page.getByRole('heading', { name: 'Bài toán xác suất QA', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Bài toán hình học QA/ }).click()
  await expect(page).toHaveURL(new RegExp(`conversationId=${CHAT_ID_2}`))
  await expect(page.getByRole('heading', { name: 'Bài toán hình học QA', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Bài toán xác suất QA', exact: true })).toBeVisible()
  expect(state.unmatched).toEqual([])
})

test('expired student keeps readable history but cannot create or send', async ({ page }) => {
  const state = await installChatFixture(page)
  state.canCreate = false
  state.conversations[0].canSend = false
  state.conversations[0].sendDisabledReason = 'Khóa học đã hết hiệu lực.'
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yêu cầu mới', exact: true })).toBeDisabled()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Gửi', exact: true })).toBeDisabled()
  expect(state.requests.filter(request => request.method === 'POST')).toHaveLength(0)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('lost send response retries same key and does not duplicate committed message', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  state.loseSendAfterCommit = true
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Tin nhắn cần retry QA')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Thử gửi lại', exact: true })).toBeEnabled()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toBeDisabled()
  expect(state.sent.size).toBe(1) // The server committed before the response was lost.
  await page.getByRole('button', { name: 'Thử gửi lại', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Gửi', exact: true })).toBeVisible()
  await expect(page.getByText('Tin nhắn cần retry QA', { exact: true })).toHaveCount(1)
  const writes = state.requests.filter(request => request.method === 'POST' && request.path.endsWith('/messages'))
  expect(writes).toHaveLength(2)
  expect(writes[0].body.clientMessageId).toBe(writes[1].body.clientMessageId)
  expect(state.sent.size).toBe(1)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('student unread inbox and deep links work without WebSocket', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto('/student/chat')
  await page.getByLabel('Chưa đọc', { exact: true }).check()
  await page.getByRole('button', { name: /Bài toán xác suất QA/ }).click()
  await expect(page).toHaveURL(new RegExp(`/student/chat/${CHAT_ID}$`))
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect.poll(() => state.requests.some(request => request.path.endsWith('/read'))).toBe(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Bài toán xác suất QA', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tải lại chat', exact: true }).click()
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  expect(state.unmatched).toEqual([])
})

test('mentor resolves assigned conversation and composer becomes read only', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Hoàn tất', exact: true }).click()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toBeDisabled()
  expect(state.conversations[0].status).toBe('RESOLVED')
  expect(state.requests.filter(request => request.method === 'PATCH' && request.path.endsWith('/status'))).toHaveLength(1)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('dirty conversation navigation supports cancel and deliberate discard', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Bản nháp QA')
  await page.getByRole('button', { name: /Bài toán hình học QA/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Bỏ bản nháp chưa gửi?' })
  await dialog.getByRole('button', { name: 'Tiếp tục viết', exact: true }).click()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('Bản nháp QA')
  await expect(page).toHaveURL(new RegExp(CHAT_ID))
  await page.getByRole('button', { name: /Bài toán hình học QA/ }).click()
  await dialog.getByRole('button', { name: 'Bỏ bản nháp', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(CHAT_ID_2))
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('')
  expect(state.unmatched).toEqual([])
})

test('create request navigates directly without prompting to discard completed form', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto('/student/chat')
  await page.getByRole('button', { name: 'Yêu cầu mới', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Tạo yêu cầu hỗ trợ' })
  await dialog.getByLabel('Môn học', { exact: true }).selectOption(SUBJECT_ID)
  await dialog.getByLabel('Tiêu đề yêu cầu', { exact: true }).fill('Yêu cầu mới QA')
  await dialog.getByLabel('Nội dung yêu cầu', { exact: true }).fill('Nội dung bài toán QA')
  await dialog.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Yêu cầu mới QA', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Bỏ bản nháp chưa gửi?' })).toHaveCount(0)
  expect(state.requests.filter(request => request.method === 'POST' && request.path === '/api/v1/chat/conversations')).toHaveLength(1)
  expect(state.unmatched).toEqual([])
})

test('missing backend shows unavailable and does not invent conversations', async ({ page }) => {
  const state = await installChatFixture(page)
  state.unavailable = true
  await page.goto('/student/chat')
  await expect(page.getByText(/Dịch vụ hỗ trợ chưa khả dụng/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yêu cầu mới', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toHaveCount(0)
  expect(state.pageErrors).toEqual([])
})

test('concurrent HTTP and socket token preparation performs a single refresh', async ({ page }) => {
  await installChatFixture(page)
  await page.goto('/student/chat')
  let refreshes = 0
  const encoded = Buffer.from(JSON.stringify({ sub: 'student', role: 'STUDENT', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64')
  await page.route('**/api/v1/auth/refresh', async route => {
    refreshes++
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, status: 200,
      data: { accessToken: `new.${encoded}.fixture`, refreshToken: 'new-fixture-refresh' } }) })
  })
  await page.route('**/api/v1/chat/probe-fixture', route => {
    const refreshed = route.request().headers().authorization === `Bearer new.${encoded}.fixture`
    return route.fulfill({ status: refreshed ? 200 : 401, contentType: 'application/json',
      body: JSON.stringify({ success: refreshed, status: refreshed ? 200 : 401, data: { ready: true } }) })
  })
  const tokens = await page.evaluate(async () => {
    const source = '/src/lib/api.ts'
    const api = await import(source)
    const expired = btoa(JSON.stringify({ sub: 'student', role: 'STUDENT', exp: 1 }))
    localStorage.setItem('hocluc.accessToken', `old.${expired}.fixture`)
    localStorage.setItem('hocluc.refreshToken', 'old-fixture-refresh')
    const results = await Promise.all([api.request('/api/v1/chat/probe-fixture', { auth: true }), api.ensureFreshAccessToken(true), api.ensureFreshAccessToken()])
    return { ready: results[0].data.ready, tokens: results.slice(1) }
  })
  expect(refreshes).toBe(1)
  expect(tokens.ready).toBe(true)
  expect(new Set(tokens.tokens).size).toBe(1)
  expect(tokens.tokens[0]).toBe(`new.${encoded}.fixture`)
})

test('student chat desktop and mobile retain readable history without page overflow', async ({ page }) => {
  await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.screenshot({ path: '.pi/qa/chat/student-chat-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '.pi/qa/chat/student-chat-mobile.png', fullPage: true })
})

test('slow 401 from a sibling request retries with the rotated token and one shared refresh', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto('/student/chat')
  await expect(page.getByRole('button', { name: 'Yêu cầu mới', exact: true })).toBeEnabled()
  // The stored token no longer matches the one the server currently issues, so
  // the first probe attempt gets a delayed 401 while a sibling may refresh first.
  await page.evaluate(() => localStorage.setItem('hocluc.accessToken', 'stale.fixture.token'))
  const results = await page.evaluate(async () => {
    // @ts-expect-error - Vite serves this module path only inside the browser.
    const api = await import('/src/lib/api.ts')
    const calls = [
      api.request('/api/v1/chat/probe-one', { auth: true, retryOnUnauthorized: true }),
      api.request('/api/v1/chat/probe-two', { auth: true, retryOnUnauthorized: true }),
    ]
    const settled = await Promise.allSettled(calls)
    return settled.map(entry => entry.status === 'fulfilled'
      ? `ok:${String(entry.value.data?.ready)}`
      : `err:${String((entry.reason as Error)?.message ?? entry.reason)}`)
  })
  expect(results).toEqual(['ok:true', 'ok:true'])
  const probes = state.requests.filter(request => request.path.includes('probe-'))
  expect(probes).toHaveLength(4)
  // Both attempts started with the same stale token; both retried with the same rotated token.
  expect(new Set(probes.slice(0, 2).map(request => request.authorization)).size).toBe(1)
  expect(probes[0].authorization).toContain('stale.fixture.token')
  expect(probes[1].authorization).toContain('stale.fixture.token')
  expect(new Set(probes.slice(2).map(request => request.authorization)).size).toBe(1)
  expect(probes[2].authorization).not.toContain('stale.fixture.token')
  expect(state.requests.filter(request => request.path === '/api/v1/auth/refresh')).toHaveLength(1)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('read cursor is not advanced while the window lacks focus', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.evaluate(() => Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => false }))
  state.requests.length = 0
  state.injectMessage(CHAT_ID, 2, 'Tin mới khi mất focus QA')
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByText('Tin mới khi mất focus QA', { exact: true })).toBeVisible()
  await page.waitForTimeout(400)
  expect(state.requests.filter(request => request.path.endsWith('/read'))).toHaveLength(0)
  await page.evaluate(() => Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => true }))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(() => state.requests.some(request => request.path.endsWith('/read') && request.body.lastReadSequence === 2)).toBe(true)
  expect(state.unmatched).toEqual([])
})

test('account switch during a pending send never replays the mutation with the new session', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Bản nháp đổi tài khoản QA')
  const postsBefore = state.requests.filter(request => request.method === 'POST' && request.path.endsWith('/messages')).length
  state.sendDelayMs = 500
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await page.evaluate((sub) => {
    const encoded = btoa(JSON.stringify({ sub, role: 'MENTOR', exp: Math.floor(Date.now() / 1000) + 3600 }))
    localStorage.setItem('hocluc.accessToken', `fixture.${encoded}.fixture`)
    window.dispatchEvent(new StorageEvent('storage', { key: 'hocluc.accessToken' }))
  }, '40000000-0000-0000-0000-000000000003')
  await page.waitForTimeout(700)
  expect(state.requests.filter(request => request.method === 'POST' && request.path.endsWith('/messages'))).toHaveLength(postsBefore + 1)
  expect(state.requests.filter(request => request.path === '/api/v1/auth/refresh')).toHaveLength(0)
  expect(state.unmatched).toEqual([])
})

test('logout stops socket reconnects and does not repopulate purged session data', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect.poll(() => state.socketAttempts).toBeGreaterThan(0)
  await page.evaluate(() => {
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: 'hocluc.accessToken' }))
  })
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toHaveCount(0)
  await page.waitForTimeout(600)
  const frozen = state.socketAttempts
  await page.waitForTimeout(800)
  expect(state.socketAttempts).toBe(frozen)
  expect(state.pageErrors).toEqual([])
})

test('sparse POST sequence backfills the gap instead of skipping messages', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  state.injectMessage(CHAT_ID, 2, 'Tin bị bỏ qua QA 2')
  state.injectMessage(CHAT_ID, 3, 'Tin bị bỏ qua QA 3')
  state.injectMessage(CHAT_ID, 4, 'Tin bị bỏ qua QA 4')
  state.injectMessage(CHAT_ID, 5, 'Tin bị bỏ qua QA 5')
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Tin nhảy sequence QA')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await expect(page.getByText('Tin nhảy sequence QA', { exact: true })).toBeVisible()
  for (const label of ['Tin bị bỏ qua QA 2', 'Tin bị bỏ qua QA 3', 'Tin bị bỏ qua QA 4', 'Tin bị bỏ qua QA 5']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
  expect(state.sent.size).toBe(1)
  expect(state.unmatched).toEqual([])
})

test('connected socket polling backfills a missed event outside the inbox filter', async ({ page }) => {
  const state = await installChatFixture(page, 'STUDENT', { socketMock: true })
  // Install before the app registers its interval; existing real timers are not migrated.
  await page.clock.install()
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect.poll(() => state.socketConnections.filter(connection => connection.subscribed).length).toBe(1)
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Bản nháp khi thiếu event QA')
  // The selected conversation can be absent from the current inbox page/filter.
  await page.getByLabel('Tìm hội thoại', { exact: true }).fill('Không có kết quả QA')
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toHaveCount(0)
  const inboxReads = state.requests.filter(request => request.path === '/api/v1/chat/conversations').length
  state.injectMessage(CHAT_ID, 2, 'Tin thiếu event QA')
  // No socket frame, focus event, reload, or manual refresh is delivered.
  await page.clock.runFor(15_000)
  await expect.poll(() => state.requests.filter(request => request.path === '/api/v1/chat/conversations').length).toBeGreaterThan(inboxReads)
  await expect(page.getByText('Tin thiếu event QA', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('Bản nháp khi thiếu event QA')
  const messageReads = state.requests.filter(request => request.method === 'GET' && request.path.endsWith('/messages')).length
  const detailReads = state.requests.filter(request => request.path === `/api/v1/chat/conversations/${CHAT_ID}`).length
  await page.clock.runFor(15_000)
  await expect.poll(() => state.requests.filter(request => request.path === `/api/v1/chat/conversations/${CHAT_ID}`).length).toBeGreaterThan(detailReads)
  await expect(page.getByText('Tin thiếu event QA', { exact: true })).toHaveCount(1)
  expect(state.requests.filter(request => request.method === 'GET' && request.path.endsWith('/messages'))).toHaveLength(messageReads)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('connected socket polling purges a silently revoked mentor conversation', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR', { socketMock: true })
  await page.clock.install()
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect.poll(() => state.socketConnections.filter(connection => connection.subscribed).length).toBe(1)
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Bản nháp trước thu hồi QA')
  const inboxReads = state.requests.filter(request => request.path === '/api/v1/chat/conversations').length
  state.revoked.add(CHAT_ID)
  await page.clock.runFor(15_000)
  await expect.poll(() => state.requests.filter(request => request.path === '/api/v1/chat/conversations').length).toBeGreaterThan(inboxReads)
  await expect(page.getByText('Bạn không còn quyền truy cập hội thoại này.', { exact: true })).toBeVisible()
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveCount(0)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('read cursor waits for sparse POST backfill and survives a failed catch-up', async ({ page }) => {
  const state = await installChatFixture(page, 'STUDENT', { socketMock: true })
  await page.goto(`/student/chat/${CHAT_ID}`)
  await page.evaluate(() => Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => true }))
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect.poll(() => state.socketConnections.filter(connection => connection.subscribed).length).toBe(1)
  await expect.poll(() => state.requests.some(request => request.path.endsWith('/read') && request.body.lastReadSequence === 1)).toBe(true)
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  let started = false
  let fail = true
  await page.route(`**/conversations/${CHAT_ID}/messages?**`, async route => {
    if (fail && new URL(route.request().url()).searchParams.get('afterSequence') === '1') {
      started = true
      await held
      return route.abort('connectionfailed')
    }
    await route.fallback()
  })
  try {
    for (let sequence = 2; sequence <= 5; sequence++) state.injectMessage(CHAT_ID, sequence, `Tin chưa đọc trong gap QA ${sequence}`)
    await page.getByLabel('Tin nhắn', { exact: true }).fill('Tin POST sequence 6 QA')
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await expect(page.getByText('Tin POST sequence 6 QA', { exact: true })).toBeVisible()
    await expect.poll(() => started).toBe(true)
    // Exercise the focus/visibility read callbacks while the REST gap is held.
    await page.evaluate(async () => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    })
    expect(state.requests.filter(request => request.path.endsWith('/read')).map(request => request.body.lastReadSequence)).toEqual([1])
    await expect(page.getByText(/^Tin chưa đọc trong gap QA/)).toHaveCount(0)
    release()
    await expect(page.getByText('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.', { exact: true })).toBeVisible()
    expect(state.requests.filter(request => request.path.endsWith('/read')).map(request => request.body.lastReadSequence)).toEqual([1])
    fail = false
    await page.getByRole('button', { name: 'Tải lại chat', exact: true }).click()
    await expect(page.getByText(/^Tin chưa đọc trong gap QA/)).toHaveCount(4)
    await expect.poll(() => state.requests.some(request => request.path.endsWith('/read') && request.body.lastReadSequence === 6)).toBe(true)
    await expect(page.getByText('Tin POST sequence 6 QA', { exact: true })).toHaveCount(1)
    expect(state.sent.size).toBe(1)
    expect(state.unmatched).toEqual([])
    expect(state.pageErrors).toEqual([])
  } finally { release() }
})

test('reconnect catch-up backfills more than one page without duplicates', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  for (let sequence = 2; sequence <= 151; sequence++) state.injectMessage(CHAT_ID, sequence, `Tin tải bù QA ${sequence}`)
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(page.getByText('Tin tải bù QA 151', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Tin tải bù QA 101', { exact: true })).toBeVisible()
  expect(await page.getByText(/^Tin tải bù QA \d+$/).count()).toBe(150)
  expect(state.unmatched).toEqual([])
})

test('older history loads one page at a time from the top', async ({ page }) => {
  const state = await installChatFixture(page)
  for (let sequence = 2; sequence <= 251; sequence++) state.injectMessage(CHAT_ID, sequence, `Tin cũ QA ${sequence}`)
  await page.goto(`/student/chat/${CHAT_ID}`)
  // The first page shows only the latest 100 messages (152..251).
  await expect(page.getByText('Tin cũ QA 251', { exact: true })).toBeVisible()
  await expect(page.getByText('Tin cũ QA 152', { exact: true })).toBeVisible()
  expect(await page.getByText(/^Tin cũ QA \d+$/).count()).toBe(100)
  await page.getByRole('button', { name: 'Tải tin nhắn cũ', exact: true }).click()
  await expect(page.getByText('Tin cũ QA 52', { exact: true })).toBeVisible()
  expect(await page.getByText(/^Tin cũ QA \d+$/).count()).toBe(200)
  await page.getByRole('button', { name: 'Tải tin nhắn cũ', exact: true }).click()
  await expect(page.getByText('Tin cũ QA 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  expect(await page.getByText(/^Tin cũ QA \d+$/).count()).toBe(250)
  await expect(page.getByRole('button', { name: 'Tải tin nhắn cũ', exact: true })).toHaveCount(0)
  expect(state.unmatched).toEqual([])
})

test('duplicate sequences merge to one rendered message across overlapping refreshes', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  state.injectMessage(CHAT_ID, 2, 'Tin trùng QA 2')
  state.injectMessage(CHAT_ID, 2, 'Tin trùng QA 2')
  state.injectMessage(CHAT_ID, 3, 'Tin trùng QA 3')
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(page.getByText('Tin trùng QA 3', { exact: true })).toBeVisible()
  expect(await page.getByText('Tin trùng QA 2', { exact: true }).count()).toBe(1)
  expect(await page.getByText('Tin trùng QA 3', { exact: true }).count()).toBe(1)
  expect(state.unmatched).toEqual([])
})

test('switching conversation while an older response is pending never paints stale messages', async ({ page }) => {
  const state = await installChatFixture(page)
  state.slowAuth = true
  await page.goto(`/student/chat/${CHAT_ID}`)
  await page.getByRole('button', { name: /Bài toán hình học QA/ }).click()
  await expect(page).toHaveURL(new RegExp(CHAT_ID_2))
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  const detailPaths = state.requests.filter(request => request.path.endsWith(`/conversations/${CHAT_ID}`))
  expect(detailPaths.length).toBeGreaterThan(0)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('stale inbox search responses cannot overwrite the newest query', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto('/student/chat')
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toBeVisible()
  state.listDelayBySearch = { 'xác suất': 1500, 'hình học': 50 }
  await page.getByLabel('Tìm hội thoại', { exact: true }).fill('xác suất')
  await page.waitForTimeout(400)
  await page.getByLabel('Tìm hội thoại', { exact: true }).fill('hình học')
  await expect(page.getByRole('button', { name: /Bài toán hình học QA/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toHaveCount(0)
  // Wait past the stale response's arrival: it must not repopulate the list.
  await page.waitForTimeout(1400)
  await expect(page.getByRole('button', { name: /Bài toán hình học QA/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toHaveCount(0)
  expect(state.unmatched).toEqual([])
})

test('inbox pagination fetches the next page without duplicates', async ({ page }) => {
  const state = await installChatFixture(page)
  state.conversationPageSize = 1
  await page.goto('/student/chat')
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Bài toán hình học QA/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Tải thêm hội thoại', exact: true }).click()
  await expect(page.getByRole('button', { name: /Bài toán hình học QA/ })).toBeVisible()
  expect(await page.getByRole('button', { name: /Bài toán xác suất QA/ }).count()).toBe(1)
  expect(state.unmatched).toEqual([])
})

test('lost create response retries with the same clientRequestId and navigates once', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto('/student/chat')
  await page.getByRole('button', { name: 'Yêu cầu mới', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Tạo yêu cầu hỗ trợ' })
  await dialog.getByLabel('Môn học', { exact: true }).selectOption(SUBJECT_ID)
  await dialog.getByLabel('Tiêu đề yêu cầu', { exact: true }).fill('Yêu cầu retry QA')
  await dialog.getByLabel('Nội dung yêu cầu', { exact: true }).fill('Nội dung retry QA')
  state.loseCreateResponse = true
  await dialog.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Thử tạo lại', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Thử tạo lại', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Yêu cầu retry QA', exact: true })).toBeVisible()
  const writes = state.requests.filter(request => request.method === 'POST' && request.path === '/api/v1/chat/conversations')
  expect(writes).toHaveLength(2)
  expect(writes[0].body.clientRequestId).toBe(writes[1].body.clientRequestId)
  expect(state.unmatched).toEqual([])
})

test('browser back with a draft is guarded once', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID_2}`)
  await page.getByRole('button', { name: /Bài toán xác suất QA/ }).click()
  await expect(page).toHaveURL(new RegExp(CHAT_ID))
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Bản nháp back QA')
  const dialog = page.getByRole('dialog', { name: 'Bỏ bản nháp chưa gửi?' })
  await page.goBack()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Tiếp tục viết', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(CHAT_ID))
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('Bản nháp back QA')
  await page.goBack()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Bỏ bản nháp', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(CHAT_ID_2))
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('')
  expect(state.unmatched).toEqual([])
})

test('logout with a draft is deferred and keeps the draft when cancelled', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Bản nháp logout QA')
  await page.getByRole('button', { name: 'Mở menu hồ sơ' }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
  const dialog = page.getByRole('dialog', { name: 'Bỏ bản nháp chưa gửi?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Tiếp tục viết', exact: true }).click()
  await expect(page).toHaveURL(new RegExp('/student/chat'))
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('Bản nháp logout QA')
  expect(state.requests.filter(request => request.path === '/api/v1/auth/logout')).toHaveLength(0)
  expect(state.unmatched).toEqual([])
})

test('discard dialog traps focus, Escape cancels, and restores focus', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Bản nháp focus QA')
  const other = page.getByRole('button', { name: /Bài toán hình học QA/ })
  await other.click()
  const dialog = page.getByRole('dialog', { name: 'Bỏ bản nháp chưa gửi?' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('Bản nháp focus QA')
  await expect(other).toBeFocused()
  expect(state.unmatched).toEqual([])
})

test('enter sends while shift+enter keeps composing a new line', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  const box = page.getByLabel('Tin nhắn', { exact: true })
  await box.fill('Dòng một')
  await box.press('Shift+Enter')
  await box.pressSequentially('Dòng hai')
  await expect(box).toHaveValue('Dòng một\nDòng hai')
  expect(state.requests.filter(request => request.method === 'POST' && request.path.endsWith('/messages'))).toHaveLength(0)
  await box.press('Enter')
  await expect.poll(() => state.requests.filter(request => request.method === 'POST' && request.path.endsWith('/messages')).length).toBe(1)
  const posted = state.requests.find(request => request.method === 'POST' && request.path.endsWith('/messages'))
  expect(posted?.body.body).toBe('Dòng một\nDòng hai')
  await expect(box).toHaveValue('')
  expect(state.unmatched).toEqual([])
})

test('mobile detail offers a back button to the conversation list', async ({ page }) => {
  await installChatFixture(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Tìm hội thoại')).toBeHidden()
  await page.getByRole('button', { name: 'Quay lại danh sách hội thoại', exact: true }).click()
  await expect(page.getByLabel('Tìm hội thoại')).toBeVisible()
  await expect(page).toHaveURL(/\/student\/chat$/)
})

test('new messages while reading older ones show a jump button without scrolling', async ({ page }) => {
  const state = await installChatFixture(page)
  for (let sequence = 2; sequence <= 30; sequence++) state.injectMessage(CHAT_ID, sequence, `Tin cũ đọc QA ${sequence}`)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Tin cũ đọc QA 30', { exact: true })).toBeVisible()
  const scroller = page.locator('section[aria-label="Hội thoại"] [aria-live="polite"]')
  await scroller.evaluate(element => { element.scrollTop = 0 })
  await page.waitForTimeout(120)
  expect(await scroller.evaluate(element => element.scrollTop)).toBeLessThan(50)
  state.injectMessage(CHAT_ID, 31, 'Tin mới khi đang đọc QA')
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(page.getByRole('button', { name: 'Tin nhắn mới ↓', exact: true })).toBeVisible()
  expect(await scroller.evaluate(element => element.scrollTop)).toBeLessThan(50)
  await page.getByRole('button', { name: 'Tin nhắn mới ↓', exact: true }).click()
  expect(await scroller.evaluate(element => Math.round(element.scrollTop + element.clientHeight) >= element.scrollHeight - 4)).toBe(true)
  expect(state.unmatched).toEqual([])
})

test('loading older history preserves the reading position', async ({ page }) => {
  const state = await installChatFixture(page)
  for (let sequence = 2; sequence <= 251; sequence++) state.injectMessage(CHAT_ID, sequence, `Tin cũ giữ chỗ QA ${sequence}`)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Tin cũ giữ chỗ QA 251', { exact: true })).toBeVisible()
  const scroller = page.locator('section[aria-label="Hội thoại"] [aria-live="polite"]')
  await scroller.evaluate(element => { element.scrollTop = 0 })
  await page.waitForTimeout(150)
  const anchorOffset = () => scroller.evaluate(element => {
    const article = Array.from(element.querySelectorAll('article')).find(node => node.textContent?.includes('Tin cũ giữ chỗ QA 152'))
    return article ? Math.round(article.getBoundingClientRect().top - element.getBoundingClientRect().top) : null
  })
  const before = await anchorOffset()
  await page.getByRole('button', { name: 'Tải tin nhắn cũ', exact: true }).click()
  await expect(page.getByText('Tin cũ giữ chỗ QA 52', { exact: true })).toBeVisible()
  await page.waitForTimeout(150)
  const after = await anchorOffset()
  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
  expect(Math.abs((after ?? 0) - (before ?? 0))).toBeLessThan(40)
  expect(state.unmatched).toEqual([])
})

test('invalid student conversation UUIDs never request detail', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto('/student/chat/not-a-uuid')
  await page.waitForTimeout(500)
  expect(state.requests.filter(request => request.path.includes('not-a-uuid'))).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('invalid console conversation UUIDs never request detail', async ({ page }) => {
  const state = await installChatFixture(page, 'STAFF')
  await page.goto('/staff/chat-queue?conversationId=not-a-uuid')
  await expect(page.getByText('Chọn yêu cầu để xem trạng thái và Mentor phụ trách.', { exact: true })).toBeVisible()
  expect(state.requests.filter(request => request.path.includes('not-a-uuid'))).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('context snapshot renders stored data escaped and only when present', async ({ page }) => {
  const state = await installChatFixture(page)
  const row = state.rows.get(CHAT_ID)!
  row.contextSnapshot = { source: 'ai-conversation', problem: '<img src=x onerror="window.__xss=1">', solution: 'Lời giải đã lưu QA' }
  await page.goto(`/student/chat/${CHAT_ID_2}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect(page.getByText('Ngữ cảnh bài toán', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /Bài toán xác suất QA/ }).click()
  await expect(page.getByText('Ngữ cảnh bài toán', { exact: true })).toBeVisible()
  await page.getByText('Ngữ cảnh bài toán', { exact: true }).click()
  await expect(page.getByText('Lời giải đã lưu QA', { exact: true })).toBeVisible()
  await expect(page.getByText('<img src=x onerror="window.__xss=1">', { exact: true })).toBeVisible()
  expect(await page.locator('img[src="x"]').count()).toBe(0)
  expect(await page.evaluate(() => (window as Window & { __xss?: number }).__xss)).toBeUndefined()
  expect(state.unmatched).toEqual([])
})

test('manager metadata view ignores transcript fields injected into responses', async ({ page }) => {
  const state = await installChatFixture(page, 'MANAGER')
  state.managementExtras = true
  await page.goto(`/manager/chat-monitoring?conversationId=${CHAT_ID}`)
  await expect(page.getByRole('heading', { name: 'Bài toán xác suất QA', exact: true })).toBeVisible()
  await expect(page.getByText('Bản xem trước bí mật QA', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Bí mật ngữ cảnh QA', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Ngữ cảnh bài toán', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toHaveCount(0)
  expect(state.requests.filter(request => request.path.endsWith('/messages'))).toHaveLength(0)
  // Prove the responses really carried the tempting fields the screen must ignore.
  const injected = await page.evaluate(async (id) => {
    // @ts-expect-error - Vite serves this module path only inside the browser.
    const service = await import('/src/services/chatService.ts')
    const result = await service.chatService.getManagementConversation(id)
    const data = result.data as { lastMessagePreview?: string; contextSnapshot?: unknown }
    return { preview: data?.lastMessagePreview, hasSnapshot: Boolean(data?.contextSnapshot) }
  }, CHAT_ID)
  expect(injected).toEqual({ preview: 'Bản xem trước bí mật QA', hasSnapshot: true })
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('staff queue paginates more than one hundred requests without duplicates', async ({ page }) => {
  const state = await installChatFixture(page, 'STAFF')
  state.conversationPageSize = 25
  state.addConversations(110)
  await page.goto('/staff/chat-queue')
  const queueRows = page.locator('section[aria-label="Hàng đợi Hỏi Mentor"] button[aria-pressed]')
  await expect(queueRows).toHaveCount(25)
  const more = page.getByRole('button', { name: 'Tải thêm yêu cầu', exact: true })
  for (let step = 0; step < 6; step++) {
    if (await more.count() === 0) break
    const before = await queueRows.count()
    await more.click()
    await expect.poll(() => queueRows.count()).toBeGreaterThan(before)
  }
  await expect(more).toHaveCount(0)
  const count = await queueRows.count()
  expect(count).toBeGreaterThan(100)
  expect(count).toBe(112)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('assignment mentor picker loads the next page before saving', async ({ page }) => {
  const state = await installChatFixture(page, 'STAFF')
  state.mentorPageSize = 1
  state.mentors.push({ id: '40000000-0000-0000-0000-000000000010', displayName: 'Mentor QA 1' })
  await page.goto(`/staff/chat-queue?conversationId=${CHAT_ID}`)
  await page.getByRole('button', { name: 'Đổi Mentor', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Phân công Mentor', exact: true })
  await expect(dialog.getByRole('option', { name: 'Mentor QA', exact: true })).toBeAttached()
  await expect(dialog.getByRole('option', { name: 'Mentor QA 1', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Tải thêm Mentor', exact: true }).click()
  await expect(dialog.getByRole('option', { name: 'Mentor QA 1', exact: true })).toBeAttached()
  await dialog.getByRole('combobox', { name: 'Mentor phụ trách', exact: true }).selectOption('40000000-0000-0000-0000-000000000010')
  await dialog.getByRole('textbox', { name: 'Lý do phân công', exact: true }).fill('Chọn Mentor trang hai QA')
  await dialog.getByRole('button', { name: 'Lưu phân công', exact: true }).click()
  await expect(dialog).toBeHidden()
  const write = state.requests.find(request => request.path.endsWith('/assignment'))
  expect(write?.body.mentorId).toBe('40000000-0000-0000-0000-000000000010')
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('switching account clears manager metadata and assignment draft', async ({ page }) => {
  const state = await installChatFixture(page, 'STAFF')
  await page.goto(`/staff/chat-queue?conversationId=${CHAT_ID}`)
  await expect(page.getByRole('heading', { name: 'Bài toán xác suất QA', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Đổi Mentor', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Phân công Mentor', exact: true })
  await dialog.getByRole('textbox', { name: 'Lý do phân công', exact: true }).fill('Lý do nháp đổi phiên QA')
  await page.evaluate(() => {
    const encoded = btoa(JSON.stringify({ sub: '88888888-8888-8888-8888-888888888888', role: 'STAFF', exp: Math.floor(Date.now() / 1000) + 3600 }))
    localStorage.setItem('hocluc.accessToken', `fixture.${encoded}.fixture`)
    window.dispatchEvent(new StorageEvent('storage', { key: 'hocluc.accessToken' }))
  })
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Đổi Mentor', exact: true }).click()
  const reopened = page.getByRole('dialog', { name: 'Phân công Mentor', exact: true })
  await expect(reopened.getByRole('textbox', { name: 'Lý do phân công', exact: true })).toHaveValue('')
  await expect(reopened.getByRole('combobox', { name: 'Mentor phụ trách', exact: true })).toHaveValue('')
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('mentor reassignment 403 purges transcript and composer draft', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Bản nháp bị thu hồi QA')
  state.revoked.add(CHAT_ID)
  await page.getByRole('button', { name: 'Tải lại chat', exact: true }).click()
  await expect(page.getByText('Bạn không còn quyền truy cập hội thoại này.', { exact: true })).toBeVisible()
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveCount(0)
  state.revoked.delete(CHAT_ID)
  await page.getByRole('button', { name: 'Tải lại chat', exact: true }).click()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('')
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('working hours load failure never saves an empty schedule', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  state.hoursFail = 'load'
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Giờ hỗ trợ', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Giờ hỗ trợ Mentor', exact: true })
  await expect(dialog.getByText('Dịch vụ lịch hỗ trợ tạm thời không khả dụng.', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/thao tác lưu đang bị khóa/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Lưu lịch', exact: true })).toBeDisabled()
  expect(state.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/working-hours'))).toHaveLength(0)
  state.hoursFail = null
  await dialog.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(dialog.getByText('Chưa thiết lập lịch hỗ trợ.', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Thêm khoảng giờ', exact: true }).click()
  await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
  await expect(dialog.getByText('Đã lưu giờ hỗ trợ.', { exact: true })).toBeVisible()
  const writes = state.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/working-hours'))
  expect(writes).toHaveLength(1)
  expect(writes[0].body).toEqual({ timezone: 'Asia/Ho_Chi_Minh', intervals: [{ dayOfWeek: 1, startLocal: '09:00', endLocal: '17:00' }] })
  expect(state.workingHours.intervals).toHaveLength(1)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('working hours reject invalid and overlapping intervals before a valid save', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  state.workingHours.intervals = [{ dayOfWeek: 1, startLocal: '09:00', endLocal: '12:00' }]
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Giờ hỗ trợ', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Giờ hỗ trợ Mentor', exact: true })
  await expect(dialog.getByLabel('Bắt đầu 1', { exact: true })).toHaveValue('09:00')
  await dialog.getByRole('button', { name: 'Thêm khoảng giờ', exact: true }).click()
  // The default new row (09:00–17:00, same day) overlaps the stored interval.
  await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
  await expect(dialog.getByText('Các khoảng giờ trong cùng ngày không được chồng lấn.', { exact: true })).toBeVisible()
  expect(state.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/working-hours'))).toHaveLength(0)
  await dialog.getByLabel('Bắt đầu 2', { exact: true }).fill('15:00')
  await dialog.getByLabel('Kết thúc 2', { exact: true }).fill('14:00')
  await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
  await expect(dialog.getByText(/Giờ kết thúc phải sau giờ bắt đầu/)).toBeVisible()
  expect(state.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/working-hours'))).toHaveLength(0)
  await dialog.getByLabel('Bắt đầu 2', { exact: true }).fill('13:00')
  await dialog.getByLabel('Kết thúc 2', { exact: true }).fill('15:00')
  await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
  await expect(dialog.getByText('Đã lưu giờ hỗ trợ.', { exact: true })).toBeVisible()
  const writes = state.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/working-hours'))
  expect(writes).toHaveLength(1)
  expect(writes[0].body.timezone).toBe('Asia/Ho_Chi_Minh')
  const intervals = writes[0].body.intervals as { dayOfWeek: number; startLocal: string; endLocal: string }[]
  expect(intervals).toContainEqual({ dayOfWeek: 1, startLocal: '09:00', endLocal: '12:00' })
  expect(intervals).toContainEqual({ dayOfWeek: 1, startLocal: '13:00', endLocal: '15:00' })
  expect(state.workingHours.intervals).toHaveLength(2)
  expect(state.unmatched).toEqual([])
})

test('working hours dirty close is guarded and saving blocks dismissal', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  state.hoursDelayMs = 700
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Giờ hỗ trợ', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Giờ hỗ trợ Mentor', exact: true })
  await dialog.getByRole('button', { name: 'Thêm khoảng giờ', exact: true }).click()
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
  await expect(dialog.getByText('Lịch chưa lưu.', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click()
  await expect(dialog.getByText('Lịch chưa lưu.', { exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Đã lưu giờ hỗ trợ.', { exact: true })).toBeVisible()
  await dialog.getByLabel('Bắt đầu 1', { exact: true }).fill('08:00')
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
  await dialog.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('assignment draft is guarded and saving blocks dismissal', async ({ page }) => {
  const state = await installChatFixture(page, 'STAFF')
  state.assignmentDelayMs = 700
  await page.goto(`/staff/chat-queue?conversationId=${CHAT_ID}`)
  await page.getByRole('button', { name: 'Đổi Mentor', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Phân công Mentor', exact: true })
  await dialog.getByRole('combobox', { name: 'Mentor phụ trách', exact: true }).selectOption(MENTOR_ID)
  await dialog.getByRole('textbox', { name: 'Lý do phân công', exact: true }).fill('Lý do nháp bảo vệ QA')
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: 'Bỏ thay đổi phân công?', exact: true })
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'Tiếp tục chỉnh sửa', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Lý do phân công', exact: true })).toHaveValue('Lý do nháp bảo vệ QA')
  await dialog.getByRole('button', { name: 'Lưu phân công', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Đang lưu…', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(dialog).toBeHidden()
  expect(state.requests.filter(request => request.path.endsWith('/assignment'))).toHaveLength(1)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('attachments reserve, stage without JWT, complete, then bind on send', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByLabel('Đính kèm ảnh hoặc PDF', { exact: true }).setInputFiles({ name: 'de-bai.png', mimeType: 'image/png', buffer: Buffer.from('png-fixture') })
  await expect(page.getByText('de-bai.png', { exact: true })).toBeVisible()
  expect(state.uploads).toHaveLength(1)
  expect(state.uploads[0].authorization).toBeNull()
  expect(state.uploads[0].bytes).toBe(Buffer.byteLength('png-fixture'))
  const reserve = state.requests.find(request => request.path.endsWith('/attachments/upload-url'))
  expect(reserve?.body).toMatchObject({ name: 'de-bai.png', mimeType: 'image/png', sizeBytes: 11 })
  const index = (needle: string) => state.timeline.findIndex(line => line.includes(needle))
  expect(index('/attachments/upload-url')).toBeLessThan(index('/__upload/att-1'))
  expect(index('/__upload/att-1')).toBeLessThan(index('/attachments/att-1/complete'))
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Gửi kèm tệp QA')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await expect(page.getByText('Gửi kèm tệp QA', { exact: true })).toBeVisible()
  const sent = state.requests.find(request => request.method === 'POST' && request.path.endsWith('/messages'))
  expect(sent?.body.attachmentIds).toEqual(['att-1'])
  expect(index('/attachments/att-1/complete')).toBeLessThan(index(`POST /api/v1/chat/conversations/${CHAT_ID}/messages`))
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('attachment capability rejects wrong MIME, oversize and too many files', async ({ page }) => {
  const state = await installChatFixture(page)
  state.maxFileBytes = 4
  state.maxAttachments = 1
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  const input = page.getByLabel('Đính kèm ảnh hoặc PDF', { exact: true })
  await input.setInputFiles({ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('x') })
  await expect(page.getByText('Chỉ nhận ảnh JPEG, PNG, WebP hoặc PDF trong giới hạn dung lượng.', { exact: true })).toBeVisible()
  await input.setInputFiles({ name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(16) })
  await expect(page.getByText('Chỉ nhận ảnh JPEG, PNG, WebP hoặc PDF trong giới hạn dung lượng.', { exact: true })).toBeVisible()
  await input.setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: Buffer.alloc(2) },
    { name: 'b.png', mimeType: 'image/png', buffer: Buffer.alloc(2) },
  ])
  await expect(page.getByText('Mỗi tin nhắn tối đa 1 tệp.', { exact: true })).toBeVisible()
  expect(state.requests.filter(request => request.path.includes('upload-url'))).toHaveLength(0)
  expect(state.uploads).toHaveLength(0)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('failed attachment upload keeps composer clean and sends no incomplete binding', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  state.failUpload = true
  const input = page.getByLabel('Đính kèm ảnh hoặc PDF', { exact: true })
  await input.setInputFiles({ name: 'loi.png', mimeType: 'image/png', buffer: Buffer.from('png-fixture') })
  await expect(page.getByText('Tải tệp không thành công. Vui lòng thử lại.', { exact: true })).toBeVisible()
  await expect(page.getByText('loi.png', { exact: true })).toHaveCount(0)
  expect(state.requests.filter(request => request.path.endsWith('/complete'))).toHaveLength(0)
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Chỉ gửi chữ QA')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await expect(page.getByText('Chỉ gửi chữ QA', { exact: true })).toBeVisible()
  const sent = state.requests.find(request => request.method === 'POST' && request.path.endsWith('/messages'))
  expect(sent?.body.attachmentIds).toEqual([])
  state.failUpload = false
  await input.setInputFiles({ name: 'thanh-cong.png', mimeType: 'image/png', buffer: Buffer.from('png-fixture') })
  await expect(page.getByText('thanh-cong.png', { exact: true })).toBeVisible()
  expect(state.requests.filter(request => request.path.endsWith('/complete'))).toHaveLength(1)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('download URL is validated and content is fetched with the current bearer before preview', async ({ page }) => {
  const state = await installChatFixture(page)
  state.transcripts.get(CHAT_ID)![0].attachments = [{ id: 'att-dl', name: 'de-bai.pdf', mimeType: 'application/pdf', sizeBytes: 10 }]
  await page.goto(`/student/chat/${CHAT_ID}`)
  const link = page.getByRole('button', { name: 'de-bai.pdf', exact: true })
  await expect(link).toBeVisible()
  state.downloadUrl = 'javascript:window.__dl=1'
  await link.click()
  await expect(page.getByText('Đường dẫn tệp không hợp lệ.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => (window as Window & { __dl?: number }).__dl)).toBeUndefined()
  state.downloadUrl = null
  const popupPromise = page.waitForEvent('popup')
  await link.click()
  const popup = await popupPromise
  await expect.poll(() => popup.url()).toMatch(/^blob:/)
  const contentRequest = state.requests.find(request => request.path.endsWith('/attachments/att-dl/content'))
  expect(contentRequest?.authorization).toMatch(/^Bearer fixture\./)
  await popup.close()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('composer blocks navigation while an upload is in flight', async ({ page }) => {
  const state = await installChatFixture(page)
  state.uploadDelayMs = 700
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByLabel('Đính kèm ảnh hoặc PDF', { exact: true }).setInputFiles({ name: 'dang-tai.png', mimeType: 'image/png', buffer: Buffer.from('png-fixture') })
  await expect(page.getByText('Đang tải tệp…', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Bài toán hình học QA/ }).click()
  await expect(page).toHaveURL(new RegExp(CHAT_ID))
  await expect(page.getByRole('dialog', { name: 'Bỏ bản nháp chưa gửi?' })).toHaveCount(0)
  await expect(page.getByText('dang-tai.png', { exact: true })).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: /Bài toán hình học QA/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Bỏ bản nháp chưa gửi?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Bỏ bản nháp', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(CHAT_ID_2))
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

// Observe browser delivery before advancing the paused 350ms coalescing window.
async function observeChatSocketFrames(page: Page) {
  await page.addInitScript(() => {
    const dispatch = EventTarget.prototype.dispatchEvent
    const ids: string[] = []
    // routeWebSocket installs its own WebSocket class. Observe its dispatched
    // MessageEvent instead of relying on init-script constructor ordering.
    EventTarget.prototype.dispatchEvent = function (event: Event) {
      const result = dispatch.call(this, event)
      if (event instanceof MessageEvent && event.type === 'message' && typeof event.data === 'string') {
        for (const frame of event.data.split('\0')) {
          const body = frame.split('\n\n')[1]
          if (!body) continue
          try {
            const payload = JSON.parse(body)
            if (typeof payload.eventId === 'string') ids.push(payload.eventId)
          } catch { /* Non-metadata frames are irrelevant to this observer. */ }
        }
        document.documentElement.dataset.chatTestEventIds = JSON.stringify(ids)
      }
      return result
    }
  })
}

async function expectDeliveredFrame(page: Page, eventId: string) {
  await expect.poll(() => page.evaluate(id => {
    const ids = JSON.parse(document.documentElement.dataset.chatTestEventIds || '[]') as string[]
    return ids.includes(id)
  }, eventId)).toBe(true)
}

async function settleSocketBaseline(page: Page) {
  // Body/SUBSCRIBE alone do not prove CONNECT reconciliation and inbox debounce
  // completed. Wait for their REST response/render before resetting counters.
  const detail = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/chat/conversations/${CHAT_ID}`)
  await page.clock.runFor(2000)
  await (await detail).finished()
  await expect(page.getByRole('button', { name: /Bài toán hình học QA/ })).toBeVisible()
  await expect(page.getByText('Đang tải…', { exact: true })).toHaveCount(0)
}

test('coalesces socket metadata bursts without dropping selected detail recovery', async ({ page }) => {
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 60_000)
  await observeChatSocketFrames(page)
  const state = await installChatFixture(page, 'STUDENT', { socketMock: true })
  // Measure metadata coalescing separately from the independent automatic read.
  state.rows.get(CHAT_ID)!.lastReadSequence = 1
  state.rows.get(CHAT_ID)!.unreadCount = 0
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect.poll(() => state.socketConnections.filter(connection => connection.subscribed).length).toBe(1)
  await settleSocketBaseline(page)
  state.requests.length = 0
  for (let index = 0; index < 12; index++) state.sendSocketFrame(JSON.stringify({
    type: 'conversation.assigned', eventId: `burst-${index}`, conversationId: CHAT_ID, assignmentVersion: 3,
  }))
  await expect.poll(() => page.evaluate(() => JSON.parse(document.documentElement.dataset.chatTestEventIds || '[]').filter((id: string) => id.startsWith('burst-')).length as number)).toBe(12)
  await page.clock.runFor(1500)
  await expect.poll(() => state.requests.filter(request => request.path === `/api/v1/chat/conversations/${CHAT_ID}`).length).toBeGreaterThan(0)
  expect(state.requests.filter(request => request.path === '/api/v1/chat/conversations').length).toBeLessThanOrEqual(2)
  expect(state.requests.filter(request => request.path === `/api/v1/chat/conversations/${CHAT_ID}`).length).toBeLessThanOrEqual(1)
  state.injectMessage(CHAT_ID, 2, 'Burst recovery QA')
  state.sendSocketFrame(JSON.stringify({ type: 'message.created', eventId: 'burst-new-message', conversationId: CHAT_ID, sequence: 2 }))
  await expectDeliveredFrame(page, 'burst-new-message')
  await page.clock.runFor(1000)
  await expect(page.getByText('Burst recovery QA', { exact: true })).toBeVisible()
  expect(state.pageErrors).toEqual([])
})

test('peer read cursors do not reload my inbox or transcript; my cursor reconciles inbox only', async ({ page }) => {
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 60_000)
  await observeChatSocketFrames(page)
  const state = await installChatFixture(page, 'STUDENT', { socketMock: true })
  state.rows.get(CHAT_ID)!.lastReadSequence = 1
  state.rows.get(CHAT_ID)!.unreadCount = 0
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect.poll(() => state.socketConnections.filter(connection => connection.subscribed).length).toBe(1)
  await settleSocketBaseline(page)
  state.requests.length = 0
  state.sendSocketFrame(JSON.stringify({ type: 'message.read', eventId: 'peer-read', conversationId: CHAT_ID, userId: MENTOR_ID, lastReadSequence: 1 }))
  await expectDeliveredFrame(page, 'peer-read')
  await page.clock.runFor(1000)
  expect(state.requests.filter(request => request.path.startsWith('/api/v1/chat/conversations'))).toHaveLength(0)
  state.sendSocketFrame(JSON.stringify({ type: 'message.read', eventId: 'my-read', conversationId: CHAT_ID, userId: 'student', lastReadSequence: 1 }))
  await expectDeliveredFrame(page, 'my-read')
  await page.clock.runFor(1000)
  await expect.poll(() => state.requests.filter(request => request.path === '/api/v1/chat/conversations').length).toBe(1)
  expect(state.requests.filter(request => request.path === `/api/v1/chat/conversations/${CHAT_ID}`)).toHaveLength(0)
})

test('socket events are metadata-only and malformed frames never disconnect', async ({ page }) => {
  const state = await installChatFixture(page, 'STUDENT', { socketMock: true })
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect(page.getByText(/Đang kết nối chat|Chat đang ngoại tuyến/)).toHaveCount(0, { timeout: 10_000 })
  state.sendSocketFrame('not-json')
  state.sendSocketFrame(JSON.stringify({ type: 'not.a.type', conversationId: CHAT_ID, body: 'BÍ MẬT SOCKET QA' }))
  state.injectMessage(CHAT_ID, 2, 'Tin qua socket QA')
  state.sendSocketFrame(JSON.stringify({ type: 'message.created', eventId: 'evt-1', conversationId: CHAT_ID, body: 'BÍ MẬT SOCKET QA' }))
  await expect(page.getByText('Tin qua socket QA', { exact: true })).toBeVisible()
  await expect(page.getByText('BÍ MẬT SOCKET QA', { exact: true })).toHaveCount(0)
  // The connection survived the malformed frames: a fresh event still refreshes.
  state.injectMessage(CHAT_ID, 3, 'Tin tiếp theo QA')
  state.sendSocketFrame(JSON.stringify({ type: 'message.created', eventId: 'evt-2', conversationId: CHAT_ID }))
  await expect(page.getByText('Tin tiếp theo QA', { exact: true })).toBeVisible()
  expect(state.pageErrors).toEqual([])
  expect(state.unmatched).toEqual([])
})

test('mentor console screen renders from fixture at desktop and mobile', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.screenshot({ path: '.pi/qa/chat/mentor-chat-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.screenshot({ path: '.pi/qa/chat/mentor-chat-mobile.png', fullPage: true })
  expect(state.pageErrors).toEqual([])
})

test('manager monitoring screen renders from fixture at desktop and mobile', async ({ page }) => {
  const state = await installChatFixture(page, 'MANAGER')
  await page.goto(`/manager/chat-monitoring?conversationId=${CHAT_ID}`)
  await expect(page.getByRole('heading', { name: 'Bài toán xác suất QA', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toBeVisible()
  await page.screenshot({ path: '.pi/qa/chat/manager-monitoring-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Bài toán xác suất QA', exact: true })).toBeVisible()
  await page.screenshot({ path: '.pi/qa/chat/manager-monitoring-mobile.png', fullPage: true })
  expect(state.pageErrors).toEqual([])
})

test('a revoked transcript stays purged when an older page resolves late', async ({ page }) => {
  const state = await installChatFixture(page)
  for (let sequence = 2; sequence <= 250; sequence++) state.injectMessage(CHAT_ID, sequence, `Tin cũ thu hồi QA ${sequence}`)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Tin cũ thu hồi QA 250', { exact: true })).toBeVisible()
  state.beforeDelayMs = 800
  await page.getByRole('button', { name: 'Tải tin nhắn cũ', exact: true }).click()
  await page.waitForTimeout(120)
  state.revoked.add(CHAT_ID)
  await page.getByRole('button', { name: 'Tải lại chat', exact: true }).click()
  await expect(page.getByText('Bạn không còn quyền truy cập hội thoại này.', { exact: true })).toBeVisible()
  await page.waitForTimeout(1400)
  await expect(page.getByText(/^Tin cũ thu hồi QA \d+$/)).toHaveCount(0)
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveCount(0)
  expect(state.pageErrors).toEqual([])
})

test('a one-page transcript never offers load-older after a catch-up', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  state.injectMessage(CHAT_ID, 2, 'Tin nối trang QA')
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(page.getByText('Tin nối trang QA', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tải tin nhắn cũ', exact: true })).toHaveCount(0)
  expect(state.unmatched).toEqual([])
})

test('a failed pending send can be cancelled without leaving the conversation', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  state.loseSendResponse = true
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Tin bị kẹt QA')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Thử gửi lại', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Hủy tin chưa gửi', exact: true }).click()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Gửi', exact: true })).toBeDisabled()
  expect(state.unmatched).toEqual([])
})

test('capability-level send restriction disables the composer with its reason', async ({ page }) => {
  const state = await installChatFixture(page)
  state.canSend = false
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect(page.getByText('Tài khoản đang tạm ngừng gửi tin.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Gửi', exact: true })).toBeDisabled()
  await expect(page.getByLabel('Đính kèm ảnh hoặc PDF', { exact: true })).toBeDisabled()
  expect(state.requests.filter(request => request.method === 'POST')).toHaveLength(0)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('multi-file upload keeps completed files and never binds the failed one', async ({ page }) => {
  const state = await installChatFixture(page)
  state.uploadFailAt = 1
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByLabel('Đính kèm ảnh hoặc PDF', { exact: true }).setInputFiles([
    { name: 'hoan-tat.png', mimeType: 'image/png', buffer: Buffer.from('png-fixture') },
    { name: 'that-bai.png', mimeType: 'image/png', buffer: Buffer.from('png-fixture') },
  ])
  await expect(page.getByText('hoan-tat.png', { exact: true })).toBeVisible()
  await expect(page.getByText('that-bai.png', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Tải tệp không thành công. Vui lòng thử lại.', { exact: true })).toBeVisible()
  expect(state.requests.filter(request => request.path.endsWith('/complete'))).toHaveLength(1)
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Gửi tệp hoàn tất QA')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await expect(page.getByText('Gửi tệp hoàn tất QA', { exact: true })).toBeVisible()
  const sent = state.requests.find(request => request.method === 'POST' && request.path.endsWith('/messages'))
  expect(sent?.body.attachmentIds).toEqual(['att-1'])
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})


test('a failed later catch-up page never advances the committed cursor', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  for (let sequence = 2; sequence <= 251; sequence++) state.injectMessage(CHAT_ID, sequence, `audit gap ${sequence}`)
  let failed = false
  await page.route('**/messages?**', async route => {
    if (!failed && new URL(route.request().url()).searchParams.get('afterSequence') === '101') {
      failed = true
      await route.abort('connectionfailed')
      return
    }
    await route.fallback()
  })
  await page.getByRole('button', { name: 'Tải lại chat', exact: true }).click()
  await expect.poll(() => failed).toBe(true)
  await expect(page.getByText('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tải lại chat', exact: true }).click()
  await expect(page.getByText('audit gap 251', { exact: true })).toHaveCount(1)
  const missing = await page.getByText('audit gap 2', { exact: true }).count()
  expect(missing).toBe(1)
})

test('an unread background refresh removes conversations that were read', async ({ page }) => {
  const state = await installChatFixture(page)
  state.rows.get('d0000000-0000-0000-0000-000000000002')!.unreadCount = 0
  await page.goto('/student/chat')
  await page.getByLabel('Chưa đọc', { exact: true }).check()
  await expect(page.getByRole('button', { name: /Bài toán hình học QA/ })).toHaveCount(0)
  let returnedEmpty = false
  await page.route('**/api/v1/chat/conversations?**', async route => {
    if (new URL(route.request().url()).searchParams.get('unread') === 'true' && state.rows.get(CHAT_ID)!.unreadCount === 0) {
      returnedEmpty = true
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, status: 200, data: { items: [], nextCursor: null } }) })
      return
    }
    await route.fallback()
  })
  await page.getByRole('button', { name: /Bài toán xác suất QA/ }).click()
  await expect.poll(() => state.rows.get(CHAT_ID)!.unreadCount).toBe(0)
  await expect.poll(() => returnedEmpty).toBe(true)
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toHaveCount(0)
  await expect(page.getByLabel('1 tin chưa đọc')).toHaveCount(0)
})

test('a stale catch-up response cannot advance another conversation cursor', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  state.injectMessage(CHAT_ID, 101, 'Stale A response QA')
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  let started = false
  let delivered = false
  await page.route(`**/conversations/${CHAT_ID}/messages?**`, async route => {
    if (new URL(route.request().url()).searchParams.get('afterSequence') === '1') {
      started = true
      await held
      await route.fallback()
      delivered = true
    } else await route.fallback()
  })
  await page.getByRole('button', { name: 'Tải lại chat', exact: true }).click()
  await expect.poll(() => started).toBe(true)
  await page.getByRole('button', { name: /Bài toán hình học QA/ }).click()
  await expect(page).toHaveURL(new RegExp(CHAT_ID_2))
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  release()
  await expect.poll(() => delivered).toBe(true)
  state.injectMessage(CHAT_ID_2, 2, 'Fresh B response QA')
  await page.getByRole('button', { name: 'Tải lại chat', exact: true }).click()
  await expect(page.getByText('Fresh B response QA', { exact: true })).toBeVisible()
  await expect(page.getByText('Stale A response QA', { exact: true })).toHaveCount(0)
  expect(state.pageErrors).toEqual([])
})

test('filtered background refresh reconciles all loaded pages and keeps pagination usable', async ({ page }) => {
  const state = await installChatFixture(page)
  state.conversationPageSize = 1
  state.addConversations(2)
  await page.goto('/student/chat')
  await page.getByLabel('Chưa đọc', { exact: true }).check()
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toBeVisible()
  await page.getByRole('button', { name: 'Tải thêm hội thoại', exact: true }).click()
  await expect(page.getByRole('button', { name: /Bài toán hình học QA/ })).toBeVisible()
  state.rows.get(CHAT_ID)!.unreadCount = 0
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Bài toán hình học QA/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Yêu cầu QA 1/ })).toBeVisible()
  await page.getByRole('button', { name: 'Tải thêm hội thoại', exact: true }).click()
  await expect(page.getByRole('button', { name: /Yêu cầu QA 2/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Yêu cầu QA 1/ })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Tải thêm hội thoại', exact: true })).toHaveCount(0)
  expect(state.pageErrors).toEqual([])
})

test('a resolved conversation leaves the in-progress inbox filter', async ({ page }) => {
  const state = await installChatFixture(page)
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByLabel('Trạng thái hội thoại', { exact: true }).selectOption('IN_PROGRESS')
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toBeVisible()
  await page.getByRole('button', { name: 'Hoàn tất', exact: true }).click()
  await expect.poll(() => state.rows.get(CHAT_ID)!.status).toBe('RESOLVED')
  await expect(page.getByRole('button', { name: /Bài toán xác suất QA/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Bài toán hình học QA/ })).toBeVisible()
  expect(state.pageErrors).toEqual([])
})

test('a connected socket rotates JWT without losing draft or subsequent events', async ({ page }) => {
  const state = await installChatFixture(page, 'STUDENT', { socketMock: true })
  await page.goto(`/student/chat/${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await expect.poll(() => state.socketConnections.filter(connection => connection.subscribed).length).toBe(1)
  await page.getByLabel('Tin nhắn', { exact: true }).fill('Bản nháp giữ khi refresh JWT')
  const encoded = Buffer.from(JSON.stringify({ sub: 'student', role: 'STUDENT', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64')
  const rotated = `rotated.${encoded}.fixture`
  await page.evaluate(async accessToken => {
    const source = '/src/lib/api.ts'
    const api = await import(source)
    api.setTokens({ accessToken, refreshToken: 'rotated-STUDENT' })
  }, rotated)
  await expect.poll(() => state.socketConnections.filter(connection => connection.subscribed).length).toBe(2)
  expect(state.socketConnections[0].disconnected).toBe(true)
  expect(state.socketConnections[1].authorization).toBe(`Bearer ${rotated}`)
  await expect(page.getByLabel('Tin nhắn', { exact: true })).toHaveValue('Bản nháp giữ khi refresh JWT')
  state.injectMessage(CHAT_ID, 2, 'Sự kiện sau JWT rotation QA')
  state.sendSocketFrame(JSON.stringify({ type: 'message.created', eventId: 'rotation-evt', conversationId: CHAT_ID, sequence: 2 }))
  await expect(page.getByText('Sự kiện sau JWT rotation QA', { exact: true })).toBeVisible()
  expect(state.requests.filter(request => request.path.endsWith('/messages')).at(-1)?.authorization).toBe(`Bearer ${rotated}`)
  expect(state.requests.filter(request => request.path.endsWith('/auth/refresh'))).toHaveLength(0)
  expect(state.pageErrors).toEqual([])
  expect(state.unmatched).toEqual([])
})

test('Sunday overnight hours are rejected without writing or altering the stored schedule', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  state.workingHours.intervals = [{ dayOfWeek: 7, startLocal: '22:00', endLocal: '23:00' }]
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Giờ hỗ trợ', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Giờ hỗ trợ Mentor', exact: true })
  await expect(dialog.getByLabel('Ngày hỗ trợ 1', { exact: true })).toHaveValue('7')
  await dialog.getByLabel('Kết thúc 1', { exact: true }).fill('01:00')
  await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
  await expect(dialog.getByText(/Lịch qua nửa đêm cần tách thành hai dòng/)).toBeVisible()
  expect(state.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/working-hours'))).toHaveLength(0)
  expect(state.workingHours.intervals).toEqual([{ dayOfWeek: 7, startLocal: '22:00', endLocal: '23:00' }])
  expect(state.pageErrors).toEqual([])
})

test('Sunday midnight split saves and reloads 24:00 exactly without overlap or a missing minute', async ({ page }) => {
  const state = await installChatFixture(page, 'MENTOR')
  state.workingHours.intervals = [{ dayOfWeek: 7, startLocal: '22:00', endLocal: '23:00' }]
  await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
  await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Giờ hỗ trợ', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Giờ hỗ trợ Mentor', exact: true })
  await expect(dialog.getByLabel('Bắt đầu 1', { exact: true })).toHaveValue('22:00')
  await dialog.getByLabel('Kết thúc cuối ngày 1', { exact: true }).check()
  await expect(dialog.getByLabel('Kết thúc 1', { exact: true })).toHaveValue('24:00')
  await dialog.getByRole('button', { name: 'Thêm khoảng giờ', exact: true }).click()
  await dialog.getByLabel('Bắt đầu 2', { exact: true }).fill('00:00')
  await dialog.getByLabel('Kết thúc 2', { exact: true }).fill('01:00')
  await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
  await expect(dialog.getByText('Đã lưu giờ hỗ trợ.', { exact: true })).toBeVisible()
  expect(state.workingHours).toEqual({ timezone: 'Asia/Ho_Chi_Minh', intervals: [
    { dayOfWeek: 7, startLocal: '22:00', endLocal: '24:00' },
    { dayOfWeek: 1, startLocal: '00:00', endLocal: '01:00' },
  ] })
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
  await page.getByRole('button', { name: 'Giờ hỗ trợ', exact: true }).click()
  await expect(dialog.getByLabel('Kết thúc 1', { exact: true })).toHaveValue('24:00')
  await expect(dialog.getByLabel('Kết thúc cuối ngày 1', { exact: true })).toBeChecked()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await dialog.screenshot({ path: '.pi/qa/chat/mentor-hours-midnight-mobile.png' })
  await dialog.getByRole('button', { name: 'Thêm khoảng giờ', exact: true }).click()
  await dialog.getByLabel('Ngày hỗ trợ 3', { exact: true }).selectOption('7')
  await dialog.getByLabel('Bắt đầu 3', { exact: true }).fill('23:30')
  await dialog.getByLabel('Kết thúc cuối ngày 3', { exact: true }).check()
  await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
  await expect(dialog.getByText('Các khoảng giờ trong cùng ngày không được chồng lấn.', { exact: true })).toBeVisible()
  expect(state.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/working-hours'))).toHaveLength(1)
  await dialog.getByLabel('Ngày hỗ trợ 3', { exact: true }).selectOption('1')
  await dialog.getByLabel('Bắt đầu 3', { exact: true }).fill('01:00')
  await dialog.getByLabel('Kết thúc cuối ngày 3', { exact: true }).uncheck()
  await expect(dialog.getByLabel('Kết thúc 3', { exact: true })).toHaveValue('')
  await dialog.getByLabel('Kết thúc 3', { exact: true }).fill('02:00')
  await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
  await expect(dialog.getByText('Đã lưu giờ hỗ trợ.', { exact: true })).toBeVisible()
  expect(state.workingHours.intervals).toContainEqual({ dayOfWeek: 1, startLocal: '01:00', endLocal: '02:00' })
  expect(state.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/working-hours'))).toHaveLength(2)
  expect(state.pageErrors).toEqual([])
  expect(state.unmatched).toEqual([])
})

for (const interval of [
  { dayOfWeek: 7, startLocal: '24:00', endLocal: '24:00' },
  { dayOfWeek: 7, startLocal: '22:00', endLocal: '24:01' },
]) {
  test(`invalid midnight boundary ${interval.startLocal}-${interval.endLocal} cannot be saved`, async ({ page }) => {
    const state = await installChatFixture(page, 'MENTOR')
    state.workingHours.intervals = [interval]
    await page.goto(`/mentor/chat?conversationId=${CHAT_ID}`)
    await expect(page.getByText('Lời giải riêng tư QA', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Giờ hỗ trợ', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Giờ hỗ trợ Mentor', exact: true })
    await expect(dialog.getByRole('button', { name: 'Lưu lịch', exact: true })).toBeEnabled()
    await dialog.getByRole('button', { name: 'Lưu lịch', exact: true }).click()
    await expect(dialog.getByText(/24:00 chỉ dùng cho giờ kết thúc cuối ngày/)).toBeVisible()
    expect(state.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/working-hours'))).toHaveLength(0)
    expect(state.pageErrors).toEqual([])
  })
}

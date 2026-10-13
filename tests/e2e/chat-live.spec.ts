import { expect, test, type BrowserContext } from '@playwright/test'
import { authenticated, liveManifest, login, watch, type LiveRole, type LiveTokens } from './chat-live-support'

const seed = liveManifest()
const tokens = {} as Record<LiveRole, LiveTokens>
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxZkAAAAASUVORK5CYII=', 'base64')
test.beforeAll(async ({ request }) => {
  // Five real logins once, within the existing auth rate limit. Never fixture tokens.
  for (const role of ['student', 'mentor', 'nextMentor', 'staff', 'manager'] as const) tokens[role] = await login(request, seed, role)
})

test('real two-session chat: REST/STOMP, private browser upload, manager isolation and silent reassignment purge', async ({ browser, request }) => {
  const contexts: BrowserContext[] = []
  async function actor(role: LiveRole) {
    const context = await browser.newContext(); contexts.push(context); await authenticated(context, tokens[role]);
    const page = await context.newPage(); const observed = watch(page); return { page, observed }
  }
  try {
    const learner = await actor('student'), helper = await actor('mentor')
    await learner.page.goto(`/student/chat/${seed.conversationId}`)
    await helper.page.goto(`/mentor/chat?conversationId=${seed.conversationId}`)
    await expect(learner.page.getByText('private FE marker', { exact: true })).toBeVisible()
    await expect(helper.page.getByText('private FE marker', { exact: true })).toBeVisible()
    await expect.poll(() => learner.observed.urls.length).toBeGreaterThan(0)
    await expect.poll(() => helper.observed.urls.length).toBeGreaterThan(0)
    await expect(learner.page.getByText('Đang kết nối chat…', { exact: true })).toHaveCount(0)
    await expect(helper.page.getByText(/Chat đang ngoại tuyến/)).toHaveCount(0)
    await learner.page.getByLabel('Tin nhắn', { exact: true }).fill('Câu hỏi từ Student BE thật')
    await learner.page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await expect(helper.page.getByText('Câu hỏi từ Student BE thật', { exact: true })).toBeVisible()
    await helper.page.getByLabel('Tin nhắn', { exact: true }).fill('Mentor trả lời qua BE thật')
    await helper.page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await expect(learner.page.getByText('Mentor trả lời qua BE thật', { exact: true })).toBeVisible()
    await expect.poll(() => learner.observed.metadata.filter(event => event.type === 'message.created').length).toBeGreaterThan(0)
    await expect.poll(() => helper.observed.metadata.filter(event => event.type === 'message.created').length).toBeGreaterThan(0)
    for (const stream of [learner.observed, helper.observed]) {
      for (const url of stream.urls) { expect(new URL(url).search).toBe(''); expect(new URL(url).pathname).toBe('/ws/chat') }
      for (const event of stream.metadata) for (const field of ['body', 'contextSnapshot', 'attachments', 'downloadUrl', 'uploadUrl']) expect(event).not.toHaveProperty(field)
    }
    await test.step('Respect the real shared-IP quota between messaging and file scenarios', async () => {
      await new Promise(resolve => setTimeout(resolve, 61_000))
    })
    await learner.page.getByLabel('Đính kèm ảnh hoặc PDF', { exact: true }).setInputFiles({ name: 'live-diagram.png', mimeType: 'image/png', buffer: PNG })
    await expect(learner.page.getByText('live-diagram.png', { exact: true })).toBeVisible()
    await expect(learner.page.getByRole('button', { name: 'Gửi', exact: true })).toBeEnabled()
    await learner.page.getByLabel('Tin nhắn', { exact: true }).fill('Tệp riêng tư gửi thật')
    await learner.page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await expect(helper.page.getByRole('button', { name: 'live-diagram.png', exact: true })).toBeVisible()
    const downloadWait = helper.page.waitForResponse(response => response.request().method() === 'GET'
      && response.url().includes(`/api/v1/chat/conversations/${seed.conversationId}/attachments/`)
      && response.url().endsWith('/download-url'), { timeout: 10_000 })
    const popupWait = helper.page.waitForEvent('popup', { timeout: 15_000 }).catch(() => null)
    await helper.page.getByRole('button', { name: 'live-diagram.png', exact: true }).click()
    expect((await downloadWait).status(), 'Real authorized attachment download URL request').toBe(200)
    const popup = await popupWait
    if (!popup) throw new Error('Authorized private attachment did not open a popup within 15s')
    await popup.waitForLoadState('domcontentloaded')
    expect(popup.url()).toContain('X-Amz-Expires=300'); expect(new URL(popup.url()).hostname).toBe('127.0.0.1')
    const binary = await request.get(popup.url()); expect(binary.status()).toBe(200); expect(await binary.body()).toEqual(PNG)
    const unsigned = new URL(popup.url()); unsigned.search = ''; expect((await request.get(unsigned.toString())).status()).toBe(403)
    await popup.close()
    // Five real actors share loopback/global60 requests/min (including normal browser traffic).
    // Separate compressed interactive scenarios by a real quota window; no limiter reset/bypass or fake responses.
    // This is deliberate workload pacing, not a DOM readiness wait or proof of unlimited burst throughput.
    await test.step('Respect the real shared-IP quota between file and recovery scenarios', async () => {
      await new Promise(resolve => setTimeout(resolve, 61_000))
    })
    // Close the real document/socket, commit an answer while disconnected, then recover through real REST/new CONNECT.
    const previousSockets = learner.observed.urls.length
    await learner.page.goto('about:blank')
    const missed = await request.post(`${seed.backend}/api/v1/chat/conversations/${seed.conversationId}/messages`, {
      headers: { Authorization: `Bearer ${tokens.mentor.accessToken}` },
      data: { body: 'Hồi đáp lúc Student mất kết nối', clientMessageId: `live-gap-${seed.conversationId}`, attachmentIds: [] },
    })
    expect(missed.status()).toBe(200)
    await learner.page.goto(`/student/chat/${seed.conversationId}`)
    await expect(learner.page.getByText('Hồi đáp lúc Student mất kết nối', { exact: true })).toBeVisible()
    await expect.poll(() => learner.observed.urls.length).toBeGreaterThan(previousSockets)
    await learner.page.bringToFront()
    await expect.poll(async () => {
      const current = await request.get(`${seed.backend}/api/v1/chat/conversations/${seed.conversationId}`, { headers: { Authorization: `Bearer ${tokens.student.accessToken}` } })
      expect(current.status()).toBe(200); const data = (await current.json()).data
      return data.lastReadSequence === data.lastSequence
    }).toBe(true)
    const observer = await actor('manager'); const managerTranscript: string[] = []
    observer.page.on('request', call => { if (/\/api\/v1\/chat\/conversations\/[^/?]+/.test(call.url())) managerTranscript.push(call.url()) })
    await observer.page.goto(`/manager/chat-monitoring?conversationId=${seed.conversationId}`)
    await expect(observer.page.getByRole('heading', { name: 'Live FE–BE support', exact: true })).toBeVisible()
    await expect(observer.page.getByText('private FE marker', { exact: true })).toHaveCount(0)
    await expect(observer.page.getByText('Mentor trả lời qua BE thật', { exact: true })).toHaveCount(0)
    await expect(observer.page.getByRole('button', { name: 'Đổi Mentor', exact: true })).toHaveCount(0)
    expect(managerTranscript).toEqual([])
    const assignment = await request.put(`${seed.backend}/api/v1/chat/management/conversations/${seed.conversationId}/assignment`, {
      headers: { Authorization: `Bearer ${tokens.staff.accessToken}` },
      data: { mentorId: seed.accounts.nextMentor.id, expectedAssignmentVersion: 1, reason: 'Live two-session reassignment' },
    })
    expect(assignment.status()).toBe(200)
    // Old Mentor gets no reassignment event. The independent selected-detail poll must purge private UI.
    await expect(helper.page.getByText('private FE marker', { exact: true })).toHaveCount(0, { timeout: 25_000 })
    await expect(helper.page.getByLabel('Tin nhắn', { exact: true })).toHaveCount(0)
    const replacement = await actor('nextMentor')
    await replacement.page.goto(`/mentor/chat?conversationId=${seed.conversationId}`)
    await expect(replacement.page.getByText('Mentor trả lời qua BE thật', { exact: true })).toBeVisible()
    const read = await request.get(`${seed.backend}/api/v1/chat/conversations/${seed.conversationId}`, { headers: { Authorization: `Bearer ${tokens.student.accessToken}` } })
    expect(read.status()).toBe(200); const detail = (await read.json()).data
    expect(detail.lastReadSequence).toBeLessThanOrEqual(detail.lastSequence)
    for (const view of [learner, helper, observer, replacement]) expect(view.observed.errors).toEqual([])
  } finally { for (const context of contexts) await context.close() }
})

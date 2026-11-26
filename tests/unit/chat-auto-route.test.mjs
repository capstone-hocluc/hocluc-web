import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let vite, api, chatService, useChatWorkspace

before(async () => {
  vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, watch: null, ws: false },
  })
  ;[api, chatService, useChatWorkspace] = await Promise.all([
    vite.ssrLoadModule('/src/lib/api.ts'),
    vite.ssrLoadModule('/src/services/chatService.ts'),
    vite.ssrLoadModule('/src/hooks/useChatWorkspace.ts'),
  ])
})

after(async () => {
  await vite?.close()
})

function stubLocalStorage(t) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => null },
  })
  t.after(() => {
    delete globalThis.localStorage
  })
}

test('createConversation omits subjectCategoryId when absent and includes it when provided', async (t) => {
  stubLocalStorage(t)
  const bodies = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(new URL(url).pathname, '/api/v1/chat/conversations')
    assert.equal(init.method, 'POST')
    const parsed = JSON.parse(init.body)
    bodies.push(parsed)
    return Response.json({
      success: true,
      status: 200,
      data: {
        id: 'conv-1',
        title: parsed.title,
        status: 'OPEN',
        student: { id: 'student-1', displayName: 'Học viên' },
        subjectCategoryId: parsed.subjectCategoryId ?? 'sub-auto',
        subjectName: 'Toán',
        lastSequence: 1,
        lastReadSequence: 0,
        unreadCount: 0,
        canSend: true,
        assignmentVersion: 1,
        updatedAt: '2026-11-26T12:00:00Z',
      },
    })
  })

  await chatService.chatService.createConversation({
    title: 'Câu hỏi tự phân môn',
    initialMessage: 'Giải phương trình bậc hai',
    clientRequestId: 'req-1',
  })
  await chatService.chatService.createConversation({
    title: 'Câu hỏi chọn môn',
    initialMessage: 'Tính gia tốc rơi tự do',
    clientRequestId: 'req-2',
    subjectCategoryId: 'subject-physics',
  })

  assert.equal('subjectCategoryId' in bodies[0], false)
  assert.equal(bodies[0].clientRequestId, 'req-1')
  assert.equal(bodies[1].subjectCategoryId, 'subject-physics')
  assert.equal(bodies[1].clientRequestId, 'req-2')
})

test('422 CHAT_SUBJECT_REQUIRED preserves errorCode, message, and subjects data', async (t) => {
  stubLocalStorage(t)
  const subjects = [
    { id: 'sub-1', name: 'Toán' },
    { id: 'sub-2', name: 'Vật lý' },
  ]
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      {
        success: false,
        status: 422,
        errorCode: 'CHAT_SUBJECT_REQUIRED',
        message: 'Chọn môn cho câu hỏi này.',
        data: { subjects },
      },
      { status: 422 }
    )
  )

  await assert.rejects(
    () =>
      chatService.chatService.createConversation({
        title: 'Bài tập tổng hợp',
        initialMessage: 'Nội dung cần phân môn',
        clientRequestId: 'req-422',
      }),
    (error) => {
      assert.ok(error instanceof api.ApiError)
      assert.equal(error.status, 422)
      assert.equal(error.code, 'CHAT_SUBJECT_REQUIRED')
      assert.deepEqual(error.data, { subjects })
      assert.equal(useChatWorkspace.chatError(error), 'Chọn môn cho câu hỏi này.')
      return true
    }
  )
})

test('409 CHAT_NO_MENTOR preserves errorCode and message', async (t) => {
  stubLocalStorage(t)
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      {
        success: false,
        status: 409,
        errorCode: 'CHAT_NO_MENTOR',
        message: 'Hiện chưa có mentor nhận câu hỏi.',
        data: null,
      },
      { status: 409 }
    )
  )

  await assert.rejects(
    () =>
      chatService.chatService.createConversation({
        title: 'Câu hỏi chưa có mentor',
        initialMessage: 'Nội dung gửi lên',
        clientRequestId: 'req-409',
      }),
    (error) => {
      assert.ok(error instanceof api.ApiError)
      assert.equal(error.status, 409)
      assert.equal(error.code, 'CHAT_NO_MENTOR')
      assert.equal(useChatWorkspace.chatError(error), 'Hiện chưa có mentor nhận câu hỏi.')
      return true
    }
  )
})

test('5xx and network failures preserve chatError messages', async (t) => {
  stubLocalStorage(t)
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      {
        success: false,
        status: 503,
        message: 'Hệ thống đang bận.',
      },
      { status: 503 }
    )
  )

  await assert.rejects(
    () =>
      chatService.chatService.createConversation({
        title: 'Lỗi 5xx',
        initialMessage: 'Nội dung 5xx',
        clientRequestId: 'req-503',
      }),
    (error) => {
      assert.ok(error instanceof api.ApiError)
      assert.equal(error.status, 503)
      assert.equal(useChatWorkspace.chatError(error), 'Hệ thống đang bận.')
      return true
    }
  )

  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch')
  })

  await assert.rejects(
    () =>
      chatService.chatService.createConversation({
        title: 'Lỗi mạng',
        initialMessage: 'Nội dung lỗi mạng',
        clientRequestId: 'req-net',
      }),
    (error) => {
      assert.equal(
        useChatWorkspace.chatError(error),
        'Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.'
      )
      return true
    }
  )
})

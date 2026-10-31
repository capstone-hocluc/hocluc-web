import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AiAssistantMessage,
  AiAssistantMode,
} from '../services/aiAssistantService'
import { AI_ASSISTANT_DEMO } from '../components/management/ai-assistant/ai-assistant-demo'

const WAITING_REPLY =
  '**Bản xem trước giao diện.** Trợ lý AI chưa nối máy chủ nên chưa thể soạn đề. Tin nhắn của bạn đã được giữ lại; khi API hoàn thiện, câu trả lời sẽ xuất hiện ở đây.'

function waitingReply(mode: AiAssistantMode): AiAssistantMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    mode,
    createdAt: new Date().toISOString(),
    body: WAITING_REPLY,
    trace: [
      'Nhận yêu cầu và xác định chế độ soạn đề',
      'Kiểm tra kết nối dịch vụ trợ lý AI',
      'Máy chủ chưa sẵn sàng — trả về thông báo',
    ],
  }
}

export function useAiChat() {
  const [messages, setMessages] = useState<AiAssistantMessage[]>([])
  const [demo, setDemo] = useState(false)
  const [mode, setMode] = useState<AiAssistantMode>('compose')
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const timer = useRef<number | null>(null)

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setPending(false)
  }, [])

  useEffect(() => cancel, [cancel])

  const reply = useCallback(
    (replyMode: AiAssistantMode) => {
      setPending(true)
      timer.current = window.setTimeout(() => {
        setMessages((previous) => [...previous, waitingReply(replyMode)])
        setPending(false)
        timer.current = null
      }, 1200)
    },
    []
  )

  const send = useCallback(() => {
    const text = value.trim()
    if (!text || pending) return
    const message: AiAssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      body: text,
      createdAt: new Date().toISOString(),
    }
    const replyMode = mode
    setMessages((previous) => [...previous, message])
    setValue('')
    reply(replyMode)
  }, [mode, pending, reply, value])

  const regenerate = useCallback(() => {
    if (pending) return
    reply(mode)
  }, [mode, pending, reply])

  const loadDemo = useCallback(() => {
    cancel()
    setMessages(AI_ASSISTANT_DEMO.messages)
    setDemo(true)
    setMode('compose')
    setValue('')
  }, [cancel])

  const startNew = useCallback(() => {
    cancel()
    setMessages([])
    setDemo(false)
    setMode('compose')
    setValue('')
  }, [cancel])

  return {
    messages,
    demo,
    mode,
    value,
    pending,
    setMode,
    setValue,
    send,
    stop: cancel,
    regenerate,
    loadDemo,
    startNew,
  }
}

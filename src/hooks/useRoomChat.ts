import { useCallback, useEffect, useRef, useState } from 'react'
import type { EmbeddedClient, ChatMessage, ChatRecord } from '@hocluc/zoom-meeting-sdk'

type Message = { id: string; text: string; sender: string; senderId: number; time: number }

export function useRoomChat(client: typeof EmbeddedClient | null, open: boolean) {
  const [messages, setMessages] = useState<Message[]>([])
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState('')
  const openRef = useRef(open)
  useEffect(() => { openRef.current = open }, [open])
  useEffect(() => {
    if (!client) return
    const receive = (payload: ChatRecord | ChatMessage) => {
      if (!payload.message) return
      const message = { id: payload.id || `${payload.sender.userId}-${payload.timestamp}`, text: Array.isArray(payload.message) ? payload.message.join('') : payload.message, sender: payload.sender.name, senderId: payload.sender.userId, time: payload.timestamp }
      setMessages((previous) => previous.some((item) => item.id === message.id) ? previous : [...previous, message])
      if (!openRef.current && payload.sender.userId !== client.getCurrentUser()?.userId) setUnread((count) => count + 1)
    }
    client.on('chat-on-message', receive)
    return () => client.off('chat-on-message', receive)
  }, [client])
  const send = useCallback(async (text: string) => {
    if (!client || !text.trim()) return false
    try {
      const result = await client.sendChat(text)
      if (result instanceof Error) throw result
      const self = client.getCurrentUser()
      const senderId = result?.sender?.userId ?? self?.userId ?? 0
      const time = result?.timestamp ?? Date.now()
      const message = { id: result?.id || `${senderId}-${time}`, text: result?.message ?? text, sender: result?.sender?.name ?? self?.userName ?? '', senderId, time }
      setMessages((previous) => previous.some((item) => item.id === message.id) ? previous : [...previous, message])
      setError('')
      return true
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không gửi được tin nhắn'); return false }
  }, [client])
  return { messages, unread, error, send, clearUnread: () => setUnread(0) }
}

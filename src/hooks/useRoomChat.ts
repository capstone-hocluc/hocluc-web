import { useCallback, useEffect, useState } from 'react'
import type { EmbeddedClient, ChatMessage, ChatRecord } from '@hocluc/zoom-meeting-sdk'

type Message = { id: string; text: string; sender: string; senderId: number; time: number }

export function useRoomChat(client: typeof EmbeddedClient | null, open: boolean) {
  const [messages, setMessages] = useState<Message[]>([])
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!client) return
    const receive = (payload: ChatRecord | ChatMessage) => {
      if (!payload.message) return
      const message = { id: payload.id || `${payload.sender.userId}-${payload.timestamp}`, text: Array.isArray(payload.message) ? payload.message.join('') : payload.message, sender: payload.sender.name, senderId: payload.sender.userId, time: payload.timestamp }
      setMessages((previous) => previous.some((item) => item.id === message.id) ? previous : [...previous, message])
      if (!open && payload.sender.userId !== client.getCurrentUser()?.userId) setUnread((count) => count + 1)
    }
    client.on('chat-on-message', receive)
    return () => client.off('chat-on-message', receive)
  }, [client, open])
  const send = useCallback(async (text: string) => {
    if (!client || !text.trim()) return false
    try {
      const result = await client.sendChat(text)
      if (result instanceof Error) throw result
      setMessages((previous) => previous.some((item) => item.id === result.id) ? previous : [...previous, { id: result.id || `${result.sender.userId}-${result.timestamp}`, text: result.message, sender: result.sender.name, senderId: result.sender.userId, time: result.timestamp }])
      setError('')
      return true
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không gửi được tin nhắn'); return false }
  }, [client])
  return { messages, unread, error, send, clearUnread: () => setUnread(0) }
}

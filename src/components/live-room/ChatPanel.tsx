import { useEffect, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import Button from '../console/button'
import Notice from '../console/notice'
import { Input } from '../tailgrids/core/input'
import RoomChatMessage from './RoomChatMessage'
import { useRoomChat } from '../../hooks/useRoomChat'

export default function ChatPanel({ chat, currentUserId }: { chat: ReturnType<typeof useRoomChat>; currentUserId?: number }) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [chat.messages.length])
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {chat.messages.length === 0
          ? <p className="py-10 text-center text-sm text-text-tertiary">Chưa có tin nhắn</p>
          : <div className="space-y-4">{chat.messages.map((message) => <RoomChatMessage key={message.id} message={message} outgoing={message.senderId === currentUserId} />)}</div>}
        {chat.error && <Notice tone="danger" className="mt-3">{chat.error}</Notice>}
        <div ref={endRef} />
      </div>
      <form className="flex shrink-0 items-center gap-2 border-t border-card-border p-3" onSubmit={(event) => { event.preventDefault(); void chat.send(text).then((sent) => { if (sent) setText('') }) }}>
        <Input className="min-w-0 flex-1 py-2" aria-label="Tin nhắn" placeholder="Nhắn cho cả lớp" maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} />
        <Button size="icon" shape="pill" type="submit" aria-label="Gửi" disabled={!text.trim()}><SendHorizontal size={18} /></Button>
      </form>
    </>
  )
}

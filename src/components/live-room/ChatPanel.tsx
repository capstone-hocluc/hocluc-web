import { useState } from 'react'
import Button from '../console/button'
import { useRoomChat } from '../../hooks/useRoomChat'

export default function ChatPanel({ chat, currentUserId }: { chat: ReturnType<typeof useRoomChat>; currentUserId?: number }) {
  const [text, setText] = useState('')
  return <aside className="flex h-full w-full flex-col border-l border-card-border bg-card-background p-3 md:w-80" aria-label="Trò chuyện">
    <h2 className="font-semibold">Trò chuyện</h2>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3">{chat.messages.map((message) => <div key={message.id} className={message.senderId === currentUserId ? 'text-right' : 'text-left'}><div className="text-xs text-text-tertiary">{message.sender} · {new Date(message.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div><p className="whitespace-pre-wrap break-words">{message.text}</p></div>)}</div>
    {chat.error && <p role="alert">{chat.error}</p>}
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void chat.send(text).then((sent) => { if (sent) setText('') }) }}><input className="min-w-0 flex-1 rounded border border-card-border bg-card-background p-2" aria-label="Tin nhắn" maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} /><Button size="sm" type="submit">Gửi</Button></form>
  </aside>
}

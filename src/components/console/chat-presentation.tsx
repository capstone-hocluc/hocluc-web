import { Fragment } from 'react'
import { Avatar, AvatarFallback } from '../tailgrids/core/avatar'
import { FileText } from './icons'
import Status from './status'
import { chatDay } from './chat-format'
import type { ChatConversation, ChatMessage } from '../../types/chat'

const clock = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
const shortDate = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })
export function ChatAvatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => Array.from(part)[0]).join('') || '?'
  return <Avatar size={small ? 'sm' : 'md'} aria-hidden="true">
    <AvatarFallback className="bg-background-gray-secondary text-text-secondary">{initials}</AvatarFallback>
  </Avatar>
}

export function ChatInboxRow({ item, active, statusLabel, onSelect }: {
  item: ChatConversation; active: boolean; statusLabel: string; onSelect: () => void
}) {
  const date = new Date(item.updatedAt)
  const validDate = !Number.isNaN(date.getTime())
  const timestamp = validDate ? (chatDay(item.updatedAt) === chatDay(new Date().toISOString()) ? clock.format(date) : shortDate.format(date)) : ''
  return <button type="button" onClick={onSelect} aria-current={active ? 'true' : undefined}
    className={`flex w-full items-start gap-3 border-b border-card-border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-input-primary-focus-border hover:bg-background-gray-secondary active:bg-background-gray-secondary ${active ? 'bg-background-gray-secondary' : 'bg-card-background'}`}>
    <ChatAvatar name={item.student.displayName} />
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-text-primary">{item.student.displayName}</span>
        {validDate && <time dateTime={item.updatedAt} className="shrink-0 text-xs tabular-nums text-text-tertiary">{timestamp}</time>}
      </div>
      <p className="mt-1 truncate text-sm text-text-secondary">{item.title}</p>
      <p className="mt-1 truncate text-xs text-text-tertiary">{item.lastMessagePreview || item.subjectName || 'Yêu cầu hỗ trợ'}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Status tone={item.status === 'RESOLVED' ? 'success' : item.status === 'OPEN' ? 'warning' : 'info'} className="text-xs">{statusLabel}</Status>
        {item.unreadCount > 0 && <span aria-label={`${item.unreadCount} tin chưa đọc`} className="min-w-6 rounded-full bg-button-primary-background px-2 py-1 text-center text-xs tabular-nums text-button-primary-text">{item.unreadCount}</span>}
      </div>
    </div>
  </button>
}

export function ChatMessageBubble({ message, outgoing, showDay, onDownload }: {
  message: ChatMessage; outgoing: boolean; showDay: boolean; onDownload: (id: string, name: string) => void
}) {
  const date = new Date(message.createdAt)
  const validDate = !Number.isNaN(date.getTime())
  return <Fragment>
    {showDay && chatDay(message.createdAt) && <div className="flex items-center gap-4 py-2 text-xs text-text-tertiary">
      <span className="h-px flex-1 bg-card-border" aria-hidden="true" /><span>{chatDay(message.createdAt)}</span><span className="h-px flex-1 bg-card-border" aria-hidden="true" />
    </div>}
    <article data-chat-direction={outgoing ? 'outgoing' : 'incoming'} className={`flex max-w-full items-end gap-2 sm:gap-3 ${outgoing ? 'flex-row-reverse' : ''}`}>
      <ChatAvatar name={message.senderName} small />
      <div className={`min-w-0 max-w-[80%] sm:max-w-[75%] ${outgoing ? 'text-right' : ''}`}>
        <p className="mb-2 truncate text-xs font-medium text-text-secondary">{message.senderName}</p>
        <div className={`rounded-xl px-4 py-3 text-left ${outgoing ? 'rounded-br-sm bg-button-primary-background text-button-primary-text' : 'rounded-bl-sm bg-background-gray-secondary text-text-primary'}`}>
          {message.body && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>}
          {message.attachments.map(file => <button type="button" key={file.id} aria-label={file.name} onClick={() => onDownload(file.id, file.name)}
            className={`mt-2 flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-current hover:underline ${outgoing ? 'border-current/30' : 'border-card-border'}`}>
            <FileText size={20} aria-hidden="true" className="shrink-0" /><span className="min-w-0 break-all">{file.name}</span>
          </button>)}
        </div>
        {validDate && <time dateTime={message.createdAt} className="mt-2 block text-xs tabular-nums text-text-tertiary">{clock.format(date)}</time>}
      </div>
    </article>
  </Fragment>
}

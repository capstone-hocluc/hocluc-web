import { ChatAvatar } from '../console/chat-presentation'
import { cn } from '../../lib/cn'
import { useRoomChat } from '../../hooks/useRoomChat'

type Message = ReturnType<typeof useRoomChat>['messages'][number]

export default function RoomChatMessage({ message, outgoing }: { message: Message; outgoing: boolean }) {
  const time = new Date(message.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return (
    <article className={cn('flex items-end gap-2', outgoing && 'flex-row-reverse')}>
      {!outgoing && <ChatAvatar name={message.sender} small />}
      <div className={cn('min-w-0 max-w-[85%]', outgoing && 'text-right')}>
        <p className="mb-1 truncate text-xs text-text-tertiary">{outgoing ? time : `${message.sender} · ${time}`}</p>
        <div className={cn('inline-block rounded-2xl px-3 py-2 text-left text-sm leading-relaxed', outgoing ? 'rounded-br-sm bg-button-primary-background text-button-primary-text' : 'rounded-bl-sm bg-background-gray-secondary text-text-primary')}>
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
      </div>
    </article>
  )
}

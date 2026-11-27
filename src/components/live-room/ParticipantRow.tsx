import type { ReactNode } from 'react'
import { ChatAvatar } from '../console/chat-presentation'
import { cn } from '../../lib/cn'

export default function ParticipantRow({ name, detail, speaking = false, children }: { name: string; detail?: string; speaking?: boolean; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-background-gray-secondary">
      <span className={cn('shrink-0 rounded-full ring-2 ring-transparent transition-shadow', speaking && 'ring-badge-success-icon-color animate-pulse')}>
        <ChatAvatar name={name} small />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{name}</p>
        {detail && <p className={cn('truncate text-xs', speaking ? 'text-badge-success-text' : 'text-text-tertiary')}>{detail}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-0.5">{children}</div>}
    </div>
  )
}

import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import Logo from '../common/Logo'
import { Badge } from '../tailgrids/core/badge'

interface RoomHeaderProps {
  title: string
  time?: { start: string; label: string } | null
  /** Shown once the student or teacher is inside the meeting. */
  live?: { elapsed: string; people: number } | null
  children?: ReactNode
}

export default function RoomHeader({ title, time, live, children }: RoomHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-card-border bg-card-background px-4 py-2.5">
      <span className="hidden sm:inline-flex"><Logo wordmarkSize={20} /></span>
      <span className="sm:hidden"><Logo markOnly wordmarkSize={20} /></span>
      <span className="h-8 w-px shrink-0 bg-card-border" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold text-text-primary">{title}</h1>
        {time && <time dateTime={time.start} className="block truncate text-sm text-text-tertiary">{time.label}</time>}
      </div>
      {live && (
        <div className="hidden items-center gap-2 md:flex">
          <Badge color="error" size="md" prefixIcon={<span className="size-2 animate-pulse rounded-full bg-badge-error-text" />}>
            Trực tiếp <span className="tabular-nums">{live.elapsed}</span>
          </Badge>
          <Badge color="gray" size="md" prefixIcon={<Users />}>{live.people}</Badge>
        </div>
      )}
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  )
}

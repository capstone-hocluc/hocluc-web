import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import Card from '../../ui/Card'
import StatusBadge from '../../ui/StatusBadge'

// The white bordered surface shared by every block of the activity screens.
export function ActivityCard({ as = 'article', className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      as={as}
      padding="none"
      radius="xl"
      className={cn(
        'border-line-card bg-surface p-5 shadow-card max-[760px]:p-4',
        className
      )}
      {...props}
    />
  )
}

// Card title (h2) inside an ActivityCard.
export function ActivityCardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2 className={cn('mb-2.5 text-lg font-extrabold text-text-heading', className)} {...props} />
  )
}

interface ActivityHeaderProps {
  label: string
  title: ReactNode
  meta?: string
}

// Badge + title + meta line at the top of each activity.
export function ActivityHeader({ label, title, meta }: ActivityHeaderProps) {
  return (
    <ActivityCard as="header">
      <StatusBadge tone="primary" size="sm" className="px-3 py-1 text-xs uppercase">
        {label}
      </StatusBadge>
      <h1 className="mt-3 mb-1.5 text-[28px] leading-[1.2] font-black tracking-[-0.4px] text-text-heading max-[760px]:text-[22px]">
        {title}
      </h1>
      {meta && <p className="text-sm font-semibold text-text-secondary">{meta}</p>}
    </ActivityCard>
  )
}

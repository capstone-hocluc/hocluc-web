import type { ReactNode } from 'react'
import { CheckCircle2, Maximize2, Target } from '../../console/icons'
import { cva } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import { ProfileCard } from './primitives'

interface InsightListProps {
  tone: 'strength' | 'improvement'
  /** Tighter list used inside the small insight cards. */
  dense?: boolean
  items: { key: string; text: ReactNode; extra?: ReactNode }[]
}

// Check / target bullets of "Điểm mạnh" and "Cần cải thiện".
export function InsightList({ tone, dense = false, items }: InsightListProps) {
  const Icon = tone === 'strength' ? CheckCircle2 : Target

  return (
    <ul className={cn('flex flex-col', dense ? 'gap-2' : 'gap-[11px]')}>
      {items.map((item) => (
        <li
          key={item.key}
          className={cn(
            'flex items-start gap-[9px] font-semibold text-text-emphasis',
            dense ? 'text-sm leading-normal' : 'text-[15px] leading-normal'
          )}
        >
          <Icon
            size={15}
            className={cn(
              'mt-0.5 shrink-0',
              tone === 'strength' ? 'text-success' : 'text-warning-dark'
            )}
          />
          <span>{item.text}</span>
          {item.extra}
        </li>
      ))}
    </ul>
  )
}

const card = cva('flex flex-col rounded-2xl p-4 shadow-none', {
  variants: {
    tone: {
      strength: 'border-line-practice bg-practice-soft',
      improvement: 'border-live-line bg-live-tint',
    },
    size: {
      // Overview AI panel
      sm: '',
      // Practice tab
      lg: 'h-full min-h-[142px] max-[760px]:max-h-[230px]',
    },
  },
})

interface InsightCardProps {
  tone: 'strength' | 'improvement'
  size: 'sm' | 'lg'
  title: string
  onDetail: () => void
  children: ReactNode
}

// "Điểm mạnh" / "Cần cải thiện" card with an "Xem chi tiết" link.
export function InsightCard({ tone, size, title, onDetail, children }: InsightCardProps) {
  const Icon = tone === 'strength' ? CheckCircle2 : Target
  const large = size === 'lg'

  return (
    <ProfileCard className={cn(card({ tone, size }))}>
      <div className="mb-2.5 flex flex-none items-start justify-between gap-2.5 max-[760px]:flex-col">
        <strong
          className={cn(
            'inline-flex items-center font-bold',
            large
              ? 'gap-[9px] text-[17px] leading-[1.25] text-text-heading'
              : 'gap-2 text-[17px] leading-[1.25] text-text-heading'
          )}
        >
          {!large && (
            <Icon
              size={16}
              className={tone === 'strength' ? 'text-success' : 'text-warning-dark'}
            />
          )}
          {title}
        </strong>
        <div
          className={cn(
            'flex flex-wrap items-center justify-end max-[760px]:justify-start',
            large ? 'gap-[9px]' : 'gap-[7px]'
          )}
        >
          <button
            type="button"
            className={cn(
              'inline-flex cursor-pointer items-center p-0 font-semibold text-primary-text',
              large ? 'min-h-8 gap-1.5 text-[13px]' : 'min-h-8 gap-[5px] text-xs'
            )}
            onClick={onDetail}
            aria-label={`Xem chi tiết ${title.toLowerCase()}`}
          >
            <Maximize2 size={14} />
            Xem chi tiết
          </button>
        </div>
      </div>
      <div
        className={cn(
          'min-h-0 flex-1 pr-1.5',
          large && 'max-h-[116px] app-scroll overflow-y-auto'
        )}
      >
        {children}
      </div>
    </ProfileCard>
  )
}

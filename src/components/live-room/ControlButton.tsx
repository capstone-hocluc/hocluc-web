import type { ComponentType } from 'react'
import { cn } from '../../lib/cn'

export type ControlTone = 'default' | 'off' | 'active' | 'speaking'

const TONES: Record<ControlTone, string> = {
  speaking: 'bg-badge-success-background text-badge-success-text ring-2 ring-badge-success-icon-color animate-pulse',
  default: 'bg-background-gray-secondary text-text-primary group-hover:bg-badge-primary-background group-hover:text-badge-primary-text',
  off: 'bg-badge-error-background text-badge-error-text group-hover:brightness-95',
  active: 'bg-button-primary-background text-button-primary-text group-hover:bg-button-primary-hover-background',
}

interface ControlButtonProps {
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  onClick: () => void
  tone?: ControlTone
  /** Unread count shown on the icon. */
  badge?: number
}

/** A room control: round icon with its label underneath, like the call bars people already know. */
export default function ControlButton({ label, icon: Icon, onClick, tone = 'default', badge = 0 }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={badge > 0 ? `${label} (${badge})` : label}
      aria-pressed={tone === 'active' ? true : undefined}
      className="group flex min-w-16 shrink-0 flex-col items-center gap-1 rounded-xl px-1.5 py-1 text-xs font-medium text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring"
    >
      <span className={cn('relative grid size-11 place-items-center rounded-full transition-colors', TONES[tone])}>
        <Icon size={20} />
        {badge > 0 && (
          <span aria-hidden="true" className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-badge-error-text px-1 text-[11px] leading-none font-semibold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}

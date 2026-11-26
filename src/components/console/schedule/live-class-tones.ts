import { cn } from '../../../lib/cn'

// Theme-token colours for the states a class block can be in, shared by the week grids and their legends.
export type LiveClassTone = 'upcoming' | 'attention' | 'live' | 'completed' | 'cancelled'

export const LIVE_CLASS_TONE_CLASS: Record<LiveClassTone, string> = {
  upcoming: 'border border-badge-blue-icon-color/30 bg-badge-blue-background text-text-primary',
  attention: 'border-2 border-badge-warning-icon-color bg-badge-warning-background text-text-primary',
  live: 'border border-brand-500 bg-brand-500 text-white',
  completed: 'border border-card-border bg-background-gray-secondary text-text-secondary',
  cancelled: 'border border-dashed border-card-border bg-background-gray-secondary text-text-tertiary',
}

export const LIVE_CLASS_TONE_LABEL: Record<Exclude<LiveClassTone, 'completed'>, string> = {
  upcoming: 'Sắp diễn ra',
  attention: 'Cần xem',
  live: 'Đang dạy',
  cancelled: 'Đã hủy',
}

/** Horizontal hour lines behind a time grid; `rowPx` is the height of one hour. */
export function hourLinesStyle(rowPx: number) {
  return {
    backgroundImage: 'linear-gradient(var(--color-card-border) 1px, transparent 1px)',
    backgroundSize: `100% ${rowPx}px`,
  }
}

/** Time column plus seven day columns. */
export const WEEK_COLUMNS = 'grid grid-cols-[56px_repeat(7,minmax(0,1fr))]'

export function selectedRing(selected: boolean, attention: boolean) {
  return cn(selected && 'ring-3', selected && (attention ? 'ring-badge-warning-icon-color/35' : 'ring-brand-500/30'))
}

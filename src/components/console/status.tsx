import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { Badge } from '../tailgrids/core/badge'
import { AlertTriangle, CheckCircle2, XCircle } from './icons'

// Management-area status chip: NextAdmin badge behind the same tone prop as ui/Status.
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_COLOR = {
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'primary',
  neutral: 'gray',
} as const

// Only the tones that report an outcome carry a glyph; info and neutral also tag plain facts
// ("Giảng viên chính", "Có hình"), where an icon would read as a state.
const TONE_ICON = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const

type StatusProps = Omit<ComponentProps<'span'>, 'color'> & { tone?: StatusTone }

function Status({ tone = 'neutral', className, children, ...props }: StatusProps) {
  const Icon = tone in TONE_ICON ? TONE_ICON[tone as keyof typeof TONE_ICON] : null
  return (
    <Badge
      {...props}
      color={TONE_COLOR[tone]}
      size="md"
      className={cn(
        'w-fit gap-1.5 rounded-lg px-2.5 py-1 text-[13px] leading-5 font-semibold whitespace-nowrap [&>svg]:size-3.5',
        className
      )}
    >
      {Icon && <Icon aria-hidden />}
      {children}
    </Badge>
  )
}

export default Status

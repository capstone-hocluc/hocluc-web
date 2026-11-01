import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { Badge } from '../tailgrids/core/badge'

// Management-area status chip: NextAdmin badge behind the same tone prop as ui/Status. Text only.
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_COLOR = {
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'primary',
  neutral: 'gray',
} as const

type StatusProps = Omit<ComponentProps<'span'>, 'color'> & { tone?: StatusTone }

function Status({ tone = 'neutral', className, children, ...props }: StatusProps) {
  return (
    <Badge
      {...props}
      color={TONE_COLOR[tone]}
      size="md"
      className={cn(
        'w-fit rounded-lg px-2.5 py-1 text-[13px] leading-5 font-semibold whitespace-nowrap',
        className
      )}
    >
      {children}
    </Badge>
  )
}

export default Status

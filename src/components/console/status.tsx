import type { ComponentProps } from 'react'
import { Badge } from '../tailgrids/core/badge'

// Management-area status pill: NextAdmin badge behind the same tone prop as ui/Status.
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
    <Badge {...props} color={TONE_COLOR[tone]} size="md" className={className}>
      {children}
    </Badge>
  )
}

export default Status

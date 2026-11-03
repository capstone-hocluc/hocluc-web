import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { AlertIcon, alertSurface } from './alert'

// One-line console message (+ optional inline buttons): the Alert card without a title, so short
// errors and hints look the same as full alerts.
type NoticeProps = ComponentProps<'div'> & { tone?: 'danger' | 'warning' | 'info' }

function Notice({ tone = 'info', className, children, ...props }: NoticeProps) {
  return (
    <div role="status" className={cn(alertSurface, 'py-3 has-[button]:items-center', className)} {...props}>
      <AlertIcon tone={tone} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-2 leading-5 text-text-primary">
        {children}
      </div>
    </div>
  )
}

export default Notice

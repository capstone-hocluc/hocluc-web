import type { ReactNode } from 'react'
import Button from './Button'

// NextAdmin page header: 28/32 medium title, optional muted subtitle and one action.
interface PageHeadingProps {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  onAction?: () => void
  actionDisabled?: boolean
}

function PageHeading({ title, subtitle, action, onAction, actionDisabled = false }: PageHeadingProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[28px] leading-8 font-medium text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-tertiary">{subtitle}</p>}
      </div>
      {action && (
        <Button type="button" onClick={onAction} disabled={actionDisabled}>
          {action}
        </Button>
      )}
    </div>
  )
}

export default PageHeading

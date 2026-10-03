import type { ReactNode } from 'react'
import Button from './Button'

// The one shared page-header for every staff screen (eyebrow + title +
// subtitle + optional action button). Every screen used to hand-roll its
// own ".hl-staff-title" block with slightly different metrics; this now
// matches the values the Dashboard's header actually rendered at
// (measured via computed styles) so every screen looks identical.
interface PageHeadingProps {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  onAction?: () => void
  actionDisabled?: boolean
}

function PageHeading({ eyebrow, title, subtitle, action, onAction, actionDisabled = false }: PageHeadingProps) {
  return (
    <div className="mb-[27px] flex items-end justify-between gap-5">
      <div>
        {eyebrow && (
          <span className="block text-[13px] font-bold tracking-[1.2px] text-primary">
            {eyebrow}
          </span>
        )}
        <h1 className="mb-[7px] text-[28px] leading-[1.5] font-normal tracking-[-0.8px] text-text-heading">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
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

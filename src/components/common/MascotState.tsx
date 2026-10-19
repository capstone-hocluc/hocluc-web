import Button from '../ui/Button'
import { cn } from '../../lib/cn'
import { Info } from '../console/icons'

interface MascotStateProps {
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

// Shared empty / error state: status icon, title, hint and optional action.
// The one implementation for "nothing to show" and "something went wrong" -
// error states pass a retry action, empty states usually don't.
function MascotState({ title, message, actionLabel, onAction, className }: MascotStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-line-card bg-surface p-6 text-center text-text-secondary',
        className
      )}
    >
      <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary-text">
        <Info size={24} aria-hidden="true" />
      </span>
      <strong className="text-lg font-bold text-text-heading">{title}</strong>
      {message && <p className="m-0 max-w-lg text-sm leading-relaxed text-text-body">{message}</p>}
      {actionLabel && onAction && (
        <Button shape="pill" className="mt-2 px-6 text-[15px]" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export default MascotState

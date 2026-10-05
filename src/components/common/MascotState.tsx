import Button from '../ui/Button'
import { cn } from '../../lib/cn'

interface MascotStateProps {
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

// Shared empty / error state: owl mascot + title + hint (+ optional action).
// The one implementation for "nothing to show" and "something went wrong" -
// error states pass a retry action, empty states usually don't.
function MascotState({ title, message, actionLabel, onAction, className }: MascotStateProps) {
  return (
    <div
      className={cn(
        'grid min-h-[200px] place-items-center gap-[7px] p-[18px] text-center text-text-secondary',
        className
      )}
    >
      <img
        src="/owl-mascot4.png"
        alt=""
        aria-hidden="true"
        className="size-[92px] object-contain drop-shadow-[0_10px_16px_rgba(28, 176, 246,0.12)]"
      />
      <strong className="text-[15px] font-black text-text-heading">{title}</strong>
      {message && <p className="m-0 text-[13.5px]">{message}</p>}
      {actionLabel && onAction && (
        <Button shape="pill" className="mt-1.5 px-[22px] text-[13px] font-extrabold" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export default MascotState

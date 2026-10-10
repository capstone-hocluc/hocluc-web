import { ChevronLeft, ChevronRight } from '../../console/icons'
import Button from '../../ui/Button'

interface CarouselControlsProps {
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
  label: string
}

const arrowClass =
  'rounded-[10px] border-line text-link shadow-[0_8px_18px_rgba(17,24,58,0.04)] enabled:hover:-translate-y-px enabled:hover:border-line-brand enabled:hover:bg-surface-brand disabled:opacity-[0.38] disabled:shadow-none'

// Previous / next arrows; hidden when there is nothing to scroll.
function CarouselControls({
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  label,
}: CarouselControlsProps) {
  if (!canPrevious && !canNext) return null

  return (
    <div className="inline-flex items-center gap-1.5" aria-label={label}>
      <Button
        appearance="outline"
        size="icon"
        className={arrowClass}
        onClick={onPrevious}
        disabled={!canPrevious}
        aria-label="Xem mục trước"
      >
        <ChevronLeft />
      </Button>
      <Button
        appearance="outline"
        size="icon"
        className={arrowClass}
        onClick={onNext}
        disabled={!canNext}
        aria-label="Xem mục tiếp theo"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

export default CarouselControls

import { ChevronLeft, ChevronRight } from '../../console/icons'
import Button from '../../ui/Button'

interface CarouselControlsProps {
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
  label: string
}

const arrowClass = 'size-9 text-primary-text disabled:opacity-40 disabled:shadow-none'

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
    <div className="inline-flex items-center gap-2" aria-label={label}>
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

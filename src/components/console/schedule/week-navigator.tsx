import Button from '../button'
import { ChevronLeft, ChevronRight } from '../icons'

interface Props {
  label: string
  onPrev: () => void
  onNext: () => void
  onThisWeek: () => void
}

export default function WeekNavigator({ label, onPrev, onNext, onThisWeek }: Props) {
  return (
    <div className="flex items-center gap-1">
      <Button size="icon" appearance="outline" aria-label="Tuần trước" onClick={onPrev}>
        <ChevronLeft size={16} />
      </Button>
      <p className="min-w-40 text-center text-sm font-medium text-text-primary">{label}</p>
      <Button size="icon" appearance="outline" aria-label="Tuần sau" onClick={onNext}>
        <ChevronRight size={16} />
      </Button>
      <Button size="sm" appearance="outline" className="h-9" onClick={onThisWeek}>
        Tuần này
      </Button>
    </div>
  )
}

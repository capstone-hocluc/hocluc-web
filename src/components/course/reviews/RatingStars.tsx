import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Star } from '../../console/icons'
import { cn } from '../../../lib/cn'

const STARS = [1, 2, 3, 4, 5]

/** Read-only stars, to the nearest half: 4.5 shows four full stars and a half one. */
export function RatingStars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  const halves = Math.round(value * 2) / 2
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={`${value.toLocaleString('vi-VN')} trên 5 sao`}
    >
      {STARS.map((star) => {
        const fill = Math.min(1, Math.max(0, halves - (star - 1)))
        return (
          <span key={star} className="relative inline-flex" aria-hidden="true">
            <Star size={size} className="fill-transparent text-border-primary" />
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="fill-accent text-accent" />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

const STAR_LABELS = ['Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt']

/** Five radio stars: arrows move the choice, and every star up to the chosen one is filled. */
export function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <RadioGroupPrimitive.Root
        className="flex items-center gap-1"
        orientation="horizontal"
        aria-label="Số sao"
        value={value ? String(value) : ''}
        onValueChange={(next) => onChange(Number(next))}
        disabled={disabled}
      >
        {STARS.map((star) => (
          <RadioGroupPrimitive.Item
            key={star}
            value={String(star)}
            aria-label={`${star} sao`}
            className="grid size-9 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed"
          >
            <Star
              size={28}
              aria-hidden="true"
              className={star <= value ? 'fill-accent text-accent' : 'fill-transparent text-border-primary'}
            />
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      {value > 0 && <span className="text-sm font-semibold text-text-body">{STAR_LABELS[value - 1]}</span>}
    </div>
  )
}

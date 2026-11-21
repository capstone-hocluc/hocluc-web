import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { useId, type CSSProperties } from 'react'
import { Star } from '../../console/icons'
import { cn } from '../../../lib/cn'

const STARS = [1, 2, 3, 4, 5]

// The gold of the credit coin (public/sao-coin.svg): a darker rim below, a lit face and a pale shine.
const GOLD = { rim: '#B8760A', top: '#FFE07A', bottom: '#F2A81D', edge: '#E39A12' }
const GREY = { rim: '#B9C3D0', top: '#F4F7FB', bottom: '#D6DEE8', edge: '#C3CDD9' }
const SHINE = '#FFF6D2'
const layer = 'absolute inset-0 [&_path]:[fill:var(--star-fill)]'

/**
 * The kit's star drawn in relief: the same shape three times, a rim pushed down for depth, the face in a
 * top-to-bottom gradient, and a shine over its upper half.
 */
export function Star3D({ size = 16, empty = false, className }: { size?: number; empty?: boolean; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const tone = empty ? GREY : GOLD
  const depth = Math.max(1, Math.round(size * 0.07))
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-block shrink-0', className)}
      style={{ width: size, height: size + depth }}
    >
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tone.top} />
            <stop offset="1" stopColor={tone.bottom} />
          </linearGradient>
          <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SHINE} stopOpacity={empty ? 0.7 : 0.95} />
            <stop offset="0.5" stopColor={SHINE} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <Star size={size} className={layer} style={{ top: depth, '--star-fill': tone.rim } as CSSProperties} />
      <Star
        size={size}
        className={cn(layer, '[&_path]:[stroke-width:0.5] [&_path]:[stroke:var(--star-edge)]')}
        style={{ '--star-fill': `url(#${id}f)`, '--star-edge': tone.edge } as CSSProperties}
      />
      <Star size={size} className={layer} style={{ '--star-fill': `url(#${id}s)` } as CSSProperties} />
    </span>
  )
}

/** Read-only stars, to the nearest half: 4.5 shows four gold stars and a half one. */
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
          <span key={star} className="relative inline-flex">
            <Star3D size={size} empty />
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star3D size={size} />
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
            className="grid size-9 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Star3D size={28} empty={star > value} />
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      {value > 0 && <span className="text-sm font-semibold text-text-body">{STAR_LABELS[value - 1]}</span>}
    </div>
  )
}

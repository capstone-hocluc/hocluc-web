import {
  Label,
  Slider as AriaSlider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from 'react-aria-components'
import { cn } from '../../lib/cn'

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  minValue: number
  maxValue: number
  step?: number
  /** How the value reads beside the label, e.g. `{ style: 'percent' }`. */
  formatOptions?: Intl.NumberFormatOptions
  className?: string
}

// NextAdmin-style range: a label with the value on the right, a thin track filled up to a round thumb
// (React Aria: arrow keys, Home/End and Page Up/Down move it).
export default function Slider({
  label,
  value,
  onChange,
  minValue,
  maxValue,
  step = 1,
  formatOptions,
  className,
}: SliderProps) {
  return (
    <AriaSlider
      value={value}
      onChange={onChange}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      formatOptions={formatOptions}
      className={cn('flex w-full min-w-0 flex-col gap-2', className)}
    >
      <div className="flex items-center justify-between gap-3 text-sm font-medium text-text-primary">
        <Label>{label}</Label>
        <SliderOutput className="font-normal text-text-secondary tabular-nums" />
      </div>
      <SliderTrack className="relative h-5 w-full cursor-pointer">
        {({ state }) => (
          <>
            <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-background-gray-secondary" />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-button-primary-background"
              style={{ width: `${state.getThumbPercent(0) * 100}%` }}
            />
            <SliderThumb className="top-1/2 size-5 rounded-full border-2 border-button-primary-background bg-card-background shadow-sm outline-none transition-[box-shadow] data-[dragging]:ring-4 data-[dragging]:ring-button-primary-focus-ring data-[focus-visible]:ring-4 data-[focus-visible]:ring-button-primary-focus-ring" />
          </>
        )}
      </SliderTrack>
    </AriaSlider>
  )
}

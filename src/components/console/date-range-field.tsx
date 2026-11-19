import {
  Button,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DateRangePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Label,
  RangeCalendar,
} from 'react-aria-components'
import type { CalendarDate } from '@internationalized/date'
import { Popover } from '../tailgrids/core/popover'
import { cn } from '../../lib/cn'
import { RequiredMark } from './form-field'
import { CalendarDays, ChevronLeft, ChevronRight } from './icons'
import { calendarNavButtonClass, dateGroupClass, dateSegmentClass, parseDateValue } from './date-parts'

export interface DateRange {
  /** `yyyy-mm-dd`, or '' when not set. */
  from: string
  to: string
}

interface DateRangeFieldProps {
  label: string
  value: DateRange
  onChange: (value: DateRange) => void
  /** Hidden fields for the start and end, so FormData-driven forms keep working. */
  names?: [string, string]
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  min?: string
  max?: string
  hideLabel?: boolean
  /** Toolbar height, matching the search box and select filters beside it. */
  compact?: boolean
  /** Spells the chosen range out under the field ("Từ … đến … · N ngày") so it can be checked at a glance. */
  showSummary?: boolean
  /** Shows the required star without making the browser enforce it. */
  markRequired?: boolean
  hint?: string
  className?: string
}

const shortDate = (date: CalendarDate) =>
  `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`

// One field for a from-to pair: two date inputs in one frame and a calendar that picks both ends.
function DateRangeField({
  label,
  value,
  onChange,
  names,
  disabled,
  required,
  invalid,
  min,
  max,
  hideLabel,
  compact,
  showSummary,
  markRequired,
  hint,
  className,
}: DateRangeFieldProps) {
  const start = parseDateValue(value.from)
  const end = parseDateValue(value.to)
  const range = start && end ? { start, end } : null
  const days = range ? range.end.compare(range.start) + 1 : 0

  return (
    <I18nProvider locale="vi-VN">
      <DateRangePicker
        value={range}
        onChange={(next) => onChange(next ? { from: next.start.toString(), to: next.end.toString() } : { from: '', to: '' })}
        granularity="day"
        isDisabled={disabled}
        isRequired={required}
        isInvalid={invalid || undefined}
        validationBehavior="native"
        minValue={parseDateValue(min) ?? undefined}
        maxValue={parseDateValue(max) ?? undefined}
        className={cn('group flex flex-col gap-1.5 text-sm font-medium text-text-primary', className)}
      >
        <Label className={hideLabel ? 'sr-only' : undefined}>
          {label}
          {markRequired && <RequiredMark />}
        </Label>
        <Group className={dateGroupClass(compact)}>
          <DateInput slot="start" className="flex items-center gap-px">
            {(segment) => <DateSegment segment={segment} className={dateSegmentClass} />}
          </DateInput>
          <span aria-hidden="true" className="px-1.5 text-text-tertiary">–</span>
          <DateInput slot="end" className="flex min-w-0 flex-1 items-center gap-px">
            {(segment) => <DateSegment segment={segment} className={dateSegmentClass} />}
          </DateInput>
          <Button
            aria-label={`Chọn khoảng ngày: ${label}`}
            className={cn(calendarNavButtonClass, 'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50')}
          >
            <CalendarDays size={16} aria-hidden="true" />
          </Button>
        </Group>
        <Popover placement="bottom start" className="w-72 bg-card-background p-3 shadow-lg">
          <Dialog className="flex flex-col gap-3 outline-none">
            <RangeCalendar className="flex flex-col gap-2">
              <header className="flex items-center justify-between">
                <Button slot="previous" aria-label="Tháng trước" className={calendarNavButtonClass}>
                  <ChevronLeft size={16} aria-hidden="true" />
                </Button>
                <Heading className="m-0 text-sm font-semibold text-text-primary" />
                <Button slot="next" aria-label="Tháng sau" className={calendarNavButtonClass}>
                  <ChevronRight size={16} aria-hidden="true" />
                </Button>
              </header>
              <CalendarGrid className="w-full border-separate border-spacing-y-0.5">
                <CalendarGridHeader>
                  {(day) => <CalendarHeaderCell className="pb-1 text-xs font-medium text-text-tertiary">{day}</CalendarHeaderCell>}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className="grid h-9 cursor-pointer place-items-center text-sm text-text-primary outline-none focus-visible:outline-none! data-[today]:font-semibold data-[hovered]:bg-background-gray-secondary data-[focus-visible]:ring-2 data-[focus-visible]:ring-primary data-[outside-month]:invisible data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[selected]:bg-primary/15 data-[selection-start]:rounded-l-lg data-[selection-start]:bg-primary data-[selection-start]:text-white data-[selection-end]:rounded-r-lg data-[selection-end]:bg-primary data-[selection-end]:text-white"
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </RangeCalendar>
            {!required && range && (
              <Button
                onPress={() => onChange({ from: '', to: '' })}
                className="cursor-pointer self-end rounded-lg border-0 bg-transparent px-2 py-1 text-sm font-medium text-text-secondary outline-none hover:bg-background-gray-secondary focus-visible:outline-none!"
              >
                Xóa
              </Button>
            )}
          </Dialog>
        </Popover>
        {showSummary && range && (
          <span className="text-xs font-normal text-text-secondary">
            Từ {shortDate(range.start)} đến {shortDate(range.end)} · {days} ngày
          </span>
        )}
        {hint && <span className="text-xs font-normal text-text-tertiary">{hint}</span>}
        {names && (
          <>
            <input type="hidden" name={names[0]} value={value.from} />
            <input type="hidden" name={names[1]} value={value.to} />
          </>
        )}
      </DateRangePicker>
    </I18nProvider>
  )
}

export default DateRangeField

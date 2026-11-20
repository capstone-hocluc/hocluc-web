import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Label,
} from 'react-aria-components'
import { Popover } from '../tailgrids/core/popover'
import { cn } from '../../lib/cn'
import { CalendarDays, ChevronLeft, ChevronRight } from './icons'
import { calendarNavButtonClass as navButtonClass, dateGroupClass, dateSegmentClass, parseDateValue as parseValue } from './date-parts'

interface DateFieldProps {
  label: string
  /** Adds a hidden field in the date text format so FormData-driven forms keep working. */
  name?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
  hint?: string
  invalid?: boolean
  min?: string
  max?: string
  hideLabel?: boolean
  /** Toolbar height, matching the search box and select filters beside it. */
  compact?: boolean
  student?: boolean
}

function DateField({ label, name, value, onChange, disabled, required, className, hint, invalid, min, max, hideLabel, compact, student }: DateFieldProps) {
  const parsed = parseValue(value)
  return (
    <I18nProvider locale="vi-VN">
      <DatePicker
        value={parsed}
        onChange={(next) => onChange(next?.toString() ?? '')}
        granularity="day"
        isDisabled={disabled}
        isRequired={required}
        isInvalid={invalid || undefined}
        validationBehavior="native"
        minValue={parseValue(min) ?? undefined}
        maxValue={parseValue(max) ?? undefined}
        className={cn('group flex flex-col gap-1.5 text-sm font-medium text-text-primary', className)}
      >
        <Label className={hideLabel ? "sr-only" : undefined}>{label}</Label>
        <Group className={cn(student ? "flex h-11 w-full items-center rounded-xl border border-line bg-surface pr-1 pl-3.5 text-[15px] font-semibold text-text-heading focus-within:border-primary" : dateGroupClass(compact))}>
          <DateInput className="flex min-w-0 flex-1 items-center gap-px">
            {(segment) => (
              <DateSegment
                segment={segment}
                className={dateSegmentClass}
              />
            )}
          </DateInput>
          <Button aria-label={`Chọn ngày: ${label}`} className={cn(navButtonClass, 'size-8 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50')}>
            <CalendarDays size={16} aria-hidden="true" />
          </Button>
        </Group>
        <Popover placement="bottom start" className="w-72 bg-card-background p-3 shadow-lg">
          <Dialog className="flex flex-col gap-3 outline-none">
            <Calendar className="flex flex-col gap-2">
              <header className="flex items-center justify-between">
                <Button slot="previous" aria-label="Tháng trước" className={navButtonClass}><ChevronLeft size={16} aria-hidden="true" /></Button>
                <Heading className="m-0 text-sm font-semibold text-text-primary" />
                <Button slot="next" aria-label="Tháng sau" className={navButtonClass}><ChevronRight size={16} aria-hidden="true" /></Button>
              </header>
              <CalendarGrid className="w-full border-separate border-spacing-y-0.5">
                <CalendarGridHeader>
                  {(day) => <CalendarHeaderCell className="pb-1 text-xs font-medium text-text-tertiary">{day}</CalendarHeaderCell>}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className="mx-auto grid size-9 cursor-pointer place-items-center rounded-lg text-sm text-text-primary outline-none focus-visible:outline-none! data-[today]:ring-1 data-[today]:ring-primary/50 data-[hovered]:bg-background-gray-secondary data-[focus-visible]:ring-2 data-[focus-visible]:ring-primary data-[outside-month]:hidden data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[selected]:bg-primary data-[selected]:text-white"
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </Calendar>
            {!required && parsed && (
              <Button onPress={() => onChange('')} className="cursor-pointer self-end rounded-lg border-0 bg-transparent px-2 py-1 text-sm font-medium text-text-secondary outline-none hover:bg-background-gray-secondary focus-visible:outline-none!">
                Xóa
              </Button>
            )}
          </Dialog>
        </Popover>
        {hint && <span className="text-xs font-normal text-text-tertiary">{hint}</span>}
        {name && <input type="hidden" name={name} value={value} />}
      </DatePicker>
    </I18nProvider>
  )
}

export default DateField

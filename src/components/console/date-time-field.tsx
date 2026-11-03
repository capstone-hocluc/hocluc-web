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
  TimeField,
} from 'react-aria-components'
import { CalendarDateTime, getLocalTimeZone, parseDateTime, Time, today } from '@internationalized/date'
import { Popover } from '../tailgrids/core/popover'
import { cn } from '../../lib/cn'
import { CalendarDays, ChevronLeft, ChevronRight } from './icons'

// Date + time picker that reads and writes the same "YYYY-MM-DDTHH:mm" text as <input type="datetime-local">,
// so callers keep their string state.
interface DateTimeFieldProps {
  label: string
  /** Adds a hidden field in the datetime-local text format so FormData-driven forms keep working. */
  name?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
}

function parseValue(text: string) {
  if (!text) return null
  try {
    return parseDateTime(text)
  } catch {
    return null
  }
}

const navButtonClass =
  'grid size-8 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-icon-primary outline-none hover:bg-background-gray-secondary focus-visible:outline-none! data-[focus-visible]:bg-background-gray-secondary'

function DateTimeField({ label, name, value, onChange, disabled, required, className }: DateTimeFieldProps) {
  const parsed = parseValue(value)
  const emit = (next: CalendarDateTime | null) => onChange(next ? next.toString().slice(0, 16) : '')
  const setTime = (time: Time | null) => {
    if (!time) return
    const day = today(getLocalTimeZone())
    const base = parsed ?? new CalendarDateTime(day.year, day.month, day.day)
    emit(base.set({ hour: time.hour, minute: time.minute }))
  }
  return (
    <I18nProvider locale="vi-VN">
      <DatePicker
        value={parsed}
        onChange={(next) => emit(next as CalendarDateTime | null)}
        granularity="minute"
        hourCycle={24}
        isDisabled={disabled}
        isRequired={required}
        shouldCloseOnSelect={false}
        className={cn('group flex flex-col gap-1.5 text-sm font-medium text-text-primary', className)}
      >
        <Label>{label}</Label>
        <Group className="flex h-10 w-full items-center rounded-lg border border-card-border bg-input-background pr-1 pl-4 text-sm font-normal text-text-primary focus-within:border-input-primary-focus-border data-[disabled]:cursor-not-allowed data-[disabled]:border-input-disabled-border data-[disabled]:bg-input-disabled-background data-[disabled]:text-input-disabled-text">
          <DateInput className="flex min-w-0 flex-1 items-center gap-px">
            {(segment) => (
              <DateSegment
                segment={segment}
                className="rounded px-0.5 tabular-nums outline-none focus-visible:outline-none! data-[focused]:bg-primary data-[focused]:text-white data-[placeholder]:text-input-placeholder-text"
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
            <div className="flex items-center justify-between gap-3 border-t border-card-border pt-3">
              <TimeField
                aria-label={`Giờ: ${label}`}
                value={parsed ? new Time(parsed.hour, parsed.minute) : null}
                onChange={setTime}
                hourCycle={24}
                granularity="minute"
                className="flex items-center"
              >
                <DateInput className="flex h-9 items-center gap-px rounded-lg border border-card-border bg-input-background px-3 text-sm text-text-primary focus-within:border-input-primary-focus-border">
                  {(segment) => (
                    <DateSegment
                      segment={segment}
                      className="rounded px-0.5 tabular-nums outline-none focus-visible:outline-none! data-[focused]:bg-primary data-[focused]:text-white data-[placeholder]:text-input-placeholder-text"
                    />
                  )}
                </DateInput>
              </TimeField>
              {!required && parsed && (
                <Button onPress={() => onChange('')} className="cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-sm font-medium text-text-secondary outline-none hover:bg-background-gray-secondary focus-visible:outline-none!">
                  Xóa
                </Button>
              )}
            </div>
          </Dialog>
        </Popover>
        {name && <input type="hidden" name={name} value={value} />}
      </DatePicker>
    </I18nProvider>
  )
}

export default DateTimeField

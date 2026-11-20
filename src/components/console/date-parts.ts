import { parseDate, type CalendarDate } from '@internationalized/date'

/** Reads a `yyyy-mm-dd` value; anything else is treated as no date. */
export function parseDateValue(text: string | undefined): CalendarDate | null {
  if (!text) return null
  try {
    return parseDate(text)
  } catch {
    return null
  }
}

/** Month arrows and the field's calendar button. */
export const calendarNavButtonClass =
  'grid size-8 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-icon-primary outline-none hover:bg-background-gray-secondary focus-visible:outline-none! data-[focus-visible]:bg-background-gray-secondary'

/** One editable part of a date (day, month or year) inside a date input. */
export const dateSegmentClass =
  'rounded px-0.5 tabular-nums outline-none focus-visible:outline-none! data-[focused]:bg-primary data-[focused]:text-white data-[placeholder]:text-input-placeholder-text'

/** The console input frame around a date field; `compact` matches the toolbar filters beside it. */
export function dateGroupClass(compact?: boolean) {
  return [
    compact ? 'h-9' : 'h-10',
    'flex w-full items-center rounded-lg border border-card-border bg-input-background pr-1 pl-4 text-sm font-normal text-text-primary focus-within:border-input-primary-focus-border/40 data-[disabled]:cursor-not-allowed data-[disabled]:border-input-disabled-border data-[disabled]:bg-input-disabled-background data-[disabled]:text-input-disabled-text',
  ].join(' ')
}

// Formatting for the console CRUD screens. Instants are shown in Vietnam time, the
// console's business zone, so a date filter and the column it filters agree.
const VN = 'Asia/Ho_Chi_Minh'

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: VN,
})

const DATE = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: VN })

const DATE_INPUT = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: VN,
})

export const EMPTY = '—'

export function formatVnd(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY : VND.format(value)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? EMPTY : DATE_TIME.format(date)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? EMPTY : DATE.format(date)
}

/** An ISO instant to the YYYY-MM-DD a date input expects. */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : DATE_INPUT.format(date)
}

/** The YYYY-MM-DD value that ends that day in Vietnam, as an ISO instant. */
export function endOfDayInstant(dateOnly: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? `${dateOnly}T23:59:59+07:00` : null
}

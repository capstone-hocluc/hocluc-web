export const courseCurrency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export const courseDate = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** A yyyy-mm-dd course date as a local date, or null when it is missing or unreadable. */
export function parseCourseDate(value?: string) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatCoursePrice(price?: number) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return null
  return price === 0 ? 'Miễn phí' : courseCurrency.format(price)
}

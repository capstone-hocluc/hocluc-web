const fullDate = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })

export function chatDay(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : fullDate.format(date)
}

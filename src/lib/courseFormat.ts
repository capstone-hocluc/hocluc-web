// Confirmed readable labels for known enum values. Anything not listed here
// falls back to a generic prettified version of the raw value instead of
// guessing a Vietnamese translation we can't confirm.
const EXAM_LABELS: Record<string, string> = {
  VNUHCM_DGNL: 'ĐGNL ĐHQG-HCM',
}

export function prettifyEnum(value?: string) {
  if (!value) return ''
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const COURSE_TRACK_LABELS: Record<string, string> = {
  LONG: 'Dài hạn',
  STANDARD: 'Tiêu chuẩn',
  SPRINT_ROUND2: 'Nước rút đợt 2',
}

export function formatCourseTrack(value?: string | null) {
  if (!value) return ''
  return COURSE_TRACK_LABELS[value] || 'Lộ trình học'
}

export function formatExamLabel(value?: string) {
  if (!value) return ''
  return EXAM_LABELS[value] || prettifyEnum(value)
}

// Backend enum -> Vietnamese label. Only values seen from the API are listed;
// anything else falls back to the prettified raw value.
const ENROLLMENT_BRANCH_LABELS: Record<string, string> = {
  NEW_COURSE_FULL_ROADMAP: 'Lộ trình đầy đủ',
  WAIT_FOR_LATER_COURSE: 'Nên chờ khóa học sau',
}

// The backend sends this text in English; known branches get a Vietnamese
// message, others keep whatever the backend returned.
const ENROLLMENT_BRANCH_MESSAGES: Record<string, string> = {
  WAIT_FOR_LATER_COURSE:
    'Khóa học này sắp kết thúc - chúng tôi khuyến nghị bạn nên chờ khóa học kế tiếp.',
}

const ENROLLMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASED: 'Đã mua',
}

export function formatEnrollmentBranch(value?: string | null) {
  if (!value) return ''
  return ENROLLMENT_BRANCH_LABELS[value] || prettifyEnum(value)
}

export function formatEnrollmentBranchMessage(branch?: string | null, message?: string | null) {
  return (branch && ENROLLMENT_BRANCH_MESSAGES[branch]) || message || ''
}

export function formatEnrollmentType(value?: string | null) {
  if (!value) return ''
  return ENROLLMENT_TYPE_LABELS[value] || prettifyEnum(value)
}

export function formatDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('vi-VN')
}

export function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN')
}

export function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function formatCoursePrice(price?: number, paid?: boolean) {
  if (paid === false || !price) return 'Miễn phí'
  return `${price.toLocaleString('vi-VN')} ₫`
}

export function formatDuration(totalSeconds?: number) {
  if (!totalSeconds || totalSeconds <= 0) return '0 phút'
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} phút`
  if (minutes === 0) return `${hours} giờ`
  return `${hours} giờ ${minutes} phút`
}

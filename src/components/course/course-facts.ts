import { formatDuration } from '../../lib/courseFormat'
import type { CourseDetail } from '../../services/courseService'
import { courseDate, parseCourseDate } from '../landing-page/landing-course-format'

export interface CourseFact {
  key: 'includes' | 'start' | 'exam' | 'duration' | 'access' | 'gifts' | 'chapters' | 'lessons'
  label: string
  value: string
  note?: string
}

export const courseDay = (value?: string) => {
  const date = parseCourseDate(value)
  return date ? courseDate.format(date) : null
}

// How long a buyer keeps the course; null when the backend does not say.
function accessLength(course: CourseDetail): string | null {
  if (course.accessMode === 'DAYS_FROM_PURCHASE' && course.accessDays) {
    return `${course.accessDays} ngày từ khi mua`
  }
  if (course.accessMode === 'FIXED_END_DATE') {
    return courseDay(course.endDate) ? `Đến hết ${courseDay(course.endDate)}` : 'Không giới hạn'
  }
  return null
}

// The facts the course page's hero lists, in the order a bundle shows them. The study time the
// author entered wins over the hours a description's fact line states.
export function courseFacts(
  course: CourseDetail,
  view: {
    bundle: boolean
    giftCount: number
    chapterCount: number
    lessonCount: number
    weeks: number | null
    hours: number | null
  }
): CourseFact[] {
  const facts: CourseFact[] = []
  if (view.bundle) facts.push({ key: 'includes', label: 'Gồm', value: `${view.giftCount} khóa học` })
  const start = courseDay(course.startDate)
  if (start) {
    const end = courseDay(course.endDate)
    facts.push({
      key: 'start',
      label: 'Khai giảng',
      value: end ? `${start} – ${end}` : start,
      note: view.weeks ? `${view.weeks} tuần` : undefined,
    })
  }
  const exam = courseDay(course.examSessionDate)
  if (exam) {
    const session = course.examSession
    facts.push({
      key: 'exam',
      label: 'Ngày thi',
      value: `${session ? `${session.name} · ` : ''}${exam}${session && !session.dateConfirmed ? ' (dự kiến)' : ''}`,
    })
  }
  const minutes = course.estimatedDurationMinutes || (view.hours ? Math.round(view.hours * 60) : 0)
  if (minutes) facts.push({ key: 'duration', label: 'Thời lượng', value: formatDuration(minutes * 60) })
  const access = accessLength(course)
  if (access) facts.push({ key: 'access', label: 'Hạn dùng', value: access })
  if (view.giftCount > 0 && !view.bundle) {
    facts.push({ key: 'gifts', label: 'Khóa đi kèm', value: `${view.giftCount} khóa` })
  }
  if (view.chapterCount > 0) facts.push({ key: 'chapters', label: 'Chương', value: `${view.chapterCount} chương` })
  if (view.lessonCount > 0) facts.push({ key: 'lessons', label: 'Bài học', value: `${view.lessonCount} bài` })
  return facts
}

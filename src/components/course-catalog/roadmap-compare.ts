import { parseCourseDate } from '../landing-page/landing-course-format'
import type { Course } from '../../services/courseService'

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days from local midnight of `today` to a course date; negative once the date has passed. */
export function daysFrom(today: Date, value?: string) {
  const date = parseCourseDate(value)
  if (!date) return null
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - start.getTime()) / DAY_MS)
}

/** Weeks between opening day and the exam the roadmap prepares for (its end date when no exam is set). */
export function prepWeeks(course: Course) {
  const from = parseCourseDate(course.startDate)
  const to = parseCourseDate(course.examSessionDate ?? course.endDate)
  if (!from || !to || to <= from) return null
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / (7 * DAY_MS)))
}

/** Who a roadmap suits, read from how long it gives before the exam. */
export function fitFor(weeks: number | null) {
  if (weeks === null) return null
  if (weeks >= 14) return 'Phù hợp nếu bạn muốn ôn sớm, học chắc nền tảng rồi mới luyện đề.'
  if (weeks >= 8) return 'Phù hợp nếu bạn đã có nền cơ bản và cần tăng tốc luyện đề.'
  return 'Phù hợp nếu bạn cần nước rút, tập trung luyện đề sát ngày thi.'
}

/** Shown under the opening date, so it does not repeat "Khai giảng". */
export function openingLabel(days: number | null) {
  if (days === null) return null
  if (days > 0) return `Còn ${days} ngày`
  if (days === 0) return 'Hôm nay'
  return 'Đã khai giảng'
}

/** An exam date counts as fixed only when its exam session says it is confirmed. */
export const examIsTentative = (course: Course) => course.examSession?.dateConfirmed !== true

export type RoadmapBadge = 'suggested' | 'recommended' | 'opening-soon'

export const BADGE_LABELS: Record<RoadmapBadge, string> = {
  suggested: 'Đề xuất cho bạn',
  recommended: 'Khuyên dùng',
  'opening-soon': 'Sắp khai giảng',
}

const OPENING_SOON_DAYS = 30

/**
 * At most one badge per roadmap, decided from the data:
 * - when the backend suggests roadmaps for this student, those carry "Đề xuất cho bạn" and nothing else
 *   is badged, so the comparison never contradicts the suggestion on the cards above;
 * - otherwise, among roadmaps not owned yet and not opened yet, the one giving the most weeks before
 *   its exam is "Khuyên dùng", and the one opening soonest (within 30 days) is "Sắp khai giảng" when it
 *   is a different roadmap.
 */
export function pickBadges(courses: Course[], today: Date) {
  const badges = new Map<string, RoadmapBadge>()
  const suggested = courses.filter((course) => course.recommended && !course.purchased)
  if (suggested.length > 0) {
    suggested.forEach((course) => badges.set(course.id, 'suggested'))
    return badges
  }

  const open = courses.flatMap((course) => {
    const days = daysFrom(today, course.startDate)
    return !course.purchased && days !== null && days >= 0 ? [{ course, days, weeks: prepWeeks(course) }] : []
  })
  const longest = open.reduce<(typeof open)[number] | null>(
    (best, item) => (item.weeks !== null && (best === null || item.weeks > (best.weeks ?? 0)) ? item : best),
    null
  )
  if (longest) badges.set(longest.course.id, 'recommended')

  const soonest = open.reduce<(typeof open)[number] | null>(
    (best, item) => (best === null || item.days < best.days ? item : best),
    null
  )
  if (soonest && soonest.days <= OPENING_SOON_DAYS && !badges.has(soonest.course.id)) {
    badges.set(soonest.course.id, 'opening-soon')
  }
  return badges
}

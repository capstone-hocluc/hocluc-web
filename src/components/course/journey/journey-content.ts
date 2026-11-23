import { formatExamLabel } from '../../../lib/courseFormat'
import type { CourseDetail, CoursePhase, GiftCourse } from '../../../services/courseService'
import { subjectFor, type SubjectStyle } from '../../landing-page/course-subjects'
import { courseDate, parseCourseDate } from '../../landing-page/landing-course-format'
import { includedCourseSummary, parseDescription, weeksBetween } from '../course-detail-content'

/** The scene is laid out for this many stages and this many courses in one stage. */
const MAX_STAGES = 5
const MAX_STAGE_COURSES = 8
const HIGHLIGHT_COUNT = 3

/** One figure with its unit, such as "19 khóa". */
export interface JourneyStat {
  value: string
  unit: string
}

export interface JourneyCourse {
  id: string
  title: string
  href: string
  subject: SubjectStyle
  subjectName: string
  /** The big figure on the course's ticket: its hours, or its lessons when the hours are unknown. */
  figure: JourneyStat
  /** "5 chương · 12 bài · 20 giờ". */
  facts: string
  /** The course in one line, such as "Khóa cơ bản · Phần 1A Tiếng Việt (câu 1–30)". */
  summary: string | null
  /** The first things the course teaches, under the heading its description gives them. */
  highlights: { heading: string | null; items: string[] } | null
}

export interface JourneyStage {
  key: string
  name: string
  description: string | null
  stats: JourneyStat[]
  courses: JourneyCourse[]
}

/** A course studied alongside every stage rather than in one of them. */
export interface JourneyCompanion {
  id: string
  title: string
  href: string
  facts: string
}

export interface JourneyContent {
  title: string
  summary: string
  start: { label: string; date: string | null }
  stages: JourneyStage[]
  companions: JourneyCompanion[]
  finish: {
    /** Name of the last step on the progress bar. */
    step: string
    headline: string[]
    note: string | null
    stats: JourneyStat[]
  }
}

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

const day = (value?: string) => {
  const date = parseCourseDate(value)
  return date ? courseDate.format(date) : null
}

const courseHref = (id: string) => `/courses/${encodeURIComponent(id)}`

const hoursOf = (gift: GiftCourse) => includedCourseSummary(gift.description).hours

/** Total hours of some courses, or null when any of them does not state its hours. */
function totalHours(gifts: GiftCourse[]) {
  let total = 0
  for (const gift of gifts) {
    const hours = hoursOf(gift)
    if (hours === null) return null
    total += hours
  }
  return total
}

const totalLessons = (gifts: GiftCourse[]) => gifts.reduce((sum, gift) => sum + gift.lessonCount, 0)

function stats(gifts: GiftCourse[]): JourneyStat[] {
  const hours = totalHours(gifts)
  const lessons = totalLessons(gifts)
  return [
    { value: number.format(gifts.length), unit: 'khóa' },
    ...(hours ? [{ value: number.format(hours), unit: 'giờ' }] : []),
    ...(lessons ? [{ value: number.format(lessons), unit: 'bài' }] : []),
  ]
}

function facts(gift: GiftCourse, withChapters: boolean) {
  const hours = hoursOf(gift)
  return [
    withChapters && gift.chapterCount > 0 && `${gift.chapterCount} chương`,
    gift.lessonCount > 0 && `${gift.lessonCount} bài`,
    hours !== null && `${number.format(hours)} giờ`,
  ]
    .filter(Boolean)
    .join(' · ')
}

// "Giai đoạn 1 – Nền tảng" is shown as "Nền tảng"; a name without that second part stays whole.
function stageName(phase: CoursePhase, index: number) {
  const name = phase.name?.trim()
  if (!name) return `Chặng ${index + 1}`
  return name.split(/\s[–—-]\s/).slice(1).join(' – ').trim() || name
}

// The course description tells its roadmap as "• Giai đoạn 1 – Nền tảng: định hướng kỳ thi, …";
// the text after the stage's name describes that stage.
function stageDescription(phase: CoursePhase, roadmapLines: string[]) {
  const name = phase.name?.trim()
  if (!name) return null
  const opening = `${name}:`.toLocaleLowerCase('vi-VN')
  for (const line of roadmapLines) {
    if (!line.toLocaleLowerCase('vi-VN').startsWith(opening)) continue
    const text = line.slice(opening.length).trim()
    return text ? text.charAt(0).toLocaleUpperCase('vi-VN') + text.slice(1) : null
  }
  return null
}

function highlights(gift: GiftCourse) {
  const lists = parseDescription(gift.description).filter((block) => block.bullets.length > 0)
  // What the course teaches reads better here than who it is for.
  const block = lists.find((list) => !list.heading?.toLocaleLowerCase('vi-VN').includes('dành cho ai')) ?? lists[0]
  return block ? { heading: block.heading, items: block.bullets.slice(0, HIGHLIGHT_COUNT) } : null
}

function journeyCourse(gift: GiftCourse): JourneyCourse {
  const subject = subjectFor(gift.categoryName)
  const { summary, hours } = includedCourseSummary(gift.description)
  return {
    id: gift.courseId,
    title: gift.title,
    href: courseHref(gift.courseId),
    subject,
    subjectName: gift.categoryName?.trim() || subject.short,
    figure:
      hours !== null
        ? { value: number.format(hours), unit: 'giờ' }
        : { value: number.format(gift.lessonCount), unit: 'bài' },
    facts: facts(gift, true),
    summary,
    highlights: highlights(gift),
  }
}

// A course sold as a set of smaller courses, told as a road: its stages in order, the courses of
// each stage, the courses that run alongside all of them, and the exam at the end. Null when the
// course has no stage to walk through, or more than the scene can lay out; the page then lists
// the courses instead.
export function buildJourney(course: CourseDetail): JourneyContent | null {
  const phases = [...(course.phases ?? [])].sort((a, b) => (a.sequence ?? Infinity) - (b.sequence ?? Infinity))
  const staged = phases.filter((phase) => phase.id && phase.gifts.length > 0)
  if (staged.length === 0 || staged.length > MAX_STAGES) return null
  if (staged.some((phase) => phase.gifts.length > MAX_STAGE_COURSES)) return null

  const alongside = phases.filter((phase) => !phase.id).flatMap((phase) => phase.gifts)
  const everything = [...staged.flatMap((phase) => phase.gifts), ...alongside]
  const roadmapLines = parseDescription(course.description)
    .filter((block) => block.heading?.startsWith('Lộ trình'))
    .flatMap((block) => block.bullets)

  const start = day(course.startDate)
  const exam = day(course.examSessionDate)
  const end = exam ?? day(course.endDate)
  const hours = totalHours(everything)
  const weeks = weeksBetween(course.startDate, course.endDate)
  const session = course.examSession
  const examName = [formatExamLabel(course.targetExam), session?.examYear].filter(Boolean).join(' ')

  return {
    title: exam ? 'Lộ trình đến ngày thi' : 'Lộ trình học',
    summary: [
      start && end && `${start} → ${end}`,
      `${staged.length} chặng`,
      `${everything.length} khóa`,
      hours && `${number.format(hours)} giờ`,
    ]
      .filter(Boolean)
      .join(' · '),
    start: { label: start ? 'Khai giảng' : 'Bắt đầu', date: start },
    stages: staged.map((phase, index) => ({
      key: phase.id ?? String(index),
      name: stageName(phase, index),
      description: stageDescription(phase, roadmapLines),
      stats: stats(phase.gifts),
      courses: phase.gifts.map(journeyCourse),
    })),
    companions: alongside.map((gift) => ({
      id: gift.courseId,
      title: gift.title,
      href: courseHref(gift.courseId),
      facts: facts(gift, false),
    })),
    finish: {
      step: exam ? 'Ngày thi' : 'Về đích',
      headline: exam ? [session ? `Thi ${session.name}` : 'Ngày thi', exam] : end ? ['Kết thúc', end] : ['Hoàn thành lộ trình'],
      note: exam && session && !session.dateConfirmed ? `Ngày thi dự kiến${examName ? ` của kỳ ${examName}` : ''}.` : null,
      stats: [...stats(everything), ...(weeks ? [{ value: number.format(weeks), unit: 'tuần' }] : [])],
    },
  }
}

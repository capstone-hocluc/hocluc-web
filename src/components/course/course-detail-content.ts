import type { CourseChapter, CourseDetail, CoursePhase, GiftCourse } from '../../services/courseService'
import { parseCourseDate } from '../landing-page/landing-course-format'

export interface DescriptionBlock {
  heading: string | null
  lines: string[]
  bullets: string[]
}

// Course descriptions are written as "Heading\n• item\n• item\nHeading\n…": a line without a
// bullet starts a new block. Text that has no bullets at all stays one plain block.
export function parseDescription(text?: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = []
  let current: DescriptionBlock | null = null
  for (const raw of (text ?? '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const bullet = line.match(/^[•\-*]\s*(.+)$/)
    if (bullet) {
      if (!current) {
        current = { heading: null, lines: [], bullets: [] }
        blocks.push(current)
      }
      current.bullets.push(bullet[1])
    } else if (current && current.bullets.length === 0 && current.heading === null) {
      current.lines.push(line)
    } else {
      current = { heading: line, lines: [], bullets: [] }
      blocks.push(current)
    }
  }
  // A heading with no items under it is a paragraph.
  return blocks.map((block) =>
    block.heading && block.bullets.length === 0 && block.lines.length === 0
      ? { heading: null, lines: [block.heading], bullets: [] }
      : block
  )
}

export function weeksBetween(start?: string, end?: string) {
  const from = parseCourseDate(start)
  const to = parseCourseDate(end)
  if (!from || !to || to <= from) return null
  return Math.ceil((to.getTime() - from.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

// "Luyện thi … · Lộ trình Dài hạn – Từ nền tảng…" reads as "Lộ trình Dài hạn"; other titles stay whole.
export function shortCourseName(title: string) {
  return title.split(' · ')[1]?.split(' – ')[0]?.trim() || title
}

const GIFT_LIST = /^Khóa tặng kèm:\s*/

export interface RoadmapStage {
  id: string
  name: string
  note: string | null
  gifts: GiftCourse[]
}

// Phases name their gift courses in the description ("Khóa tặng kèm: A · B."), since the API
// does not link a gift to a phase. The gifts are grouped that way only when every listed name
// is a real gift and no gift lands in two phases; gifts no phase names run through the whole
// roadmap. Anything else falls back to the plain list (null).
export function roadmapStages(phases: CoursePhase[], gifts: GiftCourse[]): RoadmapStage[] | null {
  const ordered = [...phases].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
  if (ordered.length === 0 || gifts.length === 0) return null
  const byTitle = new Map(gifts.map((gift) => [gift.title, gift]))
  const used = new Set<string>()
  const stages: RoadmapStage[] = []
  for (const phase of ordered) {
    const text = (phase.description ?? '').trim()
    const listed = GIFT_LIST.test(text)
      ? text.replace(GIFT_LIST, '').replace(/\.$/, '').split(' · ').map((name) => name.trim())
      : []
    const stageGifts: GiftCourse[] = []
    for (const name of listed) {
      const gift = byTitle.get(name)
      if (!gift || used.has(gift.courseId)) return null
      used.add(gift.courseId)
      stageGifts.push(gift)
    }
    stages.push({ id: phase.id, name: phase.name, note: listed.length ? null : text || null, gifts: stageGifts })
  }
  if (used.size === 0) return null
  const rest = gifts.filter((gift) => !used.has(gift.courseId))
  if (rest.length) stages.push({ id: 'throughout', name: 'Xuyên suốt lộ trình', note: null, gifts: rest })
  return stages
}

/** The chapters a course teaches itself (a SECTION course, or a MAIN course with own content). */
export function ownChapters(course: CourseDetail): CourseChapter[] {
  return (course.phases ?? [])
    .flatMap((phase) => phase.sections)
    .flatMap((section) => section.chapters)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
}

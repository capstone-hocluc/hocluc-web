import type { CourseChapter, CourseDetail } from '../../services/courseService'
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

/** The chapters a course teaches itself (a SECTION course, or a MAIN course with own content). */
export function ownChapters(course: CourseDetail): CourseChapter[] {
  return (course.phases ?? [])
    .flatMap((phase) => phase.sections)
    .flatMap((section) => section.chapters)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
}

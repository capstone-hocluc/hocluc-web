import { includedCourseSummary, type DescriptionBlock } from '../course-detail-content'

/** What a part of the description is about, which decides how the page shows it. */
export type CoursePartKind = 'audience' | 'learn' | 'outcome' | 'method' | 'list'

export interface CoursePart {
  kind: CoursePartKind
  heading: string | null
  lines: string[]
  items: string[]
  /** Sentences the description puts right after this part. */
  notes: string[]
}

export interface SmallCourseContent {
  /** Short pieces of the description's opening fact line, such as "Khóa kỹ năng" or "Phần 1A Tiếng Việt". */
  tags: string[]
  /** Study hours the fact line states. */
  hours: number | null
  /** Text before the first part, including a fact-line piece too long to be a tag. */
  intro: string[]
  parts: CoursePart[]
}

// The longest tag in use is "Phần 3A Logic & phân tích số liệu (câu 91–102)"; a longer piece of the
// fact line ("Dùng sau khi học xong các phần hoặc ở giai đoạn luyện đề") reads as a sentence.
const TAG_MAX_LENGTH = 48

// The headings small-course descriptions use: "Khóa dành cho ai", "Bạn sẽ học / luyện / biết",
// "Học xong bạn làm được" and "Cách học". Any other heading is a plain list.
function kindOf(heading: string | null): CoursePartKind {
  const text = (heading ?? '').toLocaleLowerCase('vi-VN')
  if (text.includes('dành cho ai')) return 'audience'
  if (text.includes('làm được')) return 'outcome'
  if (text.includes('cách học')) return 'method'
  if (/^bạn sẽ (học|luyện|biết)/.test(text)) return 'learn'
  return 'list'
}

const isParagraph = (block: DescriptionBlock) => !block.heading && block.bullets.length === 0

// A course description as a course page that is not a bundle shows it. The opening fact line
// ("Khóa kỹ năng · 16 giờ · Phần 1A Tiếng Việt") becomes tags and the hours; every other block is a
// part, and a paragraph after a part stays with that part.
export function smallCourseContent(blocks: DescriptionBlock[]): SmallCourseContent {
  let tags: string[] = []
  let hours: number | null = null
  const intro: string[] = []
  let body = blocks

  const [first, ...rest] = blocks
  if (first && isParagraph(first)) {
    const [line, ...more] = first.lines
    const fact = includedCourseSummary(line)
    const pieces = fact.summary ? fact.summary.split(' · ') : []
    // A plain sentence is not a fact line: it has neither hours nor separate pieces.
    if (fact.hours !== null || pieces.length > 1) {
      hours = fact.hours
      tags = pieces.filter((piece) => piece.length <= TAG_MAX_LENGTH)
      intro.push(...pieces.filter((piece) => piece.length > TAG_MAX_LENGTH), ...more)
      body = rest
    }
  }

  const parts: CoursePart[] = []
  for (const block of body) {
    if (!isParagraph(block)) {
      parts.push({
        kind: kindOf(block.heading),
        heading: block.heading,
        lines: block.lines,
        items: block.bullets,
        notes: [],
      })
    } else if (parts.length > 0) {
      parts[parts.length - 1].notes.push(...block.lines)
    } else {
      intro.push(...block.lines)
    }
  }
  return { tags, hours, intro, parts }
}

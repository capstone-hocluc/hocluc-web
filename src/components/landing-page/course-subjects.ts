import type { LandingIconName } from '../../data/landing-content'
import type { CourseDetail, CoursePhase, GiftCourse } from '../../services/courseService'

// Gifts moved from the course to its phases in the backend; read both so either response works.
type PhaseWithGifts = CoursePhase & { gifts?: GiftCourse[] }
type RoadmapWithGifts = CourseDetail & { gifts?: GiftCourse[] }

export interface SubjectStyle {
  key: string
  label: string
  /** Short name for chips. */
  short: string
  /** Where the subject sits in the V-ACT paper, shown next to the subject's courses. */
  part: string
  icon: LandingIconName
  tone: string
  soft: string
}

/** The V-ACT subjects in exam order, then the shared strategy and practice courses. */
export const SUBJECTS: SubjectStyle[] = [
  {
    key: 'tieng-viet',
    label: 'Tiếng Việt',
    short: 'Tiếng Việt',
    part: 'Phần 1 của đề V-ACT · 30 câu',
    icon: 'book-open',
    tone: '#a85a17',
    soft: '#fff1dc',
  },
  {
    key: 'tieng-anh',
    label: 'Tiếng Anh',
    short: 'Tiếng Anh',
    part: 'Phần 1 của đề V-ACT · 30 câu',
    icon: 'languages',
    tone: '#b94266',
    soft: '#fceaf0',
  },
  {
    key: 'toan',
    label: 'Toán học',
    short: 'Toán',
    part: 'Phần 2 của đề V-ACT · 30 câu',
    icon: 'calculator',
    tone: '#087dbd',
    soft: '#e7f5ff',
  },
  {
    key: 'logic',
    label: 'Logic & Số liệu',
    short: 'Logic & Số liệu',
    part: 'Phần 3 của đề V-ACT · 12 câu',
    icon: 'chart-column-increasing',
    tone: '#7652bf',
    soft: '#f0ebff',
  },
  {
    key: 'khoa-hoc',
    label: 'Suy luận khoa học',
    short: 'Suy luận khoa học',
    part: 'Phần 3 của đề V-ACT · 18 câu',
    icon: 'flask-conical',
    tone: '#27735b',
    soft: '#e8f6ee',
  },
  {
    key: 'chung',
    label: 'Chiến lược & Luyện đề',
    short: 'Luyện đề',
    part: 'Dùng cho toàn bộ bài thi V-ACT',
    icon: 'trending-up',
    tone: '#0b3a82',
    soft: '#edf5ff',
  },
]

/** Query parameter the home page reads to open its course catalog on one tab. */
export const COURSE_TAB_PARAM = 'mon'

/** Home page address with the course catalog open on one tab (a subject key or the roadmaps). */
export const courseTabHref = (tab: string) =>
  `/?${COURSE_TAB_PARAM}=${encodeURIComponent(tab)}#khoa-hoc`

const plain = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()

// Backend category names ("Toán học", "Logic, phân tích số liệu", "Chung"...) mapped onto the
// subjects above; a category this page does not know keeps its own name as a subject of its own.
export function subjectFor(categoryName?: string | null): SubjectStyle {
  const name = plain(categoryName ?? '')
  const known = (key: string) => SUBJECTS.find((subject) => subject.key === key)!
  if (name.includes('tieng viet')) return known('tieng-viet')
  if (name.includes('tieng anh') || name.includes('english')) return known('tieng-anh')
  if (name.includes('logic') || name.includes('so lieu')) return known('logic')
  if (name.includes('khoa hoc') || name.includes('science')) return known('khoa-hoc')
  if (name.includes('toan') || name.includes('math')) return known('toan')
  if (!name || name === 'chung' || name.includes('tong hop')) return known('chung')
  return {
    key: `khac-${name.replace(/[^a-z0-9]+/g, '-')}`,
    label: categoryName!.trim(),
    short: categoryName!.trim(),
    part: '',
    icon: 'book-open',
    tone: '#0b3a82',
    soft: '#edf5ff',
  }
}

/** A course sold on its own that a roadmap is built from, as the roadmap's detail lists it. */
export interface SubjectCourse {
  id: string
  title: string
  description?: string
  chapterCount: number
  lessonCount: number
  /** The roadmaps (MAIN courses) that include it. */
  roadmapIds: string[]
}

export interface SubjectGroup {
  subject: SubjectStyle
  courses: SubjectCourse[]
}

const SUBJECT_ORDER = new Map(SUBJECTS.map((subject, index) => [subject.key, index]))

// Collects the courses every roadmap is made of (its gifts, or its own sections on older data),
// once per course, grouped by subject in exam order. Within a subject the roadmap's own phase
// order is kept, so foundation courses come before practice ones.
export function groupSubjectCourses(roadmaps: CourseDetail[]): SubjectGroup[] {
  const byId = new Map<string, SubjectCourse & { subject: SubjectStyle }>()
  const add = (
    roadmapId: string,
    item: Omit<SubjectCourse, 'roadmapIds'> & { categoryName?: string | null }
  ) => {
    if (!item.id) return
    const existing = byId.get(item.id)
    if (existing) {
      if (!existing.roadmapIds.includes(roadmapId)) existing.roadmapIds.push(roadmapId)
      return
    }
    const { categoryName, ...course } = item
    byId.set(item.id, { ...course, roadmapIds: [roadmapId], subject: subjectFor(categoryName) })
  }

  const addGift = (roadmapId: string, gift: GiftCourse) =>
    add(roadmapId, {
      id: gift.courseId,
      title: gift.title,
      description: gift.description,
      categoryName: gift.categoryName,
      chapterCount: gift.chapterCount ?? 0,
      lessonCount: gift.lessonCount ?? 0,
    })

  for (const roadmap of roadmaps) {
    if (!roadmap?.id) continue
    const phases = (Array.isArray(roadmap.phases) ? roadmap.phases : []) as PhaseWithGifts[]
    for (const phase of phases) {
      for (const gift of phase?.gifts ?? []) addGift(roadmap.id, gift)
      for (const section of phase?.sections ?? []) {
        const chapters = section.chapters ?? []
        add(roadmap.id, {
          id: section.sectionCourseId,
          title: section.title,
          description: section.description,
          categoryName: section.categoryName,
          chapterCount: chapters.length,
          lessonCount: chapters.reduce((total, chapter) => total + (chapter.lessons?.length ?? 0), 0),
        })
      }
    }
    const courseGifts = (roadmap as RoadmapWithGifts).gifts
    for (const gift of Array.isArray(courseGifts) ? courseGifts : []) addGift(roadmap.id, gift)
  }

  const groups = new Map<string, SubjectGroup>()
  for (const { subject, ...course } of byId.values()) {
    const group = groups.get(subject.key) ?? { subject, courses: [] }
    group.courses.push(course)
    groups.set(subject.key, group)
  }
  return [...groups.values()].sort(
    (a, b) =>
      (SUBJECT_ORDER.get(a.subject.key) ?? SUBJECTS.length) -
        (SUBJECT_ORDER.get(b.subject.key) ?? SUBJECTS.length) ||
      a.subject.label.localeCompare(b.subject.label, 'vi')
  )
}

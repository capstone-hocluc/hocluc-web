import type { CourseAdmin } from '../../../services/courseAdminService'

export type CourseStepTab = 'overview' | 'content' | 'gifts'
export interface CourseStep {
  id: 'info' | 'content' | 'publish' | 'review' | 'live'
  title: string
  /** done = finished; current = the next thing to do; todo = later; unknown = still loading, never blocks. */
  state: 'done' | 'current' | 'todo' | 'unknown'
  /** What is missing (or advice), shown under the steps. */
  note?: string
  /** Where to work on this step. */
  tab?: CourseStepTab
}

/** The course fields the sale check reads; the course form passes what is typed so far. */
export type CourseSaleFields = Pick<
  CourseAdmin,
  'courseType' | 'categoryId' | 'imageUrl' | 'shortIntroduction' | 'description' | 'startDate' | 'endDate'
> & { examSessionId: string | null }

const blank = (value: string | null | undefined) => !value?.trim()

/**
 * Names of the course fields still empty that the backend requires before the course is sent for
 * review or sold (CourseAdminServiceImpl.requireReady). Saving a draft never needs them.
 */
export function courseSaleGaps(course: CourseSaleFields): CourseSaleGap[] {
  const gaps: CourseSaleGap[] = []
  if (!course.categoryId) gaps.push({ field: 'categoryId', label: 'môn học' })
  if (blank(course.imageUrl)) gaps.push({ field: 'imageUrl', label: 'ảnh khóa học' })
  if (blank(course.shortIntroduction)) gaps.push({ field: 'shortIntroduction', label: 'giới thiệu ngắn' })
  if (blank(course.description)) gaps.push({ field: 'description', label: 'mô tả' })
  if (course.courseType === 'MAIN') {
    if (!course.examSessionId) gaps.push({ field: 'examSessionId', label: 'đợt thi' })
    if (!course.startDate) gaps.push({ field: 'startDate', label: 'ngày bắt đầu' })
    if (!course.endDate) gaps.push({ field: 'endDate', label: 'ngày kết thúc' })
  }
  return gaps
}

export interface CourseSaleGap {
  /** The save request field, as the backend names it in its errors. */
  field: 'categoryId' | 'imageUrl' | 'shortIntroduction' | 'description' | 'examSessionId' | 'startDate' | 'endDate'
  label: string
}

// The route from an empty course to one on sale. The first three steps mirror what the backend
// requires (CourseAdminServiceImpl.requireReady); the backend stays the judge, this only tells staff early.
export function courseSteps(
  course: CourseAdmin,
  chapters: { published: boolean }[] | null,
  canReview: boolean
): CourseStep[] {
  const gifts = course.sections
  const unfinishedGifts = gifts.filter((gift) => gift.status === 'DRAFT').length
  const published = chapters?.filter((chapter) => chapter.published).length ?? 0
  const titled = course.title.trim().length > 0
  const priced = !course.paid || (course.price ?? 0) > 0
  const gaps = courseSaleGaps({ ...course, examSessionId: course.examSession?.id ?? null })
  const loading = chapters === null

  const infoDone = titled && priced && gaps.length === 0
  const contentDone = (chapters?.length ?? 0) > 0 || gifts.length > 0
  const publishDone = (published > 0 || gifts.length > 0) && unfinishedGifts === 0
  const live = course.status === 'PUBLISHED'

  const steps: CourseStep[] = [
    {
      id: 'info',
      title: 'Thông tin khóa',
      state: infoDone ? 'done' : 'todo',
      tab: 'overview',
      note: !titled
        ? 'Khóa cần có tên.'
        : !priced
          ? 'Khóa thu phí cần học phí lớn hơn 0.'
          : gaps.length > 0
            ? `Còn thiếu: ${gaps.map((gap) => gap.label).join(', ')}. Bấm “Sửa thông tin” để điền.`
            : undefined,
    },
    {
      id: 'content',
      title: 'Soạn nội dung',
      state: contentDone ? 'done' : loading ? 'unknown' : 'todo',
      tab: 'content',
      note: contentDone
        ? undefined
        : 'Thêm phần học, chương và bài học ở tab Nội dung (hoặc tặng kèm một khóa).',
    },
    {
      id: 'publish',
      title: 'Xuất bản nội dung',
      state: publishDone ? 'done' : loading && !gifts.length ? 'unknown' : 'todo',
      tab: unfinishedGifts > 0 ? 'gifts' : 'content',
      note: publishDone
        ? undefined
        : unfinishedGifts > 0
          ? `${unfinishedGifts} khóa tặng kèm chưa xuất bản. Xuất bản hoặc gỡ chúng.`
          : 'Xuất bản ít nhất một bài học, rồi xuất bản chương chứa nó.',
    },
    {
      id: 'review',
      title: canReview ? 'Duyệt và bán' : 'Gửi duyệt',
      state: live ? 'done' : 'todo',
      note: live
        ? undefined
        : course.reviewState === 'REJECTED'
          ? 'Bị trả lại. Sửa theo góp ý rồi gửi lại.'
          : undefined,
    },
    { id: 'live', title: 'Đang bán', state: live ? 'done' : 'todo' },
  ]

  // The first unfinished step is the one to work on now.
  const next = steps.findIndex((step) => step.state !== 'done')
  if (next >= 0 && steps[next].state !== 'unknown') steps[next].state = 'current'
  return steps
}

/** The first of the three preparation steps that stops the course from being sent or sold. */
export function firstBlocker(steps: CourseStep[]): CourseStep | undefined {
  return steps.slice(0, 3).find((step) => step.state === 'todo' || step.state === 'current')
}

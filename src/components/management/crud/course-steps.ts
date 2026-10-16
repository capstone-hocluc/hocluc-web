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
  const loading = chapters === null

  const infoDone = titled && priced
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
          : !course.categoryId
            ? 'Nên chọn danh mục để trưởng bộ môn duyệt khóa này.'
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

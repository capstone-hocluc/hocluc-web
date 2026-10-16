import type { CourseAdmin } from '../../../services/courseAdminService'

export type ReadinessTab = 'overview' | 'content' | 'gifts'
export interface ReadinessItem {
  id: 'info' | 'content' | 'gifts' | 'category'
  /** todo = blocks sending/selling; unknown = not loaded yet, so it never blocks. */
  state: 'ok' | 'todo' | 'unknown'
  label: string
  hint?: string
  /** Where to fix it. */
  tab: ReadinessTab
  /** Advice only: the backend does not require it. */
  optional?: boolean
}

// Mirrors what the backend requires before a course can be sent for review or put on sale.
// The backend stays the judge; this only tells staff early.
export function courseReadiness(
  course: CourseAdmin,
  publishedChapters: number | null
): ReadinessItem[] {
  const titled = course.title.trim().length > 0
  const priced = !course.paid || (course.price ?? 0) > 0
  const gifts = course.sections
  const unfinishedGifts = gifts.filter((gift) => gift.status === 'DRAFT').length
  const hasContent = (publishedChapters ?? 0) > 0 || gifts.length > 0

  const items: ReadinessItem[] = [
    {
      id: 'info',
      state: titled && priced ? 'ok' : 'todo',
      label: 'Thông tin khóa đầy đủ',
      hint: !titled
        ? 'Khóa cần có tên.'
        : !priced
          ? 'Khóa thu phí cần học phí lớn hơn 0.'
          : undefined,
      tab: 'overview',
    },
    {
      id: 'content',
      state: hasContent ? 'ok' : publishedChapters === null ? 'unknown' : 'todo',
      label: publishedChapters
        ? `${publishedChapters} chương đã xuất bản`
        : gifts.length > 0
          ? 'Có khóa tặng kèm'
          : 'Có ít nhất một chương đã xuất bản',
      hint: hasContent
        ? undefined
        : 'Xuất bản một chương (chương cần có bài học đã xuất bản), hoặc tặng kèm một khóa đã xuất bản.',
      tab: 'content',
    },
  ]
  if (gifts.length > 0) {
    items.push({
      id: 'gifts',
      state: unfinishedGifts === 0 ? 'ok' : 'todo',
      label:
        unfinishedGifts === 0
          ? 'Khóa tặng kèm đã sẵn sàng'
          : `${unfinishedGifts} khóa tặng kèm chưa xuất bản`,
      hint:
        unfinishedGifts === 0
          ? undefined
          : 'Xuất bản hoặc gỡ các khóa tặng kèm còn ở trạng thái nháp.',
      tab: 'gifts',
    })
  }
  items.push({
    id: 'category',
    state: course.categoryId ? 'ok' : 'todo',
    label: course.categoryId ? 'Đã chọn danh mục' : 'Chưa chọn danh mục',
    hint: course.categoryId ? undefined : 'Chọn danh mục để trưởng bộ môn có thể duyệt khóa này.',
    tab: 'overview',
    optional: true,
  })
  return items
}

/** The first requirement that stops the course from being sent or sold, if any. */
export function firstBlocker(items: ReadinessItem[]): ReadinessItem | undefined {
  return items.find((item) => !item.optional && item.state === 'todo')
}

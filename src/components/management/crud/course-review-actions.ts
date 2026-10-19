import {
  approveCourseReview,
  changeCourseStatus,
  getAdminCourse,
  submitCourseReview,
  type CourseAdmin,
} from '../../../services/courseAdminService'

export type ReviewAction = 'submit' | 'approve' | 'sell' | 'archive'

export const ACTION_COPY: Record<
  ReviewAction,
  { title: string; body: string; confirm: string; done: string }
> = {
  submit: {
    title: 'Gửi duyệt khóa học?',
    body: 'Quản lý hoặc trưởng bộ môn sẽ xem và quyết định cho khóa lên bán. Trong lúc chờ duyệt bạn vẫn xem được khóa nhưng không nên sửa.',
    confirm: 'Gửi duyệt',
    done: 'Đã gửi duyệt. Khóa đang chờ người duyệt xử lý.',
  },
  approve: {
    title: 'Duyệt và bán khóa học?',
    body: 'Khóa sẽ hiện ngay ở trang chủ để học viên mua.',
    confirm: 'Duyệt và bán',
    done: 'Đã duyệt. Khóa đang được bán.',
  },
  sell: {
    title: 'Bán khóa học?',
    body: 'Khóa sẽ hiện ngay ở trang chủ để học viên mua.',
    confirm: 'Bán khóa',
    done: 'Khóa đang được bán.',
  },
  archive: {
    title: 'Lưu trữ khóa học?',
    body: 'Khóa sẽ ngừng bán nhưng học viên đã mua vẫn học được. Muốn bán lại, cần gửi duyệt hoặc bán lại sau khi chỉnh sửa.',
    confirm: 'Lưu trữ',
    done: 'Đã lưu trữ khóa học.',
  },
}

/** Runs one review step on the latest copy of the course (content edits move its version). */
export async function runReviewAction(action: ReviewAction, id: string): Promise<CourseAdmin> {
  const latest = await getAdminCourse(id)
  switch (action) {
    case 'submit':
      return submitCourseReview(latest)
    case 'approve':
      return approveCourseReview(latest)
    case 'sell':
      return changeCourseStatus(latest, 'PUBLISHED')
    case 'archive':
      return changeCourseStatus(latest, 'ARCHIVED')
  }
}

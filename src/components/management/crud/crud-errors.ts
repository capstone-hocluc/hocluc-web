import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'

const messages: Record<string, string> = {
  'This record changed. Reload it before saving.': 'Dữ liệu đã thay đổi. Tải lại trước khi lưu.',
  'This slug is already in use.': 'Slug đã được sử dụng.',
  'Category has children or referenced data. Deactivate it instead.':
    'Danh mục còn dữ liệu liên quan. Hãy ngừng sử dụng thay vì xóa.',
  'Category parent would create a cycle or exceed the supported depth.':
    'Danh mục cha không hợp lệ hoặc tạo vòng lặp.',
  'Choose an active category.': 'Chọn danh mục đang dùng.',
  'Only an unreferenced draft course can be deleted. Archive it instead.':
    'Khóa còn dữ liệu liên quan. Không thể xóa hoặc đổi thành phần đã cấp quyền.',
  'Course is not ready for publication.':
    'Khóa chưa đủ điều kiện xuất bản. Kiểm tra chương và các SECTION.',
  'Move sections out of this phase before deleting it.':
    'Chuyển các SECTION ra khỏi giai đoạn trước khi xóa.',
  'This operation conflicts with referenced or concurrently changed data.':
    'Dữ liệu bị xung đột. Tải lại và kiểm tra các tham chiếu.',
  'Chapter has lessons, quizzes or student progress. Unpublish it or remove unreferenced children first.':
    'Chương còn bài học, quiz hoặc tiến độ học sinh. Hãy ẩn hoặc gỡ các mục con chưa tham chiếu trước.',
  'Publish at least one lesson before publishing this chapter.':
    'Cần ít nhất một bài học đã xuất bản trước khi xuất bản chương.',
  'Lesson not found.': 'Không tìm thấy bài học.',
  'Lesson has progress, quizzes, assignments, videos or enrollment references. Unpublish it instead.':
    'Bài học còn tiến độ, quiz, bài tập, video hoặc ghi danh tham chiếu. Hãy ẩn thay vì xóa.',
  'Lesson needs content or a video before publication. Unpublish its chapter before hiding the last published lesson.':
    'Bài học cần nội dung hoặc video trước khi xuất bản. Ẩn chương trước khi ẩn bài học đã xuất bản cuối cùng.',
}
export function crudError(error: unknown): string {
  const message = getErrorMessage(error)
  return messages[message] ?? message
}
export function unknownMutation(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500
}

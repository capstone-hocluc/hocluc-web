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
}
export function crudError(error: unknown): string {
  const message = getErrorMessage(error)
  return messages[message] ?? message
}
export function unknownMutation(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500
}

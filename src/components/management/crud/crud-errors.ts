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
  'Order not found.': 'Không tìm thấy đơn hàng.',
  'This order is no longer awaiting payment.': 'Đơn không còn ở trạng thái chờ thanh toán.',
  'This order has already been paid.': 'Đơn này đã được thanh toán.',
  'A reason is required when confirming a payment by hand.':
    'Cần nhập lý do khi xác nhận thanh toán thủ công.',
  'Enrollment not found.': 'Không tìm thấy ghi danh.',
  'This student already has an active enrollment on the course.':
    'Học viên đã có ghi danh đang hoạt động cho khóa này.',
  'Unsupported enrollment status change.': 'Không thể đổi sang trạng thái ghi danh này.',
  'Course not found.': 'Không tìm thấy khóa học.',
  'User not found.': 'Không tìm thấy người dùng.',
  'Management request is invalid.': 'Yêu cầu không hợp lệ. Kiểm tra lại thông tin đã nhập.',
  'A study group with this name already exists in the course.':
    'Tên nhóm đã tồn tại trong khóa học.',
  'Capacity cannot be lower than the number of active students.':
    'Sĩ số tối đa không thể thấp hơn số học viên đang học.',
  'This group still has active students. Move them before deleting it.':
    'Nhóm còn học viên đang học. Hãy chuyển họ sang nhóm khác trước.',
  'This student is not an active member of the group.': 'Học viên không còn trong nhóm này.',
  'This mentor is not assigned to the group.': 'Mentor không được gán cho nhóm này.',
  'This study group is already at capacity.': 'Nhóm đã đủ sĩ số.',
  'Choose an account whose active role is MENTOR.': 'Chọn tài khoản có vai trò Mentor.',
  'Choose an account whose active role is STUDENT.': 'Chọn tài khoản có vai trò Học viên.',
  'Email is already registered and active.': 'Email đã được dùng cho tài khoản khác.',
}
export function crudError(error: unknown): string {
  const message = getErrorMessage(error)
  return messages[message] ?? message
}
export function unknownMutation(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500
}

import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'

const messages: Record<string, string> = {
  'This record changed. Reload it before saving.': 'Dữ liệu đã thay đổi. Tải lại trước khi lưu.',
  'This slug is already in use.': 'Slug đã được sử dụng.',
  'Category has children or referenced data. Deactivate it instead.':
    'Môn học còn dữ liệu liên quan. Hãy ngừng sử dụng thay vì xóa.',
  'Category parent would create a cycle or exceed the supported depth.':
    'Môn học cha không hợp lệ hoặc tạo vòng lặp.',
  'Choose an active category.': 'Chọn môn học đang dùng.',
  'Only an unreferenced draft course can be deleted. Archive it instead.':
    'Khóa còn dữ liệu liên quan. Không thể xóa hoặc đổi thành phần đã cấp quyền.',
  'Course is not ready for publication.':
    'Khóa chưa đủ điều kiện để bán. Kiểm tra tên, học phí, chương đã xuất bản và các khóa tặng kèm.',
  'Move sections out of this phase before deleting it.':
    'Chuyển các phần học ra khỏi giai đoạn trước khi xóa.',
  'Send the course for review: a manager or the leader of its subject puts it on sale.':
    'Khóa cần được duyệt trước khi bán. Hãy gửi duyệt; quản lý hoặc trưởng bộ môn sẽ đưa khóa lên bán.',
  "Only a manager or the leader of the course's subject reviews it.":
    'Chỉ quản lý hoặc trưởng bộ môn của khóa mới được duyệt.',
  'The course is not waiting for review.': 'Khóa không ở trạng thái chờ duyệt.',
  'Invalid course state transition.': 'Không thể chuyển khóa sang trạng thái này.',
  'The course is on sale: take it off sale (ARCHIVED) to change it, then send it for review.':
    'Khóa đang bán. Hãy lưu trữ khóa để chỉnh sửa, rồi gửi duyệt lại.',
  'The course is already on sale.': 'Khóa đã được bán.',
  'Move or delete the chapters of this section first.':
    'Chuyển hoặc xóa các chương của phần học này trước.',
  'Classes or recordings of the schedule are for this section.':
    'Lịch học hoặc bản ghi buổi học đang gắn với phần học này.',
  'Section does not belong to this course.': 'Phần học không thuộc khóa này.',
  'A course cannot come with itself.': 'Một khóa không thể tặng kèm chính nó.',
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
  'Category not found.': 'Không tìm thấy môn học.',
  'Course type cannot be changed.': 'Không thể đổi loại khóa (Trọn bộ / Khóa nhỏ).',
  'Notification not found.': 'Không tìm thấy thông báo.',
  'Phase does not belong to this course.': 'Giai đoạn không thuộc khóa này.',
  'Choose an active teacher.': 'Chọn giáo viên đang hoạt động.',
  'Provide each item exactly once in the requested order.':
    'Danh sách sắp xếp phải có đủ từng mục đúng một lần.',
  'List every category of the group exactly once, in the new order.':
    'Danh sách sắp xếp phải có đủ từng môn học của nhóm đúng một lần.',
  'Chapter does not belong to this course.': 'Chương không thuộc khóa này.',
  'Section does not belong to the specified course.': 'Phần học không thuộc khóa đã chọn.',
  'You cannot review your own work.': 'Bạn không thể tự duyệt nội dung của mình.',
  "The chapter's subject or domains are invalid.": 'Môn hoặc domain của chương không hợp lệ.',
  'The lesson labels are invalid.': 'Nhãn của bài học không hợp lệ.',
  'Email is already registered and active.': 'Email đã được dùng cho tài khoản khác.',
}
// Why the backend says a course is not ready, keyed by the field it reports.
const readinessReasons: Record<string, string> = {
  content: 'Cần xuất bản ít nhất một chương, hoặc tặng kèm một khóa đã xuất bản.',
  sections: 'Mọi khóa tặng kèm phải đã xuất bản hoặc lưu trữ.',
}
export function crudError(error: unknown): string {
  const message = getErrorMessage(error)
  const base = messages[message] ?? message
  if (error instanceof ApiError && message === 'Course is not ready for publication.') {
    const reasons = Object.keys(error.errors ?? {})
      .map((key) => readinessReasons[key])
      .filter(Boolean)
    if (reasons.length) return `${base} ${reasons.join(' ')}`
  }
  return base
}
export function unknownMutation(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500
}

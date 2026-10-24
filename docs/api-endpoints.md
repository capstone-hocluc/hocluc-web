# Danh sách API đã kết nối (Frontend)

Tổng hợp toàn bộ API backend mà frontend đang gọi tới, trích xuất từ các file trong [`src/services/`](../src/services/) (client HTTP dùng chung nằm ở [`src/lib/api.ts`](../src/lib/api.ts)).

## Cấu hình chung

- **Base URL**: lấy từ biến môi trường `VITE_API_BASE_URL` hoặc `VITE_API_URL`; mặc định `https://developments.hocluc.com`.
- **Auth**: `auth: true` gắn `Authorization: Bearer <accessToken>` (access token lưu trong `localStorage`). Refresh token chỉ nằm trong cookie HttpOnly do BE quản lý, không đọc/ghi bằng JS. API auth gửi `credentials: 'include'`. Khi gặp `401`, client refresh bằng cookie rồi retry tối đa một lần; refresh bị từ chối `401/403` mới kết thúc phiên, lỗi mạng/5xx giữ phiên để thử lại. Chi tiết tại [auth-cookie.md](auth-cookie.md).
- **optionalAuth**: vẫn gắn token nếu có, nhưng `401` không bị coi là hết phiên (dùng cho các trang public như catalog khóa học).
- Tổng cộng **48 endpoint** đang được gọi trong code, chia theo 7 module bên dưới.

---

## 1. Auth — `src/services/authService.ts`

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/student-register` | ✗ | Đăng ký tài khoản học sinh |
| POST | `/api/v1/auth/confirm` | ✗ | Xác nhận đăng ký bằng OTP |
| POST | `/api/v1/auth/login` | ✗ | Đăng nhập bằng email/password |
| POST | `/api/v1/auth/google` | ✗ | Đăng nhập/đăng ký qua Google ID token |
| POST | `/api/v1/auth/refresh` | Cookie HttpOnly | Làm mới access token, không có body chứa refresh token |
| POST | `/api/v1/auth/forgot-password` | ✗ | Gửi OTP quên mật khẩu |
| POST | `/api/v1/auth/reset-password` | ✗ | Đặt lại mật khẩu bằng OTP |
| POST | `/api/v1/auth/resend-otp` | ✗ | Gửi lại mã OTP |
| POST | `/api/v1/auth/logout` | Cookie; Bearer nếu còn | Thu hồi phiên và xóa cookie, không gửi refresh token trong body |

## 2. User / Profile — `src/services/userService.ts`

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/users/profiles` | ✓ | Lấy thông tin hồ sơ người dùng hiện tại |
| PUT | `/api/v1/users/profiles` | ✓ | Cập nhật hồ sơ chung (tên, phone, bio...) |
| PUT | `/api/v1/users/student-profiles` | ✓ | Cập nhật hồ sơ học sinh (mục tiêu thi, trường...) |
| POST | `/api/v1/users/avatars` | ✓ | Upload ảnh đại diện (multipart/form-data) |
| PUT | `/api/v1/users/passwords` | ✓ | Đổi mật khẩu |
| GET | `/api/v1/users?role&status&page&size&sort` | ✓ | (Admin) Lấy danh sách người dùng có phân trang/lọc |
| POST | `/api/v1/users` | ✓ | (Admin) Tạo tài khoản người dùng mới |
| GET | `/api/v1/users/{id}` | ✓ | (Admin) Lấy chi tiết người dùng theo id |
| DELETE | `/api/v1/users/{id}` | ✓ | (Admin) Xóa người dùng |
| PATCH | `/api/v1/users/{id}/status` | ✓ | (Admin) Cập nhật trạng thái tài khoản (ACTIVE/INACTIVE/...) |
| PATCH | `/api/v1/users/{id}/role` | ✓ | (Admin) Cập nhật vai trò tài khoản |

## 3. Cart — `src/services/cartService.ts`

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/cart` | ✓ | Lấy giỏ hàng hiện tại |
| POST | `/api/v1/cart/items` | ✓ | Thêm khóa học vào giỏ hàng |
| DELETE | `/api/v1/cart/items/{courseId}` | ✓ | Xóa khóa học khỏi giỏ hàng |

## 4. Order — `src/services/orderService.ts`

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/v1/orders/checkout` | ✓ | Tạo đơn hàng từ giỏ hàng (trả kèm thông tin thanh toán SePay/QR) |
| GET | `/api/v1/orders/{orderId}` | ✓ | Lấy chi tiết một đơn hàng |
| GET | `/api/v1/orders/me` | ✓ | Lấy danh sách đơn hàng của người dùng hiện tại |
| POST | `/api/v1/orders/{orderId}/pay` | ✓ | Lấy lại thông tin thanh toán cho đơn hàng |
| POST | `/api/v1/orders/{orderId}/cancel` | ✓ | Hủy đơn hàng |

## 5. Course — `src/services/courseService.ts`

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/courses/my` | ✓ | Danh sách khóa học đã ghi danh của tôi |
| GET | `/api/v1/courses/main` | optionalAuth | Danh sách khóa học công khai (catalog) |
| GET | `/api/v1/courses/main/suggested` | ✓ | Danh sách khóa học được đề xuất |
| GET | `/api/v1/courses/{courseId}` | optionalAuth | Chi tiết khóa học (nội dung, phases/sections/chapters/lessons) |
| GET | `/api/v1/courses/{courseId}/study` | ✓ | Trạng thái học tập của học sinh trong khóa học (tiến độ, quiz, live class) |
| GET | `/api/v1/courses/{courseId}/
ses` | ✓ | Lịch học trực tuyến (next/upcoming/past) của khóa học |
| GET | `/api/v1/courses/{courseId}/enrollment-plan` | ✓ | Lộ trình ghi danh / đề xuất khóa học tiếp theo |

## 6. Lesson — `src/services/lessonService.ts`

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/lessons/{lessonId}` | ✓ | Chi tiết bài học (kèm sẵn tiến độ hiện tại) |
| GET | `/api/v1/lessons/{lessonId}/progress` | ✓ | Lấy tiến độ bài học (dùng để refresh nhẹ) |
| PUT | `/api/v1/lessons/{lessonId}/progress` | ✓ | Cập nhật tiến độ xem bài học |

## 7. Assessment (Quiz & Placement Test) — `src/services/assessmentService.ts`

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/assessments/quizzes/{quizId}` | ✓ | Chi tiết bài quiz (câu hỏi, lịch sử làm bài) |
| POST | `/api/v1/assessments/quizzes/{quizId}/attempts` | ✓ | Bắt đầu (hoặc resume) một lượt làm quiz |
| GET | `/api/v1/assessments/attempts/{attemptId}` | ✓ | Chi tiết lượt làm bài (câu trả lời đã lưu) |
| POST | `/api/v1/assessments/attempts/{attemptId}/answers` | ✓ | Lưu câu trả lời cho một câu hỏi |
| POST | `/api/v1/assessments/attempts/{attemptId}/submit` | ✓ | Nộp bài |
| GET | `/api/v1/assessments/attempts/{attemptId}/review` | ✓ | Xem kết quả/đáp án sau khi nộp bài |
| GET | `/api/v1/assessments/placement` | ✓ | Lấy đề bài kiểm tra đầu vào (placement test) |
| POST | `/api/v1/assessments/placement/attempts` | ✓ | Bắt đầu (hoặc resume) lượt làm bài kiểm tra đầu vào |
| GET | `/api/v1/assessments/placement/attempts/me` | ✓ | Lịch sử các lượt làm bài kiểm tra đầu vào |
| GET | `/api/v1/assessments/results/me` | ✓ | Kết quả bài kiểm tra đầu vào (phân loại năng lực, category mạnh/yếu) |

---

## Ghi chú

- `src/services/studentService.ts` không gọi endpoint mới — nó chỉ tổng hợp (`Promise.all`) kết quả từ `getMyCourses()`, `getCourseStudy()` và `getPlacementResult()` ở trên để dựng dashboard học sinh.
- Các endpoint đánh dấu `{param}` dùng `encodeURIComponent` trước khi ráp vào URL.
- File này liệt kê API tầng frontend gọi ra backend; không bao gồm các API nội bộ của backend không được frontend sử dụng.

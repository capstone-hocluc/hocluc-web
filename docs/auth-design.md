# Đồng bộ giao diện đăng nhập

Ngày 16/10/2026. Học viên: `/login`. Quản trị/nhân sự: `/console/login`.

## Giao diện

- Dùng chung `BrandAuthShell`, font Be Vietnam Pro và các token trong `learner-brand.css` với landing.
- Học viên mở dialog trên landing; quản trị mở trang riêng với nội dung dành cho đội ngũ vận hành.
- Bố cục desktop hai cột: nhận diện và minh họa Mai/Nam bên trái, form bên phải. Logo vẫn `#1CB0F6`; nút `#007EB5` với chữ trắng.
- Trang quản trị có theme sáng/tối. Token tối chỉ áp dụng trong trang đăng nhập quản trị.
- Email, mật khẩu và gửi form là nội dung chính; nút tài khoản phát triển nằm trong mục thu gọn, chỉ ở DEV.
- Trang học viên hỗ trợ gửi bằng Enter và liên kết lỗi email/mật khẩu với input; trang quản trị có nút hiện/ẩn mật khẩu. Kiểu đăng ký, xác minh và khôi phục mật khẩu dùng chung khung nhận diện.
- Quản trị tiếp tục dùng adapter Button của console. Quyền truy cập, audience LEARNER/CONSOLE, xử lý chọn vai trò và dịch vụ xác thực được giữ trong logic hiện có.

## Kiểm tra

- 14/14 E2E trong `playwright.landing.config.ts` đạt: 10 landing và 4 auth.
- Auth kiểm tra validation, gửi bằng Enter, hiển thị mật khẩu, lỗi đăng nhập, audience học viên/quản trị, chặn profile học viên vào quản trị và xóa token, đổi theme, bố cục tại 1280/1440/1920 cho login/signup/recovery/verify-email.
- TypeScript ứng dụng và build production đạt. ESLint các file quản trị/khung/test mới đạt; AuthPage còn cảnh báo dependency effect có sẵn ở luồng khôi phục/xác minh.
- TypeScript E2E toàn repo còn ba lỗi trong `tests/e2e/core-crud-fixture.ts`: thiếu trường review của CourseAdmin; `phaseId` không còn thuộc CourseAdminSection; ChapterAdmin thiếu sectionId/sectionTitle. Không sửa fixture CRUD trong công việc giao diện auth.
- Kiểm tra bằng trình duyệt riêng và screenshot cả hai trang, gồm quản trị dark. Không kiểm thử đăng nhập tài khoản thật; API trong test được giả lập. Google thực chưa khả dụng trong môi trường preview.
- Mobile hoàn thiện tiếp tục tạm hoãn theo yêu cầu trước đó; có fallback một cột cho màn hình hẹp.

## Trạng thái workspace

Trong lúc làm, worktree `W:/CapstoneProject/worktrees/codex-refactor-landingpage` được chuyển bên ngoài sang `feature/staff-course-authoring`; phần learner và landing trước đó đã có trong HEAD. Các chỉnh sửa auth lần này chưa commit/push. Có chỉnh sửa đồng thời ở `src/components/management/crud/course-stepper.tsx` không thuộc công việc này; không sửa hay đưa vào kiểm tra auth.

Preview chạy ở http://127.0.0.1:5190/ .

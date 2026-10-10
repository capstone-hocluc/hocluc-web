# HocLuc FE — Danh sách màn hình và bảng kiểm mock data

*Tạo ngày 10/10/2026 · Repo `Casptone_Frontend_Branch` (React + Vite) · Dùng để làm tiếp FE bằng dữ liệu mẫu trước khi nối API*

Nguồn đối chiếu: `W:\CapstoneProject\docs` — file 02 §4 (luồng theo role), §8 (danh mục API CRUD), file 05 §0 (quyết định chốt D1–D24), file 06 (kế hoạch).

**Ký hiệu trạng thái:** `[x]` có, chạy API thật · `[m]` có, đang dùng dữ liệu mẫu · `[~]` có nhưng phải sửa · `[ ]` chưa có.

---

## 0. Quy ước làm mock data

| # | Quy ước | Ghi chú |
| --- | --- | --- |
| 1 | Mọi dữ liệu mẫu nằm ở **`src/data/console-mock.ts`** (console) và `src/data/*` (học sinh). Màn hình không tự khai báo mảng dữ liệu | Thay mock bằng API sau này chỉ cần sửa tầng service |
| 2 | Type của dữ liệu mẫu **đặt theo DTO dự kiến** ở docs/02 §8 (tên field, enum status) | Ví dụ status câu hỏi `DRAFT / APPROVED / PUBLISHED / RETIRED`; hàng đợi duyệt `PENDING / CLAIMED / APPROVED / REJECTED` |
| 3 | Màn đọc dữ liệu qua một hàm service (ví dụ `mockQuestionService.list()`), không import trực tiếp mảng | Đổi sang `request('/api/v1/...')` không phải sửa component |
| 4 | Thao tác (duyệt, từ chối, tạo, sửa) ghi vào **mock store dùng chung có lưu `localStorage`** (bọc `try/catch`) | Hiện tải lại trang là mất → khó demo luồng nhiều bước |
| 5 | Màn đang dùng mock có **nhãn nhỏ "Dữ liệu mẫu"** ở header | Không nhầm với màn đã chạy API thật |
| 6 | Màn đã có API thật (Người dùng, Khoá học quản lý, Lịch học, Điểm danh, khu học sinh) **giữ nguyên gọi API**, không quay về mock | Quy tắc cũ "không dùng mock khi API lỗi" vẫn áp dụng cho các màn này |
| 7 | Mỗi màn có đủ trạng thái: đang tải, rỗng, lỗi, không có quyền (403) | Dùng `ResourceState` sẵn có |
| 8 | Kiểm tra ở 390px và 1440px, sáng và tối (khu vận hành) | Theo DARK-MODE cũ: khu vận hành có dark mode, khu học sinh chỉ sáng |

---

## 1. Lệch với quyết định đã chốt — sửa trước

- [ ] **Teacher được duyệt câu hỏi** (D6). Hiện `TeacherDashboard` → "Câu hỏi" gọi `QuestionReview canReview={false}`. Đổi thành `canReview` và câu teacher tự nộp hiển thị trạng thái **Đã duyệt** ngay.
- [ ] **Teacher và Staff vào được "Phân loại kiến thức"** (D16). Hiện chỉ có trong `ADMIN_NAV_ITEMS`. Thêm vào menu Staff và Teacher (có quyền sửa).
- [ ] **Cửa đăng nhập Mentor.** Hiện Mentor vào qua `/login` (form học sinh, `DEFAULT_ALLOWED_ROLES = ['STUDENT','MENTOR']`), còn `/management/login` không nhận Mentor. Chọn một: cho `/management/login` nhận MENTOR, hoặc ghi rõ đây là quyết định.

---

## 2. Bảng màn hình theo vai trò

### 2.1 Công khai (chưa đăng nhập)

| Trạng thái | Màn | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| [x] | Landing | `/` | |
| [~] | Catalog khoá học | `/courses` | Phải hiện **cả khoá trọn bộ và khoá nhỏ** (D2), có bộ lọc loại khoá |
| [~] | Chi tiết khoá | `/courses/:id` | Hiện kiểu hạn dùng (ngày cố định / N ngày từ khi mua — D15) |
| [x] | Đăng nhập / đăng ký / OTP / quên mật khẩu | dialog trên landing, `/login` | |
| [x] | Đăng nhập nhân sự | `/management/login`, `/admin/login` | Xem mục 1 về Mentor |
| [ ] | Trang 403 / 404 | `*` | Dùng chung cho mọi khu |

### 2.2 Học sinh (`/student/...`)

| Trạng thái | Màn | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| [x] | Onboarding mục tiêu | trong luồng đăng nhập đầu | |
| [x] | Test đầu vào: giới thiệu, làm bài, kết quả, xem lại | `/student/assessments/placement[...]` | Bắt buộc đăng nhập — đã đúng (D3) |
| [ ] | **Lộ trình sau test đầu vào** | `/student/roadmap` | D3–D4: danh sách khoá / bài / bài luyện theo thứ tự + lý do; đánh dấu đã mua / chưa mua; nút mua. Mock: `roadmapItems[]` |
| [x] | Dashboard | `/student/dashboard` | Kiểm tra phần nào còn mock |
| [x] | Khoá của tôi, màn học, bài học, video | `/student/courses[...]` | |
| [~] | Trạng thái quyền học | trong Khoá của tôi + topbar | Thêm: sắp hết hạn, đã hết hạn, **quyền dùng gia sư AI** (D12) |
| [x] | Chọn Nhà / nhóm học | trong màn học khoá (`StudyGroupDiscovery`) | |
| [x] | Quiz: xem, làm, xem lại | `/student/assessments/quizzes[...]` | |
| [ ] | **Gia sư AI (màn riêng)** | `/student/tutor` | Xem mục 3.1 |
| [~] | Hồ sơ năng lực / báo cáo sau bài | `/student/learning-profile` | Điểm theo **skill** (Master Data), thời gian từng câu, câu sa lầy. Kiểm tra còn mock |
| [x] | Lịch học, chuyên cần | `/student/schedule` | |
| [x] | Hồ sơ tài khoản | `/student/profile` | |
| [x] | Giỏ, thanh toán SePay, kết quả, đơn hàng | `/cart`, `/checkout`, `/payment/*`, `/orders` | Giỏ phải nhận khoá nhỏ (D2) |
| [~] | Thông báo | chuông ở topbar | Đang mock; thêm danh sách + đánh dấu đã đọc |
| [ ] | Hỏi Mentor | — | **PENDING (D11)** — không làm |

### 2.3 Admin (`/admin/...`)

| Trạng thái | Màn | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| [x] | Tổng quan | `/admin/dashboard` | |
| [x] | Người dùng (tạo, role, status, cấp role chuyển được) | `/admin/users` | |
| [m] | Blueprint đề thi | `/admin/blueprints` | Thêm form tạo/sửa blueprint theo năm (4 phần, số câu từng phần) |
| [m] | Phân loại kiến thức | `/admin/taxonomy` | Cần CRUD 9 loại danh mục + màn import (mục 3.4) |
| [m] | Nhật ký hoạt động | `/admin/audit-log` | |
| [ ] | **Quản lý khoá học** | `/admin/courses` | Dùng chung màn với Staff (mục 3.2) |
| [ ] | Danh mục môn (categories) | `/admin/categories` | Danh mục hiển thị trên catalog |
| [ ] | Cấu hình nghiệp vụ | `/admin/settings` | Các khoá ở file 06 §2.3 (tự duyệt, quyền AI, Casio, kiểu chấm…) — chỉ đọc cũng được ở giai đoạn mock |

### 2.4 Staff (`/staff/...`)

| Trạng thái | Màn | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| [x] | Tổng quan, Người dùng (xem) | `/staff/dashboard`, `/staff/users` | |
| [m] | Đơn hàng | `/staff/orders` | Thêm drawer chi tiết đơn |
| [m] | Ghi danh | `/staff/enrollments` | Thêm thao tác **ghi danh thủ công** và **gia hạn** |
| [m] | Nhóm học | `/staff/groups` | Thêm tạo/sửa group (Nhà, level, sức chứa), gán mentor, xếp/chuyển học sinh |
| [m] | Duyệt câu hỏi | `/staff/question-review` | Staff duyệt cả câu của mình (D6) |
| [x] | Lịch học, Điểm danh | `/staff/schedules`, `/staff/attendance` | |
| [ ] | **Quản lý khoá học** | `/staff/courses` | Mục 3.2 |
| [ ] | Phân loại kiến thức | `/staff/taxonomy` | Dùng lại màn admin (mục 1) |
| [ ] | Ngân hàng câu hỏi (toàn bộ) | `/staff/question-bank` | Dùng lại trình soạn của Teacher (mục 3.3) |
| [ ] | **Dọn route cũ** | `/staff/batches`, `/staff/batches/batch-12a-k24`, `/staff/students/hs-24091`, `/staff/invoices`, `/staff/tuition`, `/staff/payments` | Mô hình batch và công nợ học phí không còn trong scope (thay bằng nhóm học + thanh toán online). Gỡ hoặc chuyển hướng |

### 2.5 Manager (`/manager/...`) — chỉ xem (D14, D23)

| Trạng thái | Màn | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| [x] | Tổng quan | `/manager/dashboard` | |
| [x] | Khoá học (xem) | `/manager/courses` | |
| [x] | Lịch học, Điểm danh (xem) | `/manager/schedules`, `/manager/attendance` | |
| [ ] | Người dùng (chỉ đọc) | `/manager/users` | Dùng lại màn Staff, ẩn thao tác |
| [ ] | Đơn hàng (chỉ đọc) | `/manager/orders` | Dùng lại `StaffOrders` với `readOnly` |
| [ ] | Ghi danh (chỉ đọc) | `/manager/enrollments` | Dùng lại `StaffEnrollments` với `readOnly` |
| [ ] | Nhóm học (chỉ đọc) | `/manager/groups` | Dùng lại `StaffGroups` với `readOnly` |
| [ ] | Báo cáo | `/manager/reports` | Doanh thu theo khoá, học viên mới, tỷ lệ hoàn thành, điểm theo phần |
| [ ] | **Dọn route cũ** | `/manager/batches`, `/manager/invoices`, `/manager/tuition`, `/manager/payments`, `/manager/students` | Như Staff |

Gợi ý kỹ thuật: thêm prop `readOnly` cho các màn trong `role-screens.tsx` (giống `canReview`) thay vì viết màn mới.

### 2.6 Teacher (`/teacher/...`)

| Trạng thái | Màn | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| [x] | Tổng quan | `/teacher/dashboard` | |
| [~] | Lớp học (khoá mình dạy) | `/teacher/my-courses` | Thêm **soạn nội dung**: chương, bài học, video, preview (mục 3.2, phần dành cho Teacher) |
| [x] | Lịch dạy, Giờ rảnh | `/teacher/schedule`, `/teacher/availability` | |
| [~] | Buổi live | trong Lịch dạy | Kiểm tra có start / end / huỷ / gắn bản ghi; chưa có thì thêm |
| [x] | Bài thi thử, Quiz, Bài tập | `/teacher/mock-exams`, trong Lớp học | |
| [~] | Câu hỏi của tôi | `/teacher/questions` | Đang là danh sách duyệt không có quyền duyệt → sửa (mục 1) và thêm **trình soạn câu hỏi** (mục 3.3) |
| [ ] | Soạn lời giải CT-Pólya | trong trình soạn câu hỏi | Mục 3.3 |
| [m] | Bài làm học viên | `/teacher/attempts` | |
| [ ] | Phân loại kiến thức | `/teacher/taxonomy` | Mục 1 |
| [ ] | Hàng đợi duyệt lời giải AI | `/teacher/solution-queue` | Teacher cũng duyệt được (D7) — dùng lại `MentorSolutionQueue` |

### 2.7 Mentor (`/mentor/...`)

| Trạng thái | Màn | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| [m] | Tổng quan | `/mentor/dashboard` | |
| [m] | Nhóm của tôi | `/mentor/groups` | |
| [m] | Học viên | `/mentor/students` | Thêm drawer tiến độ + điểm theo skill của một học sinh |
| [m] | Duyệt lời giải AI | `/mentor/solution-queue` | Ưu tiên học sinh trong group mình, rồi hàng chung theo môn |
| [ ] | **Duyệt lời giải câu ngân hàng** | `/mentor/solutions` | D6: Mentor duyệt lời giải, không cần Teacher/Staff duyệt thêm |
| [x] | Hồ sơ | `/mentor/profile` | |

---

## 3. Đặc tả nhanh các màn còn thiếu quan trọng

### 3.1 Gia sư AI — `/student/tutor`

| Thành phần | Nội dung |
| --- | --- |
| Chặn quyền | Chưa có khoá nào còn hiệu lực → màn chặn + nút xem khoá (D12). Đang trong lượt thi → không mở |
| Ô hỏi | Gõ chữ / công thức, đính kèm ảnh; chọn môn |
| Chế độ | Ba nút ngang hàng: **Gợi ý từng bước** · **Lời giải đầy đủ** · **Đáp án nhanh** (D8) |
| Nhãn | Bài trong ngân hàng: **tích xanh "Đã kiểm duyệt"**. Bài ngoài ngân hàng: **"Chưa kiểm duyệt — đang chờ giáo viên/mentor xem"** (D7) |
| Gợi ý từng bước | Hiện bước S1–S6 hiện tại, gợi ý G1 → G2 → G3, nút "Gợi ý tiếp" sau khi học sinh trả lời lại |
| Casio | Nút mở panel máy ảo **fx-580VN X** khi bài phù hợp (D17); MathTutor đã có máy ảo, FE chỉ cần nhúng/mở |
| Lịch sử | Danh sách hội thoại trước |
| Persona | Avatar nhân vật theo môn |
| Mock | `tutorConversations[]`, `tutorMessages[]` với field `reviewStatus: 'APPROVED' \| 'UNREVIEWED'`, `mode: 'STEP_HINT' \| 'FULL' \| 'QUICK'` |

`TeacherAi.tsx` + `teacherAiMock.ts` trong trang video giữ làm lối vào nhanh, nhưng nên dùng chung component chat với màn này.

### 3.2 Quản lý khoá học — `/staff/courses`, `/admin/courses` (Teacher: phần nội dung)

| Màn con | Nội dung | Ai sửa |
| --- | --- | --- |
| Danh sách khoá | Lọc loại (trọn bộ / khoá nhỏ), trạng thái, track; nút tạo | SF, AD (Teacher chỉ thấy khoá mình) |
| Thông tin khoá | Tên, mô tả, ảnh, giá, loại, track, ngày bắt đầu/kết thúc, ngày thi, **kiểu hạn dùng** + số ngày, trạng thái `DRAFT / PUBLISHED / ARCHIVED` | SF, AD |
| Giảng viên | Gán / gỡ | SF, AD |
| Lộ trình (khoá trọn bộ) | Giai đoạn; ghép khoá nhỏ vào giai đoạn; kéo thả thứ tự | SF, AD |
| Nội dung (khoá nhỏ) | Chương → bài học (loại TEXT / VIDEO / ARTICLE / QUIZ / LIVE), cờ preview, video, kéo thả thứ tự | TE (khoá mình), SF |
| Mock | `mockCourses[]` (có `courseType`, `expiryType`, `expiryDays`), `mockPhases[]`, `mockCourseSections[]`, `mockChapters[]`, `mockLessons[]` |

### 3.3 Ngân hàng câu hỏi và lời giải — `/teacher/questions`, `/staff/question-bank`

| Màn con | Nội dung |
| --- | --- |
| Danh sách | Lọc môn, domain, dạng câu, skill, trạng thái, nguồn (`OLD_EXAM` / `TEACHER` / `AI_REVIEWED`), có/không tích xanh |
| Trình soạn câu hỏi | Chọn / tạo ngữ liệu (passage); thân câu (LaTeX, xem trước KaTeX); 4 phương án; đáp án; mỗi phương án nhiễu gắn **mã lỗi**; gắn domain, dạng câu, **skill chính + skill phụ** (chọn từ cây Master Data); thẻ cấu trúc `cau_truc` |
| Trình soạn lời giải | Các bước S1–S6, mỗi bước có `ct_skill`, nội dung, gợi ý G1–G3; S6 gắn bài song sinh |
| Duyệt | Teacher/Staff duyệt câu (kể cả của mình); Mentor/Teacher duyệt lời giải; tích xanh khi đã duyệt |
| Phiên bản | Tab lịch sử phiên bản; câu đã có lượt làm thì sửa tạo phiên bản mới |
| Mock | `mockPassages[]`, `mockBankQuestions[]` (`status`, `version`, `skills[]`, `options[].errorCode`), `mockSolutions[]` (`steps[]`, `approvalStatus`) |

### 3.4 Phân loại kiến thức — `/admin|staff|teacher/taxonomy`

| Màn con | Nội dung |
| --- | --- |
| Cây | Nhóm (5 nhóm V-ACT) → Domain → Dạng câu → Skill → Micro-skill |
| Bảng từng loại | Domain, Khoá/module, Dạng câu, Skill, Micro-skill, Mapping, Mã lỗi, Thẻ cấu trúc — tìm, lọc, thêm, sửa, ngưng dùng |
| Import Excel | Chọn file → **chạy thử** → bảng lỗi theo sheet/dòng → xác nhận ghi |
| Mock | Lấy số liệu thật từ 5 file Master Data: 37 domain · 98 dạng câu · 116 skill · 130 micro-skill · 40 mã lỗi (danh mục ở docs/03 Phụ lục) |

---

## 4. Thứ tự làm tiếp (vẫn bằng mock)

- [ ] **B1.** Sửa 3 chỗ lệch (mục 1) + mock store có `localStorage` + nhãn "Dữ liệu mẫu" (mục 0)
- [ ] **B2.** Quản lý khoá học Staff/Admin + soạn nội dung cho Teacher (mục 3.2)
- [ ] **B3.** Phân loại kiến thức đủ CRUD + import (mục 3.4), mở cho Staff/Teacher
- [ ] **B4.** Ngân hàng câu hỏi + lời giải + duyệt; Mentor duyệt lời giải ngân hàng (mục 3.3)
- [ ] **B5.** Gia sư AI `/student/tutor` (mục 3.1) + lộ trình `/student/roadmap`
- [ ] **B6.** Trạng thái quyền học, khoá nhỏ trên catalog/giỏ, báo cáo theo skill
- [ ] **B7.** Màn chỉ đọc cho Manager (`readOnly`) + báo cáo; Teacher dùng lại hàng đợi lời giải AI
- [ ] **B8.** Thông báo, trang 403/404, dọn route cũ (`batches`, `invoices`, `tuition`, ID cứng)
- [ ] **B9.** Rà toàn bộ: mọi role đăng nhập được, menu đúng quyền, 390px/1440px, sáng/tối, `tsc` + `eslint` sạch

---

## 5. Khi chuyển từ mock sang API

| Màn | API thay thế (docs/02 §8) |
| --- | --- |
| Phân loại kiến thức | `/manage/taxonomy/*`, `POST /manage/taxonomy/import`, `GET /taxonomy/tree` |
| Quản lý khoá học | `/manage/courses`, `/manage/courses/{id}/instructors`, `/phases`, `/sections`, `/manage/chapters`, `/manage/lessons` |
| Ngân hàng câu hỏi | `/manage/passages`, `/manage/bank-questions`, `/manage/solutions` |
| Duyệt câu hỏi / lời giải AI | `POST /manage/bank-questions/{id}/approve`, `/manage/review-queue/*` |
| Đơn hàng, ghi danh | `/manage/orders`, `/manage/enrollments` |
| Nhóm học | `/manage/study-groups`, `/mentor/study-groups/me` |
| Quyền học | `GET /students/me/access` |
| Lộ trình | `POST /roadmaps/me/generate`, `GET /roadmaps/me` |
| Gia sư AI | `/tutor/sessions`, `/tutor/sessions/{id}/messages` |
| Thông báo | `/notifications/me`, `PATCH /notifications/{id}/read` |
| Blueprint, nhật ký | Chưa có trong danh mục API — bổ sung khi làm backend |

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
- [x] **Teacher và Staff vào được "Phân loại kiến thức"** (D16). Đã có trong menu Staff và Teacher (quyền `TAXONOMY_WRITE`).
- [ ] **Cửa đăng nhập Mentor.** Hiện Mentor vào qua `/login` (form học sinh, `DEFAULT_ALLOWED_ROLES = ['STUDENT','MENTOR']`), còn `/management/login` không nhận Mentor. Chọn một: cho `/management/login` nhận MENTOR, hoặc ghi rõ đây là quyết định.

---

## 2. Bảng màn hình theo vai trò

### 2.0 Menu và phân quyền (khu vận hành)

Menu khu vận hành **sinh từ code**, không viết tay theo từng role: `src/lib/permissions.ts` (role → quyền) + `src/lib/console-nav.ts` (danh sách mục, nhóm, quyền cần có) + `src/lib/feature-flags.ts` (cờ ẩn tính năng chưa chốt). Đường dẫn: `/console/{admin|manager|staff|teacher|mentor}/<trang>`.

- Quyền ở FE **chỉ để hiển thị**. `@PreAuthorize` ở backend mới là nguồn quyết định; ẩn nút ở FE không cấp hay thu quyền gọi API.
- Gõ URL của trang mà role không có trong menu → **trang 403 dùng chung** (`ForbiddenPage`).
- Mục đã có trong menu nhưng chưa có màn → trạng thái **"Đang phát triển"** (`ComingSoonPage`).
- Role có quyền xem nhưng không có quyền ghi → trang mở ở **chế độ xem**: nhãn "Chế độ xem" cạnh tiêu đề, ẩn nút tạo / sửa / xoá.
- Menu chia nhóm theo việc, thu gọn được (trạng thái nhớ trong `localStorage`). Hồ sơ, đổi vai trò, giao diện sáng/tối, đăng xuất nằm ở menu người dùng trên topbar.
- Huy hiệu số lượng lấy từ `getNavBadges(role)`; hiện chỉ "Duyệt lời giải AI" có số (từ dữ liệu mẫu).
- Nhóm "Hệ thống" đứng thứ 2 với Admin, đứng cuối với các role khác.

Menu thực tế (cờ `mentorAsk = false`, nên "Hỏi Mentor", "Phân công Mentor", "Giám sát hỗ trợ" đang ẩn). *Nghiêng* = mở ra "Đang phát triển".

| Nhóm | Admin | Manager | Staff | Teacher | Mentor |
| --- | --- | --- | --- | --- | --- |
| Tổng quan | Tổng quan, *Báo cáo* | Tổng quan, *Báo cáo* | Tổng quan | Tổng quan | Tổng quan |
| Hệ thống | Người dùng & phân quyền, *Cấu hình nghiệp vụ*, Nhật ký hoạt động | Người dùng & phân quyền (xem), Nhật ký hoạt động | Người dùng & phân quyền (xem) | — | — |
| Học thuật | Phân loại kiến thức, Blueprint đề thi, Danh mục môn | Danh mục môn (xem) | Phân loại kiến thức, Danh mục môn | Phân loại kiến thức | — |
| Khoá học & nội dung | Khóa học, *Ngân hàng câu hỏi*, Duyệt câu hỏi | Khóa học (xem) | Khóa học, *Ngân hàng câu hỏi*, Duyệt câu hỏi | Lớp của tôi, *Ngân hàng câu hỏi*, Duyệt câu hỏi, Bài thi thử | — |
| Giảng dạy | — | — | — | Lịch dạy, Giờ rảnh | — |
| Vận hành lớp | Nhóm học | Lịch học (xem), Nhóm học (xem) | Lịch học, Điểm danh, Nhóm học | — | Nhóm của tôi |
| Học viên & kinh doanh | Ghi danh, Đơn hàng | Ghi danh (xem), Đơn hàng (xem) | Ghi danh, Đơn hàng | — | Học viên |
| Đánh giá & duyệt | Duyệt lời giải AI, *Lời giải ngân hàng* | — | — | Bài làm học viên, Duyệt lời giải AI, *Lời giải ngân hàng* | Duyệt lời giải AI, *Lời giải ngân hàng* |

Lệch có chủ đích so với bảng quyền ở docs/06 §2.2 (theo `@PreAuthorize` thực tế): Manager **không có** "Điểm danh" (API điểm danh không cho MANAGER); Admin **không có** "Lịch học" / "Điểm danh" (tạo lịch chỉ STAFF); xác nhận thanh toán thủ công trong "Đơn hàng" chỉ Admin.

### 2.1 Công khai (chưa đăng nhập)

| Trạng thái | Màn | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| [x] | Landing | `/` | |
| [~] | Catalog khoá học | `/courses` | Phải hiện **cả khoá trọn bộ và khoá nhỏ** (D2), có bộ lọc loại khoá |
| [~] | Chi tiết khoá | `/courses/:id` | Hiện kiểu hạn dùng (ngày cố định / N ngày từ khi mua — D15) |
| [x] | Đăng nhập / đăng ký / OTP / quên mật khẩu | dialog trên landing, `/login` | |
| [x] | Đăng nhập nhân sự | `/management/login`, `/admin/login` | Xem mục 1 về Mentor |
| [~] | Trang 403 | trong khu vận hành, theo menu role | Đã có `ForbiddenPage` cho `/console/*`; trang 404 chung và 403 cho khu học sinh chưa có |

### 2.2 Học sinh (`/student/...`)

Sidebar chia 3 nhóm: **Học tập** (Tổng quan, Lộ trình của tôi, Khóa học của tôi, Lịch học) · **Luyện tập** (Gia sư AI, Bài kiểm tra / thi thử, Hồ sơ năng lực) · **Khác** (Đơn hàng, Khám phá khóa học). "Đơn hàng" và "Khám phá khóa học" đi tới `/orders` và `/courses` (ngoài `StudentLayout`).

| Trạng thái | Màn | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| [x] | Onboarding mục tiêu | trong luồng đăng nhập đầu | |
| [x] | Test đầu vào: giới thiệu, làm bài, kết quả, xem lại | `/student/assessments/placement[...]` | Bắt buộc đăng nhập — đã đúng (D3). Menu "Bài kiểm tra / thi thử" trỏ vào đây |
| [ ] | **Lộ trình sau test đầu vào** | `/student/roadmap` | Menu đã có, màn hiện "Đang phát triển". D3–D4: danh sách khoá / bài / bài luyện theo thứ tự + lý do; đánh dấu đã mua / chưa mua; nút mua. Mock: `roadmapItems[]` |
| [x] | Dashboard | `/student/dashboard` | Kiểm tra phần nào còn mock |
| [x] | Khoá của tôi, màn học, bài học, video | `/student/courses[...]` | |
| [~] | Trạng thái quyền học | trong Khoá của tôi + topbar | Thêm: sắp hết hạn, đã hết hạn, **quyền dùng gia sư AI** (D12) |
| [x] | Chọn Nhà / nhóm học | trong màn học khoá (`StudyGroupDiscovery`) | |
| [x] | Quiz: xem, làm, xem lại | `/student/assessments/quizzes[...]` | |
| [ ] | **Gia sư AI (màn riêng)** | `/student/tutor` | Menu đã có, màn hiện "Đang phát triển". Xem mục 3.1 |
| [~] | Hồ sơ năng lực / báo cáo sau bài | `/student/learning-profile` | Điểm theo **skill** (Master Data), thời gian từng câu, câu sa lầy. Kiểm tra còn mock |
| [x] | Lịch học, chuyên cần | `/student/schedule` | |
| [x] | Hồ sơ tài khoản | `/student/profile` | |
| [x] | Giỏ, thanh toán SePay, kết quả, đơn hàng | `/cart`, `/checkout`, `/payment/*`, `/orders` | Giỏ phải nhận khoá nhỏ (D2) |
| [~] | Thông báo | chuông ở topbar | Đang mock; thêm danh sách + đánh dấu đã đọc |
| [ ] | Hỏi Mentor | — | **PENDING (D11)** — không làm, đã gỡ khỏi menu học sinh |

### 2.3 Admin (`/console/admin/...`)

| Trạng thái | Màn | Trang | Ghi chú |
| --- | --- | --- | --- |
| [x] | Tổng quan | `dashboard` | |
| [x] | Người dùng (tạo, role, status, cấp role chuyển được) | `users` | |
| [m] | Blueprint đề thi | `blueprints` | Thêm form tạo/sửa blueprint theo năm (4 phần, số câu từng phần) |
| [m] | Phân loại kiến thức | `taxonomy` | Cần CRUD 9 loại danh mục + màn import (mục 3.4) |
| [m] | Nhật ký hoạt động | `audit-log` | |
| [x] | Quản lý khoá học | `courses` | Dùng chung màn với Staff (mục 3.2) |
| [x] | Danh mục môn (categories) | `categories` | Danh mục hiển thị trên catalog |
| [x] | Nhóm học, Ghi danh, Đơn hàng | `groups`, `enrollments`, `orders` | Admin là role duy nhất xác nhận thanh toán thủ công |
| [m] | Duyệt câu hỏi, Duyệt lời giải AI | `question-review`, `solution-queue` | |
| [ ] | Báo cáo | `reports` | Menu có, màn "Đang phát triển" |
| [ ] | Cấu hình nghiệp vụ | `settings` | Menu có, màn "Đang phát triển". Các khoá ở file 06 §2.3 (tự duyệt, quyền AI, Casio, kiểu chấm…) — chỉ đọc cũng được ở giai đoạn mock |
| [ ] | Ngân hàng câu hỏi, Lời giải ngân hàng | `question-bank`, `solutions` | Menu có, màn "Đang phát triển" |

### 2.4 Staff (`/console/staff/...`)

| Trạng thái | Màn | Trang | Ghi chú |
| --- | --- | --- | --- |
| [x] | Tổng quan, Người dùng (xem) | `dashboard`, `users` | |
| [x] | Đơn hàng | `orders` | Có chi tiết đơn |
| [x] | Ghi danh | `enrollments` | Có ghi danh thủ công, đổi trạng thái, đổi hạn dùng |
| [x] | Nhóm học | `groups` | Tạo/sửa group, gán mentor, xếp/chuyển học sinh |
| [m] | Duyệt câu hỏi | `question-review` | Staff duyệt cả câu của mình (D6) |
| [x] | Lịch học, Điểm danh | `schedules`, `attendance` | |
| [x] | Quản lý khoá học | `courses` | Mục 3.2 |
| [m] | Phân loại kiến thức | `taxonomy` | Dùng lại màn admin (mục 1) |
| [x] | Danh mục môn | `categories` | |
| [ ] | Ngân hàng câu hỏi (toàn bộ) | `question-bank` | Menu có, màn "Đang phát triển". Dùng lại trình soạn của Teacher (mục 3.3) |
| [x] | **Route cũ đã dọn** | `/staff/batches`, `/staff/invoices`, `/staff/tuition`, `/staff/payments`… | Mô hình batch và công nợ học phí không còn trong scope; URL không có trong menu → 403 |

### 2.5 Manager (`/console/manager/...`) — chỉ xem (D14, D23)

| Trạng thái | Màn | Trang | Ghi chú |
| --- | --- | --- | --- |
| [x] | Tổng quan | `dashboard` | |
| [x] | Khoá học, Danh mục môn (xem) | `courses`, `categories` | `readOnly`: ẩn tạo/sửa/xoá/xuất bản |
| [x] | Lịch học (xem) | `schedules` | Không có Điểm danh: API điểm danh không cho MANAGER |
| [x] | Người dùng, Nhật ký hoạt động (xem) | `users`, `audit-log` | |
| [x] | Đơn hàng, Ghi danh, Nhóm học (xem) | `orders`, `enrollments`, `groups` | `readOnly` |
| [ ] | Báo cáo | `reports` | Menu có, màn "Đang phát triển". Doanh thu theo khoá, học viên mới, tỷ lệ hoàn thành, điểm theo phần |
| [ ] | Giám sát hỗ trợ | `chat-monitoring` | Ẩn bằng cờ `mentorAsk` (D11) |

### 2.6 Teacher (`/console/teacher/...`)

| Trạng thái | Màn | Trang | Ghi chú |
| --- | --- | --- | --- |
| [x] | Tổng quan | `dashboard` | |
| [~] | Lớp của tôi (khoá mình dạy) | `courses` | Thêm **soạn nội dung**: chương, bài học, video, preview (mục 3.2, phần dành cho Teacher). Quiz/bài tập nằm trong màn này |
| [x] | Lịch dạy, Giờ rảnh | `schedule`, `availability` | |
| [~] | Buổi live | trong Lịch dạy | Kiểm tra có start / end / huỷ / gắn bản ghi; chưa có thì thêm |
| [x] | Bài thi thử | `mock-exams` | |
| [~] | Duyệt câu hỏi | `question-review` | URL cũ `questions` được chuyển sang đây. Cần thêm **trình soạn câu hỏi** (mục 3.3) |
| [ ] | Soạn lời giải CT-Pólya | trong trình soạn câu hỏi | Mục 3.3 |
| [x] | Bài làm học viên | `attempts` | Danh sách thật + xem chi tiết từng câu (`GET /teacher/attempts/{id}`) |
| [m] | Phân loại kiến thức | `taxonomy` | |
| [m] | Duyệt lời giải AI | `solution-queue` | Teacher cũng duyệt được (D7) |
| [ ] | Ngân hàng câu hỏi, Lời giải ngân hàng | `question-bank`, `solutions` | Menu có, màn "Đang phát triển" |

### 2.7 Mentor (`/console/mentor/...`)

| Trạng thái | Màn | Trang | Ghi chú |
| --- | --- | --- | --- |
| [m] | Tổng quan | `dashboard` | |
| [m] | Nhóm của tôi | `groups` | |
| [m] | Học viên | `students` | Thêm drawer tiến độ + điểm theo skill của một học sinh |
| [m] | Duyệt lời giải AI | `solution-queue` | Ưu tiên học sinh trong group mình, rồi hàng chung theo môn. Có huy hiệu số lượng |
| [ ] | **Duyệt lời giải câu ngân hàng** | `solutions` | Menu có, màn "Đang phát triển". D6: Mentor duyệt lời giải, không cần Teacher/Staff duyệt thêm |
| [ ] | Hỏi Mentor | `chat` | Ẩn bằng cờ `mentorAsk` (D11) |
| [x] | Hồ sơ | menu người dùng trên topbar | |

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
| Danh sách khoá | Lọc loại (khoá chính / khoá tặng kèm), trạng thái, **trạng thái duyệt**, danh mục; cột Duyệt; nút nhanh "Chờ duyệt (n)"; nút tạo | SF, AD (Teacher chỉ thấy khoá mình) |
| Chi tiết khoá — đầu trang | Tên, loại · danh mục · giá, chip trạng thái + chip duyệt, **một hành động chính theo trạng thái và vai trò**: Gửi duyệt (staff) / Đang chờ duyệt / Duyệt và bán + Trả lại (người duyệt) / Bán khoá / Lưu trữ. Nút bị khoá kèm lý do ngay dưới | SF, AD, MG |
| Banner duyệt + checklist | Chờ duyệt (ai gửi, lúc nào); bị trả lại (ai, lúc nào, lý do); checklist "Sẵn sàng để bán" (thông tin đủ, ≥1 chương đã xuất bản hoặc có khoá tặng kèm, khoá tặng kèm đã xuất bản, danh mục) | SF, AD, MG |
| Tab Tổng quan | Thông tin khoá; "Sửa thông tin" mở form nhiều bước | SF, AD |
| Tab Nội dung (khoá chính) | Giai đoạn → **Phần học** → Chương → Bài học. Chương được nhóm theo phần học; "Thêm chương" ngay trong phần; chọn phần học khi tạo/sửa chương | SF, AD, TE (khoá mình) |
| Tab Khoá tặng kèm | Gắn / gỡ khoá khác để tặng kèm khi mua khoá này (mọi khoá, trừ chính nó); đổi thứ tự | SF, AD |
| Tab Giảng viên | Gán / gỡ | SF, AD |
| Nội dung (khoá tặng kèm) | Chương → bài học (loại TEXT / VIDEO / ARTICLE / QUIZ / LIVE), cờ preview, video, thứ tự | TE (khoá mình), SF |

Quy trình bán: nhân viên soạn nội dung, xuất bản bài học rồi chương, bấm **Gửi duyệt**. Quản lý / trưởng bộ môn **Duyệt và bán** hoặc **Trả lại** kèm lý do bắt buộc (≤ 2000 ký tự); nhân viên sửa theo góp ý và gửi lại. Người duyệt có thể bán trực tiếp. Mọi bước dùng bản khoá mới nhất (`expectedUpdatedAt`). Backend vẫn là nơi quyết định điều kiện; checklist chỉ báo sớm. Khoá đang bán chỉ chỉnh sửa được sau khi lưu trữ. Màn đọc-chỉ (Manager) vẫn có nút duyệt / trả lại / bán.

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

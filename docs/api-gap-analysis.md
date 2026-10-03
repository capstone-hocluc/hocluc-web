# API gap analysis (FE ↔ dev swagger)

Snapshot: 2026-10-03. Source: `https://developments.hocluc.com/v3/api-docs` (153 endpoint, 211 schema; không đổi so với 2026-10-02).
Phương pháp: parse mọi lời gọi `request(...)` trong `src/`, so khớp method + path với swagger. "Chưa dùng" = không có lời gọi trong code FE (chưa đo trên log server).

## 1. Hiện trạng

| Chỉ số | Giá trị |
|---|---|
| Endpoint trên swagger | 153 |
| FE đang gọi | 79 (gồm `/auth/refresh` qua `REFRESH_PATH`) |
| Chưa dùng | 74 → 4 không dành cho FE (2 webhook, 2 test) + **70 cần tích hợp** |
| Swagger không có endpoint nào cho | assignments, certificates, categories, chapters, notifications (controller trong BE chỉ là stub rỗng) |

## 2. Luồng cũ đã kiểm tra và sửa

| # | Vấn đề | Xử lý |
|---|---|---|
| 1 | `tsc -b` lỗi 2 chỗ: `sectionTitle` không tồn tại trên union `CourseStudyLiveClass \| ClassSessionResponse` (`SchedulingPage`, `TeacherSchedulePage`) | Dùng `itemSubtitle()` có sẵn trong `lib/scheduling.ts` |
| 2 | Hồ sơ học viên: `gender`, `academicTrack`, `targetExam` là ô gõ tự do, API chỉ nhận enum (`MALE/FEMALE/OTHER`, `NATURAL_SCIENCES/SOCIAL_SCIENCES/COMBINED`, `VNUHCM_DGNL`) → gõ sai bị 400 | Đổi sang `DropdownField` trong `StudentInfoTab.tsx` |
| 3 | ESLint `set-state-in-effect` (3 lỗi) ở `StudentDashboard`, `VideoLearningPage` | Tính giá trị khi render thay vì đồng bộ state trong effect |
| 4 | So hợp đồng: trường bắt buộc của 30 request body, enum, interface response vs schema | Khớp. Chỉ lệch: `Course.imageUrl` (FE đọc, server không trả) |

Sau sửa: `tsc -b` sạch, `eslint` 0 lỗi (còn 3 cảnh báo cũ: `AuthPage:147`, `DataTable:33`, `PracticeTab:385`), `vite build` thành công.
Chưa làm: test chạy thật các luồng cần đăng nhập (không có tài khoản test trong phiên này).

## 3. Endpoint đã có trên BE, FE cần tích hợp (70)

### P0 – luồng cốt lõi
| Endpoint | Màn hình |
|---|---|
| `GET/POST /lessons/{id}/videos`, `DELETE /lessons/{id}/videos/{videoId}`, `GET .../videos/{videoId}/stream-url` | Phát video bài học (hiện `VideoLearningPage` dùng mock) + giáo viên tải video |

### P1 – chức năng chính (55)
| Nhóm | Endpoint | Màn hình |
|---|---|---|
| Teacher quiz (31) | `/teacher/quizzes` (GET, POST), `/{quizId}` (GET, PUT, DELETE), `publish`, `unpublish`, `duplicate`, `stats`, `attempts`, `pages`, `sections`, `answer-key`, `exam-file`, `groups` (POST) + `/teacher/groups/{id}` (PUT, DELETE), `questions` (POST), `questions/order`, `questions/reviewed`, `/teacher/questions/{id}` (PUT, DELETE), `.../image`, `import/file`, `import/text`, `ai/extract`, `ai/generate`, `ai/jobs`, `ai/jobs/{jobId}`, `ai/jobs/{jobId}/apply`, `/teacher/attempts/{id}` | `TeacherQuiz`, `TeacherMockExams` (hiện tĩnh) |
| Live class (11) | `POST /courses/{id}/live-classes`, `GET /lessons/{id}/live-classes`, `/live-classes` (GET, POST), `/{id}` (GET, PATCH), `start`, `end`, `cancel`, `recordings` (GET, POST) | Quản lý lớp trực tuyến |
| File (7) | `upload-urls`, `complete-upload`, `user-files`, `entity/{type}/{id}`, `/{id}` (GET, DELETE), `/{id}/download` | Upload tài liệu, đề thi |
| Assessment (4) | `attempts/{id}/pause`, `attempts/{id}/resume`, `quizzes/{id}/pages/{n}`, `quizzes/{id}/attempts/me` | Làm đề dài, lịch sử làm bài |
| Study group (6) | `courses/{id}/study-groups/{me,suggested,{groupId}}`, `.../join`, `.../leave`, `courses/{id}/houses/suggested` | Nhóm học / house |

### P2 – bổ sung (7)
`GET /schedules/me`, `GET /courses/{id}/attendances/me`, `GET /class-sessions`, `GET /courses/{id}/exams`, `POST /auth/logout-all`, `DELETE /cart`, `GET /users/student-profiles`.

### Không dành cho FE (4)
`POST /payments/webhook/sepay`, `POST /webhooks/zoom` (server-to-server). `POST /test/upload`, `POST /test/upload-local` là endpoint thử nghiệm: **nên gỡ khỏi dev/prod**.

## 4. Endpoint mới cần BE triển khai (chưa có trong swagger)

Căn cứ: màn hình FE đang chạy bằng dữ liệu tĩnh/mock (`data/*.ts`), hoặc controller BE là stub rỗng.

| Ưu tiên | Đề xuất endpoint | Lý do / màn hình | Ghi chú |
|---|---|---|---|
| P1 | `GET /api/v1/categories` (+ cây con) | `quiz_questions.category_id`, placement theo môn; controller đang rỗng | Cần cho tag môn học |
| P1 | `GET /api/v1/students/me/dashboard` (bài đang học, streak, tổng quan) | `StudentDashboard` dùng `data/studentDashboard.ts` | Gộp từ `lesson_progress`, `enrollments` |
| P1 | `GET /api/v1/students/me/learning-profile` (điểm theo thời gian, lịch sử luyện tập, điểm mạnh/yếu) | `LearningProfile*` dùng `data/learningProfile.ts` | Nguồn: `quiz_attempts`, `placement_results` |
| P1 | `GET /api/v1/notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all` | Bảng `notifications` có, `NotificationController` chưa có endpoint | Chuông thông báo ở topbar |
| P1 | `imageUrl` trong `MainCourseSummaryResponse` / `CourseDetailResponse` | FE đọc `course.imageUrl`, server không trả → ảnh khoá học không hiện | Chỉ thêm field |
| P2 | `/api/v1/assignments` (CRUD, nộp bài, chấm) | `TeacherAssignments` tĩnh; có bảng `assignments`, `assignment_submissions` | Controller rỗng |
| P2 | `/api/v1/certificates` (danh sách của tôi, tải) | Có bảng `certificates` | Controller rỗng |
| P2 | `GET/POST/PUT /api/v1/chapters`, `lessons` (CRUD cho giáo viên) | `TeacherLessonEditor`, `TeacherCourses` tĩnh | Chỉ có `GET /lessons/{id}` |
| P2 | `GET /api/v1/teachers/me/dashboard` | `TeacherDashboard` tĩnh | Số liệu lớp, bài chưa chấm |
| P3 | Taxonomy `curriculum`: domains, question-types, skills, micro-skills, error-codes, mapping | Master data v2.0 (xem `docs/master-data/`, đã gitignore); chưa có thực thể nào | Cần chốt dữ liệu master trước (lệch giờ/mã khoá docx ↔ xlsx) |
| P3 | `error_code` trên đáp án + `GET /students/me/skill-mastery` | Vòng LEARN→DRILL→DIAGNOSE→REMEDIATE | Phụ thuộc dòng trên |

## 5. Câu hỏi mở
- Các màn tĩnh (Dashboard, Learning profile, Teacher*) có nằm trong phạm vi kỳ này không?
- Có tài khoản test trên dev để kiểm chạy thật các luồng cần đăng nhập không?
- Dev server có build từ `origin/develop` mới nhất không (BE local vừa pull 24 commit)?

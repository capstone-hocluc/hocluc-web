# Phân quyền quiz trên console

Đối chiếu source BE tại `D:/CAPSTONE/1016BE/hocluc-api`, không suy actor từ prefix `/teacher`.

## Ma trận đang áp dụng

| Active role | Xem quiz/câu hỏi/bài làm/thống kê | Ghi quiz và câu hỏi |
|---|---|---|
| ADMINISTRATOR, STAFF, MANAGER | Theo các API quản trị quiz hiện tại | Tạo, sửa, xóa, xuất bản/ẩn, sao chép, layout, câu hỏi, đánh dấu đã duyệt; vẫn chịu validation và khóa do có bài làm |
| TEACHER | Khóa được gán CourseInstructor; không có quyền placement quản trị | Không |
| STUDENT | Luồng assessment của chính mình và quyền học khóa; giữ nguyên | Lưu đáp án/nộp bài qua assessment, không ghi authoring |
| MENTOR | Không có quyền quiz console | Không |

BE hiện không kiểm AUTHOR/REVIEWER theo môn trong QuizAuthorizationService: Actor.isStaff cho ba role quản trị; Teacher kiểm phân công khóa. Vì vậy không tự thêm điều kiện scope môn vào quiz, cũng không dùng quyền quiz để cấp quyền taxonomy, gắn nhãn bài hoặc duyệt khóa. Nếu BE bổ sung scope quiz sau này, cần cập nhật lại client/menu và test theo hợp đồng mới.

Nguồn BE:

- [TeacherQuizController.java](D:/CAPSTONE/1016BE/hocluc-api/src/main/java/fu/hocluc/quiz/authoring/controller/TeacherQuizController.java): method ghi chỉ STAFF/MANAGER/ADMINISTRATOR; GET cho thêm Teacher.
- [QuizAuthorizationService.java](D:/CAPSTONE/1016BE/hocluc-api/src/main/java/fu/hocluc/quiz/authoring/service/QuizAuthorizationService.java), [Actor.java](D:/CAPSTONE/1016BE/hocluc-api/src/main/java/fu/hocluc/quiz/authoring/service/Actor.java): phạm vi course/quiz và placement.
- [QuizAuthoringServiceImpl.java](D:/CAPSTONE/1016BE/hocluc-api/src/main/java/fu/hocluc/quiz/authoring/service/impl/QuizAuthoringServiceImpl.java): list, findManaged, attempts/stats/review, validation và khóa chỉnh sửa khi đã có attempts.
- [CourseAdminController.java](D:/CAPSTONE/1016BE/hocluc-api/src/main/java/fu/hocluc/course/controller/CourseAdminController.java), [CourseAdminServiceImpl.java](D:/CAPSTONE/1016BE/hocluc-api/src/main/java/fu/hocluc/course/service/impl/CourseAdminServiceImpl.java): GET quản trị khóa lọc theo phân công Teacher, không dùng public catalog.
- [WebSecurityConfig.java](D:/CAPSTONE/1016BE/hocluc-api/src/main/java/fu/hocluc/auth/config/WebSecurityConfig.java): authoring không phải public endpoint; BE xác thực và thực thi quyền cuối cùng.

## Màn và đường dẫn

Sidebar chỉ có một mục **Bài kiểm tra**, gồm các tab **Bài học / chương**, **Đánh giá đầu vào**, **Thi thử**. Tab đầu vào chỉ dành cho STAFF/MANAGER/ADMINISTRATOR; Teacher chỉ có hai tab đọc trong khóa được phân công. **Duyệt câu hỏi** vẫn là mục riêng. Mỗi tab giữ URL và kiểm tra quyền riêng; gom menu không cấp thêm quyền.

Các tab tái sử dụng `QuizScreen`, `MockExamScreen` và `QuizCatalog`, cùng `Tabs` có sẵn. Nút tạo theo tab, editor không hiện thanh chuyển tab. Từ khóa và bộ lọc được giữ trong sessionStorage riêng theo tài khoản, active role, loại bài và khóa khi có; không lưu nội dung đề hoặc token vào bộ nhớ bộ lọc. Điều hướng console giữ tiền tố `/console`, URL cũ vẫn được chuẩn hóa.

Với area là `staff`, `manager`, `admin` hoặc `teacher`:

- `/console/{area}/quizzes`: quiz nhanh/bài/chương, giữ loại quiz editor đang hỗ trợ.
- `/console/{area}/mock-exams`: đề thi thử EXAM.
- `/console/{area}/placements`: PLACEMENT độc lập với khóa; chỉ `staff`, `manager`, `admin`. Đường `/new`, `/{quizId}/edit` chỉ writer; Teacher bị chặn trước khi tải dữ liệu.
- `/console/{area}/question-review`: ghi đối với writer, Teacher chỉ đọc câu chờ kiểm tra.
- `/console/{area}/attempts`: bài làm và thống kê bằng màn dùng chung.
- `/console/{area}/quizzes/{quizId}` và `/mock-exams/{quizId}`: đọc nội dung qua GET editor response, không mount form ghi.
- `/console/{area}/quizzes/new`, `/quizzes/{quizId}/edit`, `/mock-exams/new`, `/mock-exams/{quizId}/edit`: chỉ writer được mở.
- Teacher URL cũ `/console/teacher/my-courses/{courseId}/quiz` chỉ đọc; đường `/quiz/new` bị chặn.

Không tạo bản sao màn theo role. Hai editor cũ được chuyển từ `components/teacher` sang `components/management/quiz`, giữ service và hành vi lưu/khóa/unknown outcome. QuestionReview và TeacherAttempts được dùng chung. Luồng Student không chuyển sang service authoring.

## Các lớp kiểm tra FE

CTA **Làm đánh giá miễn phí** ở hero và sau bài học mẫu trỏ đến `/student/assessments/placement`. Khách được chuyển sang `/login?returnTo=%2Fstudent%2Fassessments%2Fplacement`; đăng nhập Student thành công quay lại trang đầu vào. Đích đến được giữ khi chuyển màn đăng nhập/đăng ký/xác minh và khi phiên hết hạn ngay tại trang đầu vào. Student đã đăng nhập vào thẳng; role khác vẫn bị StudentRouteGuard chặn. `auth-return-to.ts` chỉ cho phép đích placement cụ thể và các đích mua hàng đã có, không nhận URL bên ngoài. Điều hướng chỉ mở trang giới thiệu, không tự tạo attempt.

1. `QUIZ_READ`/`QUIZ_WRITE` trong bảng permission có sẵn; không mở COURSE_WRITE/TAXONOMY_WRITE cho Manager vì thay đổi quiz.
2. Menu và route cùng ánh xạ ở console; Teacher editor URL bị chặn trước khi mount/fetch editor.
3. `useQuizAccess` chỉ nhận active role khớp token và profile hiện tại, không kế thừa quyền từ mảng granted roles. Boundary remount theo identity/role/route để bỏ draft và selection cũ.
4. Nút và handler ghi bị khóa với readOnly. Service kiểm lại QUIZ_WRITE trước mọi mutation, kể cả thao tác tiếp theo trong một lần lưu nhiều request.
5. Quiz API requests bật guardIdentity: bỏ phản hồi đến muộn sau logout/đổi tài khoản/active role; refresh cùng identity không làm mất draft. Request 403 không tự retry; màn hiện lỗi/forbidden, không báo lưu thành công.
6. Danh sách khóa dùng GET `/api/v1/admin/courses` có auth và đọc đủ trang; đề EXAM lọc MAIN. Vị trí bài học lấy GET chương/bài authoring để không bỏ mất draft vì public catalog. Course detail của Teacher cũng kiểm quyền qua API quản trị.

Token decoding ở FE chỉ phục vụ UI/kiểm tra phiên, không thay thế xác thực chữ ký hay scope của BE. Không giả lập capability không có trong response. Teacher không được cấp quyền ghi chỉ vì giữ scope AUTHOR hay có thêm role Staff chưa active.

### Sửa lỗi Staff bị guard FE chặn sau triển khai

Đã đọc lại `AuthServiceImpl.issueTokens`: BE tạo claim `role` dạng `ROLE_STAFF` (tương tự các role khác); `AuthTokenFilter` giữ nguyên authority này để Spring `hasAnyRole` kiểm tra. Profile trả enum `STAFF`. Guard quiz ban đầu so sánh hai chuỗi trực tiếp nên từ chối Staff; service mutation cũng không nhận ra role. Đây là lỗi FE, không phải bằng chứng BE hạn chế Staff theo môn.

`accessTokenRole()` hiện bỏ đúng một tiền tố `ROLE_` trước khi đối chiếu bảng quyền; không sửa JWT, Authorization header, identity hay BE. Fixture quiz được sửa để JWT dùng `ROLE_*`, profile vẫn dùng enum; các kết quả trước đó dùng token không có tiền tố chưa kiểm được lỗi hợp đồng này. Ca Staff URL cũ được chạy thất bại với fixture đúng trước khi sửa guard, sau đó chạy lại cùng bộ role/scope/Student để chống tái phát.

Nếu request HTTP thực tế vẫn trả 403 sau sửa này, cần method/URL và response lỗi để kiểm tra riêng môi trường triển khai. Không coi lỗi guard đã tái hiện là nguyên nhân được xác minh của mọi response 403 trên BE thật.

Kết quả kiểm tra sau sửa tiền tố role: app/e2e typecheck, ESLint `src/lib/api.ts`, build và diff check đạt. Toàn bộ 23 ca chạy với JWT `ROLE_*`: 22 đạt; một ca Admin tạo quiz dừng vì form mất lựa chọn khóa/bài học (không phải màn forbidden). Chạy lại riêng ca đó đạt 1/1; nguyên nhân không ổn định chưa được xác định nên không ghi nhận lần chạy toàn bộ là 23/23. Các ca Staff/Manager/Admin vào URL cũ và reload, mutation Staff/Manager/Admin, Teacher chỉ đọc/chặn ghi, đổi active role, phản hồi muộn, 403 và Student assessment đều đạt. Chưa chạy BE thật hoặc test Java BE trong lượt sửa này.

## Kiểm tra

- App: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`.
- Test types: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.e2e.json`.
- Build: `npm run build`.
- Quiz UI: `npm run test:e2e:quiz-permissions`.
- Regression CRUD: `npm run test:e2e:core-crud`.

Playwright chạy Chrome headless, Vite cục bộ và API fixture chặn request ngoài; không dùng tài khoản/secret thật, không sửa dữ liệu BE. Bộ quiz test kiểm writer CRUD/câu hỏi/publish/duplicate, editor trực tiếp, phạm vi Teacher được/không được giao, read-only và 12 mutation-service guards, active-role switch/late response, 403, Mentor/Student console denial và Student start/save/submit/review.

Chưa chạy kiểm thử tích hợp trên BE/database thật. Cần môi trường có Teacher được/không được phân công, các role active hợp lệ và đề có/chưa có attempts để xác minh server cùng phiên bản source. Các chức năng quiz chưa có UI từ trước (ví dụ import/AI nâng cao hoặc editor placement riêng) không được mở rộng trong thay đổi phân quyền này.

### Kết quả lần triển khai này

- App typecheck, e2e typecheck, ESLint các file ứng dụng thay đổi, production build và `git diff --check`: đạt. Build còn cảnh báo kích thước bundle trên 500 kB.
- Bộ `quiz-permissions.spec.ts`: **20/20 đạt**, chạy trình duyệt với API fixture; đây không phải xác nhận BE thật hoạt động đúng.
- Bộ CRUD đầy đủ chạy với `--max-failures=3`: 3 đạt, 3 lỗi, 22 chưa chạy. Các ca lỗi thuộc tạo SECTION, xuất bản khóa và cấu trúc MAIN, dừng khi tìm option/nút cũ. Đã kiểm tra `git show HEAD` của course editor/row actions: HEAD dùng nhãn `Khóa nhỏ` và quy trình `Gửi duyệt`/`Bán khóa`, khác selector `SECTION · Khóa nhỏ`/`Xuất bản` trong test. Không sửa nghiệp vụ khóa để đáp ứng test cũ.
- Chạy riêng 3 regression Manager ngoài quiz: đơn hàng/ghi danh và nhóm học đạt; lịch học lỗi vì nhãn bản ghi trong dialog bị ẩn. Chưa xác định nguyên nhân gốc của lỗi lịch học; không kết luận toàn bộ regression đạt.
- Để e2e typecheck chạy được, cập nhật fixture CRUD theo DTO hiện tại: thêm các trường reviewState/review metadata, bỏ phaseId cũ của course section và thêm sectionId/sectionTitle cho chapter. Không sửa test nghiệp vụ khóa hay mã sản phẩm các module đó.

## File triển khai

- `src/lib/permissions.ts`, `src/lib/console-nav.ts`, `src/lib/console-routes.ts`, `src/App.tsx`: bảng quyền, menu và route.
- `src/hooks/useQuizAccess.ts`, `src/lib/api.ts`, `src/services/teacherQuizService.ts`: active role/identity, phản hồi muộn và chặn mutation.
- `src/services/quizCourseService.ts`, `src/components/teacher/TeacherCourses.tsx`: khóa được phân công và catalog authoring.
- `src/components/management/quiz/QuizScreen.tsx`, `MockExamScreen.tsx`: chuyển hai màn/editor cũ `TeacherQuiz.tsx`/`TeacherMockExams.tsx` vào thư mục dùng chung; không nhân bản theo role.
- `src/components/management/quiz/QuizConsoleScreen.tsx`, `QuizDetails.tsx`: boundary và phần xem tĩnh.
- `src/components/management/quiz-review-screens.tsx`, `src/components/management/ManagementDashboard.tsx`, `src/components/teacher/TeacherDashboard.tsx`: dùng chung bài làm/thống kê/câu hỏi, kết nối dashboard.
- `tests/e2e/quiz-permissions.spec.ts`, `quiz-permissions-fixture.ts`, `core-crud-fixture.ts`, `tests/e2e/README.md`, `playwright.config.ts`, `package.json`: kiểm thử và lệnh chạy.

Không sửa source BE hoặc các file assessment Student. `package-lock.json` và `docs/api-endpoints.md` có thay đổi sẵn trước lượt triển khai, được giữ nguyên. Chưa commit/push.

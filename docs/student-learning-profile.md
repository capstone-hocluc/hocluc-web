# Hồ sơ năng lực Student

Màn hình: `/student/learning-profile`. Hai tab: `overview` (Tổng quan),
`learning` (Học tập). Học tập gom khóa học, tiến độ, biểu đồ lượt làm, năng lực từng lĩnh vực,
biểu đồ điểm, lịch sử đánh giá và thi thử. URL cũ `?tab=plan` và `?tab=practice`
được chuẩn hóa thành `?tab=learning`; URL practice cũ cuộn tới phần đánh giá.
Nút xem năng lực ở Tổng quan cũng mở đúng phần đánh giá trong Học tập.
Không thay đổi sidebar hoặc BE khi gộp tab.

Phần Đánh giá năng lực và luyện đề dùng cùng khung trắng bo góc, nút viền xanh và
khoảng đệm gọn như Tổng quan học tập. Kết quả đầu vào gộp tỷ lệ đúng, môn mạnh/yếu
và các lĩnh vực vào một khung; danh sách lĩnh vực có giới hạn chiều cao. Biểu đồ
đầu vào và lịch sử đề hiện hành đặt cạnh nhau trên desktop, cùng cao 272px; danh sách
lượt làm và thi thử cuộn riêng. Mobile xếp thành một cột. Giữ rõ khác biệt giữa kết quả
đầu vào gần nhất (có thể thuộc đề cũ) với lịch sử của đề hiện hành; không ghép hai nguồn.

## Nguồn dữ liệu

| API | Hiển thị | Giới hạn |
| --- | --- | --- |
| GET `/api/v1/users/profiles` | Tên, mục tiêu kỳ thi, năm thi, điểm mục tiêu | Điểm mục tiêu tự khai, không phải dự đoán |
| GET `/api/v1/assessments/results/me` | Kết quả đầu vào gần nhất và kết quả từng lĩnh vực | Có thể thuộc đề trước; không ghép ID với lịch sử đề hiện hành |
| GET `/api/v1/courses/my` | Khóa đã đăng ký | Không dùng public catalog thay dữ liệu sở hữu |
| GET `/api/v1/courses/{id}/study` | Tiến độ, bài tiếp theo, điểm cao nhất quiz trong nội dung và thi thử qua `exams` | Tối đa 4 request đồng thời; từng khóa lỗi được hiển thị và thử lại |
| GET `/api/v1/assessments/quizzes/{quizId}/attempts/me` | Biểu đồ và lịch sử một bài hoặc tất cả bài trong khóa/loại đang chọn | BE chưa có endpoint tổng hợp; FE gộp lịch sử từng bài, giới hạn 4 request đồng thời. Giữ dữ liệu tải thành công và cảnh báo phần lỗi. Lọc GRADED có percentage, gồm mọi chế độ đã chấm, màu theo loại bài, tối đa 30 lượt gần nhất trong biểu đồ |
| GET `/api/v1/credits/streak` | Chuỗi và 7 ngày gần nhất trong thẻ chuỗi | Không còn khu vực Tần suất học tập riêng |
| GET `/api/v1/assessments/placement/attempts/me` | Lịch sử và biểu đồ điểm theo lượt | Chỉ đề PLACEMENT hiện hành; biểu đồ lấy tối đa 30 lượt GRADED có percentage |

Các thao tác chỉnh mục tiêu và mua đóng băng dùng component/API đã có.
Chỉnh sửa hồ sơ mở `/student/profile`. Mở kết quả từ lịch sử dùng màn kết quả
chung có kiểm tra `showAnswers`; không tự gọi API xem đáp án khi tải Hồ sơ năng lực.

## Quy tắc trình bày

- Chỉ 404 với mã `PLACEMENT_RESULT_NOT_FOUND` được hiểu là chưa có kết quả;
  chỉ `PLACEMENT_QUIZ_NOT_FOUND` được hiểu là chưa có đề hiện hành. Lỗi khác có trạng thái và thử lại.
- Tổng quan không còn hai thẻ tổng số khóa đã đăng ký/bài học hoàn thành.
  Tiến độ chi tiết vẫn hiển thị theo từng khóa trong tab Học tập.
- Danh sách tiến độ dùng lại `MyCourseCard` (ảnh bìa, mô tả, tiến độ),
  Tổng quan mỗi nhóm tối đa 2 thẻ dọc, Chuỗi học tập ở cột bên phải;
  có nút trước/sau khi nhiều hơn 2 khóa. Học tập giữ nhóm tối đa 3 thẻ.
  Mobile tự xếp thành một cột. Không hiển thị dòng chú thích sắp xếp trên UI.
  Khu vực Tổng quan dùng đầy đủ chiều rộng cùng banner: hai thẻ khóa bên trái,
  cột chuỗi rộng 320–360px bên phải, căn cùng đỉnh. Không ép chiều cao thẻ chuỗi.
  Ảnh khóa giữ tỷ lệ 16:9, không ép chiều cao riêng để thu nhỏ ảnh.
  Xếp `enrolledAt` giảm dần; ngày thiếu/không hợp lệ xuống cuối.
  API sở hữu khóa không trả `paidAt`, nên đây là ngày đăng ký/được cấp khóa,
  không khẳng định đó luôn là thời điểm thanh toán.
- Phân bố khóa theo progressPercentage: 0 chưa bắt đầu, (0,100) đang học,
  từ 100 hoàn thành; thiếu giá trị có nhóm Chưa có dữ liệu.
- Điểm đầu vào và biểu đồ dùng percentage BE trả về. Không quy đổi sang 1200.
- Điểm quiz ở tab Học tập là bestPercentage, không phải điểm trung bình hay lịch sử theo ngày.
- Chưa có endpoint tổng hợp tất cả lịch sử quiz/thi thử và thời lượng học tin cậy
  cho trang này; thi thử hiển thị standing từ `study.exams` và mở màn bài thi hiện có.
  Thiếu field `exams` trên BE cũ được báo thiếu dữ liệu, không coi là danh sách rỗng.

## Bằng chứng BE đã đối chiếu

Trong `D:/CAPSTONE/1016BE/hocluc-api/src/main/java/fu/hocluc/`:
`quiz/controller/AssessmentController.java`,
`quiz/service/impl/AssessmentServiceImpl.java`,
`quiz/service/QuizGateService.java`,
`quiz/dto/response/AttemptSummaryResponse.java`,
`streak/service/StreakService.java`, cùng các DTO/service khóa học đang dùng.

Đã đối chiếu thêm `course/dto/response/StudyDashboardResponse.java` và
`progress/service/impl/ProgressServiceImpl.java` cho field `exams`.

Kiểm thử giao diện dùng fixture API trong `tests/e2e/learning-profile-ui.spec.ts`;
không phải xác nhận BE triển khai thật đã hoạt động.

## Tệp FE thay đổi trong lượt thiết kế

- `src/pages/student/LearningProfile.tsx`: banner, hai tab và phối hợp dữ liệu; đã bỏ khung lộ trình khỏi trang này.
- `src/components/student/learning-profile/CourseLearningAnalytics.tsx`: một khung Tiến bộ học tập, lọc khóa/loại/bài; khung biểu đồ và bảng lịch sử cùng cao 272px, căn đều mép trên/dưới (khoảng 3 lượt rồi cuộn), giữ tiêu đề cột. Đã bỏ ghi chú bộ lọc, ghi chú 3 lượt mỗi khung và dòng chú thích dưới biểu đồ. Biểu đồ hiển thị tối đa 30 lượt, bảng cho xem toàn bộ lượt đã chấm theo bộ lọc. Không còn cột Kết quả học tập riêng. Bộ lọc lưu trong URL để quay lại đúng lựa chọn.
- `src/components/student/learning-profile/LearningCoursePanel.tsx`: tiến độ, phân bố khóa, quiz và thi thử.
- `src/components/student/learning-profile/LearningPracticePanel.tsx`: biểu đồ điểm và lịch sử đầu vào.
- `src/components/student/learning-profile/controls.tsx`: biến thể segmented control cho trang.
- `src/services/learningProfileService.ts`: tải khóa có giới hạn request, phân biệt kết quả/lịch sử chưa có với lỗi.
- `src/services/courseService.ts`: khai báo field `CourseStudy.exams` theo BE.
- `src/pages/student/StudentRoutes.tsx`: giữ nơi quay lại từ quiz/kết quả mở trong hồ sơ.
- `src/pages/assessments/QuizReviewPage.tsx`: nhãn quay lại theo nguồn mở màn.
- `src/lib/attemptStatus.ts`: nhãn GRADED và ABANDONED theo enum BE.
- `tests/e2e/learning-profile-ui.spec.ts`: kiểm thử hai tab, liên kết cũ, biểu đồ, dữ liệu, lỗi, quyền xem đáp án và điều hướng.
- `tests/e2e/credits.spec.ts`: cập nhật kiểm thử chuỗi theo bố cục tab mới.

Build, typecheck, kiểm tra TypeScript của test và ESLint được chạy trên source hiện tại.
Bộ kiểm thử Hồ sơ năng lực hiện có 17 ca, gồm tổng hợp theo loại, tải lỗi một phần,
giới hạn 4 request, lọc bốn loại bài, bỏ bộ lọc chế độ và tham số resultMode cũ, lịch sử đến muộn, trạng thái tải/lỗi/403/404,
mascot 03 khi thiếu dữ liệu, responsive và quay lại đúng bộ lọc.
Màu cố định theo loại bài (QUICK xanh dương, LESSON xanh lá, CHAPTER cam, EXAM tím). Đường nối mọi lượt đã chấm cùng loại theo thứ tự nộp, bao gồm các đề và chế độ khác nhau; không suy luận
mức tiến bộ giữa các đề có độ khó khác nhau. Điểm tổng hợp dùng percentage đã được BE chấm.
Không còn bộ lọc chế độ. Thông tin chế độ từng lượt vẫn được giữ trong bảng và tooltip; không thay đổi điểm hay business rule BE.
Đã xem ảnh chụp desktop/mobile. Chưa chạy tích hợp BE thật, chưa commit/push.

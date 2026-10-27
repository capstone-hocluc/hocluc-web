# Nhập câu hỏi từ file

## Luồng sử dụng

### Tạo đề mới kèm file

1. Staff/Manager/Admin mở màn tạo bài kiểm tra, đánh giá đầu vào hoặc thi thử, điền thông tin đề và vị trí khóa/chương/bài theo loại.
2. Bấm **Nhập câu hỏi từ file**: FE kiểm tra thông tin trước khi mở dialog. Nếu thiếu hoặc chưa hợp lệ, các trường được đánh dấu ngay trên form. Khi hợp lệ, chọn DOCX/TXT/MD hoặc PDF; không cần lưu nháp trước.
3. Bấm **Tạo bản nháp và nhập câu hỏi**. FE gửi FormData gồm các trường thông tin đề, `file`, `read=true` tới `POST /api/v1/teacher/quizzes/with-file`. Không gửi JSON lồng trong multipart hoặc tự đặt Content-Type/boundary.
4. DOCX/TXT/MD nhập ngay. Xem số câu và cảnh báo, bấm **Mở bản nháp để rà soát**; FE mở URL `.../{id}/edit`, tải lại bằng GET editor. F5 vẫn mở đúng đề; không tự xuất bản.
5. Nếu đang có nội dung/cấu trúc soạn tay, lưu theo luồng hiện tại rồi nhập thêm để giữ nội dung. Không trộn nội dung chưa lưu với thao tác tạo từ file.
6. Lỗi 4xx giữ thông tin và file đã chọn để người dùng sửa/thử lại. Mất mạng/timeout/5xx/response sai khóa tạo lại trên biểu mẫu đó, yêu cầu kiểm tra danh sách; không tự gửi lại POST.

### Nhập thêm vào đề đã có

1. Staff/Manager/Admin mở bài kiểm tra, đánh giá đầu vào hoặc thi thử.
2. Mở màn chỉnh sửa bản nháp. Nếu có thay đổi chưa lưu, lưu trước khi nhập.
3. Bấm **Nhập câu hỏi từ file**, chọn `.docx`, `.txt` hoặc `.md`. Phần hướng dẫn có ba quy tắc định dạng, cấu trúc điền trống và ba nút tải mẫu Word/TXT/Markdown. Thay nội dung trong ngoặc vuông trước khi nhập; dòng đáp án ghi ký tự lựa chọn đúng.
4. Bấm **Nhập vào bản nháp**. Câu hỏi được thêm vào cuối, giữ câu hỏi cũ, không tự xuất bản.
5. Xem số câu/phần/nhóm đã thêm, số câu thiếu đáp án/cần rà soát và cảnh báo từ BE.
6. Bấm **Tải lại bài để kiểm tra** để lấy lại toàn bộ editor từ BE. Kiểm tra đáp án, môn đánh giá của placement và xử lý các câu cần rà soát qua chức năng duyệt câu hỏi hiện có trước khi xuất bản.

### PDF và AI

- API `with-file` lưu PDF và có thể trả `aiJob`. Nếu AI chưa được cấu hình, FE hiển thị warning từ server, nói rõ file đã lưu nhưng chưa có câu hỏi; không báo nhập thành công giả.
- Editor theo dõi `GET /api/v1/teacher/quizzes/{quizId}/ai/jobs/{jobId}` khoảng 2,5 giây khi PENDING/RUNNING. Dừng khi DONE/FAILED/APPLIED hoặc lỗi; lỗi tải có nút thử lại. Rời trang/đổi role dừng polling, bỏ response cũ.
- BE `ExtractionAutoApplier` có thể tự áp dụng vào đề trống, chưa có lượt làm, khi kết quả không thiếu số câu. FE theo trạng thái APPLIED, giữ hiển thị cảnh báo, chỉ cho tải lại/rà soát, không gọi apply thêm.
- Khi DONE: xem trước phần/nhóm/câu, ảnh, đáp án và cảnh báo (kể cả số câu bị thiếu); xác nhận đã rà soát rồi mới áp dụng. Chưa cho áp dụng kết quả có câu không có lựa chọn hoặc nhiều đáp án đúng trong luồng single choice này.
- `POST .../ai/jobs/{jobId}/apply`: GET lại trạng thái trước khi gửi; phải DRAFT, chưa có lượt làm, job DONE. Gửi REPLACE nếu đề trống, APPEND nếu đề đã có câu để giữ nội dung cũ. Không tự xuất bản.
- Trong lúc AI đang đọc, editor khóa soạn/lưu để tránh ghi đè kết quả tự nhập. Khi xong, tải lại nội dung để tiếp tục. Dữ liệu chưa lưu chặn áp dụng/tải lại gây mất nội dung.
- Panel và khóa editor này chỉ áp dụng cho job `EXAM_FILE`, không áp dụng cho tác vụ `GENERATE` ngoài luồng đọc file.
- Mất phản hồi apply: không tự gửi lại hoặc cho bấm apply lần hai; tải lại nội dung để đối chiếu. FAILED giữ file/đề, có nút tải lại để mở khóa editor và tiếp tục soạn tay, không tự khởi chạy AI lại. Xử lý AI thực tế và auto-apply thuộc BE; FE không thay business rules.

## API và giới hạn

- `GET /api/v1/teacher/quizzes/{quizId}`: tải editor và kiểm tra trạng thái trước khi gửi file.
- `POST /api/v1/teacher/quizzes/{quizId}/import/file?mode=APPEND`: multipart, trường `file`, có token của active role. Trình duyệt tự đặt boundary; dùng API client và guard quyền hiện có.
- `GET /api/v1/teacher/quizzes/{quizId}`: tải lại khi đóng kết quả hoặc sau lần nhập thất bại để đối chiếu trạng thái thực tế.
- Chỉ cho nhập trên bản nháp chưa có lượt làm, không có thay đổi chưa lưu và không thuộc cấu trúc editor đang chỉ xem. BE tiếp tục quyết định quyền và scope; không bổ sung quyền ở FE.
- DOCX/TXT/MD được BE nhập trực tiếp trong transaction, không có API xem trước riêng. PDF dùng pipeline AI và preview riêng như trên. Chưa hỗ trợ Excel.
- Khi mất mạng, timeout, lỗi 5xx hoặc phản hồi thành công không đủ dữ liệu: không gửi lại tự động và khóa nút nhập trong dialog; người dùng phải tải lại bài để xác nhận trước khi nhập tiếp.
- Preflight chỉ phát hiện trạng thái tại thời điểm GET; kiểm tra này không phải khóa giao dịch giữa GET và POST. BE hiện kiểm tra chưa có lượt làm khi import; FE không sửa business rules BE.
- Word được BE trích văn bản, không bảo đảm giữ ảnh/bảng/công thức phức tạp. FE không tự phân tích file.
- Editor bài học/chương giữ chế độ chỉ xem câu hỏi khi nhận phần/nhóm. Editor thi thử/placement giữ giới hạn sẵn có với nhóm và phần lồng nhau. Không làm phẳng hoặc ghi đè cấu trúc chưa hỗ trợ.
- Các loại câu hỏi chưa được màn hiện tại hỗ trợ sửa vẫn chỉ xem; import không mở rộng khả năng làm bài của Student. Placement tiếp tục kiểm tra loại SINGLE_CHOICE trong luồng lưu/xuất bản hiện có.
- Editor bài học/chương, thi thử và placement chỉ tạo/sửa `SINGLE_CHOICE`. Các loại câu hỏi khác đã có hoặc được BE import vào giữ nguyên dữ liệu, ở chế độ chỉ xem; không tự chuyển loại. Mỗi câu trong file mẫu chỉ điền một ký tự đáp án đúng.

## Kiểm tra

`tests/e2e/quiz-import.spec.ts` kiểm tra bằng API fixture: tạo mới kèm file cho ba role/nhóm đề, multipart, F5 đúng URL, cảnh báo, dữ liệu chưa lưu, nhập APPEND vào đề cũ, bài đã xuất bản/lưu trữ/có lượt làm, preflight, lỗi 400/403/413/5xx/mất kết nối/phản hồi sai, không gửi trùng, mobile, đổi active role và bảo toàn nhóm câu hỏi. Các ca PDF xác minh không cấu hình AI, preview, single choice, APPEND khi có nội dung mới, auto-apply, và mất phản hồi apply không áp dụng lại.

Các ca trình duyệt chỉ xác nhận FE và hợp đồng HTTP; dữ liệu file trong test là payload giả lập, không chứng minh parser Word/TXT/MD của BE chạy đúng. Cần kiểm thử với file thực trên BE đã triển khai và kiểm tra lại DB/kết quả câu hỏi. Không có thay đổi BE, commit hoặc push trong đợt triển khai này.

## File mẫu tải xuống

- File tĩnh ở `public/templates/quiz-import/mau-nhap-cau-hoi.docx`, `.txt`, `.md`; FE dùng đường dẫn có `BASE_URL` để tải về.
- Nguồn nội dung: `docs/samples/quiz-import-template.txt`. Chạy `scripts/generate-quiz-import-samples.py` bằng Python có `python-docx` để tạo lại cả ba mẫu khi đổi nội dung. File `quiz-import-single-choice.txt` cũ vẫn là dữ liệu thử riêng, không phải mẫu tải xuống.
- Markdown giữ nguyên văn bản câu hỏi, không thêm tiêu đề, dấu đầu dòng hoặc khối code; Word dùng từng đoạn văn bản thường, không dùng đánh số tự động, tô đậm/gạch chân đáp án hoặc Word equation.
- Script đối chiếu văn bản trong OOXML với TXT/Markdown, kiểm tra khối một câu hỏi điền trống, bốn lựa chọn và dòng đáp án. Browser test tải thật cả ba file, kiểm tra tên file và nội dung TXT/MD/chữ ký ZIP của DOCX.

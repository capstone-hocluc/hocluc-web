# Nhập câu hỏi từ file

## Luồng sử dụng

1. Staff/Manager/Admin mở bài kiểm tra, đánh giá đầu vào hoặc thi thử.
2. Tạo và lưu bản nháp, sau đó mở lại màn chỉnh sửa. Nếu có thay đổi chưa lưu, lưu trước khi nhập.
3. Bấm **Nhập câu hỏi từ file**, chọn `.docx`, `.txt` hoặc `.md`. Phần hướng dẫn có ba quy tắc định dạng, cấu trúc điền trống và ba nút tải mẫu Word/TXT/Markdown. Thay nội dung trong ngoặc vuông trước khi nhập; dòng đáp án ghi ký tự lựa chọn đúng.
4. Bấm **Nhập vào bản nháp**. Câu hỏi được thêm vào cuối, giữ câu hỏi cũ, không tự xuất bản.
5. Xem số câu/phần/nhóm đã thêm, số câu thiếu đáp án/cần rà soát và cảnh báo từ BE.
6. Bấm **Tải lại bài để kiểm tra** để lấy lại toàn bộ editor từ BE. Kiểm tra đáp án, môn đánh giá của placement và xử lý các câu cần rà soát qua chức năng duyệt câu hỏi hiện có trước khi xuất bản.

## API và giới hạn

- `GET /api/v1/teacher/quizzes/{quizId}`: tải editor và kiểm tra trạng thái trước khi gửi file.
- `POST /api/v1/teacher/quizzes/{quizId}/import/file?mode=APPEND`: multipart, trường `file`, có token của active role. Trình duyệt tự đặt boundary; dùng API client và guard quyền hiện có.
- `GET /api/v1/teacher/quizzes/{quizId}`: tải lại khi đóng kết quả hoặc sau lần nhập thất bại để đối chiếu trạng thái thực tế.
- Chỉ cho nhập trên bản nháp chưa có lượt làm, không có thay đổi chưa lưu và không thuộc cấu trúc editor đang chỉ xem. BE tiếp tục quyết định quyền và scope; không bổ sung quyền ở FE.
- BE áp dụng import trực tiếp trong transaction, không có API xem trước. Chưa triển khai REPLACE, Excel hoặc PDF/AI.
- Khi mất mạng, timeout, lỗi 5xx hoặc phản hồi thành công không đủ dữ liệu: không gửi lại tự động và khóa nút nhập trong dialog; người dùng phải tải lại bài để xác nhận trước khi nhập tiếp.
- Preflight chỉ phát hiện trạng thái tại thời điểm GET; kiểm tra này không phải khóa giao dịch giữa GET và POST. BE hiện kiểm tra chưa có lượt làm khi import; FE không sửa business rules BE.
- Word được BE trích văn bản, không bảo đảm giữ ảnh/bảng/công thức phức tạp. FE không tự phân tích file.
- Editor bài học/chương giữ chế độ chỉ xem câu hỏi khi nhận phần/nhóm. Editor thi thử/placement giữ giới hạn sẵn có với nhóm và phần lồng nhau. Không làm phẳng hoặc ghi đè cấu trúc chưa hỗ trợ.
- Các loại câu hỏi chưa được màn hiện tại hỗ trợ sửa vẫn chỉ xem; import không mở rộng khả năng làm bài của Student. Placement tiếp tục kiểm tra loại SINGLE_CHOICE trong luồng lưu/xuất bản hiện có.
- Editor bài học/chương, thi thử và placement chỉ tạo/sửa `SINGLE_CHOICE`. Các loại câu hỏi khác đã có hoặc được BE import vào giữ nguyên dữ liệu, ở chế độ chỉ xem; không tự chuyển loại. Mỗi câu trong file mẫu chỉ điền một ký tự đáp án đúng.

## Kiểm tra

`tests/e2e/quiz-import.spec.ts` kiểm tra bằng API fixture: multipart ba định dạng trên các editor/role, tải lại dữ liệu, cảnh báo, bản nháp chưa lưu, dữ liệu chưa lưu, bài đã xuất bản/lưu trữ/có lượt làm, preflight, lỗi 400/403/413/5xx/mất kết nối/phản hồi sai, không gửi trùng, mobile, đổi active role và bảo toàn nhóm câu hỏi.

Các ca trình duyệt chỉ xác nhận FE và hợp đồng HTTP; dữ liệu file trong test là payload giả lập, không chứng minh parser Word/TXT/MD của BE chạy đúng. Cần kiểm thử với file thực trên BE đã triển khai và kiểm tra lại DB/kết quả câu hỏi. Không có thay đổi BE, commit hoặc push trong đợt triển khai này.

## File mẫu tải xuống

- File tĩnh ở `public/templates/quiz-import/mau-nhap-cau-hoi.docx`, `.txt`, `.md`; FE dùng đường dẫn có `BASE_URL` để tải về.
- Nguồn nội dung: `docs/samples/quiz-import-template.txt`. Chạy `scripts/generate-quiz-import-samples.py` bằng Python có `python-docx` để tạo lại cả ba mẫu khi đổi nội dung. File `quiz-import-single-choice.txt` cũ vẫn là dữ liệu thử riêng, không phải mẫu tải xuống.
- Markdown giữ nguyên văn bản câu hỏi, không thêm tiêu đề, dấu đầu dòng hoặc khối code; Word dùng từng đoạn văn bản thường, không dùng đánh số tự động, tô đậm/gạch chân đáp án hoặc Word equation.
- Script đối chiếu văn bản trong OOXML với TXT/Markdown, kiểm tra khối một câu hỏi điền trống, bốn lựa chọn và dòng đáp án. Browser test tải thật cả ba file, kiểm tra tên file và nội dung TXT/MD/chữ ký ZIP của DOCX.

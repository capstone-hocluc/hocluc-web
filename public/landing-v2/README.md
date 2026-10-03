# Học Lực landing page

HTML/CSS/JavaScript thuần. Mở `hocluc-standalone.html` trực tiếp, không cần cài thư viện hay kết nối mạng.

## Bản nguồn

- `index.html`: chỉnh sửa nội dung, CSS, SVG và JavaScript tại đây; giữ thư mục `assets` bên cạnh.
- `hocluc-standalone.html`: bản đóng gói một file, nhúng ảnh và font.
- `build-standalone.ps1`: chạy lại sau khi sửa nguồn để cập nhật bản một file.
- Trong ứng dụng Vite: `/` hiển thị trang V2 trong khung cô lập để giữ nguyên CSS và tương tác của bản HTML; `/landing-v2/index.html` vẫn mở trực tiếp bản nguồn.

## Nội dung

Nội dung chính được rút gọn: giới thiệu, 5 nhóm học, lộ trình ngắn và bài học thử. Các hoạt động ôn luyện đặt thành hàng nút gọn dưới nhóm học. Giữ đủ 14 học phần trong cửa sổ chi tiết; Casio thuộc Toán. Bỏ thông báo đầu trang, các phần giới thiệu lặp lại, FAQ, tổng thời lượng và ghi chú phiên bản trên trang chủ.

Cú xanh, Mai và Nam cùng xuất hiện trong một khung minh họa; hero tự chuyển cảnh giữa khung này và ảnh Amy cũ, đồng thời đổi tiêu đề và mô tả theo từng ảnh. Hình ảnh lướt ngang nhẹ khi hòa cảnh; tiêu đề đổi trước, mô tả theo sau bằng hiệu ứng mờ và dịch chuyển rất nhẹ. Mai chuyển động nhẹ khi viết; Nam chuyển động theo nhịp riêng khi khám phá hình học. Bo và Mít xuất hiện trong nhóm học. Tham khảo cách trình bày từ [PREP](https://prepedu.com/vi/) và [Duolingo](https://vi.duolingo.com/); nội dung lấy từ tài liệu `HocLuc_Curriculum_Framework_v2.0.docx` và cấu trúc ứng dụng hiện tại.

## Font tiếng Việt

Dùng Nunito 400, 700, 800, 900 được lưu trong `assets/fonts` từ Google Fonts. Đã kiểm tra các glyph tiếng Việt U+1EA0–U+1EF9 đều có trong cả 4 font. Giấy phép SIL Open Font License ở `assets/fonts/OFL.txt`, cũng được nhúng vào bản standalone. Logo có khoảng cách giữa “Học Lực”; tiêu đề được giữ 2 dòng ở các kích thước điện thoại đã kiểm tra.

## Phạm vi tương tác

Xem học phần, chọn mục tiêu, gợi ý phần học, 3 câu thử có chấm điểm/lời giải/làm lại, menu mobile và dialog hỗ trợ bàn phím. Chưa gọi API, chưa lưu tiến độ, không thanh toán hoặc đăng ký tài khoản.

## Kiểm tra

Bản đầu đã kiểm tra luồng bài học đúng/sai, hoàn thành và làm lại. Sau lần chỉnh font/rút gọn: kiểm tra lại bố cục desktop/mobile, liên kết nội bộ, chi tiết học phần, nút ôn luyện và bài học mẫu. Ảnh xem trước cập nhật nằm trong `review`.


## Máy tính lấy từ MathTutor

Bổ sung góc thực hành máy tính theo yêu cầu. Dùng trực tiếp `calculator-layouts.ts`, bộ xử lý `emulator`, `lcd-renderer` và thông số LCD trong `MathTutor/apps/web/src/features/casio`; chuyển phần hiển thị React thành DOM/canvas trong `src/calculator.ts`. Không sửa file nguồn MathTutor.

Mặt máy fx-580VN X giữ bố cục phím và LCD điểm ảnh, thêm màu Học Lực, phím vàng theo từng bước, ví dụ phần trăm/căn bậc hai/lượng giác. Có thể dùng chuột, chạm hoặc bàn phím khi máy được focus; Tab/Enter vẫn truy cập từng nút. Font và bộ máy được nhúng trong HTML, không cần React hoặc API lúc mở trang.

Sau khi sửa adapter, chạy:

```powershell
node ./src/build-calculator.mjs
./build-standalone.ps1
```

Lệnh build dùng bản rolldown đã có trong MathTutor; không cần cài thêm. Nếu chỉ sửa HTML/CSS, chạy `build-standalone.ps1`.

Đã kiểm tra: giảm giá 80.000 × (1 − 25/100) = 60.000; √144 = 12; sin(30°) = 1/2; bàn phím 7 × 8 = 56; chuột 9 + 1 = 10; AC/đặt lại, hướng dẫn và chuyển sang bấm tự do. Không xác nhận tương đương tuyệt đối với firmware của máy vật lý.

### UI icons
Selected Lucide SVG icons are stored in assets/icons and embedded as inline symbols in index.html. License: assets/icons/LICENSE (also embedded in the standalone HTML). No icon CDN or runtime is required. UI icon changes also cover dynamic quiz, menu and calculator states. Keep mathematical notation and calculator key labels as text.


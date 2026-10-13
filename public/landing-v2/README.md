# Học Lực landing page

HTML/CSS/JavaScript thuần. Mở `hocluc-standalone.html` trực tiếp, không cần cài thư viện; hình ảnh, font, logo và favicon đều được nhúng trong file. Cần kết nối mạng nếu mở liên kết ClassPad.net.

## Bản nguồn

- `index.html`: chỉnh sửa nội dung, CSS, SVG và JavaScript tại đây; giữ thư mục `assets` bên cạnh.
- `hocluc-standalone.html`: bản đóng gói một file, nhúng ảnh, font, logo và favicon.
- `build-standalone.ps1`: chạy lại sau khi sửa nguồn để cập nhật bản một file.
- Trong ứng dụng Vite: `/` hiển thị trang V2 trong khung cô lập để giữ nguyên CSS và tương tác của bản HTML; `/landing-v2/index.html` vẫn mở trực tiếp bản nguồn.

## Nội dung

Trang chủ hướng học sinh vào một bước tiếp theo rõ ràng: xem 5 nhóm học V-ACT, làm đánh giá đầu vào, xem bài học mẫu và khám phá khóa học. Bài đánh giá miễn phí nhưng yêu cầu đăng nhập. Trang nêu luồng đánh giá 4 bước và chu trình học Học → Luyện → Thực hành → Đánh giá → Củng cố → Đánh giá lại. Cấu trúc đề V-ACT được mô tả riêng với 3 phần và thang điểm tối đa 1.200; 5 nhóm là cách Học Lực tổ chức nội dung học. Giữ đủ 14 học phần trong cửa sổ chi tiết.

Hero dùng ảnh tràn khung với ba cảnh Mai và Nam: làm đề V-ACT, cùng ghi và giải toán trong vở, và nhận gợi ý từ các avatar AI hình mây, sao và robot. Ảnh chuyển cảnh bằng hiệu ứng mờ kèm dịch chuyển nhẹ, tự chạy và tạm dừng khi rê chuột/focus hoặc bật giảm chuyển động. Lớp phủ xanh nhạt làm phần chữ dễ đọc và dải nền phía trên giữ khoảng thoáng cho header. Hình AI đặt Mai và Nam thấp hơn, Nam cầm máy tính khoa học. Đây là hình minh họa thương hiệu, không phải ảnh học viên thật hay giao diện sản phẩm thực tế. Giữ nguyên bốn minh họa hiện có cho Tiếng Việt, Tiếng Anh, Logic và Khoa học; cú chỉ xuất hiện ở hình minh họa môn Toán & Tư duy định lượng. Thumbnail khóa học dùng bộ silhouette luân phiên đều. Mục máy tính liên kết sang ClassPad.net chính thức, không nhúng emulator vào landing.

Các đường silhouette avatar được chuyển thể từ package `bot-avatars` của MathTutor theo giấy phép MIT; giấy phép được lưu tại `assets/bot-avatars-LICENSE.txt`.

## Font tiếng Việt

Dùng Nunito 400, 700, 800, 900 được lưu trong `assets/fonts` từ Google Fonts. Đã kiểm tra các glyph tiếng Việt U+1EA0–U+1EF9 đều có trong cả 4 font. Giấy phép SIL Open Font License ở `assets/fonts/OFL.txt`, cũng được nhúng vào bản standalone. Logo có khoảng cách giữa “Học Lực”; tiêu đề được giữ 2 dòng ở các kích thước điện thoại đã kiểm tra.

## Phạm vi tương tác

Xem học phần, chọn mục tiêu, gợi ý phần học, 3 câu luyện mẫu có chấm điểm/lời giải/làm lại, FAQ dùng details/summary, menu mobile và dialog hỗ trợ bàn phím. Chưa gọi API, chưa lưu tiến độ, không thanh toán hoặc đăng ký tài khoản.

## Kiểm tra

Bản đầu đã kiểm tra luồng bài học đúng/sai, hoàn thành và làm lại. Sau lần chỉnh font/rút gọn: kiểm tra lại bố cục desktop/mobile, liên kết nội bộ, chi tiết học phần, nút ôn luyện và bài học mẫu. Ảnh xem trước cập nhật nằm trong `review`.


Nếu sửa HTML/CSS hoặc tài nguyên hình ảnh, chạy `build-standalone.ps1` để cập nhật bản một file.

### UI icons
Selected Lucide SVG icons are stored in assets/icons and embedded as inline symbols in index.html. License: assets/icons/LICENSE (also embedded in the standalone HTML). No icon CDN or runtime is required. UI icon changes also cover the dynamic quiz and mobile menu.


# Kiểm tra landing page desktop và đề xuất nhóm kiến thức

Ngày: 16/10/2026. Nhánh: `codex-refactor-landingpage`. Preview: http://127.0.0.1:5190/.

Phạm vi: giao diện và tương tác landing desktop hiện tại, bao gồm thay đổi màu logo/nút chưa commit. Mobile tiếp tục tạm hoãn theo yêu cầu. Đây là kiểm tra FE, không đánh giá hay thay đổi BE.

**Cập nhật sau khi người dùng duyệt phương án:** Đã dựng 5 thẻ minh họa + vùng xem trước chung, chuyển ảnh sang WebP, đổi nút sang `#007EB5` với chữ trắng đạt 4,51:1 và tăng độ đậm vòng focus. Chạy lại 9/9 E2E đạt, TypeScript/ESLint/build đạt. Xem [chi tiết triển khai](landing-page-redesign.md). Phần dưới giữ lại kết quả audit trước khi triển khai; nhận xét tương phản 2,44:1 và thiếu ảnh mô tả bản trước.

## Kết luận

Các luồng landing đã kiểm tra hoạt động. Giao diện không bị quá nhiều màu ở lớp CSS: nền trắng pha xanh, chữ navy, xanh thương hiệu và xanh đậm cho chữ. Màu đa dạng chủ yếu nằm trong minh họa hero. Cảm giác cần cải thiện là thiếu hình ảnh ở nhóm kiến thức và nhiều đoạn chữ ở nửa dưới trang.

Chưa thể kết luận toàn bộ landing đạt accessibility: nút chữ trắng trên nền xanh logo hiện không đạt tương phản chữ thông thường. Bộ test hành vi không kiểm tra tiêu chí này.

## Kết quả thực chạy

| Hạng mục | Kết quả |
| --- | --- |
| Playwright landing | 8/8 passed, 17,1 giây |
| Build production | Thành công; còn cảnh báo bundle JS chính khoảng 1,64 MB, gzip 445 KB, thuộc bundle ứng dụng |
| Desktop 1280 / 1440 / 1920 | Bộ E2E kiểm tra không tràn ngang |
| Preview 1440 | Cao khoảng 5.181 CSS px trong trạng thái khóa học tải lỗi; không có ảnh hỏng hoặc anchor nội bộ thiếu đích |
| Khóa học | Loading, empty, error/retry, populated, giá miễn phí/thiếu giá và fallback ảnh đều qua E2E với dữ liệu giả lập |
| Điều hướng | Signup/login, điều hướng SPA và mở tab mới qua E2E |
| Bài học mẫu | Trả lời đúng/sai, giải thích, hoàn thành, làm lại và focus qua E2E |
| 5 nhóm kiến thức | Mở đúng tiêu đề và số học phần 3/3/4/2/2; Escape đóng được cả 5 dialog |
| Gợi ý học tập | Chọn Toán + rèn kỹ năng cho gợi ý Casio; chuyển sang đúng dialog Toán |
| 5 thao tác ôn luyện | Đều mở được dialog và đóng bằng Escape |
| FAQ và mùa thi | Cả 4 FAQ mở/đóng được; nội dung mùa thi mở/đóng được |
| Carousel | Chọn ảnh, tạm dừng/tiếp tục qua E2E |
| Reduced motion | Khi bật, transition thẻ nhóm kiến thức đo được 0 giây |

Lệnh đã chạy: `npx playwright test --config playwright.landing.config.ts`, `npm run build`. Kiểm tra bổ sung bằng Playwright trên preview thật. Không chạy lại TypeScript/ESLint ở lượt này; thay đổi giao diện từ lần commit trước chỉ nằm trong CSS.

Preview thật hiện hiển thị **“Chưa tải được khóa học”**, không phải trạng thái danh sách rỗng. Console ghi nhận hai request khóa học bị connection refused. UI có nút thử lại và lối sang bài học mẫu. Chưa xác nhận được dữ liệu khóa học thật trong phiên này; phần có dữ liệu được kiểm tra bằng fixture, không phải bằng dữ liệu production. Không kiểm tra đăng nhập thực hay hành trình mua/học ngoài landing.

## Nhận xét theo khu vực

| Khu vực | Đánh giá và việc nên làm |
| --- | --- |
| Header / hero | Logo và nền nút đã cùng `#1CB0F6`. CTA, yêu cầu đăng nhập rõ. Ảnh Mai/Nam tạo điểm nhận diện; tránh thêm một loại phong cách ảnh khác vào nhóm kiến thức. |
| Dải thông tin kỳ thi | Gọn, dễ quét; giữ vai trò phụ. Lượt này kiểm tra cách hiển thị, không xác minh lại dữ kiện kỳ thi với nguồn bên ngoài. |
| Bạn muốn bắt đầu từ đâu? | Thẻ chỉ có ký hiệu và tên; khoảng 230 × 141 px ở viewport kiểm tra. Chưa có ảnh, mô tả hoặc xem trước khi hover. Đây là ưu tiên thiết kế chính. |
| Khóa học | Có đầy đủ trạng thái giao diện; trạng thái lỗi hiện tại khiến trang thiếu bằng chứng trực quan về sản phẩm. Cần xem lại với nội dung thật khi có sẵn. |
| Bài học mẫu | Là phần trải nghiệm sản phẩm rõ nhất, nên giữ vị trí và sự nổi bật. |
| Cách học / hỗ trợ | Nội dung và điều kiện sử dụng rõ, nhưng đều thiên về chữ. Nếu bổ sung hình, chỉ nên có một hình hỗ trợ nhỏ cùng phong cách, sau khi hoàn thiện nhóm kiến thức. |
| V-ACT / FAQ | Gọn hơn bản trước; trình bày thông tin tham khảo phù hợp. |
| CTA cuối / footer | Phân cấp rõ, đồng bộ header. Nút chính có vấn đề tương phản như hero. |

## Màu sắc và khả năng đọc

- Màu thương hiệu: `#1CB0F6`; hover: `#15A5E8`; nền xanh nhạt: `#E8F7FE`; chữ xanh đậm: `#006D9F`.
- Nút hiện tại: chữ trắng trên `#1CB0F6` đạt **2,44:1**, hover đạt **2,77:1**. Chữ nút đang 14 px/600, cần 4,5:1 theo WCAG AA. Tăng độ đậm chữ không giải quyết tỷ lệ màu.
- Chữ xanh đậm `#006D9F` trên trắng đạt **5,69:1**.
- Vòng focus dùng màu xanh thương hiệu sáng; nên tăng độ đậm của riêng vòng focus để dễ nhận biết trên nền sáng.
- Ưu tiên gần nhất của người dùng là nền xanh logo + chữ trắng; lượt review này giữ nguyên lựa chọn, ghi nhận đánh đổi thay vì tự đổi màu lần nữa. Phương án nếu cần đạt tương phản: giữ logo nguyên bản và dùng sắc xanh đậm hơn cho nền nút, vẫn thuộc cùng họ màu.
- Không dùng năm màu nền riêng cho năm môn. Các trường `color`/`soft` riêng từng môn còn trong dữ liệu cũ, nhưng `CatalogSection` hiện không dùng chúng; không nên bật lại toàn bộ khi thêm ảnh.

Nguồn đối chiếu: [W3C về tương phản chữ](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Đây là phép đo màu và kiểm tra có phạm vi, không phải chứng nhận WCAG toàn trang.

## Đề xuất cho “Bạn muốn bắt đầu từ đâu?”

### Hướng nên chọn: 5 thẻ minh họa và một vùng xem trước chung

Giữ 5 nhóm ngang hàng trên desktop để người học thấy toàn bộ lựa chọn. Mỗi thẻ có một hình minh họa lớn, tên nhóm và mô tả ngắn luôn nhìn thấy. Tất cả dùng cùng nền sáng, chữ navy, cùng tỷ lệ ảnh và cùng kiểu bo góc.

| Nhóm | Ý tưởng hình | Nội dung xem trước |
| --- | --- | --- |
| Tiếng Việt | Sách mở và nhân vật đọc sách | Đọc hiểu, lập luận, sử dụng tiếng Việt |
| Tiếng Anh | Mai với sách hoặc thẻ từ | Từ vựng trong ngữ cảnh, ngữ pháp, đọc hiểu |
| Toán | Cú giáo viên cùng công thức / máy tính | Kiến thức Toán, định lượng, kỹ năng Casio |
| Logic & Phân tích số liệu | Nam đọc bảng và biểu đồ | Tìm quy luật, kết nối dữ kiện, phân tích số liệu |
| Suy luận Khoa học | Robot cùng dụng cụ thí nghiệm | Đọc dữ liệu, phân tích thí nghiệm, kiểm chứng giả thuyết |

Ưu tiên tài sản có sẵn như star-reading, mai-english, owl-teacher, nam-analysis, robot-science; cần kiểm tra trực quan và chuẩn hóa cả bộ trước khi chọn. Không mặc định rằng cả năm file đã cùng phong cách hoặc đủ nhẹ. Nên xuất WebP đúng kích thước, đặt width/height, lazy-load ảnh dưới màn hình đầu. Mục tiêu ngân sách đề xuất: tối đa khoảng 80 KB/ảnh, tùy chất lượng thực tế.

### Tương tác

1. Mặc định hiển thị đủ ảnh, tên và mô tả ngắn. Vùng xem trước bên dưới dành sẵn khoảng trống và hiển thị một lời hướng dẫn nhẹ.
2. Hover khoảng 120 ms hoặc focus bàn phím vào một thẻ: thẻ có viền xanh, nâng tối đa 4 px; hình zoom tối đa 1,03 lần. Vùng xem trước đổi sang mô tả + ba nội dung chính của nhóm đó.
3. Chuyển nội dung bằng fade/translate nhẹ 180–220 ms. Giữ chiều cao vùng xem trước ổn định, không đẩy phần khóa học lên xuống.
4. Giữ nhóm đang chọn khi chuột di chuyển xuống vùng chi tiết để người dùng đọc và bấm. Không tự đóng trong lúc người dùng vẫn đang đọc.
5. Bấm thẻ hoặc nút “Xem nội dung nhóm” mở chi tiết đầy đủ hiện có. Không tự bật modal chỉ vì rê chuột.
6. Bàn phím truy cập được toàn bộ thông tin. Thiết bị không có hover vẫn truy cập bằng click; việc hoàn thiện bố cục mobile chưa thuộc lượt này.
7. Tắt chuyển động khi người dùng chọn reduced motion. Không thêm rung, lắc, lật 3D hoặc animation chạy liên tục cho cả năm thẻ.

Nếu phần xem trước được triển khai thành lớp nổi che nội dung khác, cần thêm Escape để đóng và tuân thủ điều kiện hoverable/persistent/dismissible. Vùng chi tiết trong luồng trang giúp tránh che nội dung. Tham khảo [W3C về nội dung xuất hiện khi hover/focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).

### Kiểm soát độ dài và màu

Thẻ dự kiến cao khoảng 220–240 px, vùng chi tiết khoảng 120–140 px. Đây là ước tính thiết kế, chưa dựng thử; cần kiểm tra với tiêu đề dài ở 1280 px. Phần này có thể làm trang dài thêm khoảng 200–300 px so với hiện tại.

Màu khác chỉ nằm ở chi tiết minh họa; giữ nền các thẻ giống nhau. Không gán Tiếng Việt cam, Tiếng Anh hồng, Logic tím, Khoa học xanh lá cho toàn bộ bề mặt. Hình ảnh tạo khác biệt nội dung, trạng thái hover dùng xanh thương hiệu chung.

## Thứ tự tiếp theo

1. Dựng nhóm kiến thức theo hướng trên và kiểm tra hover, keyboard, chuyển nội dung ổn định.
2. Xem toàn trang cùng bộ ảnh mới để cân chỉnh độ bão hòa; chưa thêm ảnh cho tất cả các section.
3. Chốt cách xử lý tương phản nút và vòng focus.
4. Đánh giá lại khóa học với dữ liệu thật khi có sẵn; không dùng dữ liệu giả để che trạng thái lỗi trong sản phẩm.

Lượt này đã hoàn tất kiểm tra và đề xuất; chưa triển khai bộ thẻ mới, chưa commit hoặc push các thay đổi màu sau lần commit trước.

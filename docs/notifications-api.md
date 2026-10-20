# Tích hợp thông báo FE

Phạm vi: chuông thông báo của console và Student, dùng chung component/provider mới. Không thay đổi BE, API client chung, router, quiz hoặc quyền hiện có.

| API | Dữ liệu chính |
|---|---|
| `GET /api/v1/notifications?page=0&size=20` | `data.content`, `pageNumber`, `totalPages`, `totalElements` |
| `GET /api/v1/notifications/unread-count` | `data.unread` |
| `PATCH /api/v1/notifications/{id}/read` | Notification DTO với `read: true` |
| `PATCH /api/v1/notifications/read-all` | `data.marked` |

Theo source BE local, mọi tài khoản đã xác thực được lấy thông báo của mình; BE kiểm tra chủ sở hữu khi đánh dấu đã đọc. Không gửi userId hoặc role trong payload để chọn người nhận.

FE lấy số chưa đọc khi mở header, khi cửa sổ nhận focus và khi mở chuông. Danh sách tải khi mở popover hoặc đổi trang, tiêu đề/nội dung xem nhanh tối đa hai dòng. Bấm một thông báo đóng popover và mở dialog chi tiết bằng Modal có sẵn: hiển thị tiêu đề, thời gian, nội dung giữ xuống dòng và vùng cuộn riêng. Nút đóng nằm ngoài vùng cuộn; Escape/nút đóng trả focus về chuông. Thao tác đánh dấu đã đọc vẫn gọi API; nếu lỗi, dialog giữ nội dung và có nút thử lại. Không gọi thêm API chi tiết hoặc tự suy đường dẫn từ entityId. Chưa nối WebSocket, không polling nền.

Chỉ cập nhật trạng thái đã đọc sau response thành công. Lỗi danh sách, số chưa đọc và thao tác ghi được hiển thị riêng; không coi lỗi API là danh sách rỗng. Các request dùng `guardIdentity`; provider bỏ dữ liệu và trạng thái đang mở khi đổi tài khoản/active role. Desktop và mobile console dùng cùng provider.

Kiểm thử tự động: `node node_modules/@playwright/test/cli.js test notifications.spec.ts`. Các bài test dùng API giả lập theo cấu trúc BE, không chứng minh API deploy hoạt động.

Kiểm tra trên BE thật:

1. Đăng nhập tài khoản có thông báo được tạo bởi luồng duyệt khóa hoặc nhắc lịch học, mở chuông và so sánh số chưa đọc với API.
2. Đọc một thông báo, tải lại trang, xác nhận trạng thái đã được lưu.
3. Với trên 20 thông báo, chuyển trang rồi đánh dấu tất cả; kiểm tra cả các trang chưa mở.
4. Đổi role hoặc tài khoản khi popover/dialog chi tiết đang mở; xác nhận nội dung cũ không còn hiển thị.
5. Kiểm tra API lỗi/403, trạng thái rỗng, desktop và mobile. Không gửi token hoặc secret trong báo cáo lỗi.
6. Mở thông báo dài có nhiều đoạn hoặc chuỗi không có khoảng trắng: nội dung cuộn trong dialog, không tràn ngang; nút đóng luôn hiển thị. Mở lại thông báo đã đọc không gửi PATCH lặp lại.

# Giao diện nhiều vai trò

STUDENT luôn độc lập. Các tài khoản nhân sự có thể được cấp Admin, Manager, Staff, Teacher, Mentor; mỗi thời điểm dùng một role.

- Form tạo tài khoản chọn Học sinh/Nhân sự, checkbox vai trò nhân sự và role khởi đầu. Gửi role + roles trong một request.
- Bảng user hiển thị hai badge đầu, +N mở chi tiết bằng bàn phím, dòng riêng ghi role đang dùng. Bộ lọc lấy membership từ BE.
- Chi tiết cho admin chỉnh checkbox nháp và Lưu/Hủy. Role đang dùng bị khóa; muốn gỡ phải chuyển role trước. Lỗi lưu giữ nguyên nháp.
- Menu avatar NextAdmin luôn ghi role hiện tại. Phần Chuyển vai trò chỉ hiện khi có nhiều role, có dấu check và giải thích các phiên khác sẽ kết thúc. Dùng MenuSection items của React Aria để role thực sự render.
- Khi chuyển, guard biểu mẫu chưa lưu chạy trước API; lỗi giữ nguyên khu vực/token và hiển thị alert. Thành công lưu token rồi tải lại roleHome.
- Trang quản lý yêu cầu active role phù hợp. Nếu role được cấp nhưng chưa active, hiển thị thao tác chuyển thay vì mở nội dung không đúng quyền.
- Đăng nhập quản lý cho chọn role phù hợp khi tài khoản đang dùng role ngoài khu vực; không tự coi granted role là active role.

API và rollout: xem ../HocLuc/docs/multi-role-accounts.md trong BE. Frontend vẫn tương thích profile cũ chỉ có role. FE không cấp quyền từ localStorage.

## Icon NextAdmin

Console dùng @tailgrids/icons và các SVG có nguồn từ NextAdmin. Header/sidebar giữ SVG của kit; SVG không đồng nghĩa là icon tự vẽ.

| Icon trước | Xử lý | Ý nghĩa/consumer |
|---|---|---|
| UserRoundMinus (Lucide) | Trash2 / Trash1 Tailgrids | Xóa tài khoản, có aria-label đầy đủ |
| ShieldAlert (Lucide) | AlertTriangle / InfoTriangle Tailgrids | Trạng thái truy cập/lỗi, có tiêu đề mô tả |
| GripVertical (Lucide) | MenuBento1 Tailgrids | Tay nắm kéo câu hỏi, có aria-label |
| Save, UserPlus (Lucide) | Bỏ export không có consumer | Không thay bằng icon gần nghĩa |
| CalendarPlus alias Calendar | Plus Tailgrids | Tạo lịch/thêm ngoại lệ, nút có nhãn hành động |
| FilePlus2 alias FileText | Giữ icon tài liệu | Empty state Quiz/Mock Exams có chữ giải thích; không dùng để xác nhận hay cấp quyền |
| UserCheck alias UserCircle1 | Giữ icon user | Thẻ số lượng tài khoản hoạt động có nhãn trạng thái |

Không còn import Lucide/Iconify trong console/admin/management/teacher và pages quản lý/giáo viên. Các thay đổi đồng thời trong workspace đưa student/public qua adapter console/icons.tsx; adapter vẫn giữ một số glyph chuyên biệt từ Lucide (Calculator, Circle, CircleDot, KeyRound, Pause, QrCode, ShieldAlert, TrendingDown). Đây là fallback phục vụ student/public, không phải consumer quản lý; giữ dependency. Không nhận các thay đổi đồng thời này là phần triển khai đa role. Nguồn tham chiếu local của NextAdmin: %TEMP%/nextadmin-src, các file header/icons.tsx và utils/icon.tsx.

## Checks

`npx tsc -b`, `npm run lint`, `npm run build`. Browser smoke tests dùng fixture API, không thay đổi tài khoản thật; kiểm tra tạo/cấp role, menu desktop/mobile, chuyển dashboard, lỗi 403 và tài khoản một role.

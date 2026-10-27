# Phiên đăng nhập dùng refresh cookie

## Hợp đồng

- Login thường (`audience: LEARNER/CONSOLE`), Google learner/console và switch-role nhận JSON `{ accessToken }`. BE trả cookie `hocluc_refresh`, HttpOnly, Path `/api/v1/auth` qua Set-Cookie. FE không đọc Set-Cookie hoặc document.cookie để lấy token.
- POST `/api/v1/auth/refresh` không có body, dùng `credentials: 'include'`. Trình duyệt nhận cookie mới khi BE rotate; JSON chỉ có access token.
- POST `/api/v1/auth/logout` không có body; gửi cookie và Bearer nếu còn. Không gọi refresh chỉ để logout.
- Các API nghiệp vụ tiếp tục dùng Bearer; không thay quyền, dữ liệu hoặc UI nghiệp vụ. Không gửi credentials đến link storage bên ngoài.
- Access token giữ cách lưu hiện tại. Khóa localStorage refresh token cũ chỉ được xóa, không còn đọc hay ghi giá trị mới. Phiên cũ chưa từng nhận refresh cookie có thể cần đăng nhập lại.

## Đồng bộ và khôi phục

- HTTP, binary download và STOMP tiếp tục dùng chung `ensureFreshAccessToken`, chờ cùng một promise refresh. Giữ retry API tối đa một lần; không refresh khi API nghiệp vụ trả 403.
- Login/Google/switch-role/refresh/logout dùng chung Web Lock theo origin FE. Browser không có Web Locks dùng hàng đợi trong từng tab; chưa bảo đảm serialize giữa các tab trên browser đó.
- Marker generation/revision trong localStorage không chứa credential. Revision cho phép tab đang chờ nhận access token đã được tab khác refresh; generation chặn phản hồi của phiên cũ, kể cả khi đăng nhập lại cùng tài khoản/role.
- Logout xóa access token và chặn khôi phục ngay trước khi chờ lock. Nhờ vậy refresh/login đang chạy không hồi sinh phiên; logout vẫn chờ nhận/xóa cookie phía BE theo thứ tự.
- Nếu logout mất mạng, FE vẫn đăng xuất cục bộ và báo chưa xác nhận logout phía server. Marker ngăn cookie còn sót tự khôi phục ở cùng origin FE. Cookie chỉ được BE xóa, không thể xóa bằng JS.
- Ba guard Student/Management/Purchase dùng `useSessionRestore`: kiểm tra phiên trước redirect, có thể lấy access token từ cookie khi localStorage không còn access token, giữ returnTo của placement/purchase.
- Chỉ route được bảo vệ thử khôi phục; khách không bị refresh lặp ở trang công khai. Cookie bị từ chối dẫn đến login; lỗi mạng, 5xx hoặc response thiếu access token có trạng thái thử lại, không xóa phiên còn có.
- Đổi role/account tiếp tục phát sự kiện auth và storage hiện có để profile, quiz, chat và notifications hủy dữ liệu/response của identity cũ.

## Cấu hình cần kiểm tra trên BE thật

- `npm run dev` mặc định bật Vite proxy `/api/v1` và `/ws/chat` đến `VITE_API_BASE_URL` (hoặc `VITE_API_URL`). API client dùng origin hiện tại, nên browser nhận/gửi refresh cookie trên localhost, không gọi khác site đến domain BE. Không đổi thuộc tính cookie, không rewrite Origin và không tắt kiểm tra chứng chỉ TLS.
- Restart Vite sau khi đổi cấu hình. Đăng nhập lại qua localhost để nhận cookie tại origin mới; cookie cũ ở domain BE không tự chuyển sang localhost. Dùng `localhost` nhất quán, không đổi sang `127.0.0.1` nếu BE chưa cho phép Origin đó.
- BE vẫn phải cho phép đúng Origin FE. Cookie hiện tại của BE không có Domain; nếu sau này BE thêm Domain riêng, cần kiểm tra lại proxy. Secure cookie vẫn phụ thuộc hỗ trợ localhost của browser; không tắt Secure để né lỗi.
- `VITE_DEV_API_PROXY=false` tắt proxy để kiểm tra gọi BE trực tiếp (fixture E2E dùng chế độ này). Build production và preview không bật proxy này; triển khai thật cần cấu hình cookie/domain hoặc reverse proxy phù hợp.

- `APP_CORS_ALLOWED_ORIGINS`: origin FE đầy đủ, không dùng wildcard khi credentials bật.
- `APP_AUTH_REFRESH_COOKIE_SAME_SITE`, `APP_AUTH_REFRESH_COOKIE_SECURE`: phải phù hợp cách truy cập FE–BE. Localhost gọi domain HTTPS khác site cần kiểm tra SameSite, Secure và chính sách cookie của trình duyệt; `credentials: include` không tự vượt các giới hạn đó.
- FE không tự sửa thuộc tính cookie hoặc cấu hình BE. Không nới CORS hay dùng token JS làm phương án thay cookie.

## Xác minh

`node --test tests/config/auth-proxy.test.mjs` chạy Chrome qua Vite và HTTP upstream giả lập thật, không intercept API: xác nhận cookie Secure/HttpOnly/Lax trên localhost, Origin giữ nguyên, refresh/rotation, lỗi 503, logout, WebSocket và build/preview không bật proxy. Đây không phải kiểm thử đăng nhập trên BE triển khai.

`tests/e2e/auth-cookie.spec.ts` dùng response access-only và cookie HttpOnly do trình duyệt quản lý; kiểm tra login/Google, F5, cookie-only restore, 401/403, lỗi mạng/5xx/response sai, concurrent HTTP/blob/socket, role switch, logout online/offline, hai tab và response cũ.

Fixture không chứng minh cấu hình domain/CORS/SameSite/Secure hoặc Google provider trên môi trường thật. Kiểm tra thực tế trong DevTools bằng trạng thái Set-Cookie/cookie bị chặn, không sao chép giá trị token vào log/báo cáo.

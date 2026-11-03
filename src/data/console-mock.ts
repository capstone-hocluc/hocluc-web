// Dữ liệu mẫu cho các màn hình vai trò chưa có API. Thay bằng dữ liệu thật khi backend sẵn sàng.

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const AUDIT_LOG = [
  { id: 'lg-01', time: '10/10/2026 08:42', actor: 'Admin User', role: 'Quản trị viên', action: 'Cấp vai trò Mentor', target: 'long.nguyen@hocluc.local' },
  { id: 'lg-02', time: '10/10/2026 08:15', actor: 'Staff User', role: 'Nhân viên', action: 'Duyệt câu hỏi', target: 'Q-2041' },
  { id: 'lg-03', time: '09/10/2026 17:30', actor: 'Admin User', role: 'Quản trị viên', action: 'Cập nhật blueprint', target: 'V-ACT đầy đủ v2.1' },
  { id: 'lg-04', time: '09/10/2026 16:05', actor: 'Teacher User', role: 'Giáo viên', action: 'Xuất bản quiz', target: 'Hàm số bậc hai - Bài 06' },
  { id: 'lg-05', time: '09/10/2026 10:12', actor: 'Admin User', role: 'Quản trị viên', action: 'Khóa tài khoản', target: 'wynnhu13@gmail.com' },
  { id: 'lg-06', time: '08/10/2026 14:48', actor: 'Staff User', role: 'Nhân viên', action: 'Ghi danh thủ công', target: 'Như Nguyễn · ĐGNL 12A' },
]

export const MENTOR_STUDENTS = [
  { id: 'st-01', name: 'Quỳnh Như', group: 'Nhóm A1', progress: 82, lastScore: 8.5, weakness: 'Hàm số bậc hai', lastActive: 'Hôm nay' },
  { id: 'st-02', name: 'Minh Khang', group: 'Nhóm A1', progress: 68, lastScore: 7.0, weakness: 'Xác suất', lastActive: 'Hôm nay' },
  { id: 'st-03', name: 'Gia Hân', group: 'Nhóm A2', progress: 77, lastScore: 9.0, weakness: 'Hình học không gian', lastActive: 'Hôm qua' },
  { id: 'st-04', name: 'Đức Anh', group: 'Nhóm B1', progress: 40, lastScore: 5.5, weakness: 'Phương trình mũ', lastActive: '3 ngày trước' },
  { id: 'st-05', name: 'Thu Hà', group: 'Nhóm C1', progress: 51, lastScore: 6.5, weakness: 'Tư duy logic', lastActive: 'Hôm qua' },
]

export const SOLUTION_QUEUE = [
  { id: 'sl-01', question: 'Chứng minh bất đẳng thức Cauchy cho 3 số dương', domain: 'Đại số', student: 'Minh Khang', confidence: 'Thấp', submittedAt: '10/10/2026 09:30', status: 'PENDING' as ReviewStatus },
  { id: 'sl-02', question: 'Tính góc giữa hai mặt phẳng (SAB) và (ABCD)', domain: 'Hình học không gian', student: 'Gia Hân', confidence: 'Trung bình', submittedAt: '10/10/2026 08:55', status: 'PENDING' as ReviewStatus },
  { id: 'sl-03', question: 'Số nghiệm của phương trình lượng giác trên [0, 2π]', domain: 'Hàm số và đồ thị', student: 'Đức Anh', confidence: 'Cao', submittedAt: '09/10/2026 21:20', status: 'APPROVED' as ReviewStatus },
  { id: 'sl-04', question: 'Xác suất có điều kiện trong bài toán túi bi', domain: 'Xác suất - Thống kê', student: 'Thu Hà', confidence: 'Thấp', submittedAt: '09/10/2026 19:02', status: 'REJECTED' as ReviewStatus },
]

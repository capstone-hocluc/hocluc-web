// Dữ liệu mẫu cho các màn hình vai trò chưa có API. Thay bằng dữ liệu thật khi backend sẵn sàng.

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const BLUEPRINTS = [
  { id: 'bp-01', name: 'V-ACT đầy đủ', type: 'Thi thử', questions: 120, minutes: 150, version: 'v2.1', status: 'Đang dùng' },
  { id: 'bp-02', name: 'Tư duy định lượng', type: 'Theo phần', questions: 50, minutes: 60, version: 'v1.4', status: 'Đang dùng' },
  { id: 'bp-03', name: 'Tư duy khoa học', type: 'Theo phần', questions: 50, minutes: 60, version: 'v1.2', status: 'Đang dùng' },
  { id: 'bp-04', name: 'Test đầu vào', type: 'Placement', questions: 120, minutes: 120, version: 'v1.0', status: 'Đang dùng' },
  { id: 'bp-05', name: 'Luyện chùm theo kỹ năng', type: 'Luyện tập', questions: 20, minutes: 30, version: 'v0.3', status: 'Nháp' },
]

export const TAXONOMY = [
  { id: 'dm-01', domain: 'Đại số', questionTypes: 18, skills: 22, questions: 640, version: 'v2.0' },
  { id: 'dm-02', domain: 'Hình học không gian', questionTypes: 12, skills: 14, questions: 380, version: 'v2.0' },
  { id: 'dm-03', domain: 'Xác suất - Thống kê', questionTypes: 9, skills: 11, questions: 270, version: 'v2.0' },
  { id: 'dm-04', domain: 'Hàm số và đồ thị', questionTypes: 14, skills: 16, questions: 410, version: 'v2.0' },
  { id: 'dm-05', domain: 'Tư duy logic', questionTypes: 11, skills: 13, questions: 300, version: 'v2.0' },
  { id: 'dm-06', domain: 'Khoa học tự nhiên', questionTypes: 16, skills: 19, questions: 520, version: 'v2.0' },
]

export const AUDIT_LOG = [
  { id: 'lg-01', time: '10/10/2026 08:42', actor: 'Admin User', role: 'Quản trị viên', action: 'Cấp vai trò Mentor', target: 'long.nguyen@hocluc.local' },
  { id: 'lg-02', time: '10/10/2026 08:15', actor: 'Staff User', role: 'Nhân viên', action: 'Duyệt câu hỏi', target: 'Q-2041' },
  { id: 'lg-03', time: '09/10/2026 17:30', actor: 'Admin User', role: 'Quản trị viên', action: 'Cập nhật blueprint', target: 'V-ACT đầy đủ v2.1' },
  { id: 'lg-04', time: '09/10/2026 16:05', actor: 'Teacher User', role: 'Giáo viên', action: 'Xuất bản quiz', target: 'Hàm số bậc hai - Bài 06' },
  { id: 'lg-05', time: '09/10/2026 10:12', actor: 'Admin User', role: 'Quản trị viên', action: 'Khóa tài khoản', target: 'wynnhu13@gmail.com' },
  { id: 'lg-06', time: '08/10/2026 14:48', actor: 'Staff User', role: 'Nhân viên', action: 'Ghi danh thủ công', target: 'Như Nguyễn · ĐGNL 12A' },
]

export const ORDERS = [
  { id: 'DH-10231', student: 'Quỳnh Như', course: 'ĐGNL 12A · K24', amount: 3200000, status: 'Đã thanh toán', createdAt: '10/10/2026' },
  { id: 'DH-10230', student: 'Bảo Châu', course: 'Tư duy định lượng', amount: 1800000, status: 'Chờ thanh toán', createdAt: '10/10/2026' },
  { id: 'DH-10229', student: 'Minh Khang', course: 'ĐGNL 12B · K24', amount: 3200000, status: 'Đã thanh toán', createdAt: '09/10/2026' },
  { id: 'DH-10228', student: 'Gia Hân', course: 'Nền tảng toán học', amount: 2400000, status: 'Đã hủy', createdAt: '09/10/2026' },
  { id: 'DH-10227', student: 'Đức Anh', course: 'ĐGNL 11A · K25', amount: 2900000, status: 'Đã thanh toán', createdAt: '08/10/2026' },
  { id: 'DH-10226', student: 'Thu Hà', course: 'Tư duy định lượng', amount: 1800000, status: 'Chờ thanh toán', createdAt: '08/10/2026' },
]

export const ENROLLMENTS = [
  { id: 'en-01', student: 'Quỳnh Như', course: 'ĐGNL 12A · K24', source: 'Mua online', expiresAt: '30/06/2027', status: 'Còn hạn' },
  { id: 'en-02', student: 'Như Nguyễn', course: 'ĐGNL 12A · K24', source: 'Thủ công', expiresAt: '30/06/2027', status: 'Còn hạn' },
  { id: 'en-03', student: 'Minh Khang', course: 'ĐGNL 12B · K24', source: 'Mua online', expiresAt: '30/06/2027', status: 'Còn hạn' },
  { id: 'en-04', student: 'Đức Anh', course: 'ĐGNL 11A · K25', source: 'Mua online', expiresAt: '31/12/2026', status: 'Sắp hết hạn' },
  { id: 'en-05', student: 'Lan Phương', course: 'Tư duy định lượng', source: 'Thủ công', expiresAt: '01/09/2026', status: 'Hết hạn' },
]

export const GROUPS = [
  { id: 'gr-01', name: 'Nhóm A1', course: 'ĐGNL 12A · K24', mentor: 'Nam Lê', students: 12, progress: 74 },
  { id: 'gr-02', name: 'Nhóm A2', course: 'ĐGNL 12A · K24', mentor: 'Mai Trần', students: 11, progress: 61 },
  { id: 'gr-03', name: 'Nhóm B1', course: 'ĐGNL 12B · K24', mentor: 'Long Nguyễn', students: 13, progress: 55 },
  { id: 'gr-04', name: 'Nhóm C1', course: 'ĐGNL 11A · K25', mentor: 'Nam Lê', students: 10, progress: 42 },
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

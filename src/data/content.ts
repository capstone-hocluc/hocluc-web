// Tất cả nội dung của landing page HocLuc.com

const U = (id, w, h) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`

export const navLinks = [{ label: 'Trang chủ', href: '/#top' }]

export const stats = [
  { value: 100, suffix: '%', label: 'Chính xác' },
  { value: 50, suffix: '+', label: 'Tỉnh thành' },
  { value: 2000, suffix: '+', label: 'Thí sinh' },
  { value: 500, suffix: '+', label: 'Đề thi' },
]

export const examCategories = ['Tất cả', 'ĐHQG', 'Sư phạm', 'Bộ Công an', 'V-SAT']

export const exams = [
  {
    id: 'hcm',
    cat: 'ĐHQG',
    rating: '4.9',
    reviews: '(3.240)',
    title: 'Đánh giá năng lực ĐHQG TP.HCM',
    org: 'Ban khảo thí ĐHQG TP.HCM',
    image: '/dgnl-dhqg.jpg',
  },
  {
    id: 'sphcm',
    cat: 'Sư phạm',
    rating: '4.8',
    reviews: '(1.890)',
    title: 'Đánh giá năng lực chuyên biệt ĐH Sư phạm TP.HCM',
    org: 'Ban khảo thí ĐH Sư phạm TP.HCM',
    image: '/dgnl-supham.jpg',
  },
  {
    id: 'ca',
    cat: 'Bộ Công an',
    rating: '4.8',
    reviews: '(3.520)',
    title: 'Đánh giá tuyển sinh Bộ Công an',
    org: 'Ban tuyển sinh Bộ Công an',
    image: '/dgnl-congan.png',
  },
  {
    id: 'vsat',
    cat: 'V-SAT',
    rating: '4.9',
    reviews: '(2.890)',
    title: 'V-SAT – Đánh giá đầu vào đại học trên máy tính',
    org: 'Ban tổ chức V-SAT',
    image: '/dgnl-vsat.png',
  },
]

export const features = [
  {
    title: 'Kết quả tức thì',
    desc: 'Nhận báo cáo điểm mạnh, điểm yếu ngay sau khi hoàn thành bài thi.',
  },
  {
    title: 'Phân tích chuyên sâu',
    desc: 'AI phân tích chi tiết từng kỹ năng theo chuẩn quốc gia và quốc tế.',
  },
  {
    title: 'Truy cập trọn đời',
    desc: 'Lưu trữ lịch sử thi và theo dõi tiến bộ qua mọi giai đoạn học tập.',
  },
  {
    title: 'Cộng đồng hỗ trợ',
    desc: 'Kết nối thí sinh từ Bắc vào Nam, chia sẻ kinh nghiệm và lộ trình ôn luyện.',
  },
]

export const journeySteps = [
  { title: 'Đăng ký', desc: 'Tạo tài khoản miễn phí trên HocLuc.com.' },
  { title: 'Chọn kỳ thi', desc: 'Lựa chọn kỳ thi đánh giá năng lực phù hợp với mục tiêu của bạn.' },
  { title: 'Làm bài đánh giá', desc: 'Hoàn thành bài thi theo chuẩn hóa quốc gia.' },
  { title: 'Nhận báo cáo', desc: 'Xem phân tích chi tiết điểm mạnh, điểm yếu.' },
  { title: 'Chứng chỉ năng lực', desc: 'Tải chứng chỉ để ứng tuyển hoặc phát triển bản thân.' },
]

export const subjects = [
  'Toán học',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Ngữ văn',
  'Tiếng Anh',
  'Lịch sử',
  'Địa lý',
]

export const sampleExams = [
  {
    n: '#01',
    name: 'Đề mẫu ĐGNL ĐHQG TP.HCM',
    meta: '120 câu · 150 phút',
    level: 'Cơ bản – Nâng cao',
  },
  { n: '#02', name: 'Đề mẫu Đánh giá tư duy', meta: '100 câu · 150 phút', level: 'Nâng cao' },
  { n: '#03', name: 'Đề mẫu V-SAT tổng hợp', meta: '140 câu · 195 phút', level: 'Toàn diện' },
]

// status: done | doing | todo
export const mindBranches = [
  {
    label: 'Đại số',
    status: 'done',
    leaves: [
      ['Hàm số', 'done'],
      ['Phương trình', 'done'],
    ],
  },
  {
    label: 'Hình học',
    status: 'doing',
    leaves: [
      ['Tọa độ', 'done'],
      ['Vector', 'doing'],
    ],
  },
  {
    label: 'Xác suất',
    status: 'doing',
    leaves: [
      ['Tổ hợp', 'doing'],
      ['Thống kê', 'todo'],
    ],
  },
  {
    label: 'Tư duy',
    status: 'todo',
    leaves: [
      ['Dãy số', 'todo'],
      ['Suy luận', 'todo'],
    ],
  },
]

// [label, learned?, todayHighlight?]
export const streakDays = [
  ['T2', true],
  ['T3', true],
  ['T4', true],
  ['T5', true],
  ['T6', true, true],
  ['T7', false],
  ['CN', false],
]

export const streakRewards = [
  { days: 'Mốc 7 ngày', label: 'Huy hiệu “Chăm chỉ”', state: 'done' },
  { days: 'Mốc 14 ngày', label: '+100 điểm thưởng đổi quà', state: 'current' },
  { days: 'Mốc 30 ngày', label: 'Voucher 1 khóa học miễn phí', state: 'todo' },
  { days: 'Mốc 60 ngày', label: '1 buổi mentor 1·1 miễn phí', state: 'todo' },
]

// price theo tháng (m) và năm (y); on=1 -> có, on=0 -> không
export const plans = [
  {
    name: 'Miễn phí',
    desc: 'Làm quen với đánh giá năng lực.',
    m: 0,
    y: 0,
    popular: false,
    cta: 'Bắt đầu miễn phí',
    feats: [
      ['Video tự học cơ bản', 1],
      ['Đề thi mẫu (giới hạn)', 1],
      ['Chatbot AI cơ bản', 1],
      ['Livestream trực tiếp', 0],
      ['Chấm bài OCR', 0],
      ['Mentor 1·1', 0],
    ],
  },
  {
    name: 'Học viên',
    desc: 'Trọn bộ công cụ ôn luyện cho thí sinh.',
    m: 199000,
    y: 1990000,
    popular: true,
    cta: 'Chọn gói Học viên',
    feats: [
      ['Toàn bộ gói Miễn phí', 1],
      ['Livestream trực tiếp', 1],
      ['Chấm bài OCR không giới hạn', 1],
      ['Ôn tập theo môn đầy đủ', 1],
      ['Đề thi mẫu không giới hạn', 1],
      ['Mentor nhóm', 1],
    ],
  },
  {
    name: 'Toàn diện',
    desc: 'Kèm 1·1 và lộ trình cá nhân hóa.',
    m: 399000,
    y: 3990000,
    popular: false,
    cta: 'Chọn gói Toàn diện',
    feats: [
      ['Toàn bộ gói Học viên', 1],
      ['Mentor 1·1 hằng tuần', 1],
      ['Lộ trình cá nhân hóa AI', 1],
      ['Chatbot AI nâng cao', 1],
      ['Ưu tiên hỗ trợ 24/7', 1],
      ['Chứng chỉ hoàn thành', 1],
    ],
  },
]

export const experts = [
  { id: 'e1', name: 'PGS.TS Nguyễn Văn A', role: 'Ban khảo thí ĐHQG HN' },
  { id: 'e2', name: 'TS Trần Thị B', role: 'Chuyên gia đánh giá năng lực' },
  { id: 'e3', name: 'ThS Lê Minh C', role: 'Cố vấn giáo dục' },
  { id: 'e4', name: 'TS Phạm Thu D', role: 'Nghiên cứu đánh giá' },
  { id: 'e5', name: 'ThS Võ Anh E', role: 'Huấn luyện thí sinh' },
]

export const partners = ['ĐHQG TP.HCM', 'Sư Phạm TP.HCM', 'Bộ Công An', 'V-SAT']

export const testimonials = [
  {
    id: 't1',
    quote:
      'Nền tảng giúp mình hiểu rõ điểm mạnh yếu trước kỳ thi đánh giá năng lực, kết quả cải thiện rõ rệt chỉ sau 4 tuần.',
    name: 'Nguyễn Minh Anh',
    loc: 'Hà Nội',
  },
  {
    id: 't2',
    quote:
      'Báo cáo phân tích rất chi tiết, mình biết cần tập trung vào phần nào để tăng điểm nhanh nhất.',
    name: 'Trần Hoàng Long',
    loc: 'TP. Hồ Chí Minh',
  },
  {
    id: 't3',
    quote:
      'Đề thi đa dạng, bám sát chuẩn đánh giá năng lực của các trường đại học lớn tại Việt Nam.',
    name: 'Lê Thị Mai',
    loc: 'Đà Nẵng',
  },
]

export const faqs = [
  {
    question: 'Kỳ thi đánh giá năng lực là gì và ai nên tham gia?',
    answer:
      'Đây là bài thi chuẩn hóa đo lường tư duy, kiến thức và kỹ năng nền tảng. Phù hợp với học sinh THPT muốn xét tuyển đại học, cũng như người đi làm muốn đánh giá năng lực bản thân.',
  },
  {
    question: 'Nền tảng có hỗ trợ thí sinh ở mọi miền Việt Nam không?',
    answer:
      'Có. Hệ thống hoạt động trực tuyến 24/7, hỗ trợ thí sinh từ 63 tỉnh thành với đề thi và nội dung được cập nhật theo từng vùng miền và lĩnh vực.',
  },
  {
    question: 'Kết quả đánh giá có được công nhận không?',
    answer:
      'Đề thi được xây dựng bám sát chuẩn của các trường đại học lớn. Kết quả giúp bạn tự đánh giá và làm quen với cấu trúc kỳ thi chính thức của các đơn vị tổ chức.',
  },
  {
    question: 'Làm thế nào để theo dõi tiến bộ theo thời gian?',
    answer:
      'Mỗi tài khoản có bảng điều khiển cá nhân lưu lịch sử làm bài, biểu đồ điểm số theo từng kỹ năng và gợi ý cải thiện sau mỗi lần thi.',
  },
  {
    question: 'Có hỗ trợ tư vấn lộ trình ôn luyện cá nhân hóa không?',
    answer:
      'Có. Dựa trên kết quả bài đánh giá, hệ thống đề xuất lộ trình ôn luyện riêng và bạn có thể kết nối với chuyên gia để được tư vấn chi tiết.',
  },
]

export const footerCols = [
  { title: 'Về chúng tôi', items: ['Giới thiệu', 'Tin tức', 'Tuyển dụng', 'Liên hệ'] },
  {
    title: 'Dịch vụ',
    items: ['Kỳ thi đánh giá năng lực', 'Chứng chỉ', 'Tư vấn lộ trình', 'Doanh nghiệp'],
  },
  { title: 'Hỗ trợ', items: ['Trung tâm trợ giúp', 'Chính sách', 'Điều khoản', 'Bảo mật'] },
]

// ảnh dùng trong các section
export const media = {
  hero: '/owl-welcome-wave.png',
  feature: '/features-group.jpg',
  live: '/live-stream.jpg',
  video: U('1610484826967-09c5720778c7', 800, 600),
  ocr: U('1606326608606-aa0b62935f2b', 700, 700),
  mentorSession: '/mentor-session.jpg',
}

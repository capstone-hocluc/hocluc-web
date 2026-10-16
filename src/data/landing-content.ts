// Content of the public landing page. Image fields are plain URL strings so the bundled
// artwork can later be replaced by uploaded images without touching the components.

export type LandingIconName =
  | 'arrow-right'
  | 'arrow-up-right'
  | 'book-open'
  | 'calculator'
  | 'chart-column-increasing'
  | 'check'
  | 'flask-conical'
  | 'languages'
  | 'menu'
  | 'rotate-ccw'
  | 'x'

export interface LandingLink {
  label: string
  href: string
}

export interface HeroSlide {
  id: string
  src: string
  alt: string
  /** Short description announced by screen readers, e.g. "Mai và Nam làm đề luyện V-ACT". */
  label: string
}

export interface LandingHero {
  titleLines: [string, string]
  description: string
  primaryCta: string
  secondaryCta: string
  slides: HeroSlide[]
}

export interface ExamPart {
  id: string
  title: string
  detail?: string
  questions: number
  maxScore: number
  icon: LandingIconName
  tone: string
  soft: string
}

export interface ExamIntro {
  eyebrow: string
  title: string
  summary: string
  sheetCaption: string
  structureTitle: string
  parts: ExamPart[]
  totalQuestions: number
  totalScore: string
  scoringNote: string
  seasonTitle: string
  season: { title: string; text: string }[]
  source: { label: string; href: string; updatedAt: string; note: string }
}

export interface CourseModule {
  code: string
  title: string
  level: string
  hours: number
  summary: string
}

export type DomainArt =
  | { kind: 'sprite'; symbol: string }
  | { kind: 'image'; src: string; alt: string; width: number; height: number }

export interface Domain {
  id: string
  title: string
  part: string
  questions: number
  hours: number
  color: string
  soft: string
  art: DomainArt
  label: string
  labelFontSize?: number
  doodle: { icon: LandingIconName; text: string }
  desc: string
  modules: CourseModule[]
}

export interface PracticeOperation {
  id: string
  label: string
  tagline: string
  hours: number
  title: string
  summary: string
}

export interface SampleQuestion {
  group: string
  title: string
  context: string
  answers: string[]
  correct: number
  explain: string
}

export const landingNav: LandingLink[] = [
  { label: 'Khóa học', href: '#khoa-hoc' },
  { label: 'Chương trình học', href: '#chuong-trinh' },
  { label: 'Cách học', href: '#lo-trinh' },
  { label: 'Bài học mẫu', href: '#hoc-thu' },
  { label: 'V-ACT', href: '#ky-thi' },
]

export const landingFooterNav: LandingLink[] = [
  { label: 'Khóa học', href: '#khoa-hoc' },
  { label: 'Chương trình học', href: '#chuong-trinh' },
  { label: 'Cách học', href: '#lo-trinh' },
  { label: 'Bài học mẫu', href: '#hoc-thu' },
  { label: 'Tìm hiểu V-ACT', href: '#ky-thi' },
  { label: 'Hỗ trợ', href: '#faq' },
]

const landingAssets = '/landing-v2/assets'

export const landingHero: LandingHero = {
  titleLines: ['Ôn đúng trọng tâm.', 'Vững bước vào V-ACT.'],
  description: 'Tìm phần cần học tiếp theo, luyện đúng trọng tâm.',
  primaryCta: 'Làm đánh giá miễn phí',
  secondaryCta: 'Xem khóa học',
  slides: [
    {
      id: 'hero-slide-0',
      src: `${landingAssets}/hero-vact-exam.webp`,
      alt: 'Mai và Nam tập trung làm đề V-ACT với máy tính khoa học',
      label: 'Mai và Nam làm đề luyện V-ACT',
    },
    {
      id: 'hero-slide-1',
      src: `${landingAssets}/hero-mai-nam-learning.webp`,
      alt: 'Mai ghi phép tính vào vở, Nam cùng xem và giải thích',
      label: 'Mai ghi bài và Nam cùng giải toán',
    },
    {
      id: 'hero-slide-2',
      src: `${landingAssets}/hero-mai-nam-ai.webp`,
      alt: 'Mai và Nam chạy theo avatar AI hình mây, sao và robot; Nam cầm máy tính khoa học',
      label: 'Avatar AI hình mây, sao và robot đồng hành cùng Mai và Nam',
    },
  ],
}

export const examIntro: ExamIntro = {
  eyebrow: 'Kỳ thi ĐGNL ĐHQG-HCM',
  title: 'Kỳ thi Đánh giá năng lực V-ACT là gì?',
  summary:
    'Đánh giá năng lực (ĐGNL) là tên gọi chung của các kỳ thi tuyển sinh sớm do đại học tổ chức. V-ACT là kỳ thi ĐGNL của Đại học Quốc gia TP.HCM: bài thi trắc nghiệm trên giấy, đo năng lực cốt lõi cần cho việc học đại học và được hơn 100 trường đại học, cao đẳng dùng để xét tuyển.',
  sheetCaption: 'Minh họa phiếu trả lời trắc nghiệm',
  structureTitle: 'Cấu trúc đề thi',
  parts: [
    {
      id: 'language',
      title: 'Sử dụng ngôn ngữ',
      detail: 'Tiếng Việt 30 câu · Tiếng Anh 30 câu',
      questions: 60,
      maxScore: 600,
      icon: 'languages',
      tone: '#b94266',
      soft: '#fceaf0',
    },
    {
      id: 'math',
      title: 'Toán học',
      questions: 30,
      maxScore: 300,
      icon: 'calculator',
      tone: '#087dbd',
      soft: '#e7f5ff',
    },
    {
      id: 'science',
      title: 'Tư duy khoa học',
      detail: 'Logic, phân tích số liệu 12 câu · Suy luận khoa học 18 câu',
      questions: 30,
      maxScore: 300,
      icon: 'flask-conical',
      tone: '#7652bf',
      soft: '#f0ebff',
    },
  ],
  totalQuestions: 120,
  totalScore: '1.200',
  scoringNote:
    'Điểm được tính theo lý thuyết ứng đáp câu hỏi (IRT): mỗi câu có trọng số khác nhau tùy độ khó.',
  seasonTitle: 'Một mùa thi diễn ra thế nào?',
  season: [
    { title: 'Đăng ký', text: 'Đăng ký và đóng lệ phí trực tuyến.' },
    { title: 'Dự thi', text: 'Mỗi năm thường có 2 đợt thi.' },
    { title: 'Nhận kết quả', text: 'Điểm công bố trực tuyến.' },
    { title: 'Xét tuyển', text: 'Nộp điểm cho trường bạn chọn.' },
  ],
  source: {
    label: 'Trung tâm Khảo thí ĐHQG-HCM',
    href: 'https://cetqa.vnuhcm.edu.vn/danh-gia-nang-luc',
    updatedAt: '14/10/2026',
    note: 'Lịch thi và lệ phí xem thông báo mới nhất của ĐHQG-HCM.',
  },
}

export const catalogHeading = {
  title: 'Học đủ 5 nhóm kiến thức V-ACT.',
  text: 'Chọn nhóm bạn muốn học. Khám phá nội dung từ nền tảng đến luyện tập.',
}

export const domains: Domain[] = [
  {
    id: 'tieng-viet',
    title: 'Tiếng Việt',
    part: 'Phần 1A',
    questions: 30,
    hours: 42,
    color: '#a85a17',
    soft: '#fff1dc',
    art: { kind: 'sprite', symbol: 'star' },
    label: 'Ă a',
    doodle: { icon: 'book-open', text: 'Đọc hiểu' },
    desc: 'Đọc sâu, hiểu đúng. Làm chủ ngôn ngữ và tìm ra điều văn bản thực sự muốn nói.',
    modules: [
      {
        code: 'TV01',
        title: 'Nền tảng Sử dụng Tiếng Việt',
        level: 'Cơ bản',
        hours: 14,
        summary:
          'Chính tả, chuẩn dùng từ, từ vựng và ngữ nghĩa, ngữ pháp, cấu trúc câu, phong cách, biện pháp tu từ, liên kết câu và đoạn.',
      },
      {
        code: 'TV02',
        title: 'Đọc hiểu & Lập luận văn bản',
        level: 'Kỹ năng',
        hours: 16,
        summary:
          'Đọc văn học, nghị luận và văn bản thông tin; ý chính, chi tiết, quy chiếu, suy luận, thái độ, giọng điệu và bằng chứng.',
      },
      {
        code: 'TV03',
        title: 'Luyện Tiếng Việt theo chuẩn V-ACT',
        level: 'Tích hợp',
        hours: 12,
        summary:
          'Dạng câu hỏi hỗn hợp, chùm câu theo văn bản, luyện có thời gian, chiến thuật loại trừ và ôn lỗi theo kỹ năng.',
      },
    ],
  },
  {
    id: 'tieng-anh',
    title: 'Tiếng Anh',
    part: 'Phần 1B',
    questions: 30,
    hours: 46,
    color: '#b94266',
    soft: '#fceaf0',
    art: { kind: 'sprite', symbol: 'mai-english' },
    label: 'Hello!',
    doodle: { icon: 'languages', text: 'Ngôn ngữ' },
    desc: 'Từ vựng trong ngữ cảnh, ngữ pháp dễ hiểu. Từng bước đọc nhanh và suy luận tốt hơn.',
    modules: [
      {
        code: 'EN01',
        title: 'Nền tảng Ngôn ngữ Tiếng Anh',
        level: 'Cơ bản',
        hours: 18,
        summary:
          'Grammar, vocabulary, collocation, phrasal verbs, tìm lỗi, biến đổi câu và sử dụng ngôn ngữ trong ngữ cảnh.',
      },
      {
        code: 'EN02',
        title: 'Cloze & Reading Skills',
        level: 'Kỹ năng',
        hours: 16,
        summary:
          'Điền khuyết, ý chính, chi tiết, quy chiếu, từ vựng trong ngữ cảnh, suy luận, mục đích, mạch logic và tốc độ đọc.',
      },
      {
        code: 'EN03',
        title: 'Luyện Tiếng Anh theo chuẩn V-ACT',
        level: 'Tích hợp',
        hours: 12,
        summary:
          'Ngữ pháp trong ngữ cảnh, cloze sets, reading sets 150–300 từ, luyện hỗn hợp có thời gian và phân tích lỗi theo dạng câu.',
      },
    ],
  },
  {
    id: 'toan',
    title: 'Toán & Tư duy định lượng',
    part: 'Phần 2',
    questions: 30,
    hours: 80,
    color: '#087dbd',
    soft: '#e7f5ff',
    art: {
      kind: 'image',
      src: `${landingAssets}/owl-teacher-teaching.png`,
      alt: 'Cú giảng bài Toán',
      width: 1280,
      height: 1280,
    },
    label: 'x + y',
    doodle: { icon: 'calculator', text: 'Giải bài' },
    desc: 'Hiểu bản chất, tìm cách giải. Kết nối kiến thức Toán, tư duy định lượng và kỹ năng Casio.',
    modules: [
      {
        code: 'MA01',
        title: 'Nền tảng Toán học V-ACT',
        level: 'Cơ bản',
        hours: 36,
        summary:
          'Hàm số, phương trình, bất phương trình, dãy số, đạo hàm, tích phân, hình học, Oxyz, thống kê, xác suất và toán thực tế.',
      },
      {
        code: 'MA02',
        title: 'Casio Problem Solving — Làm chủ máy tính',
        level: 'Kỹ năng',
        hours: 10,
        summary:
          'Equation/Solve, Table, thống kê, kiểm tra nghiệm, thử đáp án, tính nhanh và lựa chọn khi nào nên dùng máy tính.',
      },
      {
        code: 'MA03',
        title: 'Tư duy Định lượng',
        level: 'Kỹ năng',
        hours: 18,
        summary:
          'Tỷ lệ, phần trăm, ước lượng, so sánh định lượng, mô hình hóa, phân tích dữ liệu, tối ưu và loại trừ đáp án.',
      },
      {
        code: 'MA04',
        title: 'Luyện Toán theo chuẩn V-ACT',
        level: 'Tích hợp',
        hours: 16,
        summary:
          'Toán hỗn hợp, toán thực tế, chiến thuật máy tính, suy luận định lượng, bài có thời gian và ôn lỗi theo kiến thức cùng kỹ năng.',
      },
    ],
  },
  {
    id: 'logic',
    title: 'Logic & Phân tích số liệu',
    part: 'Phần 3A',
    questions: 12,
    hours: 44,
    color: '#7652bf',
    soft: '#f0ebff',
    art: { kind: 'sprite', symbol: 'nam-analysis' },
    label: 'Nếu… thì?',
    labelFontSize: 36,
    doodle: { icon: 'chart-column-increasing', text: 'Phân tích' },
    desc: 'Nhìn ra quy luật, kết nối dữ kiện và lập luận chặt chẽ. Mỗi bài toán là một câu đố đáng khám phá.',
    modules: [
      {
        code: 'RM00',
        title: 'Reasoning Mastery — Làm chủ Tư duy & Suy luận',
        level: 'Kỹ năng',
        hours: 32,
        summary:
          'Nền tảng logic, tiền đề và kết luận, điều kiện cần/đủ, giả định, củng cố/phản bác, lỗi lập luận, nhân quả, thứ tự, phân nhóm, ghép cặp và dữ liệu.',
      },
      {
        code: 'RM10',
        title: 'V-ACT Logic & Data Practice',
        level: 'Tích hợp',
        hours: 12,
        summary:
          'Chùm logic và ràng buộc, quy luật, bảng và biểu đồ, điều chắc chắn/có thể/không thể đúng, luyện có thời gian theo định dạng V-ACT.',
      },
    ],
  },
  {
    id: 'khoa-hoc',
    title: 'Suy luận Khoa học',
    part: 'Phần 3B',
    questions: 18,
    hours: 42,
    color: '#27735b',
    soft: '#e8f6ee',
    art: { kind: 'sprite', symbol: 'bot' },
    label: 'Vì sao?',
    doodle: { icon: 'flask-conical', text: 'Khám phá' },
    desc: 'Suy nghĩ như nhà khoa học. Đọc dữ liệu, khám phá thí nghiệm và kiểm chứng giả thuyết bằng bằng chứng.',
    modules: [
      {
        code: 'SR00',
        title: 'Scientific Reasoning — Tư duy & Suy luận Khoa học',
        level: 'Kỹ năng nâng cao',
        hours: 28,
        summary:
          'Đồ thị và bảng, biến độc lập/phụ thuộc/kiểm soát, thiết kế và so sánh thí nghiệm, nội suy/ngoại suy, giả thuyết, bằng chứng, dự đoán và tương quan/nhân quả.',
      },
      {
        code: 'SR10',
        title: 'V-ACT Scientific Reasoning Practice',
        level: 'Tích hợp',
        hours: 14,
        summary:
          'Đoạn đọc khoa học, thí nghiệm, dữ liệu, giả thuyết đối lập, câu hỏi bằng chứng, chùm bài có thời gian và ôn lỗi theo kỹ năng khoa học.',
      },
    ],
  },
]

export const practiceHeading = 'Ôn luyện cùng Học Lực'

export const practiceOperations: PracticeOperation[] = [
  {
    id: 'OR00',
    label: 'Định hướng',
    tagline: 'Trước khi bắt đầu',
    hours: 3,
    title: 'Định hướng & Chiến lược thi V-ACT',
    summary:
      'Làm quen cấu trúc 120 câu/150 phút, phân bổ thời gian, chiến thuật 3 vòng, đánh dấu câu, loại trừ và tô phiếu.',
  },
  {
    id: 'PR00',
    label: 'Luyện tổng hợp',
    tagline: 'Kết nối 5 nhóm học',
    hours: 18,
    title: 'Luyện tập Tổng hợp V-ACT',
    summary:
      'Luyện hỗn hợp, luyện xen kẽ các kỹ năng, chuyển đổi nhanh giữa 5 nhóm câu hỏi và luyện theo từng phần.',
  },
  {
    id: 'ER00',
    label: 'Hiểu lỗi sai',
    tagline: 'Tìm đúng chỗ cần ôn',
    hours: 12,
    title: 'Phân tích lỗi & Khắc phục điểm yếu',
    summary:
      'Phân loại lỗi kiến thức, kỹ năng, thời gian và bất cẩn; liên kết lỗi với bài học, bài luyện và lịch ôn giãn cách.',
  },
  {
    id: 'SP00',
    label: 'Tăng tốc',
    tagline: 'Vững tâm dưới áp lực',
    hours: 10,
    title: 'Tăng tốc & Chiến thuật thời gian',
    summary:
      'Luyện tốc độ, nhận diện câu dễ sa lầy, phân bổ thời gian, ra quyết định dưới áp lực và chọn câu làm trước.',
  },
  {
    id: 'MT00',
    label: 'Thi thử V-ACT',
    tagline: 'Sẵn sàng về đích',
    hours: 30,
    title: 'Thi thử & Mô phỏng V-ACT',
    summary:
      'Đề đầy đủ 120 câu/150 phút, mô phỏng đề giấy, phân tích độ chính xác, tốc độ, điểm theo phần và hồ sơ lỗi.',
  },
]

export const journey = {
  title: 'Bắt đầu từ điều mình cần.',
  accent: 'Đi tiếp bằng lộ trình rõ.',
  text: 'Đánh giá miễn phí giúp bạn nhận ra điểm mạnh, phần cần củng cố và nội dung nên học tiếp.',
  cta: 'Xem gợi ý nhanh',
  steps: [
    {
      title: 'Đặt mục tiêu',
      text: 'Tạo tài khoản học sinh, chọn mục tiêu để bắt đầu.',
    },
    {
      title: 'Hiểu điểm xuất phát',
      text: 'Bài đánh giá miễn phí bao quát các nhóm kiến thức V-ACT.',
    },
    {
      title: 'Chọn phần cần học',
      text: 'Đọc kết quả theo từng phần để hiểu mình nên tập trung vào đâu.',
    },
    {
      title: 'Học và luyện mỗi ngày',
      text: 'Theo dõi bài học, luyện tập và xem lại những phần chưa vững.',
    },
  ],
  avatars: {
    label: 'Mai và Nam học cùng avatar hình khối',
    images: [
      { src: `${landingAssets}/mai-avatar-interaction.png`, alt: 'Mai đang ghi chép' },
      { src: `${landingAssets}/nam-avatar-interaction.png`, alt: 'Nam đang khám phá hình học' },
    ],
  },
}

export const sampleLesson = {
  title: 'Thử một câu. Hiểu thêm một chút.',
  intro: 'Câu luyện mẫu · 3 câu ngắn · có giải thích sau mỗi câu.',
  disclaimer: 'Câu luyện mẫu · không phải bài thi V-ACT đầy đủ',
  featureTitle: 'Hiểu cách làm,',
  featureAccent: 'nhìn ra cách học.',
  features: [
    {
      title: 'Biết câu hỏi thuộc nhóm nào',
      text: 'Nội dung gắn với nhóm kiến thức và kỹ năng cụ thể trong chương trình V-ACT.',
    },
    {
      title: 'Đọc lời giải để hiểu cách làm',
      text: 'Giải thích giúp bạn theo dõi hướng suy luận, không chỉ nhìn đáp án đúng.',
    },
  ],
}

export const sampleQuestions: SampleQuestion[] = [
  {
    group: 'Logic & Phân tích số liệu · Nhận diện quy luật',
    title: 'Số nào tiếp theo trong dãy?',
    context: '2 → 6 → 12 → 20 → ?',
    answers: ['28', '30', '32', '36'],
    correct: 1,
    explain:
      'Hiệu giữa các số lần lượt là 4, 6, 8. Hiệu tiếp theo là 10, nên 20 + 10 = 30. Bạn cũng có thể nhận ra quy luật n × (n + 1).',
  },
  {
    group: 'Toán & Tư duy định lượng · Tỷ lệ phần trăm',
    title: 'Một cuốn sách giá 80.000đ được giảm 25%.',
    context: 'Giá cuốn sách sau khi giảm là bao nhiêu?',
    answers: ['20.000đ', '55.000đ', '60.000đ', '75.000đ'],
    correct: 2,
    explain:
      'Số tiền giảm là 80.000 × 25% = 20.000đ. Giá sau giảm bằng 80.000 − 20.000 = 60.000đ. Chú ý phân biệt số tiền giảm với số tiền phải trả.',
  },
  {
    group: 'Suy luận Khoa học · Kiểm soát biến',
    title: 'Muốn kiểm tra ảnh hưởng của ánh sáng đến cây,',
    context: 'hai nhóm cây nên khác nhau ở yếu tố nào?',
    answers: ['Loại cây', 'Lượng nước', 'Loại đất', 'Lượng ánh sáng'],
    correct: 3,
    explain:
      'Thay đổi lượng ánh sáng và giữ các yếu tố còn lại giống nhau. Ánh sáng là biến độc lập; loại cây, lượng nước và đất cần được kiểm soát để so sánh có ý nghĩa.',
  },
]

export const calculatorLink = {
  label: 'Công cụ học tập · Toán',
  title: 'Muốn luyện thao tác trên fx-580VN X?',
  text: 'Mở trình mô phỏng ClassWiz chính thức của CASIO ở ClassPad.net.',
  cta: 'Mở ClassPad.net',
  href: 'https://classpad.net/intl/',
}

export const faq = {
  title: 'Trước khi bắt đầu',
  text: 'Thông tin ngắn gọn để bạn biết Học Lực phù hợp với bước nào trong hành trình ôn V-ACT.',
  items: [
    {
      question: 'Bài đánh giá đầu vào có mất phí không?',
      answer:
        'Bài đánh giá đầu vào của Học Lực miễn phí. Bạn cần đăng nhập để làm bài và xem lộ trình gợi ý.',
    },
    {
      question: 'Chưa mua khóa học thì có thể xem nội dung nào?',
      answer:
        'Lộ trình có thể gợi ý cả học phần bạn chưa mua. Bạn vẫn xem được danh mục, thông tin chi tiết và bài học mở ở chế độ xem trước; nội dung đầy đủ cần quyền truy cập khóa học.',
    },
    {
      question: 'Kết quả đánh giá có phải điểm thi V-ACT chính thức không?',
      answer:
        'Không. Đây là kết quả đánh giá trên Học Lực để hỗ trợ việc học, không thay thế kết quả kỳ thi V-ACT.',
    },
    {
      question: 'Khóa học có thời hạn và hình thức học thế nào?',
      answer:
        'Thời hạn, nội dung và hình thức học được ghi trong thông tin từng khóa. Bạn nên xem chi tiết trước khi đăng ký.',
    },
  ],
}

export const closingCta = {
  title: 'Tìm bước học tiếp theo của bạn.',
  text: 'Khám phá nhóm kiến thức và khóa học. Bài đánh giá đầu vào miễn phí, cần đăng nhập.',
  primary: 'Làm đánh giá miễn phí',
  secondary: 'Xem khóa học',
}

export const startDialogOptions = {
  domains: [
    { value: 'tieng-viet', label: 'Tiếng Việt' },
    { value: 'tieng-anh', label: 'Tiếng Anh' },
    { value: 'toan', label: 'Toán học & Tư duy định lượng' },
    { value: 'logic', label: 'Logic & Phân tích số liệu' },
    { value: 'khoa-hoc', label: 'Suy luận Khoa học' },
  ],
  defaultDomain: 'toan',
  levels: [
    { value: 'foundation', label: 'Mình muốn xây nền tảng' },
    { value: 'skill', label: 'Mình muốn rèn kỹ năng' },
    { value: 'practice', label: 'Mình muốn luyện tập vận dụng' },
  ],
} as const

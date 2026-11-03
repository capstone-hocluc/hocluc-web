// Content of the public landing page. Image fields are plain URL strings so the bundled
// artwork can later be replaced by uploaded images without touching the components.

export type LandingIconName =
  | 'arrow-right'
  | 'arrow-up-right'
  | 'book-open'
  | 'calculator'
  | 'chevron-down'
  | 'message-circle'
  | 'sparkles'
  | 'chart-column-increasing'
  | 'check'
  | 'flask-conical'
  | 'languages'
  | 'lightbulb'
  | 'log-out'
  | 'package'
  | 'shopping-cart'
  | 'smartphone'
  | 'user-round'
  | 'menu'
  | 'message-square-quote'
  | 'pen-line'
  | 'puzzle'
  | 'rotate-ccw'
  | 'scroll-text'
  | 'split'
  | 'trending-up'
  | 'x'

export interface LandingLink {
  pageHref?: string
  label: string
  href: string
}

export interface HeroSlide {
  id: string
  /**
   * `rise`: a cut-out of students in front of the logo's rising shape (smaller copy: `-720.webp`).
   * `photo`: a photo that fills the right of the hero (smaller copy: `-800.webp`).
   */
  kind: 'rise' | 'photo'
  src: string
  alt: string
  /** Theme of the photograph, also announced by screen readers. */
  label: string
  caption: string
}

export interface LandingHero {
  titleLines: [string, string]
  description: string
  coursesCta: string
  /** Label of every link to the free placement assessment (home, catalog and course pages). */
  assessmentCta: string
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

/** One figure of the exam at a glance: the value is shown large, the label says what it counts. */
export interface ExamFact {
  value: string
  label: string
}

export interface ExamIntro {
  eyebrow: string
  title: string
  summary: string
  sheetCaption: string
  structureTitle: string
  /** Key figures of the paper, each taken from the official ĐHQG-HCM exam page (see `source`). */
  facts: ExamFact[]
  parts: ExamPart[]
  scoringNote: string
  seasonTitle: string
  season: { title: string; text: string }[]
  source: { href: string; updatedAt: string }
}

export interface CourseModule {
  code: string
  title: string
  level: string
  hours: number
  summary: string
}

/** A V-ACT subject with its study modules; the quick suggestion recommends one module. */
export interface Domain {
  id: string
  title: string
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

/** One screen of the HocLuc student app, rendered at 2x from the app's design. */
export interface AppScreen {
  src: string
  alt: string
}

export const landingNav: LandingLink[] = [
  { label: 'Khóa học', href: '#khoa-hoc', pageHref: '/courses' },
  { label: 'Ứng dụng', href: '#ung-dung' },
  { label: 'Cách học', href: '#lo-trinh' },
  { label: 'V-ACT', href: '#ky-thi' },
]

export const landingFooterNav: LandingLink[] = [
  { label: 'Khóa học', href: '#khoa-hoc', pageHref: '/courses' },
  { label: 'Ứng dụng', href: '#ung-dung' },
  { label: 'Cách học', href: '#lo-trinh' },
  { label: 'Tìm hiểu V-ACT', href: '#ky-thi' },
  { label: 'Câu hỏi thường gặp', href: '#faq' },
]

const landingAssets = '/landing-v2/assets'

export const landingHero: LandingHero = {
  titleLines: ['Luyện thi V-ACT', 'theo từng môn.'],
  description: 'Chọn lộ trình trọn gói cho cả bài thi, hoặc học riêng môn bạn còn yếu.',
  coursesCta: 'Xem khóa học',
  assessmentCta: 'Làm bài đánh giá miễn phí',
  slides: [
    {
      id: 'hero-slide-0',
      kind: 'rise',
      src: `${landingAssets}/hero-students-cutout.webp`,
      alt: 'Ba học sinh lớp 12, hai nam sinh áo sơ mi trắng và một nữ sinh áo dài trắng, tươi cười ôm vở và máy tính bảng',
      label: 'Cùng nhau vươn lên',
      caption: 'Học cùng bạn bè, tiến bộ mỗi ngày.',
    },
    {
      id: 'hero-slide-1',
      kind: 'photo',
      src: `${landingAssets}/hero-home-study-v4.webp`,
      alt: 'Nữ sinh tự học buổi sáng bên bàn trắng cạnh cửa sổ, ghi chép vào sổ bên máy tính xách tay',
      label: 'Tự học có định hướng',
      caption: 'Xem bài giảng, ghi chép theo lộ trình.',
    },
    {
      id: 'hero-slide-2',
      kind: 'photo',
      src: `${landingAssets}/hero-classroom-v4.webp`,
      alt: 'Ba học sinh lớp 12, hai nam sinh áo sơ mi trắng và một nữ sinh áo dài trắng, cùng xem bài trong vở ở một lớp học sáng sủa, cửa sổ lớn',
      label: 'Học nhóm, hiểu sâu',
      caption: 'Cùng bạn bè trao đổi cách giải từng bài.',
    },
    {
      id: 'hero-slide-3',
      kind: 'photo',
      src: `${landingAssets}/hero-mock-exam-v4.webp`,
      alt: 'Nữ sinh mặc áo dài trắng tập trung làm bài thi thử trên giấy, phía sau là các dãy bàn trong phòng học sáng sủa',
      label: 'Luyện đề, vững tâm lý',
      caption: 'Làm quen với nhịp thi trên giấy.',
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
  // Verified on 02/11/2026 against the exam pages of the Trung tâm Khảo thí và Đánh giá Chất lượng
  // Đào tạo, ĐHQG-HCM (cetqa.vnuhcm.edu.vn/danh-gia-nang-luc, "Thông tin kỳ thi" and "Câu hỏi thường gặp").
  // Only what those pages state goes here; the sittings are those of 2026 because later years are not
  // announced yet.
  facts: [
    { value: '120', label: 'Câu hỏi trắc nghiệm' },
    { value: '150', label: 'Phút làm bài' },
    { value: '1.200', label: 'Điểm tối đa' },
    { value: 'Trên giấy', label: 'Hình thức thi' },
    { value: '2', label: 'Đợt thi năm 2026' },
    { value: 'Hơn 100', label: 'Trường dùng kết quả để xét tuyển' },
  ],
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
  scoringNote:
    'Điểm tính theo lý thuyết ứng đáp câu hỏi (IRT): mỗi câu có trọng số riêng, tùy theo độ khó.',
  seasonTitle: 'Một mùa thi diễn ra thế nào?',
  season: [
    { title: 'Đăng ký', text: 'Đăng ký và đóng lệ phí trực tuyến.' },
    {
      title: 'Dự thi',
      text: 'Tự in giấy báo dự thi từ tài khoản; khi đi thi, mang theo căn cước hoặc hộ chiếu còn hạn.',
    },
    {
      title: 'Nhận kết quả',
      text: 'Xem điểm và tải giấy chứng nhận kết quả trong tài khoản đăng ký.',
    },
    {
      title: 'Xét tuyển',
      text: 'Dùng kết quả để đăng ký xét tuyển vào trường bạn chọn. Cách xét và thời hạn dùng điểm do từng trường quy định.',
    },
  ],
  source: {
    href: 'https://cetqa.vnuhcm.edu.vn/danh-gia-nang-luc',
    updatedAt: '02/11/2026',
  },
}

export const domains: Domain[] = [
  {
    id: 'tieng-viet',
    title: 'Tiếng Việt',
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
          'Toán hỗn hợp, toán thực tế, chiến thuật máy tính, suy luận định lượng, bài có thời gian và ôn lỗi theo kiến thức và kỹ năng.',
      },
    ],
  },
  {
    id: 'logic',
    title: 'Logic & Phân tích số liệu',
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

export const practiceOperations: PracticeOperation[] = [
  {
    id: 'OR00',
    label: 'Định hướng',
    tagline: 'Trước khi bắt đầu',
    hours: 3,
    title: 'Định hướng & Chiến lược thi V-ACT',
    summary:
      'Làm quen với cấu trúc 120 câu/150 phút, phân bổ thời gian, chiến thuật 3 vòng, đánh dấu câu, loại trừ đáp án và tô phiếu.',
  },
  {
    id: 'PR00',
    label: 'Luyện tổng hợp',
    tagline: 'Kết nối 5 nhóm kiến thức',
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
      text: 'Làm bài đánh giá miễn phí để biết bạn đang ở đâu trong từng phần thi.',
    },
    {
      title: 'Chọn phần cần học',
      text: 'Xem kết quả theo từng phần để biết bạn nên tập trung vào đâu.',
    },
    {
      title: 'Học và luyện mỗi ngày',
      text: 'Học bài, làm bài luyện và ôn lại những phần chưa vững.',
    },
  ],
  avatars: {
    label: 'Mai và Nam học cùng avatar hình khối',
    images: [
      { src: `${landingAssets}/mai-avatar-interaction.webp`, alt: 'Mai đang ghi chép' },
      { src: `${landingAssets}/nam-avatar-interaction.webp`, alt: 'Nam đang khám phá hình học' },
    ],
  },
}

const appScreens = `${landingAssets}/app`

// The HocLuc Android app (com.hocluc.app). The download link always serves the newest APK from the
// app's GitHub releases. The screens are renders of the app's own design and show its example data,
// not a real student's.
export const studentApp = {
  badge: 'Ứng dụng Android',
  title: 'Mở điện thoại là học tiếp',
  text: 'Ứng dụng Hocluc đưa khóa học, lịch học và công cụ giải Toán lên điện thoại của bạn.',
  facts: [
    'Tiếp tục đúng bài đang học dở',
    'Lịch học, bài kiểm tra và thông báo ở cùng một nơi',
    'Máy tính CW-880 dùng được cả khi không có mạng',
  ],
  download: {
    label: 'Tải ứng dụng cho Android',
    href: 'https://github.com/nguyenquocan0101/HocLuc-Releases/releases/latest/download/hocluc.apk',
    note: 'Tệp APK cài trực tiếp trên máy Android. Đăng nhập bằng tài khoản học sinh Hocluc.',
  },
  screens: [
    {
      src: `${appScreens}/app-home.webp`,
      alt: 'Trang chủ ứng dụng Hocluc: học tiếp bài Hàm số bậc ba và cực trị, lịch học hôm nay và công cụ nhanh',
    },
    {
      src: `${appScreens}/app-calculator.webp`,
      alt: 'Máy tính CW-880 trong ứng dụng Hocluc, màn hình hiện 1/2 + 1/3 = 5/6',
    },
  ] satisfies AppScreen[],
}

export const faq = {
  title: 'Trước khi bắt đầu',
  text: 'Thông tin ngắn gọn để bạn biết Hocluc phù hợp với bước nào trong hành trình ôn V-ACT.',
  items: [
    {
      question: 'Bài đánh giá đầu vào có mất phí không?',
      answer:
        'Không. Bài đánh giá đầu vào của Hocluc miễn phí; bạn chỉ cần đăng nhập để làm bài và xem lộ trình gợi ý.',
    },
    {
      question: 'Chưa mua khóa học thì bạn xem được những gì?',
      answer:
        'Bạn vẫn xem được danh mục, thông tin chi tiết và các bài học mở xem trước. Lộ trình gợi ý có thể gồm cả khóa học bạn chưa mua; muốn học toàn bộ nội dung, bạn cần sở hữu khóa học đó.',
    },
    {
      question: 'Kết quả đánh giá có phải điểm thi V-ACT chính thức không?',
      answer:
        'Không. Kết quả này chỉ giúp bạn định hướng việc học trên Hocluc, không thay thế kết quả kỳ thi V-ACT.',
    },
    {
      question: 'Thời hạn và hình thức học của khóa học ra sao?',
      answer:
        'Mỗi khóa ghi rõ thời hạn, nội dung và hình thức học trong trang thông tin. Bạn nên xem kỹ trước khi đăng ký.',
    },
  ],
}

export const closingCta = {
  secondary: 'Xem khóa học',
}

export const startDialogOptions = {
  domains: [
    { value: 'tieng-viet', label: 'Tiếng Việt' },
    { value: 'tieng-anh', label: 'Tiếng Anh' },
    { value: 'toan', label: 'Toán học & Tư duy định lượng' },
    { value: 'logic', label: 'Logic & Phân tích số liệu' },
    { value: 'khoa-hoc', label: 'Suy luận khoa học' },
  ],
  defaultDomain: 'toan',
  levels: [
    { value: 'foundation', label: 'Mình muốn xây nền tảng' },
    { value: 'skill', label: 'Mình muốn rèn kỹ năng' },
    { value: 'practice', label: 'Mình muốn luyện tập vận dụng' },
  ],
} as const


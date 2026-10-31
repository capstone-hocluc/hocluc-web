import type {
  AiAssistantConversation,
  AiExamDraft,
  AiExamOption,
} from '../../services/aiAssistantService'

const now = Date.now()
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString()

const options = (texts: string[], correct: string): AiExamOption[] =>
  texts.map((text, index) => {
    const label = String.fromCharCode(65 + index)
    return { id: label, label, text, correct: label === correct }
  })

// The demo paper and transcript are labelled "Bản xem trước giao diện" on screen.
// Nothing here comes from the model or the API.
export const DEMO_EXAM_DRAFT: AiExamDraft = {
  id: 'demo-exam',
  title: 'Đề thi mới',
  durationMinutes: 150,
  matrix: { id: 'demo-matrix', name: 'Ma trận ĐGNL 2025' },
  parts: [
    {
      id: 'demo-part-vn',
      title: 'Tiếng Việt',
      code: '1.1',
      parentTitle: 'Phần 1. Sử dụng ngôn ngữ',
      targetCount: 30,
    },
    {
      id: 'demo-part-en',
      title: 'Tiếng Anh',
      code: '1.2',
      parentTitle: 'Phần 1. Sử dụng ngôn ngữ',
      targetCount: 30,
    },
    { id: 'demo-part-math', title: 'Phần 2. Toán học', targetCount: 30 },
    {
      id: 'demo-part-problem',
      title: 'Logic, phân tích số liệu',
      code: '3.1',
      parentTitle: 'Phần 3. Tư duy khoa học',
      targetCount: 12,
    },
    {
      id: 'demo-part-science',
      title: 'Suy luận khoa học',
      code: '3.2',
      parentTitle: 'Phần 3. Tư duy khoa học',
      targetCount: 18,
    },
  ],
  groups: [
    {
      id: 'demo-group-vn',
      partId: 'demo-part-vn',
      instruction: 'Đọc đoạn văn sau và trả lời câu hỏi',
      passage:
        'Trong những năm gần đây, nhiều đô thị Việt Nam đang chuyển mình mạnh mẽ. Những con phố cũ được mở rộng, những khu chung cư mọc lên thay cho các dãy nhà thấp. Nhịp sống nhanh hơn, nhưng cũng đặt ra câu hỏi về việc giữ gìn không gian cộng đồng và bản sắc riêng của từng vùng đất.',
    },
  ],
  questions: [
    {
      id: 'demo-q-vn-1',
      partId: 'demo-part-vn',
      groupId: 'demo-group-vn',
      prompt: 'Phương thức biểu đạt chính của đoạn trích là gì?',
      options: options(['Tự sự', 'Nghị luận', 'Miêu tả', 'Biểu cảm'], 'B'),
      explanation: 'Đoạn trích nêu hiện tượng và bàn luận về hệ quả của nó nên phương thức chính là nghị luận.',
      difficulty: 'TB',
      source: 'manual',
      accepted: true,
    },
    {
      id: 'demo-q-vn-2',
      partId: 'demo-part-vn',
      groupId: 'demo-group-vn',
      prompt: 'Từ “chuyển mình” trong đoạn trích nhấn mạnh điều gì?',
      options: options(
        [
          'Sự thay đổi nhanh và toàn diện của đô thị',
          'Việc người dân rời bỏ thành phố',
          'Sự trì trệ của hạ tầng giao thông',
          'Việc xây dựng thêm nhiều công viên',
        ],
        'A'
      ),
      explanation: '“Chuyển mình” gợi sự đổi thay mạnh mẽ về diện mạo và nhịp sống của đô thị.',
      difficulty: 'DE',
      source: 'manual',
      accepted: true,
    },
    {
      id: 'demo-q-1',
      partId: 'demo-part-math',
      groupId: null,
      prompt: String.raw`Hàm số $y=x^3-3x$ đạt cực đại tại điểm nào?`,
      options: options([String.raw`$x=-1$`, String.raw`$x=1$`, String.raw`$x=0$`, String.raw`$x=3$`], 'A'),
      explanation: String.raw`$y'=3x^2-3$; $y'=0$ tại $x=\pm 1$. Khi qua $x=-1$, $y'$ đổi dấu từ $+$ sang $-$ nên $x=-1$ là điểm cực đại.`,
      difficulty: 'TB',
      source: 'ai',
      accepted: false,
    },
    {
      id: 'demo-q-2',
      partId: 'demo-part-math',
      groupId: null,
      prompt: String.raw`Cho hàm số $y=-x^2+4x$. Khẳng định nào đúng?`,
      options: options(
        [
          String.raw`Hàm số đạt cực tiểu tại $x=2$`,
          String.raw`Hàm số đạt cực đại tại $x=2$`,
          'Hàm số không có cực trị',
          String.raw`Hàm số đạt cực đại tại $x=4$`,
        ],
        'B'
      ),
      explanation: String.raw`$y'=-2x+4$ nên $y'=0$ tại $x=2$. Vì $y''=-2<0$, hàm số đạt cực đại tại $x=2$ với $y=4$.`,
      difficulty: 'TB',
      source: 'ai',
      accepted: false,
    },
    {
      id: 'demo-q-3',
      partId: 'demo-part-math',
      groupId: null,
      prompt: String.raw`Cho $f'(x)=(x-1)(x+2)^2$. Hàm số có bao nhiêu điểm cực trị?`,
      options: options(['0', '1', '2', '3'], 'B'),
      explanation: String.raw`$f'(x)$ chỉ đổi dấu khi qua $x=1$; tại $x=-2$ là nghiệm kép nên dấu không đổi. Hàm số có đúng một điểm cực trị.`,
      difficulty: 'KHO',
      source: 'ai',
      accepted: false,
    },
  ],
}

// Hand-written transcript. It is labelled on the screen as a preview and never
// presented as model output; new messages get the "waiting for the backend" reply.
const COMPOSE_STAGES = [
  {
    id: 'stage-explore',
    title: 'Khám phá',
    state: 'done' as const,
    items: [
      { id: 'tool-bank', label: 'Tra ngân hàng câu hỏi', detail: '12 câu khớp chủ đề cực trị', state: 'done' as const },
      { id: 'tool-master', label: 'Tra Master data', detail: 'Môn Toán · mức Thông hiểu', state: 'done' as const },
      { id: 'tool-frame', label: 'Tra khung đề', detail: 'Phần 2 · 3 câu trắc nghiệm', state: 'done' as const },
    ],
  },
  {
    id: 'stage-plan',
    title: 'Lập kế hoạch',
    detail: '3 ô theo ma trận · 3 câu',
    state: 'done' as const,
    items: [
      { id: 'cell-1', label: 'Ô 1', detail: 'Dễ · 1 câu', state: 'done' as const },
      { id: 'cell-2', label: 'Ô 2', detail: 'Thông hiểu · 1 câu', state: 'done' as const },
      { id: 'cell-3', label: 'Ô 3', detail: 'Khó · 1 câu', state: 'done' as const },
    ],
  },
  {
    id: 'stage-write-1',
    title: 'Soạn câu 1/3',
    detail: 'Điểm cực đại từ hàm bậc ba',
    state: 'done' as const,
  },
  {
    id: 'stage-write-2',
    title: 'Soạn câu 2/3',
    detail: 'Đọc hệ số từ parabol',
    state: 'done' as const,
  },
  {
    id: 'stage-write-3',
    title: 'Soạn câu 3/3',
    detail: 'Đếm điểm cực trị từ đạo hàm',
    state: 'done' as const,
  },
  {
    id: 'stage-validate',
    title: 'Kiểm tra & sửa',
    detail: 'Đáp án, công thức và trùng lặp · không có lỗi',
    state: 'done' as const,
  },
]

export const AI_ASSISTANT_DEMO: AiAssistantConversation = {
  id: 'demo-conversation',
  title: 'Cực trị hàm số và bộ câu hỏi mẫu',
  createdAt: minutesAgo(24),
  updatedAt: minutesAgo(2),
  demo: true,
  messages: [
    {
      id: 'demo-user-1',
      role: 'user',
      body: 'Vì sao tại điểm cực trị đạo hàm lại bằng 0? Lấy ví dụ giúp tôi.',
      createdAt: minutesAgo(24),
    },
    {
      id: 'demo-assistant-1',
      role: 'assistant',
      mode: 'ask',
      createdAt: minutesAgo(23),
      trace: [
        'Đọc câu hỏi và xác định chủ đề: cực trị hàm số',
        'Nhắc lại định lý Fermat và quy trình xét dấu đạo hàm',
        'Chọn ví dụ bậc ba có hai điểm tới hạn',
        'Soạn bảng biến thiên và kết luận',
      ],
      body: String.raw`**Định lý Fermat.** Nếu hàm số $f$ đạt cực trị tại $x_0$ và có đạo hàm tại điểm đó thì $f'(x_0)=0$.

Quy trình xét cực trị:

1. Tính $f'(x)$ và tìm các điểm tới hạn.
2. Xét dấu $f'(x)$ trên từng khoảng.
3. Kết luận: dấu đổi từ $+$ sang $-$ là cực đại, từ $-$ sang $+$ là cực tiểu.

Ví dụ với $f(x)=x^3-3x$:

$$f'(x)=3x^2-3=0 \iff x=\pm 1$$

| Khoảng | Dấu $f'(x)$ | Kết luận |
| --- | --- | --- |
| $(-\infty;-1)$ | $+$ | Đồng biến |
| $(-1;1)$ | $-$ | Nghịch biến |
| $(1;+\infty)$ | $+$ | Đồng biến |

Vậy hàm số đạt cực đại tại $x=-1$, $y=2$ và cực tiểu tại $x=1$, $y=-2$.

Lưu ý: $f'(x_0)=0$ chỉ là điều kiện **cần**, không đủ — ví dụ $f(x)=x^3$ có $f'(0)=0$ nhưng không đạt cực trị tại $0$.`,
    },
    {
      id: 'demo-user-2',
      role: 'user',
      body: 'Soạn 3 câu trắc nghiệm về cực trị hàm số, mức thông hiểu. Ưu tiên câu có đạo hàm hoặc bảng biến thiên cho trước.',
      createdAt: minutesAgo(4),
    },
    {
      id: 'demo-assistant-2',
      role: 'assistant',
      mode: 'compose',
      createdAt: minutesAgo(3),
      stages: COMPOSE_STAGES,
      addedQuestionIds: ['demo-q-1', 'demo-q-2', 'demo-q-3'],
      addedPartTitle: 'Phần 2. Toán học',
      body: 'Ba câu trắc nghiệm về cực trị hàm số đã soạn xong. Câu hỏi nằm trên bản đề ở giữa, còn lời giải ở chế độ sửa của từng câu.',
    },
  ],
}

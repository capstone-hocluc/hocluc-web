import type { AiAssistantMode } from '../../../services/aiAssistantService'

interface Suggestion {
  label: string
  prompt: string
}

// Three starters per mode, each one a request the backend can carry out in that mode ("revise" is no mode to pick).
const SUGGESTIONS: Record<Exclude<AiAssistantMode, 'revise'>, Suggestion[]> = {
  ask: [
    {
      label: 'Giải thích vì sao tại điểm cực trị đạo hàm bằng 0',
      prompt: 'Giải thích vì sao tại điểm cực trị đạo hàm lại bằng 0, kèm ví dụ.',
    },
    {
      label: 'Tóm tắt các bước giải phương trình lượng giác',
      prompt: 'Tóm tắt các bước giải phương trình lượng giác cơ bản.',
    },
    {
      label: 'Gợi ý cách dạy tích phân cho học sinh trung bình',
      prompt: 'Gợi ý cách dạy bài tích phân cho học sinh trung bình, kèm ví dụ minh hoạ.',
    },
  ],
  compose: [
    {
      label: 'Soạn 10 câu trắc nghiệm Toán mức trung bình',
      prompt: 'Soạn 10 câu trắc nghiệm Toán mức trung bình, kèm lời giải.',
    },
    {
      label: 'Soạn đề giữa kì gồm trắc nghiệm và tự luận',
      prompt: 'Soạn đề kiểm tra giữa kì gồm phần trắc nghiệm và phần tự luận, kèm đáp án.',
    },
    {
      label: 'Soạn 5 câu vận dụng về hàm số, kèm lời giải chi tiết',
      prompt: 'Soạn 5 câu vận dụng về hàm số, kèm lời giải chi tiết.',
    },
  ],
  'mock-exam': [
    {
      label: 'Tạo đề mô phỏng từ đề mẫu đã chọn',
      prompt: 'Tạo đề mô phỏng từ đề mẫu đã chọn, giữ dạng câu và độ khó của từng câu.',
    },
    {
      label: 'Mô phỏng đề mẫu, đổi số liệu và ngữ cảnh',
      prompt: 'Mô phỏng đề mẫu đã chọn, đổi số liệu và ngữ cảnh của từng câu.',
    },
    {
      label: 'Mô phỏng đề mẫu với ngữ cảnh gần gũi học sinh',
      prompt: 'Mô phỏng đề mẫu đã chọn, dùng ngữ cảnh đời sống gần gũi với học sinh.',
    },
  ],
}

/** Starter cards stacked above the composer; a card fills the composer, it does not send. */
export default function StarterSuggestions({
  mode,
  onPick,
  disabled = false,
}: {
  mode: AiAssistantMode
  onPick: (mode: AiAssistantMode, prompt: string) => void
  disabled?: boolean
}) {
  return (
    <ul aria-label="Gợi ý yêu cầu" className="flex flex-col gap-1.5">
      {(mode === 'revise' ? [] : SUGGESTIONS[mode]).map((suggestion) => (
        <li key={suggestion.label}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(mode, suggestion.prompt)}
            title={suggestion.prompt}
            className="block w-full rounded-xl border border-card-border bg-card-background px-3 py-2.5 text-left text-[13.5px] leading-5 text-text-primary transition-colors hover:border-input-primary-focus-border hover:bg-background-gray-secondary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:pointer-events-none disabled:opacity-50"
          >
            {suggestion.label}
          </button>
        </li>
      ))}
    </ul>
  )
}

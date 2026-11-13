import type { AiAssistantMode } from '../../../services/aiAssistantService'
import { EmptyStateSuggestion, EmptyStateSuggestions } from '../../assistant-ui/elements/empty-state'

interface Suggestion {
  label: string
  prompt: string
}

// A few starters per mode, each one a request the backend can carry out in that mode ("revise" is no mode to pick).
const SUGGESTIONS: Record<Exclude<AiAssistantMode, 'revise'>, Suggestion[]> = {
  ask: [
    {
      label: 'Vì sao đạo hàm bằng 0 tại cực trị?',
      prompt: 'Giải thích vì sao tại điểm cực trị đạo hàm lại bằng 0, kèm ví dụ.',
    },
    {
      label: 'Các bước giải phương trình lượng giác',
      prompt: 'Tóm tắt các bước giải phương trình lượng giác cơ bản.',
    },
    {
      label: 'Cách dạy tích phân cho học sinh trung bình',
      prompt: 'Gợi ý cách dạy bài tích phân cho học sinh trung bình, kèm ví dụ minh hoạ.',
    },
  ],
  // Each request of an exam names its subject and its count: without them the assistant has to ask.
  compose: [
    {
      label: '10 câu trắc nghiệm Toán, mức trung bình',
      prompt: 'Soạn 10 câu trắc nghiệm Toán mức trung bình, kèm lời giải.',
    },
    {
      label: '5 câu vận dụng Toán về hàm số',
      prompt: 'Soạn 5 câu vận dụng môn Toán về hàm số, kèm lời giải chi tiết.',
    },
    {
      label: '8 câu Toán xác suất, mức dễ',
      prompt: 'Soạn 8 câu Toán về xác suất, mức dễ, kèm lời giải.',
    },
  ],
  'mock-exam': [
    {
      label: 'Mô phỏng 10 câu từ đề mẫu',
      prompt: 'Mô phỏng 10 câu Toán từ đề mẫu đã chọn, giữ dạng câu và độ khó của từng câu.',
    },
    {
      label: 'Mô phỏng 5 câu, đổi số liệu',
      prompt: 'Mô phỏng 5 câu Toán từ đề mẫu đã chọn, đổi số liệu và ngữ cảnh của từng câu.',
    },
  ],
}

/** The starters under the greeting of an empty conversation; one fills the composer, it does not send. */
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
    // Keyed by the mode, so the pills come in again when it changes.
    <EmptyStateSuggestions key={mode} aria-label="Gợi ý yêu cầu">
      {(mode === 'revise' ? [] : SUGGESTIONS[mode]).map((suggestion, index) => (
        <EmptyStateSuggestion
          key={suggestion.label}
          index={index}
          disabled={disabled}
          onClick={() => onPick(mode, suggestion.prompt)}
          title={suggestion.prompt}
        >
          {suggestion.label}
        </EmptyStateSuggestion>
      ))}
    </EmptyStateSuggestions>
  )
}

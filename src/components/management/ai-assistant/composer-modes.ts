import type { AiAssistantMode } from '../../../services/aiAssistantService'
import { ClipboardList, FileCheck2, Sparkles, type LucideIcon } from '../../console/icons'

/** The modes the composer's mode menu offers, each with the hint its message box shows. */
export const COMPOSER_MODES: readonly {
  id: AiAssistantMode
  label: string
  description: string
  placeholder: string
  icon: LucideIcon
}[] = [
  {
    id: 'ask',
    label: 'Hỏi đáp',
    description: 'Hỏi kiến thức, bài tập hoặc cách dạy',
    placeholder: 'Hỏi về khái niệm, bài tập hoặc cách dạy…',
    icon: Sparkles,
  },
  {
    id: 'compose',
    label: 'Soạn câu hỏi',
    description: 'Tạo câu hỏi mới theo cấu hình',
    // The subjects come from the request's own words, so the hint shows naming one.
    placeholder: 'Ví dụ: Soạn 10 câu Toán mức trung bình, kèm lời giải…',
    icon: ClipboardList,
  },
  {
    id: 'mock-exam',
    label: 'Mô phỏng đề',
    description: 'Soạn đề mới theo một đề mẫu',
    placeholder: 'Nhập yêu cầu tạo, sửa, giải đề thi…',
    icon: FileCheck2,
  },
]

/** A mode's menu entry; a mode the menu does not list (revising) takes the first. */
export const modeOf = (mode: AiAssistantMode) =>
  COMPOSER_MODES.find((item) => item.id === mode) ?? COMPOSER_MODES[0]

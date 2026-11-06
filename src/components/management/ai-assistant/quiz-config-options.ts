import type { SelectOption } from '../../console/select-field'
import type { AiSolutionStyle } from '../../../services/aiAssistantService'
import { EXAM_FORMATS } from './exam-format'

// The choices of the compose settings, shared by the settings panel and the composer's summary chip. The counts only
// name the count in that summary: the request's own words set it.
export const COMPOSE_COUNTS: SelectOption[] = [
  { id: '5', label: '5 câu' },
  { id: '10', label: '10 câu' },
  { id: '20', label: '20 câu' },
  { id: 'full', label: 'Cả đề' },
]

export const MOCK_COUNTS: SelectOption[] = [
  { id: '5', label: '5 câu' },
  { id: '10', label: '10 câu' },
  { id: '20', label: '20 câu' },
  { id: '40', label: '40 câu' },
  { id: 'full', label: 'Cả đề' },
]

export const REUSE_RATIOS: SelectOption[] = [
  { id: '0', label: 'Không dùng lại' },
  { id: '0.2', label: '20%' },
  { id: '0.4', label: '40%' },
  { id: '0.6', label: '60%' },
  { id: '0.8', label: '80%' },
]

export const SOLUTION_STYLES: { id: AiSolutionStyle; label: string }[] = [
  { id: 'full', label: 'Đầy đủ' },
  { id: 'short', label: 'Gọn' },
]

export const FORMAT_OPTIONS: SelectOption[] = EXAM_FORMATS.map((format) => ({
  id: format.id,
  label: format.label,
}))

import type { SelectOption } from '../../console/select-field'
import type { AiDifficulty } from '../../../services/aiAssistantService'
import { EXAM_FORMATS } from './exam-format'

// The choices of the compose settings, shared by the settings panel and the composer's summary chip.
export const DIFFICULTIES: { id: AiDifficulty; label: string }[] = [
  { id: 'DE', label: 'Dễ' },
  { id: 'TB', label: 'Trung bình' },
  { id: 'KHO', label: 'Khó' },
]

export const COMPOSE_COUNTS: SelectOption[] = [
  { id: '5', label: '5 câu' },
  { id: '10', label: '10 câu' },
  { id: '20', label: '20 câu' },
  { id: 'full', label: 'Cả đề' },
]

// 5 is the assistant's default count, so it has to be a choice here too (else the field shows 10 while 5 is sent).
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

export const FORMAT_OPTIONS: SelectOption[] = EXAM_FORMATS.map((format) => ({
  id: format.id,
  label: format.label,
}))

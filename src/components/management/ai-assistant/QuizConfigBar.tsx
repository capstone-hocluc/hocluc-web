import type { ReactNode } from 'react'
import SelectField from '../../console/select-field'
import type { AiDifficulty, AiExamFormat } from '../../../services/aiAssistantService'
import type { AiComposeSettings } from '../../../hooks/useAiAssistant'
import { COMPOSE_COUNTS, DIFFICULTIES, FORMAT_OPTIONS, MOCK_COUNTS, REUSE_RATIOS } from './quiz-config-options'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      {children}
    </div>
  )
}

interface QuizConfigBarProps {
  mode: 'compose' | 'mock-exam'
  settings: AiComposeSettings
  onChange: (patch: Partial<AiComposeSettings>) => void
}

/**
 * The compose settings. There is no subject: the request names it ("10 câu Toán"), and one that names none is for the
 * whole format. The sample paper of a mock exam is chosen in the chat's "Nguồn cho trợ lý" block.
 */
export default function QuizConfigBar({
  mode,
  settings,
  onChange,
}: QuizConfigBarProps) {
  const counts = mode === 'compose' ? COMPOSE_COUNTS : MOCK_COUNTS
  const countValue = counts.some((option) => option.id === String(settings.questionCount))
    ? String(settings.questionCount)
    : counts[0].id
  const ratioValue = REUSE_RATIOS.some((option) => option.id === String(settings.bankRatio))
    ? String(settings.bankRatio)
    : REUSE_RATIOS[0].id

  return (
    <div className="p-1">
      <div className="grid grid-cols-2 gap-2.5">
        {mode === 'compose' && (
          <Field label="Định dạng đề">
            <SelectField
              ariaLabel="Định dạng đề"
              options={FORMAT_OPTIONS}
              value={settings.examFormat}
              onChange={(value) => onChange({ examFormat: value as AiExamFormat })}
              triggerClassName="h-9"
            />
          </Field>
        )}
        <Field label="Số câu">
          <SelectField
            ariaLabel="Số câu"
            options={counts}
            value={countValue}
            onChange={(value) =>
              onChange({ questionCount: value === 'full' ? 'full' : Number(value) })
            }
            triggerClassName="h-9"
          />
        </Field>
        <Field label="Mức độ">
          <SelectField
            ariaLabel="Mức độ"
            options={DIFFICULTIES}
            value={settings.difficulty}
            onChange={(value) => onChange({ difficulty: value as AiDifficulty })}
            triggerClassName="h-9"
          />
        </Field>
        <Field label="Tỉ lệ dùng lại">
          <SelectField
            ariaLabel="Tỉ lệ dùng lại"
            options={REUSE_RATIOS}
            value={ratioValue}
            onChange={(value) => onChange({ bankRatio: Number(value) })}
            triggerClassName="h-9"
          />
        </Field>
      </div>
    </div>
  )
}

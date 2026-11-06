import type { ReactNode } from 'react'
import SelectField from '../../console/select-field'
import type { AiExamFormat, AiSolutionStyle } from '../../../services/aiAssistantService'
import type { AiComposeSettings } from '../../../hooks/useAiAssistant'
import { FORMAT_OPTIONS, REUSE_RATIOS, SOLUTION_STYLES } from './quiz-config-options'

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
 * The settings a request rarely says in words. The subject, the count and the difficulty come from the request itself
 * ("10 câu Toán mức khó"); the sample paper of a mock exam is chosen in the chat's "Nguồn cho trợ lý" block.
 */
export default function QuizConfigBar({
  mode,
  settings,
  onChange,
}: QuizConfigBarProps) {
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
        <Field label="Tỉ lệ dùng lại">
          <SelectField
            ariaLabel="Tỉ lệ dùng lại"
            options={REUSE_RATIOS}
            value={ratioValue}
            onChange={(value) => onChange({ bankRatio: Number(value) })}
            triggerClassName="h-9"
          />
        </Field>
        <Field label="Lời giải">
          <SelectField
            ariaLabel="Lời giải"
            options={SOLUTION_STYLES}
            value={settings.solutionStyle}
            onChange={(value) => onChange({ solutionStyle: value as AiSolutionStyle })}
            triggerClassName="h-9"
          />
        </Field>
      </div>
    </div>
  )
}

import { fieldControlClass } from '../../console/form-field'
import type { ExamSettings } from './exam-settings'

/** Time, attempts and (not for a placement) pass mark: the rules every exam is sat under. */
export default function ExamRuleFields({ settings, onChange, placement, disabled }: {
  settings: ExamSettings
  onChange: <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => void
  placement: boolean
  disabled: boolean
}) {
  return (
    <div className={placement ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-3'}>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
        Thời gian làm bài (phút)
        <input className={fieldControlClass} type="number" min="1" max="600" value={settings.duration}
          onChange={(event) => onChange('duration', event.target.value)} disabled={disabled} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
        Số lượt làm tối đa
        <input className={fieldControlClass} type="number" min="1" max="999" value={settings.maxAttempts}
          onChange={(event) => onChange('maxAttempts', event.target.value)} disabled={disabled} />
      </label>
      {!placement && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Điểm đạt (%)
          <input className={fieldControlClass} type="number" min="0" max="100" step="0.01" value={settings.passingPercentage}
            onChange={(event) => onChange('passingPercentage', event.target.value)} disabled={disabled} />
        </label>
      )}
    </div>
  )
}

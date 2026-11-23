import DateTimeField from '../../console/date-time-field'
import { Checkbox } from '../../tailgrids/core/checkbox'
import QuizAnswerReviewSetting from './QuizAnswerReviewSetting'
import type { ExamSettings } from './exam-settings'

/** When a mock exam opens and closes, whether answers are shown after it, and whether it can be practised again. */
export default function ExamScheduleFields({ settings, onChange, disabled, fromRequired = false, untilRequired = false }: {
  settings: ExamSettings
  onChange: <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => void
  disabled: boolean
  /** A date the server already holds cannot be cleared. */
  fromRequired?: boolean
  untilRequired?: boolean
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField label="Bắt đầu làm bài" value={settings.availableFrom} onChange={(value) => onChange('availableFrom', value)}
          disabled={disabled} required={fromRequired} />
        <DateTimeField label="Hạn làm bài" value={settings.availableUntil} onChange={(value) => onChange('availableUntil', value)}
          disabled={disabled} required={untilRequired} />
      </div>
      <QuizAnswerReviewSetting enabled={settings.showAnswers} onChange={(checked) => onChange('showAnswers', checked)} disabled={disabled} />
      <Checkbox isSelected={settings.practiceAllowed} onChange={(checked) => onChange('practiceAllowed', checked)} isDisabled={disabled}
        className="text-sm text-text-primary">
        Cho phép học viên luyện tập lại
      </Checkbox>
    </>
  )
}

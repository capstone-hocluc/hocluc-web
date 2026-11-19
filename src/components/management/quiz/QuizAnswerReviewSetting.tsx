import { Checkbox } from '../../tailgrids/core/checkbox'

interface QuizAnswerReviewSettingProps {
  enabled: boolean
  disabled?: boolean
  onChange: (enabled: boolean) => void
}

export default function QuizAnswerReviewSetting({ enabled, disabled, onChange }: QuizAnswerReviewSettingProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Checkbox isSelected={enabled} onChange={onChange} isDisabled={disabled} className="text-sm text-text-primary">
        Cho phép xem đáp án sau khi nộp
      </Checkbox>
      <p className="m-0 text-xs text-text-tertiary">
        Nếu tắt, học sinh chỉ xem được điểm. Nếu bật, học sinh có thể xem đáp án và lời giải sau khi nộp.
      </p>
    </div>
  )
}

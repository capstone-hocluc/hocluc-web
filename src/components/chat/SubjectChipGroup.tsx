import StudentButton from '../ui/Button'
import { Check } from '../console/icons'
import type { ChatSubjectOption } from '../../types/chat'

export interface SubjectChipGroupProps {
  subjects: ChatSubjectOption[]
  value: string
  onChange: (subjectId: string) => void
  disabled?: boolean
  loading?: boolean
}

export default function SubjectChipGroup({
  subjects,
  value,
  onChange,
  disabled = false,
  loading = false,
}: SubjectChipGroupProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-text-heading">Môn học</legend>
      {loading && subjects.length === 0 ? (
        <p role="status" className="text-sm text-text-body">
          Đang tải môn học…
        </p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-text-body">Không có môn học khả dụng.</p>
      ) : (
        <div role="group" aria-label="Môn học" className="flex flex-wrap gap-2">
          {subjects.map((item) => {
            const selected = value === item.id
            return (
              <StudentButton
                key={item.id}
                type="button"
                size="sm"
                shape="pill"
                appearance={selected ? 'fill' : 'outline'}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onChange(item.id)}
              >
                {selected && <Check size={14} aria-hidden="true" />}
                {item.name}
              </StudentButton>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}

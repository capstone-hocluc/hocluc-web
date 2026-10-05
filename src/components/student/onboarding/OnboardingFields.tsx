import type { ComponentType, ReactNode } from 'react'
import { BookOpen, Check } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import DropdownField from '../../ui/DropdownField'

interface FieldProps {
  className?: string
  children: ReactNode
}

// One labelled block of the form grid.
export function OnboardingField({ className, children }: FieldProps) {
  return <div className={cn('relative flex min-w-0 flex-col', className)}>{children}</div>
}

export function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ size?: number }>
  children: ReactNode
}) {
  return (
    <span className="mb-[9px] flex items-center gap-[7px] text-[13px] font-extrabold text-text-emphasis [&>svg]:text-primary">
      <Icon size={16} />
      {children}
    </span>
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  return <small className="mt-[7px] text-[11px] text-danger">{children}</small>
}

interface SearchSelectProps {
  label: string
  placeholder: string
  options: string[]
  value: string
  onChange: (value: string) => void
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
  error?: string
}

// Searchable dropdown ("Trường đại học mục tiêu", "Ngành học mục tiêu").
export function SearchSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  icon: Icon,
  error,
}: SearchSelectProps) {
  return (
    <OnboardingField>
      <FieldLabel icon={Icon}>{label}</FieldLabel>
      <DropdownField
        ariaLabel={label}
        emptyMessage="Không tìm thấy kết quả phù hợp"
        isInvalid={Boolean(error)}
        isSearchable
        options={options.map((option) => ({ id: option, label: option }))}
        placeholder={placeholder}
        renderValue={(option) => (
          <span className="flex min-w-0 items-center gap-[9px] text-[#8994b0]">
            <Icon size={17} aria-hidden={true} />
            <span className="min-w-0 truncate text-[13px] text-text-heading">
              {option?.label || placeholder}
            </span>
          </span>
        )}
        triggerClassName="flex h-[52px] items-center gap-[9px] py-0 rounded-[15px] border-[1.5px] border-[#d9eff9] bg-white/95 px-3.5 text-[#8994b0] transition focus-within:-translate-y-px focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(28, 176, 246,0.1)] aria-invalid:border-danger"
        value={value || null}
        onChange={(nextValue) => onChange(nextValue ?? '')}
      />
      {error && <FieldError>{error}</FieldError>}
    </OnboardingField>
  )
}

const subjectChip = cva(
  'inline-flex cursor-pointer items-center gap-[5px] rounded-full border border-[#d9eff9] bg-surface px-[13px] py-2.5 text-[12px] text-text-body transition hover:-translate-y-px hover:border-primary hover:text-primary hover:shadow-[0_10px_18px_rgba(28, 176, 246,0.08)]',
  {
    variants: {
      selected: {
        true: 'border-primary bg-[linear-gradient(135deg,var(--color-badge-info-bg),#f7fcfe)] font-extrabold text-primary shadow-[0_8px_16px_rgba(28, 176, 246,0.12)]',
        false: '',
      },
    },
  }
)

const subjectGroups = [
  {
    label: 'Tư duy & Ngôn ngữ',
    description: 'Bao gồm Toán, Logic & Phân tích số liệu',
    subjects: ['Toán học', 'Ngữ văn', 'Tiếng Anh'],
  },
  {
    label: 'Khoa học tự nhiên',
    description: 'Khám phá và lý giải thế giới',
    subjects: ['Vật lý', 'Hóa học', 'Sinh học'],
  },
  {
    label: 'Khoa học xã hội',
    description: 'Hiểu người và xã hội',
    subjects: ['Lịch sử', 'Địa lý'],
  },
]

interface SubjectChoiceProps {
  label: string
  hint: string
  selected: string[]
  onChange: (subjects: string[]) => void
  error?: string
}

// Multi-select of subjects, grouped (Tư duy & Ngôn ngữ / Khoa học ...).
export function SubjectChoice({ label, hint, selected, onChange, error }: SubjectChoiceProps) {
  const toggleSubject = (subject: string) => {
    if (selected.includes(subject)) {
      onChange(selected.filter((item) => item !== subject))
      return
    }
    onChange([...selected, subject])
  }

  return (
    <OnboardingField>
      <FieldLabel icon={BookOpen}>
        {label}
        <strong className="ml-auto text-[11px] font-black tracking-[0.3px] text-primary">
          {selected.length} môn đã chọn
        </strong>
      </FieldLabel>
      <span className="-mt-[3px] mb-2.5 text-[11px] text-[#8791ae]">{hint}</span>
      <div className="flex flex-col gap-3">
        {subjectGroups.map((group) => (
          <div
            className="rounded-[15px] border border-[#e6ecf9] bg-[rgba(250,252,255,0.8)] p-3 first:border-[#bde8f8] first:bg-[linear-gradient(135deg,#f0faff,#fbfcff)]"
            key={group.label}
          >
            <div className="mb-[9px] flex items-baseline justify-between gap-2.5 max-[701px]:flex-col max-[701px]:items-start max-[701px]:gap-[3px]">
              <strong className="text-[12px] text-text-emphasis">{group.label}</strong>
              <span className="text-right text-[10px] text-[#9aa4bc] max-[701px]:text-left">
                {group.description}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.subjects.map((subject) => {
                const isSelected = selected.includes(subject)
                return (
                  <button
                    type="button"
                    key={subject}
                    aria-pressed={isSelected}
                    className={cn(subjectChip({ selected: isSelected }))}
                    onClick={() => toggleSubject(subject)}
                  >
                    {isSelected && <Check size={14} />}
                    {subject}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </OnboardingField>
  )
}

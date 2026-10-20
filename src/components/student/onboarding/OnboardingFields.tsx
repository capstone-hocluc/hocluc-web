import type { ComponentType, ReactNode } from 'react'
import { BookOpen, Check } from '../../console/icons'
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
    <span className="mb-[9px] flex items-center gap-[7px] text-sm font-semibold text-text-heading [&>svg]:text-primary-text">
      <Icon size={16} />
      {children}
    </span>
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  return <small className="mt-[7px] text-[13px] font-bold text-danger">{children}</small>
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
          <span className="flex min-w-0 items-center gap-[9px] text-text-subtle">
            <Icon size={17} aria-hidden={true} />
            <span className="min-w-0 truncate text-[15px] font-semibold text-text-heading">
              {option?.label || placeholder}
            </span>
          </span>
        )}
        triggerClassName="flex h-[52px] items-center gap-[9px] py-0 rounded-xl border border-line bg-surface px-3.5 text-text-subtle transition focus-within:border-primary focus-within:ring-3 focus-within:ring-focus-ring/15 aria-invalid:border-danger"
        value={value || null}
        onChange={(nextValue) => onChange(nextValue ?? '')}
      />
      {error && <FieldError>{error}</FieldError>}
    </OnboardingField>
  )
}

const subjectChip = cva(
  'inline-flex min-h-10 cursor-pointer items-center gap-[5px] rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-bold text-text-body transition hover:border-primary hover:bg-surface-brand hover:text-primary-text focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  {
    variants: {
      selected: {
        true: 'border-primary bg-primary-soft font-semibold text-primary-text',
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
        <strong className="ml-auto text-xs font-bold tracking-[0.3px] text-primary-text">
          {selected.length} môn đã chọn
        </strong>
      </FieldLabel>
      <span className="-mt-[3px] mb-2.5 text-[13px] text-text-body">{hint}</span>
      <div className="flex flex-col gap-3">
        {subjectGroups.map((group) => (
          <div
            className="rounded-xl border border-line-card bg-surface p-3.5 first:border-line-brand first:bg-surface-brand"
            key={group.label}
          >
            <div className="mb-[9px] flex items-baseline justify-between gap-2.5 max-[701px]:flex-col max-[701px]:items-start max-[701px]:gap-[3px]">
              <strong className="text-sm font-bold text-text-heading">{group.label}</strong>
              <span className="text-right text-xs text-text-body max-[701px]:text-left">
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

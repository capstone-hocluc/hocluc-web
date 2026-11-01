import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import Button from '../../console/button'
import Notice from '../../console/notice'
import SelectField, { type SelectOption } from '../../console/select-field'
import { Skeleton } from '../../tailgrids/core/skeleton'
import type { AiDifficulty, AiExamFormat } from '../../../services/aiAssistantService'
import type { AiComposeSettings } from '../../../hooks/useAiAssistant'
import { EXAM_FORMATS } from './exam-format'

const DIFFICULTIES: { id: AiDifficulty; label: string }[] = [
  { id: 'DE', label: 'Dễ' },
  { id: 'TB', label: 'Trung bình' },
  { id: 'KHO', label: 'Khó' },
]

const COMPOSE_COUNTS: SelectOption[] = [
  { id: '5', label: '5 câu' },
  { id: '10', label: '10 câu' },
  { id: '20', label: '20 câu' },
  { id: 'full', label: 'Cả đề' },
]

const MOCK_COUNTS: SelectOption[] = [
  { id: '10', label: '10 câu' },
  { id: '20', label: '20 câu' },
  { id: '40', label: '40 câu' },
  { id: 'full', label: 'Cả đề' },
]

const REUSE_RATIOS: SelectOption[] = [
  { id: '0', label: 'Không dùng lại' },
  { id: '0.2', label: '20%' },
  { id: '0.4', label: '40%' },
  { id: '0.6', label: '60%' },
  { id: '0.8', label: '80%' },
]

const FORMAT_OPTIONS: SelectOption[] = EXAM_FORMATS.map((format) => ({
  id: format.id,
  label: format.label,
}))

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
  subjects: SelectOption[]
  subjectsLoading: boolean
  subjectsError: string
  onReloadSubjects: () => void
  papers: SelectOption[]
  papersLoading: boolean
  papersError: string
  onReloadPapers: () => void
  subjectLocked: boolean
}

export default function QuizConfigBar({
  mode,
  settings,
  onChange,
  subjects,
  subjectsLoading,
  subjectsError,
  onReloadSubjects,
  papers,
  papersLoading,
  papersError,
  onReloadPapers,
  subjectLocked,
}: QuizConfigBarProps) {
  const counts = mode === 'compose' ? COMPOSE_COUNTS : MOCK_COUNTS
  const countValue = counts.some((option) => option.id === String(settings.questionCount))
    ? String(settings.questionCount)
    : counts[0].id
  const ratioValue = REUSE_RATIOS.some((option) => option.id === String(settings.bankRatio))
    ? String(settings.bankRatio)
    : REUSE_RATIOS[0].id
  const subjectValue = subjects.some((option) => option.id === settings.subjectId)
    ? settings.subjectId
    : (subjects[0]?.id ?? '')
  const paperValue = papers.some((option) => option.id === settings.bankSourceId)
    ? settings.bankSourceId
    : (papers[0]?.id ?? '')

  return (
    <div className="mb-2.5 rounded-xl border border-card-border bg-card-background p-3 shadow-card-soft">
      <div className={cn('grid gap-2.5', mode === 'compose' ? 'grid-cols-2' : 'grid-cols-1')}>
        <Field label="Môn học">
          {subjectsLoading ? (
            <Skeleton className="h-9 w-full rounded-lg" />
          ) : subjects.length === 0 ? (
            <span className="flex h-9 items-center text-sm text-text-tertiary">Chưa có môn học</span>
          ) : (
            <SelectField
              ariaLabel="Môn học"
              options={subjects}
              value={subjectValue}
              onChange={(value) => onChange({ subjectId: value })}
              disabled={subjectLocked}
              triggerClassName="h-9"
            />
          )}
        </Field>
        {mode === 'compose' ? (
          <Field label="Định dạng đề">
            <SelectField
              ariaLabel="Định dạng đề"
              options={FORMAT_OPTIONS}
              value={settings.examFormat}
              onChange={(value) => onChange({ examFormat: value as AiExamFormat })}
              triggerClassName="h-9"
            />
          </Field>
        ) : (
          <Field label="Đề mẫu">
            {papersLoading ? (
              <Skeleton className="h-9 w-full rounded-lg" />
            ) : papers.length === 0 ? (
              <span className="flex h-9 items-center text-sm text-text-tertiary">Chưa có đề</span>
            ) : (
              <SelectField
                ariaLabel="Đề mẫu"
                options={papers}
                value={paperValue}
                onChange={(value) => onChange({ bankSourceId: value })}
                triggerClassName="h-9"
              />
            )}
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
      {subjectsError && (
        <Notice tone="danger" className="mt-2.5">
          {subjectsError}
          <Button size="sm" appearance="outline" onClick={onReloadSubjects}>
            Thử lại
          </Button>
        </Notice>
      )}
      {mode === 'mock-exam' && papersError && (
        <Notice tone="danger" className="mt-2.5">
          {papersError}
          <Button size="sm" appearance="outline" onClick={onReloadPapers}>
            Thử lại
          </Button>
        </Notice>
      )}
    </div>
  )
}

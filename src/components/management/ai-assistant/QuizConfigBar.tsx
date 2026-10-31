import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import SelectField from '../../console/select-field'
import { Skeleton } from '../../tailgrids/core/skeleton'
import { getCategories } from '../../../services/categoryService'
import { getBankSources } from '../../../services/questionBankService'
import type { AiAssistantMode, AiDifficulty } from '../../../services/aiAssistantService'

const FALLBACK_SUBJECTS = [
  { id: 'toan', label: 'Toán' },
  { id: 'ngu-van', label: 'Ngữ văn' },
  { id: 'tieng-anh', label: 'Tiếng Anh' },
  { id: 'vat-li', label: 'Vật lí' },
]

const FALLBACK_PAPERS = [
  { id: 'paper-2026', label: 'Đề tham khảo 2026' },
  { id: 'paper-2025', label: 'Đề tham khảo 2025' },
]

const DIFFICULTIES: { id: AiDifficulty; label: string }[] = [
  { id: 'DE', label: 'Dễ' },
  { id: 'TB', label: 'Trung bình' },
  { id: 'KHO', label: 'Khó' },
]

const QUESTION_TYPES = [
  { id: 'MCQ', label: 'Trắc nghiệm' },
  { id: 'TRUE_FALSE', label: 'Đúng – Sai' },
  { id: 'SHORT', label: 'Trả lời ngắn' },
]

const COMPOSE_COUNTS = ['3', '5', '10', '15'].map((count) => ({
  id: count,
  label: `${count} câu`,
}))

const MOCK_COUNTS = ['10', '20', '40'].map((count) => ({
  id: count,
  label: `${count} câu`,
}))

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      {children}
    </div>
  )
}

export default function QuizConfigBar({ mode }: { mode: Exclude<AiAssistantMode, 'ask'> }) {
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [papersLoading, setPapersLoading] = useState(true)
  const [subjects, setSubjects] = useState(FALLBACK_SUBJECTS)
  const [papers, setPapers] = useState(FALLBACK_PAPERS)
  const [subject, setSubject] = useState(FALLBACK_SUBJECTS[0].id)
  const [paper, setPaper] = useState(FALLBACK_PAPERS[0].id)
  const [count, setCount] = useState(mode === 'compose' ? '5' : '20')
  const [difficulty, setDifficulty] = useState<AiDifficulty>('TB')
  const [questionType, setQuestionType] = useState(QUESTION_TYPES[0].id)

  useEffect(() => {
    if (mode !== 'compose') return
    let live = true
    void getCategories()
      .then((categories) => {
        if (!live) return
        const options = categories
          .filter((category) => category.active)
          .map((category) => ({ id: category.id, label: category.name }))
        if (options.length > 0) setSubjects(options)
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setSubjectsLoading(false)
      })
    return () => {
      live = false
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'mock-exam') return
    let live = true
    void getBankSources()
      .then((sources) => {
        if (!live) return
        const options = sources.map((source) => ({
          id: source.id,
          label: source.year ? `${source.title} · ${source.year}` : source.title,
        }))
        if (options.length > 0) setPapers(options)
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setPapersLoading(false)
      })
    return () => {
      live = false
    }
  }, [mode])

  const subjectValue = subjects.some((option) => option.id === subject) ? subject : (subjects[0]?.id ?? '')
  const paperValue = papers.some((option) => option.id === paper) ? paper : (papers[0]?.id ?? '')
  const counts = mode === 'compose' ? COMPOSE_COUNTS : MOCK_COUNTS
  const countValue = counts.some((option) => option.id === count) ? count : counts[0].id
  const columns = mode === 'compose' ? 'grid-cols-2' : 'grid-cols-1'

  return (
    <div className="mb-2.5 rounded-xl border border-card-border bg-card-background p-3 shadow-card-soft">
      <div className={cn('grid gap-2.5', columns)}>
        {mode === 'compose' ? (
          <>
            <Field label="Môn học">
              {subjectsLoading ? (
                <Skeleton className="h-9 w-full rounded-lg" />
              ) : (
                <SelectField
                  ariaLabel="Môn học"
                  options={subjects}
                  value={subjectValue}
                  onChange={setSubject}
                  triggerClassName="h-9"
                />
              )}
            </Field>
            <Field label="Số câu">
              <SelectField
                ariaLabel="Số câu"
                options={counts}
                value={countValue}
                onChange={setCount}
                triggerClassName="h-9"
              />
            </Field>
            <Field label="Mức độ">
              <SelectField
                ariaLabel="Mức độ"
                options={DIFFICULTIES}
                value={difficulty}
                onChange={(value) => setDifficulty(value as AiDifficulty)}
                triggerClassName="h-9"
              />
            </Field>
            <Field label="Dạng câu hỏi">
              <SelectField
                ariaLabel="Dạng câu hỏi"
                options={QUESTION_TYPES}
                value={questionType}
                onChange={setQuestionType}
                triggerClassName="h-9"
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Đề mẫu">
              {papersLoading ? (
                <Skeleton className="h-9 w-full rounded-lg" />
              ) : (
                <SelectField
                  ariaLabel="Đề mẫu"
                  options={papers}
                  value={paperValue}
                  onChange={setPaper}
                  triggerClassName="h-9"
                />
              )}
            </Field>
            <Field label="Số câu tối đa">
              <SelectField
                ariaLabel="Số câu tối đa"
                options={counts}
                value={countValue}
                onChange={setCount}
                triggerClassName="h-9"
              />
            </Field>
            <Field label="Mức độ">
              <SelectField
                ariaLabel="Mức độ"
                options={DIFFICULTIES}
                value={difficulty}
                onChange={(value) => setDifficulty(value as AiDifficulty)}
                triggerClassName="h-9"
              />
            </Field>
          </>
        )}
      </div>
    </div>
  )
}

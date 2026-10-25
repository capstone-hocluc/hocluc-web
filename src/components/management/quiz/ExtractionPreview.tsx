import { useState } from 'react'
import { cn } from '../../../lib/cn'
import type { ExtractedExam, ExtractedGroup, ExtractedQuestion, ExtractedSection } from '../../../services/aiExtractionService'
import { previewCounts, questionFlags } from './extraction-preview-counts'
import Notice from '../../console/notice'
import Status from '../../console/status'
import { Skeleton } from '../../tailgrids/core/skeleton'
import MathText from '../../ui/MathText'

const UNSECTIONED_KEY = '__unsectioned__'

function QuestionRow({ exam, question, group }: { exam: ExtractedExam; question: ExtractedQuestion; group?: ExtractedGroup }) {
  const flags = questionFlags(exam, question, group)
  return (
    <li className="rounded-lg border border-card-border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-text-primary">Câu {question.number}</span>
        {question.sourcePage !== null && <span className="text-xs text-text-tertiary">trang {question.sourcePage}</span>}
        {flags.review && <Status tone="warning">Cần duyệt</Status>}
        {flags.estimated && <Status tone="warning">Hình AI ước lượng, cần kiểm tra</Status>}
        {flags.figureMissing && <Status tone="warning">Chưa cắt được hình</Status>}
        {flags.noAnswer && <Status tone="danger">Thiếu đáp án</Status>}
      </div>
      <p className="mt-2 mb-0 whitespace-pre-wrap break-words text-text-primary"><MathText>{question.text}</MathText></p>
      {question.imageUrl && (
        <img src={question.imageUrl} alt={`Hình của câu ${question.number}`} loading="lazy"
          className="mt-2 max-h-56 max-w-full rounded-lg border border-card-border bg-white object-contain" />
      )}
      <ol className="mt-2 mb-0 list-none space-y-1 p-0">
        {question.options.map(option => (
          <li key={option.label} className={cn('flex gap-2 break-words', option.correct && 'font-medium text-badge-success-text')}>
            <span className="shrink-0">{option.label}.</span>
            <span className="min-w-0 whitespace-pre-wrap"><MathText>{option.text}</MathText>{option.correct ? ' ✓' : ''}</span>
          </li>
        ))}
      </ol>
      {flags.review && <p className="mt-2 mb-0 text-xs text-badge-warning-text">{flags.review}</p>}
    </li>
  )
}

function SectionBlock({ exam, title, questions, groups, defaultOpen }: {
  exam: ExtractedExam
  title: string
  questions: ExtractedQuestion[]
  groups: Map<string, ExtractedGroup>
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const first = questions[0]?.number
  const last = questions[questions.length - 1]?.number
  return (
    <section className="rounded-xl border border-card-border">
      <h3 className="m-0">
        <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-transparent px-4 py-2 text-left text-sm font-medium text-text-primary">
          <span className="min-w-0 break-words">{title}</span>
          <span className="shrink-0 text-xs font-normal text-text-tertiary">
            {questions.length} câu{first !== undefined ? ` · ${first}–${last}` : ''}
          </span>
        </button>
      </h3>
      {/* Rows are only mounted while open, so a 100+ question paper stays light. */}
      {open && (
        <ul className="m-0 flex list-none flex-col gap-2 p-3 pt-0">
          {questions.map(question => (
            <QuestionRow key={question.number} exam={exam} question={question}
              group={question.groupKey ? groups.get(question.groupKey) : undefined} />
          ))}
        </ul>
      )}
    </section>
  )
}

function sectionTitle(section: ExtractedSection, byKey: Map<string, ExtractedSection>) {
  const parent = section.parentKey ? byKey.get(section.parentKey) : undefined
  return parent ? `${parent.title} › ${section.title}` : section.title
}

/** Read-only view of what the AI read; corrections are made in the quiz editor once it is applied. */
export default function ExtractionPreview({ exam }: { exam: ExtractedExam }) {
  const groups = new Map(exam.groups.map(group => [group.key, group]))
  const sectionsByKey = new Map(exam.sections.map(section => [section.key, section]))
  const counts = previewCounts(exam)
  const blocks = exam.sections
    .map(section => ({ key: section.key, title: sectionTitle(section, sectionsByKey), questions: exam.questions.filter(q => q.sectionKey === section.key) }))
    .filter(block => block.questions.length > 0)
  const unsectioned = exam.questions.filter(q => !q.sectionKey || !sectionsByKey.has(q.sectionKey))
  if (unsectioned.length > 0) blocks.push({ key: UNSECTIONED_KEY, title: 'Chưa gắn phần', questions: unsectioned })

  return (
    <div className="space-y-4">
      <dl className="m-0 grid grid-cols-2 gap-3 rounded-xl border border-card-border p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Câu hỏi', exam.questions.length], ['Phần', exam.sections.length], ['Nhóm', exam.groups.length],
          ['Cần duyệt', counts.review], ['Thiếu đáp án', counts.withoutAnswer], ['Số trang', exam.pageCount ?? '—'],
        ].map(([label, value]) => (
          <div key={label}><dt className="text-text-tertiary">{label}</dt><dd className="m-0 text-lg font-semibold text-text-primary">{value}</dd></div>
        ))}
      </dl>
      <p className="m-0 text-xs text-text-tertiary">
        Nguồn đáp án: {exam.answerKeySource === 'marked' ? 'đáp án đánh dấu trong đề'
          : exam.answerKeySource === 'answer-key-table' ? 'bảng đáp án cuối đề'
            : exam.answerKeySource === 'none' || !exam.answerKeySource ? 'không tìm thấy' : exam.answerKeySource}.
      </p>
      {exam.missingQuestions.length > 0 && (
        <Notice tone="danger" role="alert">
          <div>
            <strong>Thiếu {exam.missingQuestions.length} câu theo số in trên đề:</strong>{' '}
            {exam.missingQuestions.join(', ')}. Áp dụng bản đọc này sẽ không có các câu đó.
          </div>
        </Notice>
      )}
      {counts.estimated > 0 && (
        <Notice tone="warning">{counts.estimated} câu có hình do AI tự khoanh vùng, không phải ảnh có sẵn trong PDF. Kiểm tra lại phần cắt.</Notice>
      )}
      {exam.warnings.length > 0 && (
        <Notice tone="warning">
          <div>
            <strong>Cảnh báo khi đọc đề</strong>
            <ul className="mt-2 mb-0 list-disc space-y-1 pl-5">
              {exam.warnings.map((warning, index) => <li key={index} className="whitespace-pre-wrap break-words">{warning}</li>)}
            </ul>
          </div>
        </Notice>
      )}
      <div className="flex flex-col gap-2">
        {blocks.map((block, index) => (
          <SectionBlock key={block.key} exam={exam} title={block.title} questions={block.questions} groups={groups} defaultOpen={index === 0} />
        ))}
        {blocks.length === 0 && <p className="m-0 text-sm text-text-tertiary">AI chưa đọc được câu hỏi nào.</p>}
      </div>
    </div>
  )
}

/** Placeholder with the preview's layout (counts, then collapsed sections) while a finished job's result is fetched. */
export function ExtractionPreviewSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải kết quả đọc đề">
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-card-border p-4 sm:grid-cols-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map(cell => (
          <div key={cell} className="flex flex-col gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-10" /></div>
        ))}
      </div>
      <Skeleton className="h-3 w-56" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map(block => <Skeleton key={block} className="h-11 w-full rounded-xl" />)}
      </div>
    </div>
  )
}

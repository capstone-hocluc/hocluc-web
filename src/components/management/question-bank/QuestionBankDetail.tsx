import { useMemo, useState, type ReactNode } from 'react'
import { getErrorMessage } from '../../../lib/errors'
import { consoleTracePath } from '../../../lib/consoleTrace'
import { getActiveContent } from '../../../services/masterDataService'
import { findByLabel } from '../../../services/lessonLabelService'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import {
  approveBankReading,
  changeBankQuestionStatus,
  getBankQuestion,
  relabelBankQuestion,
  type BankPatternChoice,
  type BankQuestionDetail,
} from '../../../services/questionBankService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import SearchSelectField from '../../console/search-select-field'
import Status from '../../console/status'
import { Skeleton } from '../../tailgrids/core/skeleton'
import MathText from '../../ui/MathText'
import { optionColumns } from '../quiz/paper-layout'
import '../quiz/quiz-paper.css'
import BankReviewPanel from './BankReviewPanel'
import {
  BANK_STATUS_LABELS,
  BANK_STATUS_TONES,
  BANK_DIFFICULTY_LABELS,
  ANSWER_SOURCE_LABELS,
  ANSWER_SOURCE_TONES,
  confidenceText,
  examName,
  partLabel,
} from './question-bank-labels'

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Đang tải câu hỏi">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map(row => (
          <Skeleton key={row} className="h-10 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-card-border p-4">
        <Skeleton className="h-5 w-24" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map(cell => (
            <div key={cell} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** "Tiếng Việt · Đề mẫu 2026 · Câu 1": the part (once labelled), the paper and the number on it. */
function dialogTitle(question: BankQuestionDetail) {
  if (!question.sourceTitle || question.sourceNumber == null) return examName(question)
  const part = question.label?.partCode ? partLabel(question.label.partCode) : null
  return [part, question.sourceTitle, `Câu ${question.sourceNumber}`].filter(Boolean).join(' · ')
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <dt className="w-24 shrink-0 pt-0.5 text-xs text-text-tertiary">{term}</dt>
      <dd className="m-0 min-w-0 break-words text-sm text-text-primary">{children}</dd>
    </div>
  )
}

function LabelPanel({
  question,
  patterns,
  readOnly,
  onSaved,
}: {
  question: BankQuestionDetail
  patterns: BankPatternChoice[]
  readOnly: boolean
  onSaved: () => void
}) {
  const label = question.label
  const [editing, setEditing] = useState(false)
  const [patternCode, setPatternCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const byCode = useMemo(() => new Map(patterns.map(p => [p.code, p])), [patterns])
  const picked = byCode.get(patternCode)
  const subjectId = question.categoryId ?? patterns.find((item) => item.code === label?.patternCode)?.categoryId ?? null
  const master = useScheduleResource(subjectId ? `question-master:${subjectId}` : null, () => getActiveContent(subjectId!))
  const lessons = useScheduleResource(label?.primarySkillCode ? `question-lessons:${label.primarySkillCode}` : null,
    () => findByLabel({ skillCode: label!.primarySkillCode! }))
  function labelLink(kind: 'domains' | 'patterns' | 'skills' | 'microSkills', code: string | null, fallback?: string | null) {
    if (!code) return '—'
    const name = master.data?.[kind].find((item) => item.code === code)?.nameVi ?? fallback
    const text = name ? `${code} · ${name}` : code
    return subjectId ? <a className="text-brand-500 hover:underline" href={consoleTracePath('taxonomy', { categoryId: subjectId, kind, code })}>{text}</a> : text
  }

  async function save() {
    if (!patternCode || busy) return
    setBusy(true)
    setError('')
    try {
      await relabelBankQuestion(question.id, patternCode)
      setPatternCode('')
      setEditing(false)
      onSaved()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Phân loại" className="flex flex-col gap-4 rounded-xl border border-card-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-sm font-semibold text-text-primary">Phân loại</h3>
        {label ? (
          <Status tone={label.labelSource === 'MANUAL' ? 'info' : 'neutral'}>
            {label.labelSource === 'MANUAL' ? 'Gán thủ công' : `Jev · ${confidenceText(label)}`}
          </Status>
        ) : (
          <Status tone="warning">Chưa gán nhãn</Status>
        )}
      </div>
      {label && (
        <dl className="m-0 flex flex-col gap-3">
          <Fact term="Phần">{partLabel(label.partCode)}</Fact>
          <Fact term="Lĩnh vực">{labelLink('domains', label.domainCode, label.domainNameVi)}</Fact>
          <Fact term="Dạng câu">{labelLink('patterns', label.patternCode, label.patternNameVi)}</Fact>
          <Fact term="Kỹ năng">{labelLink('skills', label.primarySkillCode)}</Fact>
          <Fact term="Kỹ năng nhỏ">{labelLink('microSkills', label.microSkillCode)}</Fact>
        </dl>
      )}
      {label?.primarySkillCode && (
        <section className="flex min-w-0 flex-col gap-2">
          <h4 className="font-semibold text-text-primary">Bài học dạy kỹ năng này</h4>
          {lessons.status === 'loading' && <><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></>}
          {lessons.status === 'error' && <Notice tone="danger">{lessons.errorMessage}</Notice>}
          {lessons.status === 'ready' && lessons.data?.length === 0 && <span className="text-text-tertiary">Chưa có bài học</span>}
          {lessons.data && [...new Map(lessons.data.map((lesson) => [lesson.lessonId, lesson])).values()].map((lesson) => (
            <a key={lesson.lessonId} className="break-words text-sm text-brand-500 hover:underline"
              href={consoleTracePath('courses', { courseId: lesson.courseId })}>
              {lesson.courseTitle} › {lesson.chapterTitle} › {lesson.lessonTitle}
            </a>
          ))}
        </section>
      )}
      {!readOnly && !editing && (
        <div>
          <Button size="sm" appearance="outline" onClick={() => setEditing(true)}>
            {label ? 'Sửa nhãn' : 'Gán nhãn'}
          </Button>
        </div>
      )}
      {!readOnly && editing && (
        <div className="flex flex-col gap-3">
          <SearchSelectField
            ariaLabel="Dạng câu đúng"
            value={patternCode}
            onChange={setPatternCode}
            placeholder="Chọn dạng câu đúng"
            searchPlaceholder="Tìm dạng câu..."
            selectedLabel={picked ? picked.nameVi : undefined}
            loadPage={async term => {
              const needle = term.toLocaleLowerCase('vi')
              return {
                options: patterns
                  // The server only accepts a pattern of the question's own subject.
                  .filter(p => !question.categoryId || p.categoryId === question.categoryId)
                  .filter(p => `${p.code} ${p.nameVi} ${p.domainNameVi ?? ''}`.toLocaleLowerCase('vi').includes(needle))
                  .map(p => ({ id: p.code, label: `${partLabel(p.partCode)} · ${p.nameVi}` })),
                last: true,
              }
            }}
          />
          {picked && (
            <p className="m-0 text-xs text-text-tertiary">
              {partLabel(picked.partCode)} · {picked.domainNameVi ?? picked.domainCode}
            </p>
          )}
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!patternCode || busy}>
              {busy ? 'Đang lưu...' : 'Lưu nhãn'}
            </Button>
            <Button
              size="sm"
              appearance="ghost"
              disabled={busy}
              onClick={() => {
                setEditing(false)
                setPatternCode('')
                setError('')
              }}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

/** A reading the two models could not agree on: a person reads the page and settles it. */
function ReviewPanel({ question, readOnly, onSaved }: { question: BankQuestionDetail; readOnly: boolean; onSaved: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (question.reviewStatus !== 'NEEDS_HUMAN' || readOnly) return null

  async function approve() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await approveBankReading(question.id)
      onSaved()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Notice tone="danger">{error}</Notice>}
      <div>
        <Button size="sm" onClick={approve} disabled={busy}>
          {busy ? 'Đang lưu...' : 'Đã duyệt bản đọc'}
        </Button>
      </div>
    </div>
  )
}

function QuestionBody({
  question,
  patterns,
  readOnly,
  onSaved,
  onEdit,
  legacyReadOnly,
}: {
  question: BankQuestionDetail
  patterns: BankPatternChoice[]
  readOnly: boolean
  onSaved: () => void
  onEdit: (id: string) => void
  legacyReadOnly: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function transition(action: 'submit' | 'retire' | 'restore') {
    setBusy(true)
    setError('')
    try {
      await changeBankQuestionStatus(question.id, action)
      onSaved()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }
  const correctLabels = question.options.filter(option => option.correct).map(option => option.label).join(', ')
  return (
    <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {question.status && (
          <span title="Trạng thái duyệt">
            <Status tone={BANK_STATUS_TONES[question.status]}>{BANK_STATUS_LABELS[question.status]}</Status>
          </span>
        )}
        {question.difficulty && (
          <span title="Độ khó">
            <Status tone="neutral">Độ khó: {BANK_DIFFICULTY_LABELS[question.difficulty]}</Status>
          </span>
        )}
        {question.hasFigure && <Status tone="neutral">Có hình</Status>}
        <span className="text-xs text-text-tertiary">
          Phiên bản {question.headVersionNo}
          {question.approvedVersionNo != null && ` · đã duyệt bản ${question.approvedVersionNo}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {!readOnly && question.canEdit && (
          <Button size="sm" onClick={() => onEdit(question.id)}>Sửa</Button>
        )}
        {!readOnly && question.canEdit && (question.status === 'DRAFT' || question.status === 'CHANGES_REQUESTED') && (
          <Button size="sm" appearance="outline" disabled={busy} onClick={() => transition('submit')}>
            Gửi duyệt
          </Button>
        )}
        {question.canRetire && (
          <Button size="sm" appearance="outline" disabled={busy} onClick={() => transition('retire')}>
            Ngừng dùng
          </Button>
        )}
        {question.canRestore && (
          <Button size="sm" appearance="outline" disabled={busy} onClick={() => transition('restore')}>
            Khôi phục
          </Button>
        )}
      </div>
    </div>
    {error && <Notice tone="danger">{error}</Notice>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <article className="quiz-paper w-full! p-8! shadow-none! rounded-lg border border-card-border" aria-label="Câu hỏi">
          {question.passage && (
            <div className="quiz-paper-passage whitespace-pre-wrap">
              <MathText>{question.passage}</MathText>
              {question.passageImageUrl && <img src={question.passageImageUrl} alt="Hình của ngữ liệu" loading="lazy" />}
            </div>
          )}
          <div className="quiz-paper-question">
            <p className="quiz-paper-stem whitespace-pre-wrap">
              {question.sourceNumber != null && <strong>Câu {question.sourceNumber}: </strong>}
              <MathText>{question.text}</MathText>
            </p>
            {question.imageUrl && (
              <img src={question.imageUrl} alt={`Hình của câu ${question.sourceNumber}`} loading="lazy" />
            )}
            {question.options.length > 0 && (
              <ol className="quiz-paper-options" data-columns={optionColumns(question.options)}>
                {question.options.map(option => (
                  <li key={option.label}>
                    <strong>{option.label}.</strong> <MathText>{option.text}</MathText>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </article>
        <section aria-label="Đáp án" className="flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-sm font-semibold text-text-primary">
              Đáp án{correctLabels ? `: ${correctLabels}` : ''}
            </h3>
            <Status tone={ANSWER_SOURCE_TONES[question.answerSource]}>{ANSWER_SOURCE_LABELS[question.answerSource]}</Status>
          </div>
          {question.explanation && (
            <p className="m-0 whitespace-pre-wrap break-words text-text-primary">
              <MathText>{question.explanation}</MathText>
            </p>
          )}
        </section>
        {question.reviewNotes && <Notice tone="warning">{question.reviewNotes}</Notice>}
        <ReviewPanel question={question} readOnly={legacyReadOnly} onSaved={onSaved} />
        {question.canReview && <BankReviewPanel key={question.id} id={question.id} onSaved={onSaved} />}
      </div>
      <aside className="min-w-0" aria-label="Phân loại câu hỏi">
        <LabelPanel question={question} patterns={patterns} readOnly={legacyReadOnly} onSaved={onSaved} />
      </aside>
    </div>
    </div>
  )
}

export default function QuestionBankDetail({
  id,
  patterns,
  readOnly,
  onClose,
  onChanged,
  onEdit,
  legacyReadOnly,
}: {
  id: string | null
  patterns: BankPatternChoice[]
  readOnly: boolean
  onClose: () => void
  onChanged: () => void
  onEdit: (id: string) => void
  legacyReadOnly: boolean
}) {
  const resource = useScheduleResource(id ? `bank-question:${id}` : null, () => getBankQuestion(id as string))
  const question = resource.data
  return (
    <ConsoleDialog
      open={id !== null}
      onClose={onClose}
      maxWidth={1120}
      title={question ? dialogTitle(question) : 'Câu hỏi'}
    >
      {question ? (
        <QuestionBody
          question={question}
          patterns={patterns}
          readOnly={readOnly}
          onEdit={onEdit}
          legacyReadOnly={legacyReadOnly}
          onSaved={() => {
            resource.reload()
            onChanged()
          }}
        />
      ) : resource.status === 'loading' || resource.status === 'idle' ? (
        <DetailSkeleton />
      ) : (
        <ScheduleResourceState status={resource.status} errorMessage={resource.errorMessage} onRetry={resource.reload}>
          {null}
        </ScheduleResourceState>
      )}
    </ConsoleDialog>
  )
}

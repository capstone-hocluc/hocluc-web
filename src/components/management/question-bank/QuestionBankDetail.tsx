import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { getErrorMessage } from '../../../lib/errors'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import {
  approveBankReading,
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
import {
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

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-tertiary">{term}</dt>
      <dd className="m-0 mt-1 break-words text-sm text-text-primary">{children}</dd>
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
  const [patternCode, setPatternCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const byCode = useMemo(() => new Map(patterns.map(p => [p.code, p])), [patterns])
  const picked = byCode.get(patternCode)

  async function save() {
    if (!patternCode || busy) return
    setBusy(true)
    setError('')
    try {
      await relabelBankQuestion(question.id, patternCode)
      setPatternCode('')
      onSaved()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Nhãn" className="flex flex-col gap-4 rounded-xl border border-card-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-sm font-semibold text-text-primary">Nhãn</h3>
        {label ? (
          <Status tone={label.labelSource === 'MANUAL' ? 'info' : 'neutral'}>
            {label.labelSource === 'MANUAL' ? 'Gán thủ công' : 'Jev gán'}
          </Status>
        ) : (
          <Status tone="warning">Chưa gán nhãn</Status>
        )}
      </div>
      {label && (
        <dl className="m-0 grid gap-4 sm:grid-cols-2">
          <Fact term="Phần">{partLabel(label.partCode)}</Fact>
          <Fact term="Lĩnh vực">{label.domainNameVi ?? label.domainCode ?? '—'}</Fact>
          <Fact term="Dạng câu">{label.patternNameVi ?? label.patternCode ?? '—'}</Fact>
          <Fact term="Độ tin cậy">{confidenceText(label)}</Fact>
          <Fact term="Kỹ năng chính">{label.primarySkillCode ?? '—'}</Fact>
          <Fact term="Kỹ năng nhỏ">{label.microSkillCode ?? '—'}</Fact>
        </dl>
      )}
      {!readOnly && (
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
          <div>
            <Button size="sm" onClick={save} disabled={!patternCode || busy}>
              {busy ? 'Đang lưu...' : 'Lưu nhãn'}
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
}: {
  question: BankQuestionDetail
  patterns: BankPatternChoice[]
  readOnly: boolean
  onSaved: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Status tone={ANSWER_SOURCE_TONES[question.answerSource]}>{ANSWER_SOURCE_LABELS[question.answerSource]}</Status>
        {question.hasFigure && <Status tone="neutral">Có hình</Status>}
      </div>
      {question.reviewNotes && <Notice tone="warning">{question.reviewNotes}</Notice>}
      <ReviewPanel question={question} readOnly={readOnly} onSaved={onSaved} />
      {question.passage && (
        <div className="rounded-xl border border-card-border bg-background-gray-secondary p-4 text-sm">
          <p className="m-0 whitespace-pre-wrap break-words text-text-primary">
            <MathText>{question.passage}</MathText>
          </p>
          {question.passageImageUrl && (
            <img
              src={question.passageImageUrl}
              alt="Hình của ngữ liệu"
              loading="lazy"
              className="mt-3 max-h-72 max-w-full rounded-lg border border-card-border bg-white object-contain"
            />
          )}
        </div>
      )}
      <div className="text-sm">
        <p className="m-0 whitespace-pre-wrap break-words text-text-primary">
          <MathText>{question.text}</MathText>
        </p>
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt={`Hình của câu ${question.sourceNumber}`}
            loading="lazy"
            className="mt-3 max-h-72 max-w-full rounded-lg border border-card-border bg-white object-contain"
          />
        )}
      </div>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {question.options.map(option => (
          <li
            key={option.label}
            className={cn(
              'flex gap-2 rounded-lg border px-3 py-2 text-sm break-words',
              option.correct
                ? 'border-badge-success-text/40 bg-badge-success-bg font-medium text-badge-success-text'
                : 'border-card-border text-text-primary'
            )}
          >
            <span className="shrink-0">{option.label}.</span>
            <span className="min-w-0 whitespace-pre-wrap">
              <MathText>{option.text}</MathText>
            </span>
            {option.correct && <span className="sr-only">(đáp án đúng)</span>}
          </li>
        ))}
      </ol>
      {question.explanation && (
        <div className="rounded-xl border border-card-border p-4 text-sm">
          <h3 className="m-0 mb-2 text-sm font-semibold text-text-primary">Lời giải</h3>
          <p className="m-0 whitespace-pre-wrap break-words text-text-primary">
            <MathText>{question.explanation}</MathText>
          </p>
        </div>
      )}
      <LabelPanel question={question} patterns={patterns} readOnly={readOnly} onSaved={onSaved} />
    </div>
  )
}

export default function QuestionBankDetail({
  id,
  patterns,
  readOnly,
  onClose,
  onChanged,
}: {
  id: string | null
  patterns: BankPatternChoice[]
  readOnly: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const resource = useScheduleResource(id ? `bank-question:${id}` : null, () => getBankQuestion(id as string))
  const question = resource.data
  return (
    <ConsoleDialog
      open={id !== null}
      onClose={onClose}
      maxWidth={760}
      title={question ? examName(question) : 'Câu hỏi'}
    >
      {question ? (
        <QuestionBody
          question={question}
          patterns={patterns}
          readOnly={readOnly}
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

import { useState } from 'react'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getCategories } from '../../../services/categoryService'
import { getErrorMessage } from '../../../lib/errors'
import type { AiBankItem } from '../../../services/aiAssistantService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'
import Status from '../../console/status'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { Skeleton } from '../../tailgrids/core/skeleton'
import MathText from '../../ui/MathText'
import type { ExamPaperQuestion } from './exam-format'
import type { DraftBank } from './use-draft-bank'

interface SaveToBankDialogProps {
  /** The exam's written questions, in paper order. */
  questions: readonly ExamPaperQuestion[]
  numberOf: Map<string, number>
  bank: DraftBank
  onClose: () => void
}

/**
 * The kept questions the viewer may save are picked by default; each comes back saved, or left out with why.
 */
export default function SaveToBankDialog({ questions, numberOf, bank, onClose }: SaveToBankDialogProps) {
  const subjects = useScheduleResource('save-to-bank-subjects', getCategories)
  const subjectNames = new Map((subjects.data ?? []).map((subject) => [subject.id, subject.name]))
  const savable = questions.filter((question) => bank.canSave(question.id)).map((question) => question.id)
  const blocked = questions.filter((question) => !bank.authorable(question.id)).length
  const alreadySaved = questions.filter((question) => bank.savedQuestionId(question.id)).length
  // Until the viewer changes it, the pick is every kept question that can still be saved.
  const [picked, setPicked] = useState<ReadonlySet<string> | null>(null)
  const selection =
    picked ?? new Set(questions.filter((question) => question.kept && bank.canSave(question.id)).map((question) => question.id))
  const chosen = savable.filter((id) => selection.has(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<AiBankItem[] | null>(null)

  function toggle(id: string, on: boolean) {
    const next = new Set(selection)
    if (on) next.add(id)
    else next.delete(id)
    setPicked(next)
  }

  async function save() {
    if (chosen.length === 0 || busy) return
    setBusy(true)
    setError('')
    try {
      setResults(await bank.save(chosen))
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const label = (id: string) => `Câu ${numberOf.get(id) ?? '?'}`

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title="Lưu vào ngân hàng"
      maxWidth={640}
      dismissable={!busy}
      footer={
        results ? (
          <Button onClick={onClose}>Đóng</Button>
        ) : (
          <>
            <Button appearance="outline" onClick={onClose} disabled={busy}>
              Huỷ
            </Button>
            <Button onClick={() => void save()} disabled={!bank.ready || chosen.length === 0 || busy}>
              {busy ? 'Đang lưu…' : `Lưu ${chosen.length} câu`}
            </Button>
          </>
        )
      }
    >
      {results ? (
        <SaveResults results={results} label={label} />
      ) : !bank.ready ? (
        <QuestionListSkeleton />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-text-secondary">{questions.length} câu · {alreadySaved} câu đã lưu</p>
          {error && <Notice tone="danger">{error}</Notice>}
          {savable.length > 0 && (
            <Checkbox
              isSelected={chosen.length === savable.length}
              isIndeterminate={chosen.length > 0 && chosen.length < savable.length}
              onChange={(on) => setPicked(new Set(on ? savable : []))}
              isDisabled={busy}
              className="text-sm font-medium text-text-primary"
            >
              Chọn tất cả
            </Checkbox>
          )}
          <ul className="max-h-80 overflow-y-auto divide-y divide-card-border rounded-lg border border-card-border">
            {questions.map((question) => {
              const saved = Boolean(bank.savedQuestionId(question.id))
              const subjectId = bank.subjectId(question.id)
              const subject = subjectId ? subjectNames.get(subjectId) : null
              const unavailable = !bank.authorable(question.id)
              const status = saved
                ? { label: 'Đã lưu', tone: 'info' as const }
                : unavailable
                  ? { label: 'Không thể lưu', tone: 'warning' as const }
                  : { label: question.kept ? 'Đã giữ' : 'Đã bỏ', tone: 'neutral' as const }
              return (
                <li key={question.id} className="flex min-w-0 items-center gap-3 px-3 py-2">
                  <Checkbox
                    isSelected={saved || selection.has(question.id)}
                    isDisabled={!bank.canSave(question.id) || busy}
                    onChange={(on) => toggle(question.id, on)}
                    className="min-w-0 flex-1 text-sm text-text-primary"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <strong>{label(question.id)}.</strong>
                        {subjects.status === 'loading' && subjectId ? (
                          <Skeleton className="h-3 w-16 self-center" />
                        ) : (
                          <span className="text-xs text-text-tertiary">{subject ?? (subjectId ? 'Môn đã gắn' : 'Chưa xác định môn')}</span>
                        )}
                      </span>
                      <span className="truncate"><MathText>{question.prompt.split(/\r?\n/, 1)[0]}</MathText></span>
                    </span>
                  </Checkbox>
                  <Status tone={status.tone}>{status.label}</Status>
                </li>
              )
            })}
          </ul>
          {blocked > 0 && (
            <p className="m-0 text-sm text-text-tertiary">
              {blocked} câu không lưu được: bạn chưa có quyền soạn môn của câu, hoặc câu chưa xác định được môn.
            </p>
          )}
        </div>
      )}
    </ConsoleDialog>
  )
}

function SaveResults({ results, label }: { results: AiBankItem[]; label: (id: string) => string }) {
  const saved = results.filter((result) => result.result !== 'SKIPPED').length
  const skipped = results.filter((result) => result.result === 'SKIPPED')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Status tone="success">Đã lưu {saved} câu</Status>
        {skipped.length > 0 && <Status tone="warning">{skipped.length} câu không lưu</Status>}
      </div>
      {skipped.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-text-secondary">
          {skipped.map((result) => (
            <li key={result.itemId}>
              <strong className="text-text-primary">{label(result.itemId)}:</strong> {result.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The question list's shape while it loads: the select-all line and rows of a box and a line of text. */
function QuestionListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-col divide-y divide-card-border rounded-lg border border-card-border">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-4 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

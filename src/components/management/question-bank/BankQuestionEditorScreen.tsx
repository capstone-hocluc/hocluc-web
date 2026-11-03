import { useState } from 'react'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { getCategories } from '../../../services/categoryService'
import {
  changeBankQuestionStatus,
  createBankQuestion,
  getBankEvents,
  getBankQuestion,
  getBankScopes,
  getBankVersions,
  updateBankQuestion,
  type BankDifficulty,
  type BankQuestionDetail,
} from '../../../services/questionBankService'
import Button from '../../console/button'
import Notice from '../../console/notice'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import Status from '../../console/status'
import { Skeleton } from '../../tailgrids/core/skeleton'
import QuestionEditor from '../question/QuestionEditor'
import type { QuestionDraft } from '../question/question-draft'
import { BANK_STATUS_LABELS, BANK_STATUS_TONES } from './question-bank-labels'

type EditorData = {
  scopes: Awaited<ReturnType<typeof getBankScopes>>
  categories: Awaited<ReturnType<typeof getCategories>>
  question: BankQuestionDetail | null
  versions: Awaited<ReturnType<typeof getBankVersions>>
  events: Awaited<ReturnType<typeof getBankEvents>>
}

function emptyDraft(): QuestionDraft {
  return {
    questionText: '',
    questionType: 'SINGLE_CHOICE',
    explanation: '',
    imageUrl: null,
    categoryId: null,
    difficulty: null,
    options: Array.from({ length: 4 }, () => ({ text: '', correct: false })),
  }
}

function draftFrom(
  question: BankQuestionDetail,
  scopes: EditorData['scopes'],
  categories: EditorData['categories']
): QuestionDraft {
  const categoryId = question.categoryId
  const allowed =
    categoryId &&
    (scopes.administrator || scopes.authorSubjectIds.includes(categoryId)) &&
    categories.some((category) => category.id === categoryId)
  return {
    questionText: question.text,
    questionType: question.questionType,
    explanation: question.explanation ?? '',
    imageUrl: question.imageUrl,
    categoryId: allowed ? categoryId : null,
    difficulty: question.difficulty,
    options: question.options.map(({ text, correct }) => ({ text, correct })),
  }
}

function EditorSkeleton() {
  return (
    <div role="status" aria-label="Đang tải trình soạn câu" className="flex flex-col gap-5">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-card-border bg-card-background p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-4 w-24" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-background p-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

const EVENT_LABELS: Record<string, string> = {
  CREATE: 'Tạo câu hỏi',
  CREATED: 'Tạo câu hỏi',
  UPDATE: 'Cập nhật',
  UPDATED: 'Cập nhật',
  SUBMIT: 'Gửi duyệt',
  SUBMITTED: 'Gửi duyệt',
  APPROVE: 'Duyệt',
  APPROVED: 'Duyệt',
  REQUEST_CHANGES: 'Yêu cầu sửa',
  CHANGES_REQUESTED: 'Yêu cầu sửa',
  RETIRE: 'Ngừng dùng',
  RETIRED: 'Ngừng dùng',
  RESTORE: 'Khôi phục',
  RESTORED: 'Khôi phục',
}

function History({ versions, events }: Pick<EditorData, 'versions' | 'events'>) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-background p-6">
      <h3 className="m-0 text-lg font-semibold">Lịch sử</h3>
      <h4 className="m-0 font-medium">Phiên bản</h4>
      {versions.length === 0 ? (
        <p className="m-0 text-sm">Chưa có phiên bản.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {[...versions]
            .sort((a, b) => b.versionNo - a.versionNo)
            .map((version) => (
              <li key={version.versionNo} className="border-b border-card-border py-2 text-sm">
                Phiên bản {version.versionNo}{' '}
                {version.approved && <Status tone="success">Đã duyệt</Status>}
                {' · '}
                {version.createdByName ?? '—'} ·{' '}
                {new Date(version.createdAt).toLocaleString('vi-VN')}
                {version.changeNote && ` · ${version.changeNote}`}
              </li>
            ))}
        </ul>
      )}
      <h4 className="m-0 font-medium">Hoạt động duyệt</h4>
      {events.length === 0 ? (
        <p className="m-0 text-sm">Chưa có hoạt động.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {[...events]
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
            .map((event, index) => (
              <li
                key={`${event.createdAt}-${index}`}
                className="border-b border-card-border py-2 text-sm"
              >
                {EVENT_LABELS[event.action] ?? event.action} · {event.actorName ?? '—'} ·{' '}
                {new Date(event.createdAt).toLocaleString('vi-VN')}
                {event.versionNo != null && ` · Phiên bản ${event.versionNo}`}
                {event.comment && ` · ${event.comment}`}
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}

export default function BankQuestionEditorScreen({
  id,
  onBack,
}: {
  id: string | null
  onBack: () => void
}) {
  const [currentId, setCurrentId] = useState(id)
  const resource = useScheduleResource(`bank-editor:${currentId ?? 'new'}`, async () => {
    const [scopes, categories, question, versions, events] = await Promise.all([
      getBankScopes(),
      getCategories(),
      currentId ? getBankQuestion(currentId) : Promise.resolve(null),
      currentId ? getBankVersions(currentId) : Promise.resolve([]),
      currentId ? getBankEvents(currentId) : Promise.resolve([]),
    ])
    return { scopes, categories, question, versions, events }
  })
  if (!resource.data) {
    if (resource.status === 'loading' || resource.status === 'idle') return <EditorSkeleton />
    return (
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        {null}
      </ScheduleResourceState>
    )
  }
  return (
    <Editor
      key={`${currentId ?? 'new'}:${resource.data.question?.headVersionNo ?? 0}`}
      data={resource.data}
      onBack={onBack}
      onReload={resource.reload}
      onCreated={setCurrentId}
    />
  )
}

function Editor({
  data,
  onBack,
  onReload,
  onCreated,
}: {
  data: EditorData
  onBack: () => void
  onReload: () => void
  onCreated: (id: string) => void
}) {
  const [question, setQuestion] = useState(data.question)
  const [versions, setVersions] = useState(data.versions)
  const [events, setEvents] = useState(data.events)
  const [draft, setDraft] = useState<QuestionDraft>(() =>
    data.question ? draftFrom(data.question, data.scopes, data.categories) : emptyDraft()
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const options = data.categories
    .filter(
      (category) => data.scopes.administrator || data.scopes.authorSubjectIds.includes(category.id)
    )
    .map((category) => ({ id: category.id, label: category.name }))
  const canSave = !question || question.canEdit

  function changeDraft(update: Partial<QuestionDraft>) {
    const next = { ...draft, ...update }
    if (JSON.stringify(next) === JSON.stringify(draft)) return
    setDraft(next)
    setSaved(false)
    setDirty(true)
  }

  async function refreshHistory(id: string) {
    const [nextVersions, nextEvents] = await Promise.all([getBankVersions(id), getBankEvents(id)])
    setVersions(nextVersions)
    setEvents(nextEvents)
  }

  async function save() {
    if (busy || !canSave) return
    if (
      !draft.questionText.trim() ||
      !draft.categoryId ||
      !options.some((option) => option.id === draft.categoryId) ||
      (draft.questionType !== 'LONG_ANSWER' &&
        (draft.options.some((option) => !option.text.trim()) ||
          !draft.options.some((option) => option.correct)))
    ) {
      setError('Hãy nhập nội dung, chọn môn và hoàn thiện các đáp án.')
      return
    }
    setBusy(true)
    setError('')
    setConflict(false)
    try {
      const body = {
        question: {
          questionText: draft.questionText,
          questionType: draft.questionType,
          explanation: draft.explanation || null,
          categoryId: draft.categoryId,
          options: draft.questionType === 'LONG_ANSWER' ? [] : draft.options,
        },
        difficulty: draft.difficulty as BankDifficulty | null,
        changeNote: null,
      }
      const result = question
        ? await updateBankQuestion(question.id, {
            ...body,
            expectedVersionNo: question.headVersionNo,
          })
        : await createBankQuestion(body)
      if (!question) {
        onCreated(result.id)
        return
      }
      setQuestion(result)
      setSaved(true)
      setDirty(false)
      try {
        await refreshHistory(result.id)
      } catch (reason) {
        setError('Đã lưu câu hỏi nhưng không tải được lịch sử: ' + getErrorMessage(reason))
      }
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409 && question) {
        setConflict(true)
        setError('Câu hỏi đã được người khác thay đổi. Hãy tải lại trước khi lưu.')
      } else {
        setError(getErrorMessage(reason))
      }
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!question || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await changeBankQuestionStatus(question.id, 'submit')
      setQuestion(result)
      setSaved(false)
      try {
        await refreshHistory(result.id)
      } catch (reason) {
        setError('Đã gửi duyệt nhưng không tải được lịch sử: ' + getErrorMessage(reason))
      }
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-semibold text-text-primary">
          {data.question ? 'Sửa câu hỏi' : 'Soạn câu'}
        </h2>
        <Button appearance="outline" onClick={onBack}>
          Quay lại
        </Button>
      </div>
      {question && (
        <div>
          <Status tone={BANK_STATUS_TONES[question.status]}>
            {BANK_STATUS_LABELS[question.status]}
          </Status>
        </div>
      )}
      {error && (
        <Notice tone="danger">
          {error}
          {conflict && (
            <Button size="sm" appearance="outline" onClick={onReload}>
              Tải lại
            </Button>
          )}
        </Notice>
      )}
      {saved && <Notice>Đã lưu câu hỏi.</Notice>}
      <section className="flex flex-col gap-4 rounded-xl border border-card-border bg-card-background p-6">
        <QuestionEditor
          value={draft}
          onChange={changeDraft}
          disabled={!canSave}
          busy={busy}
          categoryOptions={options}
          categoriesReady
          categoriesLoading={false}
          categoryAriaLabel="Môn học"
          categoryLabel="Môn học"
          categoryPlaceholder="Chọn môn"
        />
        <div className="flex flex-wrap gap-2">
          {canSave && (
            <Button onClick={save} disabled={busy || conflict}>
              Lưu
            </Button>
          )}
          {question?.canEdit &&
            (question.status === 'DRAFT' || question.status === 'CHANGES_REQUESTED') && (
              <Button appearance="outline" onClick={submit} disabled={busy || dirty || conflict}>
                Gửi duyệt
              </Button>
            )}
        </div>
      </section>
      {question && <History versions={versions} events={events} />}
    </div>
  )
}

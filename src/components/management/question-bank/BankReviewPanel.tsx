import { useState } from 'react'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getErrorMessage } from '../../../lib/errors'
import {
  changeBankQuestionStatus,
  getBankVersions,
  type BankVersion,
} from '../../../services/questionBankService'
import Button from '../../console/button'
import Notice from '../../console/notice'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Skeleton } from '../../tailgrids/core/skeleton'
import MathText from '../../ui/MathText'

function VersionCard({
  version,
  other,
  title,
}: {
  version: BankVersion
  other?: BankVersion
  title: string
}) {
  function changed(value: unknown, previous: unknown) {
    return other && JSON.stringify(value) !== JSON.stringify(previous)
  }

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-card-border p-4">
      <h3 className="m-0 font-semibold text-text-primary">{title}</h3>
      {version.passage && (
        <div className="whitespace-pre-wrap break-words text-sm">
          {changed(version.passage, other?.passage) && <strong>Ngữ liệu đã thay đổi: </strong>}
          <MathText>{version.passage}</MathText>
        </div>
      )}
      {!version.passage && changed(version.passage, other?.passage) && (
        <span>Ngữ liệu đã thay đổi: —</span>
      )}
      <div className="whitespace-pre-wrap break-words text-sm">
        {changed(version.text, other?.text) && <strong>Nội dung đã thay đổi: </strong>}
        <MathText>{version.text}</MathText>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
        {version.options.map((option) => (
          <li key={option.label} className="rounded-lg border border-card-border p-2">
            {option.label}. <MathText>{option.text}</MathText>
            {option.correct && <strong> (Đáp án đúng)</strong>}
            {changed(
              option,
              other?.options.find((item) => item.label === option.label)
            ) && <strong> (Đã thay đổi)</strong>}
          </li>
        ))}
      </ul>
      {changed(
        version.options.map((option) => option.label),
        other?.options.map((option) => option.label)
      ) && <span className="text-sm font-semibold">Danh sách lựa chọn đã thay đổi</span>}
      {(version.explanation || changed(version.explanation, other?.explanation)) && (
        <div className="whitespace-pre-wrap break-words text-sm">
          <strong>
            {changed(version.explanation, other?.explanation)
              ? 'Lời giải đã thay đổi: '
              : 'Lời giải: '}
          </strong>
          {version.explanation ? <MathText>{version.explanation}</MathText> : '—'}
        </div>
      )}
    </section>
  )
}

export default function BankReviewPanel({ id, onSaved }: { id: string; onSaved: () => void }) {
  const versions = useScheduleResource(`bank-versions:${id}`, () => getBankVersions(id))
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const head = versions.data?.find((version) => version.current)
  const approved = versions.data?.find(
    (version) => version.approved && version.versionNo !== head?.versionNo
  )

  async function submit(action: 'approve' | 'request-changes') {
    if (busy || (action === 'request-changes' && !comment.trim())) return
    setBusy(true)
    setError('')
    try {
      await changeBankQuestionStatus(id, action, comment.trim() || null)
      onSaved()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Duyệt câu hỏi">
      {versions.status === 'loading' || versions.status === 'idle' ? (
        <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Đang tải phiên bản">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="flex flex-col gap-3 rounded-xl border border-card-border p-4"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : versions.data ? (
        head ? (
          <div className={approved ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
            {approved && <VersionCard version={approved} other={head} title="Bản đã duyệt" />}
            <VersionCard version={head} other={approved} title="Bản chờ duyệt" />
          </div>
        ) : (
          <Notice tone="danger">Không tìm thấy phiên bản hiện tại.</Notice>
        )
      ) : (
        <ScheduleResourceState
          status={versions.status}
          errorMessage={versions.errorMessage}
          onRetry={versions.reload}
        >
          {null}
        </ScheduleResourceState>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
        Nhận xét
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-card-border bg-card-background p-3 text-text-primary"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !head} onClick={() => submit('approve')}>
          Duyệt
        </Button>
        <Button
          size="sm"
          appearance="outline"
          disabled={busy || !head || !comment.trim()}
          onClick={() => submit('request-changes')}
        >
          Yêu cầu sửa
        </Button>
      </div>
    </section>
  )
}

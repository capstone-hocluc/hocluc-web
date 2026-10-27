import { useEffect, useRef, useState } from 'react'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { getErrorMessage } from '../../../lib/errors'
import { AmbiguousQuizImportError, applyTeacherQuizExtraction, getTeacherQuizExtractionJob, type TeacherQuizExtractionJob } from '../../../services/teacherQuizService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'

export default function QuizPdfImportPanel({ quizId, jobId, blockedReason, busy, onBusyChange, onReload, applyLocked, onApplyAttempt }: {
  quizId: string; jobId: string; blockedReason: string; busy: boolean
  onBusyChange: (value: boolean) => void; onReload: () => void; applyLocked?: boolean; onApplyAttempt?: () => void
}) {
  const access = useQuizAccess()
  const [job, setJob] = useState<TeacherQuizExtractionJob | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [preview, setPreview] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [applying, setApplying] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    async function poll() {
      try {
        const next = await getTeacherQuizExtractionJob(quizId, jobId)
        if (cancelled) return
        if (next.id !== jobId || next.quizId !== quizId || !['PENDING', 'RUNNING', 'DONE', 'FAILED', 'APPLIED'].includes(next.status)) throw new Error('Tiến trình đọc đề trả dữ liệu không hợp lệ.')
        setJob(next)
        setError('')
        if (next.status === 'PENDING' || next.status === 'RUNNING') timer = setTimeout(() => void poll(), 2500)
      } catch (cause) {
        if (!cancelled) setError(getErrorMessage(cause))
      }
    }
    if (access.canWrite) void poll()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [quizId, jobId, retry, access.canWrite])

  if (!access.canWrite) return null
  const reading = !job || job.status === 'PENDING' || job.status === 'RUNNING'
  const unsupported = job?.result?.questions.some(q => !Array.isArray(q.options) || q.options.length < 2 || q.options.filter(o => o.correct).length > 1)
  const apply = async () => {
    if (!access.canWrite || blockedReason || busy || applyLocked || inFlight.current || uncertain || !confirmed || unsupported || job?.status !== 'DONE') return
    inFlight.current = true
    setApplying(true)
    onApplyAttempt?.()
    onBusyChange(true)
    setError('')
    let applied = false
    try {
      await applyTeacherQuizExtraction(quizId, jobId)
      applied = true
    } catch (cause) {
      setUncertain(cause instanceof AmbiguousQuizImportError)
      setError(getErrorMessage(cause))
    } finally {
      inFlight.current = false
      setApplying(false)
      onBusyChange(false)
    }
    if (applied) onReload()
  }
  const warnings = [...(job?.warnings ?? []), ...(job?.result?.warnings ?? [])]
  const content = <div className="space-y-3">
    {warnings.length > 0 && <Notice tone="warning"><ul className="list-disc space-y-1 pl-5">{[...new Set(warnings)].map((warning, i) => <li key={i}>{warning}</li>)}</ul></Notice>}
    {Boolean(job?.result?.missingQuestions?.length) && <Notice tone="warning">Chưa đọc được các câu: {job?.result?.missingQuestions.join(', ')}. Rà soát đề gốc trước khi quyết định áp dụng.</Notice>}
    {job?.result?.sections?.map((section, i) => <p key={i} className="font-medium">{section.title}</p>)}
    {job?.result?.groups?.map((group, i) => <article key={i} className="rounded-xl border border-card-border p-3">
      <p className="whitespace-pre-wrap">{group.instruction}</p><p className="whitespace-pre-wrap">{group.passage}</p>
      {group.imageUrl && <img src={group.imageUrl} alt="Hình của nhóm câu hỏi" className="max-h-64 max-w-full object-contain" />}
    </article>)}
    {job?.result?.questions?.map((q, i) => <article key={i} className="space-y-2 rounded-xl border border-card-border p-3 text-sm">
      <p className="whitespace-pre-wrap break-words font-medium">Câu {q.number}. {q.text}</p>
      {q.imageUrl && <img src={q.imageUrl} alt={`Hình câu ${q.number}`} className="max-h-64 max-w-full object-contain" />}
      <ul className="space-y-1">{q.options.map((option, index) => <li key={index} className="whitespace-pre-wrap break-words">{option.label}. {option.text}{option.correct ? ' ✓ Đáp án đúng' : ''}</li>)}</ul>
      {q.explanation && <p className="whitespace-pre-wrap text-text-tertiary">Giải thích: {q.explanation}</p>}
      {q.reviewNote && <Notice tone="warning">{q.reviewNote}</Notice>}
    </article>)}
    {unsupported && <Notice tone="warning">Có câu hỏi ngoài dạng trắc nghiệm một đáp án. FE chưa cho áp dụng kết quả này; không tự chuyển đổi loại câu hỏi.</Notice>}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={applying || uncertain} onChange={e => setConfirmed(e.target.checked)} />Tôi đã rà soát nội dung, đáp án và các cảnh báo.</label>
    {blockedReason && <Notice tone="warning">{blockedReason}</Notice>}
    {applyLocked && <Notice tone="warning">Tải lại nội dung đề để kiểm tra kết quả trước khi áp dụng tiếp.</Notice>}
    {error && <Notice tone="danger" role="alert">{error}</Notice>}
  </div>

  return <div className="mb-4 space-y-3 rounded-xl border border-card-border bg-background-gray-secondary p-4" aria-label="Đọc đề PDF bằng AI">
    <h3 className="m-0 text-sm font-semibold">Đọc đề PDF bằng AI</h3>
    {reading && <p role="status" className="text-sm">{job?.progress || 'Đang chờ AI đọc đề…'} Không chỉnh sửa đề trong lúc đang xử lý. Nếu đề trống và đủ câu, BE có thể tự nhập kết quả.</p>}
    {job?.status === 'FAILED' && <Notice tone="danger">{job.error || 'AI không đọc được đề.'} File và bản nháp vẫn được giữ; chưa tự gửi lại yêu cầu.</Notice>}
    {job?.status === 'APPLIED' && <Notice>Kết quả AI đã được đưa vào đề. Tải lại nội dung để rà soát; không áp dụng lại tác vụ này.</Notice>}
    {job?.status === 'APPLIED' && warnings.length > 0 && <Notice tone="warning"><ul className="list-disc space-y-1 pl-5">{[...new Set(warnings)].map((warning, i) => <li key={i}>{warning}</li>)}</ul></Notice>}
    {job?.status === 'DONE' && <>
      <p className="text-sm">Đã đọc {job.questionCount ?? job.result?.questions.length ?? 0} câu; {job.needsReviewCount ?? 0} câu cần rà soát, {job.missingAnswerCount ?? 0} câu thiếu đáp án. Kết quả chưa được đưa vào đề.</p>
      <Button appearance="outline" disabled={busy || uncertain || !job.result} onClick={() => setPreview(true)}>Xem trước kết quả PDF</Button>
    </>}
    {error && !preview && <Notice tone="danger" role="alert">{error}{!uncertain && <Button appearance="outline" disabled={busy} onClick={() => setRetry(v => v + 1)}>Thử tải tiến trình</Button>}</Notice>}
    {(job?.status === 'APPLIED' || job?.status === 'FAILED' || job?.status === 'DONE' || uncertain) && <Button appearance="outline" disabled={busy || Boolean(blockedReason)} onClick={onReload}>Tải lại nội dung đề</Button>}
    {blockedReason && <p className="text-xs text-text-tertiary">{blockedReason}</p>}
    {preview && <ConsoleDialog open title="Rà soát kết quả đọc PDF" description="Nếu đề đã có câu hỏi, kết quả được thêm vào cuối; câu hỏi cũ được giữ nguyên. Đề chưa được xuất bản."
      onClose={() => { if (!inFlight.current) setPreview(false) }} dismissable={!applying} maxWidth={800}
      footer={<><Button appearance="outline" disabled={applying} onClick={() => setPreview(false)}>Đóng</Button>
        {uncertain ? <Button disabled={busy || Boolean(blockedReason)} onClick={onReload}>Tải lại nội dung đề</Button>
          : <Button disabled={busy || applyLocked || !confirmed || !job?.result?.questions.length || Boolean(unsupported) || Boolean(blockedReason)} onClick={() => void apply()}>{applying ? 'Đang áp dụng…' : 'Áp dụng câu hỏi vào bản nháp'}</Button>}</>}
    >{content}</ConsoleDialog>}
  </div>
}

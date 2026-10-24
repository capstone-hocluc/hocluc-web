import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useExtractionJob } from '../../../hooks/useExtractionJob'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { ApiError } from '../../../lib/api'
import { cn } from '../../../lib/cn'
import { getErrorMessage } from '../../../lib/errors'
import {
  applyExtractionJob,
  isAiDisabledError,
  startExamExtraction,
  uploadExamFile,
  type ApplyMode,
  type ExtractionJob,
} from '../../../services/aiExtractionService'
import {
  AmbiguousQuizImportError,
  type TeacherExamFile,
  type TeacherQuizImportResult,
} from '../../../services/teacherQuizService'
import Button from '../../console/button'
import Card, { CardEyebrow, CardTitle } from '../../console/card'
import ConfirmDialog from '../../console/confirm-dialog'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import Status from '../../console/status'
import ExtractionPreview from './ExtractionPreview'
import { previewCounts } from './extraction-preview-counts'

type TabState = 'done' | 'current' | 'failed' | 'locked'

const STAGES = ['Tải file', 'Tuỳ chọn', 'AI đọc', 'Duyệt', 'Áp dụng'] as const
const READING = 2
const REVIEW = 3
const APPLY = 4

interface Props {
  quizId: string | null
  examFile: TeacherExamFile | null
  latestJob: ExtractionJob | null
  existingQuestionCount: number
  blockedReason: string
  busy: boolean
  onReload: () => void
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function readingPercent(progress: string | null) {
  const match = progress?.match(/(\d+)\s*\/\s*(\d+)/)
  if (!match || Number(match[2]) === 0) return null
  return Math.min(100, Math.round((Number(match[1]) / Number(match[2])) * 100))
}

function pageNumber(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : Number(trimmed)
}

function describeFailure(cause: unknown, fallback: string) {
  if (isAiDisabledError(cause)) return 'AI chưa được bật trên máy chủ này.'
  if (cause instanceof ApiError && cause.status === 403) return 'Bạn không có quyền đọc đề cho bài này. Quyền theo môn/khóa do máy chủ kiểm tra.'
  if (cause instanceof ApiError && cause.status === 413) return 'File vượt giới hạn tải lên của máy chủ.'
  return getErrorMessage(cause) || fallback
}

/** Reading a PDF paper with AI as five steps; each step is a tab and the tabs show how far the run has got. */
export default function ExamExtractionPanel({ quizId, examFile: savedFile, latestJob, existingQuestionCount, blockedReason, busy, onReload }: Props) {
  const access = useQuizAccess()
  const tracker = useExtractionJob(quizId, latestJob)
  const { job } = tracker
  const [examFile, setExamFile] = useState(savedFile)
  const [picking, setPicking] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fromPage, setFromPage] = useState('')
  const [toPage, setToPage] = useState('')
  const [hints, setHints] = useState('')
  const [mode, setMode] = useState<ApplyMode>('REPLACE')
  const [pending, setPending] = useState<'upload' | 'start' | 'apply' | null>(null)
  const [actionError, setActionError] = useState('')
  const [uncertainApply, setUncertainApply] = useState(false)
  const [applied, setApplied] = useState<TeacherQuizImportResult | null>(null)
  const [confirmApply, setConfirmApply] = useState(false)
  const [selected, setSelected] = useState<{ at: string; index: number } | null>(null)
  const inFlight = useRef(false)

  if (!access.canWrite || !quizId) return null

  const running = job?.status === 'PENDING' || job?.status === 'RUNNING'
  const hasFile = examFile !== null
  const aiOff = tracker.aiDisabled
  const writeBlocked = busy || Boolean(blockedReason) || pending !== null

  const states: TabState[] = [
    hasFile ? 'done' : 'current',
    !hasFile ? 'locked' : job ? 'done' : 'current',
    !job ? 'locked' : running ? 'current' : job.status === 'FAILED' ? 'failed' : 'done',
    job && (job.status === 'DONE' || job.status === 'APPLIED') ? (job.status === 'DONE' ? 'current' : 'done') : 'locked',
    job?.status === 'DONE' ? 'current' : job?.status === 'APPLIED' ? 'done' : 'locked',
  ]
  const defaultStage = !hasFile ? 0 : !job ? 1 : running || job.status === 'FAILED' ? READING : job.status === 'DONE' ? REVIEW : APPLY
  const stageKey = `${hasFile}:${job?.id ?? ''}:${job?.status ?? ''}`
  const stage = selected?.at === stageKey && states[selected.index] !== 'locked' ? selected.index : defaultStage
  const goTo = (index: number) => { if (states[index] !== 'locked') setSelected({ at: stageKey, index }) }

  const editorIsStale = job?.status === 'APPLIED' && !(latestJob?.id === job.id && latestJob.status === 'APPLIED')
  const counts = job?.result ? previewCounts(job.result) : null
  const missing = job?.result?.missingQuestions.length ?? 0

  const metaLines = [
    hasFile ? examFile.fileName : 'Chưa có file',
    job ? (fromPage || toPage ? `Trang ${fromPage || 1}–${toPage || 'cuối'}` : 'Cả file') : hasFile ? 'Chọn phạm vi' : '—',
    !job ? '—' : running ? (job.progress || 'Đang đọc...') : job.status === 'FAILED' ? 'Bị lỗi' : 'Đã đọc xong',
    job?.questionCount != null && stageHasResult(job) ? `${job.questionCount} câu · ${job.needsReviewCount ?? 0} cần duyệt` : '—',
    job?.status === 'APPLIED' ? 'Đã đưa vào đề' : job?.status === 'DONE' ? 'Chờ áp dụng' : '—',
  ]

  const run = async (kind: 'upload' | 'start' | 'apply', action: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(kind)
    setActionError('')
    setUncertainApply(false)
    try {
      await action()
    } catch (cause) {
      if (isAiDisabledError(cause)) tracker.markAiDisabled()
      setUncertainApply(cause instanceof AmbiguousQuizImportError)
      setActionError(describeFailure(cause, 'Không thực hiện được. Hãy thử lại.'))
    } finally {
      inFlight.current = false
      setPending(null)
    }
  }

  const upload = () => file && run('upload', async () => {
    const record = await uploadExamFile(quizId, file)
    setExamFile(record.examFile)
    setFile(null)
    setPicking(false)
    setApplied(null)
    tracker.track(null)
  })

  const start = () => run('start', async () => {
    const from = pageNumber(fromPage)
    const to = pageNumber(toPage)
    tracker.track(await startExamExtraction(quizId, { fromPage: from, toPage: to, hints }))
    setApplied(null)
  })

  const apply = () => job && run('apply', async () => {
    setConfirmApply(false)
    setApplied(await applyExtractionJob(quizId, job.id, mode))
    tracker.track({ ...job, status: 'APPLIED' })
  })

  const requestApply = () => {
    if ((mode === 'REPLACE' && existingQuestionCount > 0) || missing > 0) setConfirmApply(true)
    else void apply()
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    for (let next = index + step; next >= 0 && next < STAGES.length; next += step) {
      if (states[next] !== 'locked') {
        goTo(next)
        document.getElementById(`extract-tab-${next}`)?.focus()
        return
      }
    }
  }

  const panels: ReactNode[] = [
    <div key="upload" className="space-y-4">
      {hasFile && !picking ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border p-4">
          <div className="min-w-0">
            <p className="m-0 break-words font-medium text-text-primary">{examFile.fileName}</p>
            <p className="m-0 text-xs text-text-tertiary">
              {formatSize(examFile.size)}{examFile.pageCount ? ` · ${examFile.pageCount} trang` : ''}
              {examFile.uploadedAt ? ` · tải lên ${new Date(examFile.uploadedAt).toLocaleString('vi-VN')}` : ''}
            </p>
          </div>
          <Button appearance="outline" className="min-h-11" disabled={writeBlocked || running} onClick={() => setPicking(true)}>Đổi file</Button>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
            Đề thi dạng PDF
            <input type="file" accept="application/pdf,.pdf" disabled={writeBlocked}
              className="w-full rounded-xl border border-card-border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-background-gray-secondary file:px-3 file:py-2 file:text-text-primary"
              onChange={(event) => {
                const chosen = event.target.files?.[0] ?? null
                setFile(null)
                setActionError('')
                if (!chosen) return
                if (!/\.pdf$/i.test(chosen.name)) { setActionError('AI chỉ đọc file .pdf.'); return }
                if (chosen.size === 0) { setActionError('File đang trống.'); return }
                setFile(chosen)
              }} />
          </label>
          {file && <p className="m-0 text-sm text-text-tertiary">{file.name} · {formatSize(file.size)}</p>}
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" disabled={!file || writeBlocked} onClick={() => void upload()}>
              {pending === 'upload' ? 'Đang tải lên...' : 'Tải file lên'}
            </Button>
            {hasFile && <Button appearance="outline" className="min-h-11" disabled={pending !== null} onClick={() => { setPicking(false); setFile(null); setActionError('') }}>Giữ file cũ</Button>}
          </div>
          {hasFile && <p className="m-0 text-xs text-text-tertiary">Đổi file không xoá câu hỏi đã có trong đề. Bạn sẽ chọn lại cách áp dụng ở bước cuối.</p>}
        </>
      )}
    </div>,

    <div key="options" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Từ trang
          <input inputMode="numeric" className={fieldControlClass} value={fromPage} placeholder="1" disabled={writeBlocked}
            onChange={(event) => setFromPage(event.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Đến trang
          <input inputMode="numeric" className={fieldControlClass} value={toPage}
            placeholder={examFile?.pageCount ? String(examFile.pageCount) : 'Trang cuối'} disabled={writeBlocked}
            onChange={(event) => setToPage(event.target.value.replace(/\D/g, ''))} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
        Gợi ý cho AI (không bắt buộc)
        <textarea className={textareaControlClass} rows={3} value={hints} disabled={writeBlocked} maxLength={1000}
          placeholder="Ví dụ: 120 câu, 3 phần; đáp án ở trang cuối"
          onChange={(event) => setHints(event.target.value)} />
      </label>
      {aiOff && <Notice tone="warning" role="alert">AI chưa được bật trên máy chủ này (cần cấu hình AI_PROVIDER). Bạn vẫn có thể tải file lên.</Notice>}
      {existingQuestionCount > 0 && <p className="m-0 text-xs text-text-tertiary">Đề đã có {existingQuestionCount} câu nên kết quả sẽ để bạn xem trước rồi mới áp dụng.</p>}
      <Button className="min-h-11" disabled={writeBlocked || running || aiOff || !hasFile} onClick={() => void start()}>
        {pending === 'start' ? 'Đang bắt đầu...' : job ? 'Đọc lại đề' : 'Đọc đề'}
      </Button>
    </div>,

    <div key="read" className="space-y-4">
      {job && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Status tone={running ? 'info' : job.status === 'FAILED' ? 'danger' : 'success'}>
              {job.status === 'PENDING' ? 'Đang chờ' : job.status === 'RUNNING' ? 'Đang đọc' : job.status === 'FAILED' ? 'Lỗi' : 'Đã đọc xong'}
            </Status>
            {(job.provider || job.model) && <span className="text-xs text-text-tertiary">{[job.provider, job.model].filter(Boolean).join(' · ')}</span>}
          </div>
          {running && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-background-gray-secondary" role="progressbar" aria-label="Tiến độ đọc đề"
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={readingPercent(job.progress) ?? undefined}>
                <div className={cn('h-full rounded-full bg-primary transition-[width]', readingPercent(job.progress) === null && 'w-1/3 animate-pulse')}
                  style={readingPercent(job.progress) === null ? undefined : { width: `${readingPercent(job.progress)}%` }} />
              </div>
              <p role="status" className="mt-2 mb-0 text-sm text-text-tertiary">{job.progress || 'Đang đọc đề...'}</p>
              <p className="mt-1 mb-0 text-xs text-text-tertiary">Bạn có thể rời trang; lần sau mở lại bài, tiến độ sẽ được nối tiếp.</p>
            </div>
          )}
          {job.status === 'FAILED' && (
            <Notice tone="danger" role="alert"><div className="min-w-0 break-words">{job.error || 'AI không đọc được đề này.'}</div></Notice>
          )}
          {(job.status === 'DONE' || job.status === 'APPLIED') && job.progress && <p className="m-0 text-sm text-text-tertiary">{job.progress}</p>}
          <div className="flex flex-wrap gap-2">
            {job.status === 'FAILED' && <Button className="min-h-11" disabled={writeBlocked || aiOff} onClick={() => void start()}>{pending === 'start' ? 'Đang bắt đầu...' : 'Đọc lại'}</Button>}
            {job.status === 'DONE' && <Button className="min-h-11" onClick={() => goTo(REVIEW)}>Duyệt kết quả</Button>}
          </div>
        </>
      )}
    </div>,

    <div key="review" className="space-y-4">
      {job?.result ? <ExtractionPreview exam={job.result} />
        : tracker.error ? null
          : <p role="status" className="m-0 text-sm text-text-tertiary">Đang tải kết quả...</p>}
      {job?.status === 'DONE' && job.result && <Button className="min-h-11" onClick={() => goTo(APPLY)}>Tiếp tục: áp dụng</Button>}
    </div>,

    <div key="apply" className="space-y-4">
      {job?.status === 'DONE' && (
        <>
          <fieldset className="m-0 space-y-2 border-0 p-0" disabled={writeBlocked}>
            <legend className="mb-2 p-0 text-sm font-medium text-text-primary">Cách đưa vào đề</legend>
            {([
              ['REPLACE', 'Thay thế', `Xoá các phần, nhóm và câu hiện có${existingQuestionCount ? ` (${existingQuestionCount} câu)` : ''} rồi đưa kết quả vào.`],
              ['APPEND', 'Thêm vào cuối', 'Giữ nguyên nội dung hiện có, câu mới được đánh số tiếp theo.'],
            ] as const).map(([value, label, hint]) => (
              <label key={value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-card-border p-3 text-sm">
                <input type="radio" name="extract-apply-mode" className="mt-1" checked={mode === value} onChange={() => setMode(value)} />
                <span><span className="block font-medium text-text-primary">{label}</span><span className="text-text-tertiary">{hint}</span></span>
              </label>
            ))}
          </fieldset>
          {job.result && (
            <p className="m-0 text-sm text-text-tertiary">
              Sẽ đưa vào {job.result.sections.length} phần, {job.result.groups.length} nhóm, {job.result.questions.length} câu
              {counts && counts.review > 0 ? `; ${counts.review} câu nên duyệt lại sau khi áp dụng` : ''}.
            </p>
          )}
          {missing > 0 && <Notice tone="danger" role="alert">Còn thiếu {missing} câu so với số in trên đề. Bạn nên đọc lại trước khi áp dụng.</Notice>}
          <Button className="min-h-11" disabled={writeBlocked} onClick={requestApply}>{pending === 'apply' ? 'Đang áp dụng...' : 'Áp dụng vào đề'}</Button>
        </>
      )}
      {job?.status === 'APPLIED' && (
        <>
          <Notice>{applied ? 'Đã áp dụng vào bản nháp. Bài chưa được tự động xuất bản.' : 'Kết quả đọc đề đã nằm trong bản nháp. Bài chưa được tự động xuất bản.'}</Notice>
          <dl className="m-0 grid grid-cols-2 gap-3 rounded-xl border border-card-border p-4 text-sm sm:grid-cols-3">
            {(applied
              ? [['Câu hỏi đã thêm', applied.questionsAdded], ['Tổng câu hỏi', applied.totalQuestions], ['Phần đã thêm', applied.sectionsAdded],
                ['Nhóm đã thêm', applied.groupsAdded], ['Câu cần rà soát', applied.needsReview], ['Câu thiếu đáp án', applied.missingAnswers]]
              : [['Số câu đọc được', job.questionCount ?? '—'], ['Câu cần rà soát', job.needsReviewCount ?? '—'], ['Câu thiếu đáp án', job.missingAnswerCount ?? '—']]
            ).map(([label, value]) => <div key={label}><dt className="text-text-tertiary">{label}</dt><dd className="m-0 text-lg font-semibold text-text-primary">{value}</dd></div>)}
          </dl>
          {Boolean((applied?.warnings ?? job.warnings)?.length) && (
            <Notice tone="warning"><div><strong>Cảnh báo</strong>
              <ul className="mt-2 mb-0 list-disc space-y-1 pl-5">{(applied?.warnings ?? job.warnings)?.map((warning, index) => <li key={index} className="whitespace-pre-wrap break-words">{warning}</li>)}</ul>
            </div></Notice>
          )}
          {editorIsStale && <Button className="min-h-11" onClick={onReload}>Xem các phần và câu hỏi</Button>}
        </>
      )}
    </div>,
  ]

  return (
    <Card as="section" padding="lg" aria-labelledby="exam-extract-title">
      <div className="mb-4">
        <CardEyebrow>ĐỌC ĐỀ BẰNG AI</CardEyebrow>
        <CardTitle id="exam-extract-title" className="mb-0 text-base">Đưa đề PDF thành câu hỏi</CardTitle>
      </div>
      {blockedReason && <p className="mt-0 mb-4 text-xs text-text-tertiary">{blockedReason}</p>}
      <div role="tablist" aria-label="Các bước đọc đề" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {STAGES.map((label, index) => {
          const state = states[index]
          const active = stage === index
          return (
            <button key={label} id={`extract-tab-${index}`} type="button" role="tab" aria-selected={active} aria-controls={`extract-panel-${index}`}
              aria-disabled={state === 'locked'} tabIndex={active ? 0 : -1} disabled={state === 'locked'}
              onClick={() => goTo(index)} onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cn(
                'flex min-h-14 min-w-32 flex-1 flex-col gap-0.5 rounded-xl border-0 border-b-4 bg-background-gray-secondary px-3 py-2 text-left',
                state === 'done' && 'border-b-badge-success-text',
                state === 'current' && 'border-b-primary',
                state === 'failed' && 'border-b-badge-danger-text',
                state === 'locked' && 'cursor-not-allowed border-b-transparent opacity-60',
                active && 'ring-2 ring-primary/40',
              )}>
              <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <span aria-hidden="true">{state === 'done' ? '✓' : state === 'failed' ? '!' : index + 1}</span>
                {label}
                <span className="sr-only">{state === 'done' ? ' (đã xong)' : state === 'failed' ? ' (lỗi)' : state === 'locked' ? ' (chưa tới)' : ''}</span>
              </span>
              <span className="truncate text-xs text-text-tertiary">{metaLines[index]}</span>
            </button>
          )
        })}
      </div>
      <div id={`extract-panel-${stage}`} role="tabpanel" aria-labelledby={`extract-tab-${stage}`} tabIndex={0} className="space-y-4">
        {panels[stage]}
        {actionError && <Notice tone="danger" role="alert">{actionError}</Notice>}
        {uncertainApply && <Button appearance="outline" className="min-h-11" onClick={onReload}>Tải lại bài để kiểm tra</Button>}
        {tracker.error && <Notice tone="warning" role="alert">Không cập nhật được tiến độ: {tracker.error}</Notice>}
      </div>
      {confirmApply && (
        <ConfirmDialog
          title="Áp dụng kết quả đọc đề?"
          description={
            <div className="space-y-2">
              {mode === 'REPLACE' && existingQuestionCount > 0 && <p className="m-0">Chế độ thay thế sẽ xoá {existingQuestionCount} câu hiện có trong đề.</p>}
              {missing > 0 && <p className="m-0">Bản đọc này còn thiếu {missing} câu so với số in trên đề.</p>}
            </div>
          }
          cancelLabel="Quay lại" confirmLabel="Áp dụng" variant="danger"
          busy={pending === 'apply'} busyLabel="Đang áp dụng..."
          onCancel={() => setConfirmApply(false)} onConfirm={() => void apply()} />
      )}
    </Card>
  )
}

function stageHasResult(job: ExtractionJob) {
  return job.status === 'DONE' || job.status === 'APPLIED'
}

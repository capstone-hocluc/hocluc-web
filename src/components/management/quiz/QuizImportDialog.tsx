import { useRef, useState } from 'react'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { AmbiguousQuizImportError, importTeacherQuizFile, type TeacherQuizImportResult } from '../../../services/teacherQuizService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'

const sample = `Câu 1. 2 + 2 bằng bao nhiêu?
A. 3
B. 4
C. 5
D. 6
Đáp án: B
Giải thích: 2 + 2 = 4.
`
const sampleUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(sample)}`

interface Props {
  quizId: string | null
  blockedReason: string
  busy: boolean
  onReload: () => void
}

/** One entry point for course quizzes, placement assessments and mock exams. */
export default function QuizImportDialog({ quizId, blockedReason, busy, onReload }: Props) {
  const access = useQuizAccess()
  const [open, setOpen] = useState(false)
  if (!access.canWrite) return null
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button appearance="outline" className="min-h-11" disabled={busy || Boolean(blockedReason) || !quizId} onClick={() => setOpen(true)}>
        Nhập câu hỏi từ file
      </Button>
      {blockedReason && <p className="m-0 max-w-sm text-xs text-text-tertiary">{blockedReason}</p>}
      {open && quizId && <ImportDialog quizId={quizId} onExit={(reload) => {
        setOpen(false)
        if (reload) onReload()
      }} />}
    </div>
  )
}

function ImportDialog({ quizId, onExit }: { quizId: string; onExit: (reload: boolean) => void }) {
  const access = useQuizAccess()
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TeacherQuizImportResult | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const inFlight = useRef(false)
  const attempted = useRef(false)

  const submit = async () => {
    if (!access.canWrite || !file || pending || inFlight.current || result || uncertain) return
    inFlight.current = true
    attempted.current = true
    setPending(true)
    setError('')
    try {
      setResult(await importTeacherQuizFile(quizId, file))
    } catch (cause) {
      setUncertain(cause instanceof AmbiguousQuizImportError)
      setError(cause instanceof ApiError && cause.status === 403
        ? 'Bạn không có quyền nhập câu hỏi vào bài này. Quyền theo môn/khóa do máy chủ kiểm tra.'
        : cause instanceof ApiError && cause.status === 413
          ? 'File vượt giới hạn tải lên của máy chủ. Hãy chia thành các file nhỏ hơn.'
          : getErrorMessage(cause))
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  const close = () => { if (!inFlight.current) onExit(attempted.current) }

  return (
    <ConsoleDialog open title="Nhập câu hỏi từ file" description="Thêm câu hỏi vào cuối bản nháp hiện tại." maxWidth={640}
      dismissable={!pending} onClose={close}
      footer={<>
        <Button appearance="outline" disabled={pending} onClick={close}>{result || uncertain ? 'Tải lại bài để kiểm tra' : 'Đóng'}</Button>
        {!result && !uncertain && <Button disabled={!file || pending || !access.canWrite} onClick={() => void submit()}>
          {pending ? 'Đang nhập...' : 'Nhập vào bản nháp'}
        </Button>}
      </>}
    >
      <div className="space-y-4">
        {result ? <>
          <Notice>Đã nhập câu hỏi vào bản nháp. Bài chưa được tự động xuất bản.</Notice>
          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-card-border p-4 text-sm">
            {[
              ['Câu hỏi đã thêm', result.questionsAdded], ['Tổng câu hỏi', result.totalQuestions],
              ['Phần đã thêm', result.sectionsAdded], ['Nhóm đã thêm', result.groupsAdded],
              ['Câu cần rà soát', result.needsReview], ['Câu thiếu đáp án', result.missingAnswers],
            ].map(([label, count]) => <div key={label}><dt className="text-text-tertiary">{label}</dt><dd className="m-0 font-semibold text-text-primary">{count}</dd></div>)}
          </dl>
          {Boolean(result.warnings?.length) && <Notice tone="warning"><div><strong>Cảnh báo từ máy chủ</strong><ul className="mt-2 list-disc space-y-1 pl-5">{result.warnings?.map((warning, index) => <li key={index} className="whitespace-pre-wrap break-words">{warning}</li>)}</ul></div></Notice>}
          <p className="text-sm text-text-tertiary">Kiểm tra câu hỏi, đáp án và môn đánh giá trước khi xuất bản. Nhóm câu hỏi hoặc phần lồng nhau chưa hỗ trợ sửa sẽ được giữ ở chế độ chỉ xem.</p>
        </> : <>
          <Notice tone="warning">Nội dung được lưu trực tiếp vào bản nháp sau khi nhập. Câu hỏi cũ được giữ nguyên. Không có bước xem trước trước khi lưu.</Notice>
          <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
            File câu hỏi (.docx, .txt, .md)
            <input type="file" accept=".docx,.txt,.md" disabled={pending || uncertain} className="w-full rounded-xl border border-card-border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-background-gray-secondary file:px-3 file:py-2 file:text-text-primary"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null
                setFile(null)
                setError('')
                if (!selected) return
                if (!/\.(docx|txt|md)$/i.test(selected.name)) { setError('Chỉ hỗ trợ file .docx, .txt hoặc .md.'); return }
                if (selected.size === 0) { setError('File đang trống. Hãy chọn file có nội dung câu hỏi.'); return }
                setFile(selected)
              }} />
          </label>
          <details className="rounded-xl border border-card-border p-3 text-sm text-text-tertiary">
            <summary className="cursor-pointer font-medium text-text-primary">Hướng dẫn định dạng và file mẫu</summary>
            <p>Mỗi câu và mỗi lựa chọn viết trên một dòng. Dùng “Đáp án: B” để chỉ định đáp án đúng. File TXT/MD dùng UTF-8; trong Word cũng dùng cấu trúc văn bản này.</p>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-background-gray-secondary p-3">{sample}</pre>
            <a href={sampleUrl} download="mau-nhap-cau-hoi.txt" className="font-medium underline">Tải file mẫu TXT</a>
            <p>Excel và PDF không thuộc luồng nhập này. Ảnh, công thức và bảng phức tạp trong Word cần được kiểm tra lại sau khi nhập.</p>
          </details>
        </>}
        {pending && <p role="status" className="text-sm text-text-tertiary">Đang xử lý file. Vui lòng chờ và không gửi lại yêu cầu.</p>}
        {error && <Notice tone="danger" role="alert">{error}</Notice>}
      </div>
    </ConsoleDialog>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { AmbiguousQuizFileCreateError, AmbiguousQuizImportError, createTeacherQuizWithFile, importTeacherQuizFile,
  type CreateTeacherQuizRequest, type TeacherQuizImportResult, type TeacherQuizWithFileResult } from '../../../services/teacherQuizService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'

const sample = `Câu 1. [Điền nội dung câu hỏi tại đây]
A. [Điền nội dung lựa chọn A tại đây]
B. [Điền nội dung lựa chọn B tại đây]
C. [Điền nội dung lựa chọn C tại đây]
D. [Điền nội dung lựa chọn D tại đây]
Đáp án: [Điền ký tự đáp án đúng tại đây]
Giải thích: [Điền giải thích tại đây hoặc xóa dòng này]
`
const sampleFiles = [
  { format: 'Word (.docx)', extension: 'docx' },
  { format: 'TXT (.txt)', extension: 'txt' },
  { format: 'Markdown (.md)', extension: 'md' },
]

interface Props {
  quizId: string | null
  blockedReason: string
  busy: boolean
  onReload: () => void
  getCreateRequest?: () => CreateTeacherQuizRequest | null
  onCreated?: (quizId: string) => void
  onUncertainCreate?: () => void
  onBusyChange?: (busy: boolean) => void
}

/** One entry point for course quizzes, placement assessments and mock exams. */
export default function QuizImportDialog({ quizId, blockedReason, busy, onReload, getCreateRequest, onCreated, onUncertainCreate, onBusyChange }: Props) {
  const access = useQuizAccess()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  if (!access.canWrite) return null
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button appearance="outline" className="min-h-11" disabled={busy || Boolean(blockedReason) || (!quizId && !getCreateRequest)} onClick={() => {
        if (!quizId && !getCreateRequest?.()) return
        setOpen(true)
      }}>
        Nhập câu hỏi từ file
      </Button>
      {blockedReason && <p className="m-0 max-w-sm text-xs text-text-tertiary">{blockedReason}</p>}
      {open && (quizId || getCreateRequest) && <ImportDialog quizId={quizId} getCreateRequest={getCreateRequest} file={file} onFileChange={setFile}
        onBusyChange={onBusyChange} onUncertainCreate={onUncertainCreate} onExit={(reload, createdId) => {
        setOpen(false)
        if (createdId) onCreated?.(createdId)
        else if (reload && quizId) onReload()
      }} />}
    </div>
  )
}

function ImportDialog({ quizId, getCreateRequest, file, onFileChange, onExit, onUncertainCreate, onBusyChange }: {
  quizId: string | null; getCreateRequest?: () => CreateTeacherQuizRequest | null
  file: File | null; onFileChange: (file: File | null) => void
  onExit: (reload: boolean, createdId: string | null) => void
  onUncertainCreate?: () => void; onBusyChange?: (busy: boolean) => void
}) {
  const access = useQuizAccess()
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!fileInput.current) return
    const selected = new DataTransfer()
    if (file) selected.items.add(file)
    fileInput.current.files = selected.files
  }, [file])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TeacherQuizImportResult | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const [created, setCreated] = useState<TeacherQuizWithFileResult | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const creating = !quizId
  const inFlight = useRef(false)
  const attempted = useRef(false)

  const submit = async () => {
    if (!access.canWrite || !file || pending || inFlight.current || result || created || uncertain) return
    const createRequest = creating ? getCreateRequest?.() : null
    if (creating && !createRequest) {
      setError('Thông tin đề còn thiếu hoặc chưa hợp lệ. Đóng cửa sổ để bổ sung các trường được đánh dấu; file đã chọn vẫn được giữ.')
      return
    }
    inFlight.current = true
    attempted.current = true
    setPending(true)
    onBusyChange?.(true)
    setError('')
    try {
      if (quizId) setResult(await importTeacherQuizFile(quizId, file))
      else if (createRequest) {
        const response = await createTeacherQuizWithFile(createRequest, file)
        setCreated(response)
        setCreatedId(response.quiz.id)
        setResult(response.imported)
      }
    } catch (cause) {
      setUncertain(cause instanceof AmbiguousQuizImportError || cause instanceof AmbiguousQuizFileCreateError)
      if (cause instanceof AmbiguousQuizFileCreateError) {
        setCreatedId(cause.quizId)
        onUncertainCreate?.()
      }
      setError(cause instanceof ApiError && cause.status === 403
        ? 'Bạn không có quyền nhập câu hỏi vào bài này. Quyền theo môn/khóa do máy chủ kiểm tra.'
        : cause instanceof ApiError && cause.status === 413
          ? 'File vượt giới hạn tải lên của máy chủ. Hãy chia thành các file nhỏ hơn.'
          : getErrorMessage(cause))
    } finally {
      inFlight.current = false
      setPending(false)
      onBusyChange?.(false)
    }
  }
  const close = () => { if (!inFlight.current) onExit(attempted.current, createdId) }

  return (
    <ConsoleDialog open title="Nhập câu hỏi từ file" description={creating ? 'Tạo bản nháp và nhập file trong một lần.' : 'Thêm câu hỏi vào cuối bản nháp hiện tại.'} maxWidth={640}
      dismissable={!pending} onClose={close}
      footer={<>
        <Button appearance="outline" disabled={pending} onClick={close}>{createdId ? 'Mở bản nháp để rà soát' : result || uncertain ? creating ? 'Đóng và kiểm tra danh sách đề' : 'Tải lại bài để kiểm tra' : 'Đóng'}</Button>
        {!result && !created && !uncertain && <Button disabled={!file || pending || !access.canWrite} onClick={() => void submit()}>
          {pending ? 'Đang nhập...' : creating ? 'Tạo bản nháp và nhập câu hỏi' : 'Nhập vào bản nháp'}
        </Button>}
      </>}
    >
      <div className="space-y-4">
        {created && <>
          <Notice>Đã tạo bản nháp. Đề chưa được xuất bản.</Notice>
          {created.aiJob && <Notice>PDF đã được lưu. Mở bản nháp để theo dõi AI và rà soát kết quả. BE có thể tự nhập vào đề trống; nếu chưa áp dụng, bạn sẽ xem trước và xác nhận.</Notice>}
          {created.warnings.length > 0 && <Notice tone="warning"><ul className="list-disc space-y-1 pl-5">{created.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></Notice>}
          {!created.imported && !created.aiJob && <p className="text-sm text-text-tertiary">File đã lưu; chưa nhập câu hỏi. Kiểm tra cảnh báo của máy chủ trước khi tiếp tục.</p>}
        </>}
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
        </> : !created && <>
          <Notice tone="warning">{creating ? 'Thông tin đề và file được gửi cùng lúc. DOCX/TXT/MD nhập câu hỏi trực tiếp; PDF cần chờ AI và rà soát kết quả. Đề luôn được tạo ở trạng thái nháp.' : 'Nội dung được lưu trực tiếp vào bản nháp sau khi nhập. Câu hỏi cũ được giữ nguyên. Không có bước xem trước trước khi lưu.'}</Notice>
          <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
            {creating ? 'File đề (.pdf, .docx, .txt, .md)' : 'File câu hỏi (.docx, .txt, .md)'}
            <input ref={fileInput} type="file" accept={creating ? '.pdf,.docx,.txt,.md' : '.docx,.txt,.md'} disabled={pending || uncertain} className="w-full rounded-xl border border-card-border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-background-gray-secondary file:px-3 file:py-2 file:text-text-primary"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null
                onFileChange(null)
                setError('')
                if (!selected) return
                if (!(creating ? /\.(pdf|docx|txt|md)$/i : /\.(docx|txt|md)$/i).test(selected.name)) { setError(creating ? 'Chỉ hỗ trợ file .pdf, .docx, .txt hoặc .md.' : 'Chỉ hỗ trợ file .docx, .txt hoặc .md.'); return }
                if (selected.size === 0) { setError('File đang trống. Hãy chọn file có nội dung câu hỏi.'); return }
                onFileChange(selected)
              }} />
          </label>
          <details className="rounded-xl border border-card-border p-3 text-sm text-text-tertiary">
            <summary className="cursor-pointer font-medium text-text-primary">Hướng dẫn định dạng và file mẫu</summary>
            <div className="mt-3 space-y-4">
              <ol className="list-decimal space-y-2 pl-5">
                <li>Bắt đầu mỗi câu bằng <code>Câu 1.</code>, <code>Câu 2.</code>… Mỗi lựa chọn <code>A.</code>, <code>B.</code>, <code>C.</code>… nằm trên một dòng riêng.</li>
                <li>Ghi đáp án ở dòng <code>Đáp án: B</code>. Có thể thêm dòng <code>Giải thích:</code> ngay bên dưới.</li>
                <li>Dùng văn bản thường trong Word; lưu TXT/Markdown bằng UTF-8. Giữ tiền tố và cách xuống dòng như mẫu.</li>
              </ol>
              <p className="text-xs">Mỗi câu chỉ chọn một đáp án đúng. Câu nhiều đáp án do BE nhập vào sẽ chỉ xem trong editor; import chưa hỗ trợ các dạng câu hỏi khác.</p>
              <div>
                <p className="mb-2 font-medium text-text-primary">Mẫu cấu trúc câu hỏi</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-background-gray-secondary p-3 text-xs leading-6">{sample}</pre>
              </div>
              <div>
                <p className="mb-2 font-medium text-text-primary">Tải file mẫu</p>
                <p className="mb-3 text-xs">Ba định dạng cùng một mẫu điền trống. Thay nội dung trong ngoặc vuông; dòng đáp án chỉ ghi ký tự lựa chọn đúng. Sao chép khối câu hỏi và tăng số thứ tự để thêm câu.</p>
                <div className="flex flex-wrap gap-2">
                  {sampleFiles.map(({ format, extension }) => (
                    <Button key={extension} asChild appearance="outline" size="sm" className="min-h-10">
                      <a href={`${import.meta.env.BASE_URL}templates/quiz-import/mau-nhap-cau-hoi.${extension}`} download={`mau-nhap-cau-hoi.${extension}`} aria-label={`Tải file mẫu ${format}`}>
                        {format}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
              <p className="border-t border-card-border pt-3 text-xs">{creating ? 'PDF dùng luồng đọc bằng AI và cần rà soát trước khi áp dụng. Chưa hỗ trợ Excel.' : 'Chưa hỗ trợ Excel/PDF trong luồng nhập thêm này.'} Kiểm tra lại nội dung sau khi nhập, nhất là ảnh, bảng và công thức trong Word.</p>
            </div>
          </details>
        </>}
        {pending && <p role="status" className="text-sm text-text-tertiary">Đang xử lý file. Vui lòng chờ và không gửi lại yêu cầu.</p>}
        {error && <Notice tone="danger" role="alert">{error}</Notice>}
      </div>
    </ConsoleDialog>
  )
}

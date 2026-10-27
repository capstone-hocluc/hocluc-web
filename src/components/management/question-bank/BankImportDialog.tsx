import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../lib/errors'
import { importBankPaper, type BankAnswerSource, type BankSource } from '../../../services/questionBankService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Field, { fieldControlClass } from '../../console/form-field'
import FileField from '../../console/file-field'
import Notice from '../../console/notice'
import SelectField from '../../console/select-field'

const KEY_SOURCES: { id: BankAnswerSource; label: string }[] = [
  { id: 'REFERENCE_KEY', label: 'Đáp án tham khảo' },
  { id: 'PUBLISHED_KEY', label: 'Đáp án chính thức' },
]

export default function BankImportDialog({
  again,
  onClose,
  onQueued,
}: {
  /** A paper in the list loaded again: its details are filled in and its row is reused. */
  again?: BankSource
  onClose: () => void
  onQueued: (source: BankSource) => void
}) {
  const [exam, setExam] = useState<File | null>(null)
  const [key, setKey] = useState<File | null>(null)
  const [title, setTitle] = useState(again?.title ?? '')
  const [year, setYear] = useState(again?.year != null ? String(again.year) : '')
  const [round, setRound] = useState(again?.round ?? '')
  const [answerSource, setAnswerSource] = useState<BankAnswerSource>(
    again?.answerSource === 'PUBLISHED_KEY' ? 'PUBLISHED_KEY' : 'REFERENCE_KEY'
  )
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const yearValue = year.trim() ? Number(year) : undefined
  const yearInvalid = yearValue !== undefined && (!Number.isInteger(yearValue) || yearValue < 2000 || yearValue > 2100)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!exam || yearInvalid || busy) return
    // The AI reads every page of the paper, so the upload waits for a second, explicit click.
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    setError('')
    try {
      onQueued(
        await importBankPaper({
          code: again?.code,
          exam,
          key,
          title: title.trim() || undefined,
          year: yearValue,
          round: round.trim() || undefined,
          answerSource: key ? answerSource : undefined,
        })
      )
    } catch (reason) {
      setError(getErrorMessage(reason))
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  const edit = () => {
    setConfirming(false)
    setError('')
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title={again ? `Nạp lại đề ${again.title}` : 'Nhập đề vào ngân hàng'}
      maxWidth={600}
      dismissable={!busy}
      onSubmit={submit}
      footer={
        <>
          <Button appearance="outline" onClick={confirming ? edit : onClose} disabled={busy}>
            {confirming ? 'Quay lại' : 'Hủy'}
          </Button>
          <Button type="submit" disabled={!exam || yearInvalid || busy}>
            {busy ? 'Đang gửi...' : confirming ? 'Xác nhận nhập' : 'Tiếp tục'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {again && <Notice tone="info">Đề này chưa được lưu file trên máy chủ. Chọn lại đúng file đề và file đáp án.</Notice>}
        <Field label="File đề (PDF)">
          <FileField
            value={exam}
            onChange={setExam}
            accept=".pdf,application/pdf"
            ariaLabel="File đề (PDF)"
            placeholder="Chọn hoặc kéo file PDF của đề vào đây"
            disabled={busy || confirming}
          />
        </Field>
        <Field label="File đáp án" hint="PDF, TXT hoặc Markdown. Bỏ trống nếu đề chưa có đáp án.">
          <FileField
            value={key}
            onChange={setKey}
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            ariaLabel="File đáp án"
            placeholder="Chọn hoặc kéo file đáp án vào đây"
            disabled={busy || confirming}
          />
        </Field>
        {key && (
          <Field label="Nguồn đáp án">
            <SelectField
              ariaLabel="Nguồn đáp án"
              value={answerSource}
              disabled={busy || confirming}
              options={KEY_SOURCES}
              onChange={value => setAnswerSource(value as BankAnswerSource)}
            />
          </Field>
        )}
        <Field label="Tên đề">
          <input
            className={fieldControlClass}
            value={title}
            maxLength={200}
            placeholder="Mặc định lấy theo tên file"
            disabled={busy || confirming}
            onChange={event => setTitle(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Năm">
            <input
              className={fieldControlClass}
              inputMode="numeric"
              value={year}
              maxLength={4}
              placeholder="Ví dụ: 2025"
              aria-invalid={yearInvalid || undefined}
              disabled={busy || confirming}
              onChange={event => setYear(event.target.value)}
            />
          </Field>
          <Field label="Đợt">
            <input
              className={fieldControlClass}
              value={round}
              maxLength={40}
              placeholder="Ví dụ: mẫu, đợt 1"
              disabled={busy || confirming}
              onChange={event => setRound(event.target.value)}
            />
          </Field>
        </div>
        {yearInvalid && <Notice tone="danger">Năm phải là số từ 2000 đến 2100.</Notice>}
        {confirming && (
          <Notice tone="warning">
            AI sẽ đọc toàn bộ đề và Jev gán nhãn từng câu, việc này tốn token. Đề được xếp hàng và xử lý nền.
          </Notice>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
      </div>
    </ConsoleDialog>
  )
}

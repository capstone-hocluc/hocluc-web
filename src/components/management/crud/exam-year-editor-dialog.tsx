import DateField from '../../console/date-field'
import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import {
  createExamYear,
  updateExamYear,
  type ExamYear,
  type SaveExamSessionRequest,
} from '../../../services/examYearService'
import { getFieldErrors } from '../../../lib/errors'
import { crudError, unknownMutation } from './crud-errors'

interface Props {
  year: ExamYear | null
  onClose: () => void
  onSaved: () => void
}

/** A new year starts with Đợt 1 and Đợt 2 when their dates are filled in; both stay "dự kiến" until confirmed. */
export default function ExamYearEditorDialog({ year, onClose, onSaved }: Props) {
  const [examYear, setExamYear] = useState(String(year?.examYear ?? new Date().getFullYear() + 1))
  const [round1Date, setRound1Date] = useState('')
  const [round2Date, setRound2Date] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)
  const yearNumber = Number(examYear)
  const defaultName =
    Number.isInteger(yearNumber) && yearNumber > 2000
      ? `Năm thi ${yearNumber - 1}-${yearNumber}`
      : ''

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (busy || uncertain) return
    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '').trim() || null
    setBusy(true)
    setError('')
    setFields({})
    try {
      const payload = { examYear: yearNumber, name: text('name'), note: text('note') }
      if (year) {
        await updateExamYear(year.id, { ...payload, expectedUpdatedAt: year.updatedAt })
      } else {
        const sessions: SaveExamSessionRequest[] = [1, 2].flatMap((round) => {
          const date = text(`round${round}Date`)
          return date ? [{ roundNo: round, examStartDate: date, dateConfirmed: false }] : []
        })
        await createExamYear({ ...payload, sessions })
      }
      onSaved()
    } catch (err) {
      setError(crudError(err))
      setFields(getFieldErrors(err))
      setUncertain(unknownMutation(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      title={year ? 'Sửa năm thi' : 'Tạo năm thi'}
      description={
        year
          ? year.name
          : 'Năm mới ở trạng thái nháp, học viên chưa thấy cho tới khi đặt làm năm hiện tại.'
      }
      onClose={onClose}
      onSubmit={(e) => void submit(e)}
      maxWidth={640}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            {uncertain ? 'Đóng và kiểm tra' : 'Hủy'}
          </Button>
          <Button type="submit" disabled={busy || uncertain}>
            {busy ? 'Đang lưu...' : 'Lưu năm thi'}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
        {uncertain && (
          <Notice tone="warning">
            Chưa rõ kết quả lưu. Đóng form và tải lại trước khi thử tiếp.
          </Notice>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Năm diễn ra kỳ thi" hint="Ví dụ 2027 cho Năm thi 2026-2027.">
            <input
              name="examYear"
              type="number"
              required
              min={2000}
              max={2100}
              step={1}
              value={examYear}
              onChange={(event) => setExamYear(event.target.value)}
              className={fieldControlClass}
              aria-invalid={!!fields.examYear}
            />
          </Field>
          <Field label="Tên hiển thị" hint="Để trống để dùng tên mặc định.">
            <input
              name="name"
              maxLength={100}
              defaultValue={year?.name ?? ''}
              placeholder={defaultName}
              className={fieldControlClass}
              aria-invalid={!!fields.name}
            />
          </Field>
        </div>
        {!year && (
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField label="Ngày thi Đợt 1" hint="Có thể để trống và thêm sau." name="round1Date" value={round1Date} onChange={setRound1Date} disabled={busy} />
            <DateField label="Ngày thi Đợt 2" hint="Có thể để trống và thêm sau." name="round2Date" value={round2Date} onChange={setRound2Date} disabled={busy} />
          </div>
        )}
        <Field label="Ghi chú">
          <textarea
            name="note"
            maxLength={10000}
            defaultValue={year?.note ?? ''}
            className={textareaControlClass}
          />
        </Field>
        {Object.entries(fields).map(([field, message]) => (
          <p key={field} role="alert" className="text-sm text-danger">
            {field}: {message}
          </p>
        ))}
      </fieldset>
    </ConsoleDialog>
  )
}

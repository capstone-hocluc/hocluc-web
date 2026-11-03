import DateField from '../../console/date-field'
import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import { Checkbox } from '../../tailgrids/core/checkbox'
import {
  addExamSession,
  updateExamSession,
  type ExamSession,
  type ExamYear,
} from '../../../services/examYearService'
import { getFieldErrors } from '../../../lib/errors'
import { crudError, unknownMutation } from './crud-errors'

interface Props {
  year: ExamYear
  session: ExamSession | null
  onClose: () => void
  onSaved: () => void
}

export default function ExamSessionEditorDialog({ year, session, onClose, onSaved }: Props) {
  const nextRound = Math.max(0, ...year.sessions.map((s) => s.roundNo)) + 1
  const [roundNo, setRoundNo] = useState(String(session?.roundNo ?? nextRound))
  const [examStartDate, setExamStartDate] = useState(session?.examStartDate ?? '')
  const [examEndDate, setExamEndDate] = useState(session?.examEndDate ?? '')
  const [registrationOpenDate, setRegistrationOpenDate] = useState(session?.registrationOpenDate ?? '')
  const [registrationCloseDate, setRegistrationCloseDate] = useState(session?.registrationCloseDate ?? '')
  const [dateConfirmed, setDateConfirmed] = useState(session?.dateConfirmed ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (busy || uncertain) return
    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '').trim() || null
    setBusy(true)
    setError('')
    setFields({})
    try {
      const payload = {
        roundNo: Number(roundNo),
        name: text('name'),
        examStartDate: text('examStartDate') ?? '',
        examEndDate: text('examEndDate'),
        dateConfirmed,
        registrationOpenDate: text('registrationOpenDate'),
        registrationCloseDate: text('registrationCloseDate'),
      }
      if (session)
        await updateExamSession(session.id, { ...payload, expectedUpdatedAt: session.updatedAt })
      else await addExamSession(year.id, payload)
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
      title={session ? `Sửa ${session.name}` : 'Thêm đợt thi'}
      description={
        session && session.courseCount > 0
          ? `${year.name}. Đổi ngày thi sẽ cập nhật ngày thi của ${session.courseCount} khóa học thuộc đợt này.`
          : year.name
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
            {busy ? 'Đang lưu...' : 'Lưu đợt thi'}
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
          <Field label="Số thứ tự đợt" hint="1 = Đợt 1, 2 = Đợt 2.">
            <input
              name="roundNo"
              type="number"
              required
              min={1}
              max={10}
              step={1}
              value={roundNo}
              onChange={(event) => setRoundNo(event.target.value)}
              className={fieldControlClass}
              aria-invalid={!!fields.roundNo}
            />
          </Field>
          <Field label="Tên đợt" hint="Để trống để dùng tên mặc định.">
            <input
              name="name"
              maxLength={100}
              defaultValue={session?.name ?? ''}
              placeholder={`Đợt ${roundNo || nextRound}`}
              className={fieldControlClass}
            />
          </Field>
          <DateField label="Ngày thi (từ ngày)" name="examStartDate" value={examStartDate} onChange={setExamStartDate} required disabled={busy} invalid={!!fields.examStartDate} />
          <DateField label="Đến ngày" hint="Để trống nếu chỉ thi một ngày." name="examEndDate" value={examEndDate} onChange={setExamEndDate} disabled={busy} invalid={!!fields.examEndDate} />
          <DateField label="Mở đăng ký dự thi" name="registrationOpenDate" value={registrationOpenDate} onChange={setRegistrationOpenDate} disabled={busy} invalid={!!fields.registrationOpenDate} />
          <DateField label="Hạn đăng ký dự thi" name="registrationCloseDate" value={registrationCloseDate} onChange={setRegistrationCloseDate} disabled={busy} invalid={!!fields.registrationCloseDate} />
        </div>
        <Checkbox isSelected={dateConfirmed} onChange={setDateConfirmed} isDisabled={busy}>
          Ngày thi đã được công bố chính thức
        </Checkbox>
        <p className="-mt-3 text-xs text-text-tertiary">
          Bỏ chọn khi ngày mới là dự kiến: học viên sẽ thấy chữ “dự kiến”.
        </p>
        {Object.entries(fields).map(([field, message]) => (
          <p key={field} role="alert" className="text-sm text-danger">
            {field}: {message}
          </p>
        ))}
      </fieldset>
    </ConsoleDialog>
  )
}

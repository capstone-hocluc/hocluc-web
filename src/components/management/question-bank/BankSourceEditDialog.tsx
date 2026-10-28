import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../lib/errors'
import { getAdminExamYears, type ExamYear } from '../../../services/examYearService'
import { updateBankSource, type BankSource } from '../../../services/questionBankService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import SelectField from '../../console/select-field'

const NONE = 'NONE'

/** The title, year and round of a paper already in the bank. */
export default function BankSourceEditDialog({
  source,
  onClose,
  onSaved,
}: {
  source: BankSource
  onClose: () => void
  onSaved: (source: BankSource) => void
}) {
  const [title, setTitle] = useState(source.title)
  const [year, setYear] = useState(source.year != null ? String(source.year) : '')
  const [round, setRound] = useState(source.round ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [years, setYears] = useState<ExamYear[]>([])
  const [yearsLoading, setYearsLoading] = useState(true)
  const [yearsError, setYearsError] = useState('')
  const [reloadYears, setReloadYears] = useState(0)

  useEffect(() => {
    let active = true
    getAdminExamYears()
      .then(
        data => { if (active) setYears(data) },
        reason => { if (active) setYearsError(getErrorMessage(reason)) },
      )
      .finally(() => { if (active) setYearsLoading(false) })
    return () => { active = false }
  }, [reloadYears])

  const selectedYear = years.find(item => String(item.examYear) === year)
  const yearOptions = years.map(item => ({ id: String(item.examYear), label: item.name }))
  if (year && !yearOptions.some(item => item.id === year)) yearOptions.push({ id: year, label: year })
  const roundOptions = (selectedYear?.sessions ?? []).map(session => ({
    id: `DOT_${session.roundNo}`,
    label: session.name,
  }))
  if (round && !roundOptions.some(item => item.id === round)) roundOptions.push({ id: round, label: round })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      onSaved(
        await updateBankSource(source.id, {
          title: title.trim(),
          year: year ? Number(year) : null,
          round: round || null,
        })
      )
    } catch (reason) {
      setError(getErrorMessage(reason))
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title="Sửa thông tin đề"
      maxWidth={520}
      dismissable={!busy}
      onSubmit={submit}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={!title.trim() || busy}>
            {busy ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Tên đề">
          <input
            className={fieldControlClass}
            value={title}
            maxLength={255}
            required
            disabled={busy}
            onChange={event => setTitle(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Năm">
            <SelectField
              ariaLabel="Năm"
              value={year || NONE}
              options={[{ id: NONE, label: 'Không chọn năm' }, ...yearOptions]}
              disabled={busy || yearsLoading || !!yearsError}
              onChange={value => {
                setYear(value === NONE ? '' : value)
                setRound('')
              }}
            />
          </Field>
          <Field label="Đợt">
            <SelectField
              ariaLabel="Đợt"
              value={round || NONE}
              options={[{ id: NONE, label: year ? 'Không chọn đợt' : 'Chọn năm trước' }, ...roundOptions]}
              disabled={busy || yearsLoading || !!yearsError || !year}
              onChange={value => setRound(value === NONE ? '' : value)}
            />
          </Field>
        </div>
        {yearsLoading && <Notice tone="info">Đang tải năm và đợt thi...</Notice>}
        {yearsError && (
          <Notice tone="danger">
            Không thể tải năm và đợt thi: {yearsError}{' '}
            <button type="button" className="underline" onClick={() => { setYearsLoading(true); setYearsError(''); setReloadYears(value => value + 1) }}>Thử lại</button>
          </Notice>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
      </div>
    </ConsoleDialog>
  )
}

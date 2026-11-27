import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../dialog'
import ClockSelect from './clock-select'
import DateField from '../date-field'
import Notice from '../notice'
import Button from '../button'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import { dateKeyOfInstant, formatClockFromInstant } from '../../../lib/liveScheduleFormat'
import { localDateTimeToInstant } from '../../../lib/scheduling'

interface Props {
  liveClass: ConsoleLiveClass
  busy: boolean
  errorMessage: string
  onClose: () => void
  onSubmit: (startTime: string, endTime: string) => void
}

export default function RescheduleLiveClassDialog({
  liveClass,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const [dateKey, setDateKey] = useState(() => dateKeyOfInstant(liveClass.startTime))
  const [startClock, setStartClock] = useState(() => formatClockFromInstant(liveClass.startTime))
  const [endClock, setEndClock] = useState(() => formatClockFromInstant(liveClass.endTime))
  const [localError, setLocalError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!dateKey || !startClock || !endClock || startClock >= endClock) {
      setLocalError('Giờ kết thúc phải sau giờ bắt đầu.')
      return
    }
    setLocalError('')
    const [sh, sm] = startClock.split(':').map(Number)
    const [eh, em] = endClock.split(':').map(Number)
    onSubmit(
      localDateTimeToInstant(dateKey, sh, sm),
      localDateTimeToInstant(dateKey, eh, em)
    )
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title="Dời giờ buổi học"
      maxWidth={480}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button type="button" appearance="outline" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {(localError || errorMessage) && <Notice tone="danger">{localError || errorMessage}</Notice>}
        <p className="m-0 text-sm font-medium text-text-primary">{liveClass.title}</p>
        <DateField
          label="Ngày học"
          value={dateKey}
          onChange={setDateKey}
          disabled={busy}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Giờ bắt đầu
            <ClockSelect
              ariaLabel="Giờ bắt đầu"
              disabled={busy}
              value={startClock}
              onChange={setStartClock}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Giờ kết thúc
            <ClockSelect
              ariaLabel="Giờ kết thúc"
              disabled={busy}
              value={endClock}
              onChange={setEndClock}
            />
          </label>
        </div>
      </div>
    </ConsoleDialog>
  )
}

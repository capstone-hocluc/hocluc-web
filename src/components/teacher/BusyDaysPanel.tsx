import { useState, type FormEvent } from 'react'
import { Plus, X } from '../console/icons'
import ConsoleDialog from '../console/dialog'
import DateField from '../console/date-field'
import Button from '../console/button'
import Field, { fieldControlClass } from '../console/form-field'
import Notice from '../console/notice'
import Panel from '../console/panel'
import type { ConsoleLiveClass } from '../../services/liveClassService'
import type { AvailabilityExceptionResponse, AvailabilitySlot } from '../../types/scheduling'
import {
  dateKeyOfInstant,
  dayOfWeekFromDateKey,
  formatClockFromInstant,
  formatDdMmYyyy,
  fullDayLabel,
  shortDayLabel,
} from '../../lib/liveScheduleFormat'

interface Props {
  busyDays: AvailabilityExceptionResponse[]
  weekClasses: ConsoleLiveClass[]
  draftSlots: AvailabilitySlot[]
  busy: boolean
  onAddBusyDay: (exceptionDate: string, reason?: string) => Promise<boolean>
  onRemoveBusyDay: (exceptionId: string) => void
}

export default function BusyDaysPanel({
  busyDays,
  weekClasses,
  draftSlots,
  busy,
  onAddBusyDay,
  onRemoveBusyDay,
}: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [dateKey, setDateKey] = useState('')
  const [reason, setReason] = useState('')

  const outsideClass = weekClasses.find((item) => {
    const dk = dateKeyOfInstant(item.startTime)
    const dayEnum = dayOfWeekFromDateKey(dk)
    const cs = formatClockFromInstant(item.startTime)
    const ce = formatClockFromInstant(item.endTime)
    return (
      item.needsAttention ||
      !draftSlots.some(
        (s) => s.dayOfWeek === dayEnum && s.startTime.slice(0, 5) <= cs && s.endTime.slice(0, 5) >= ce
      )
    )
  })

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!dateKey) return
    const ok = await onAddBusyDay(dateKey, reason)
    if (ok) {
      setDateKey('')
      setReason('')
      setAddOpen(false)
    }
  }

  return (
    <Panel title="Ngày bận" className="w-full shrink-0 lg:w-[320px]">
      <div className="flex flex-col gap-3">
      {busyDays.length === 0 ? (
        <p className="text-sm text-text-tertiary">Chưa có ngày bận.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {busyDays.map((ex) => {
            const timePart =
              ex.startTime && ex.endTime
                ? `${ex.startTime.slice(0, 5)} – ${ex.endTime.slice(0, 5)}`
                : 'cả ngày'
            return (
              <li
                key={ex.id}
                className="flex items-center justify-between gap-2.5 rounded-xl border border-card-border px-3 py-2.5 text-sm text-text-primary"
              >
                <div className="min-w-0">
                  <div>
                    {shortDayLabel(ex.exceptionDate)} {formatDdMmYyyy(ex.exceptionDate)} · {timePart}
                  </div>
                  {ex.reason && <div className="truncate text-xs text-text-tertiary">{ex.reason}</div>}
                </div>
                <Button
                  size="icon"
                  appearance="ghost"
                  disabled={busy}
                  aria-label={`Xóa ngày bận ${formatDdMmYyyy(ex.exceptionDate)}`}
                  onClick={() => onRemoveBusyDay(ex.id)}
                >
                  <X size={16} aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <Button appearance="outline" disabled={busy} onClick={() => setAddOpen(true)}>
        <Plus size={16} aria-hidden="true" />
        Thêm ngày bận
      </Button>

      {outsideClass && (
        <Notice tone="warning">
          {fullDayLabel(dateKeyOfInstant(outsideClass.startTime))} có buổi học nằm ngoài giờ rảnh. Thêm giờ rảnh hoặc báo staff dời buổi.
        </Notice>
      )}
      </div>

      <ConsoleDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        dismissable={!busy}
        title="Thêm ngày bận"
        maxWidth={440}
        onSubmit={handleSubmit}
        footer={
          <>
            <Button type="button" appearance="outline" disabled={busy} onClick={() => setAddOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={busy || !dateKey}>
              {busy ? 'Đang lưu…' : 'Lưu ngày bận'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <DateField
            label="Ngày bận"
            value={dateKey}
            onChange={setDateKey}
            disabled={busy}
            required
          />
          <Field label="Ghi chú (không bắt buộc)">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              className={fieldControlClass}
            />
          </Field>
        </div>
      </ConsoleDialog>
    </Panel>
  )
}

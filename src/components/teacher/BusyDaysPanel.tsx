import { useState, type FormEvent } from 'react'
import { Plus, X } from '../console/icons'
import ConsoleDialog from '../console/dialog'
import DateField from '../console/date-field'
import Button from '../console/button'
import { fieldControlClass } from '../console/form-field'
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
    <aside
      aria-label="Ngày bận"
      className="flex w-full shrink-0 flex-col gap-3.5 rounded-2xl border border-card-border bg-card-background p-5 lg:w-[320px]"
    >
      <h2 className="m-0 text-[17px] font-bold text-text-primary">Ngày bận</h2>

      {busyDays.length === 0 ? (
        <p className="m-0 text-sm text-text-tertiary">Chưa có ngày bận.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {busyDays.map((ex) => {
            const timePart =
              ex.startTime && ex.endTime
                ? `${ex.startTime.slice(0, 5)} – ${ex.endTime.slice(0, 5)}`
                : 'cả ngày'
            return (
              <li
                key={ex.id}
                className="flex items-center justify-between gap-2.5 rounded-xl border border-[#e0e9f5] px-3 py-2.5 text-sm text-text-primary"
              >
                <div className="min-w-0">
                  <div>
                    {shortDayLabel(ex.exceptionDate)} {formatDdMmYyyy(ex.exceptionDate)} · {timePart}
                  </div>
                  {ex.reason && <div className="truncate text-xs text-[#526984]">{ex.reason}</div>}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Xóa ngày bận ${formatDdMmYyyy(ex.exceptionDate)}`}
                  onClick={() => onRemoveBusyDay(ex.id)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f6f9ff] text-[#526984] hover:bg-[#e8eff8] disabled:opacity-50"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => setAddOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-[#a9c3e0] bg-card-background text-sm font-semibold text-[#0b3a82] hover:bg-[#f6f9ff] disabled:opacity-50"
      >
        <Plus size={16} aria-hidden="true" />
        Thêm ngày bận
      </button>

      {outsideClass && (
        <div
          role="note"
          className="rounded-xl border border-[#f3c58b] bg-[#fff6ea] p-3 text-[13px] leading-relaxed text-[#7a3d00]"
        >
          {fullDayLabel(dateKeyOfInstant(outsideClass.startTime))} có buổi học nằm ngoài giờ rảnh. Thêm giờ rảnh hoặc báo staff dời buổi.
        </div>
      )}

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
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Ghi chú (không bắt buộc)
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              className={fieldControlClass}
            />
          </label>
        </div>
      </ConsoleDialog>
    </aside>
  )
}

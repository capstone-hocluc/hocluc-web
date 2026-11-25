import { AlertTriangle, Plus, Trash2 } from '../icons'
import ClockSelect from './clock-select'
import DateField from '../date-field'
import SelectField from '../select-field'
import { fieldControlClass } from '../form-field'
import type { LiveTimetableSlot } from '../../../services/liveClassService'
import type { AvailabilityExceptionResponse, AvailabilitySlot, DayOfWeek } from '../../../types/scheduling'
import {
  computeProjectedSessions,
  formatDdMmYyyy,
  shortDayLabel,
  WEEKDAYS_ORDERED,
} from '../../../lib/liveScheduleFormat'
import { cn } from '../../../lib/cn'

interface Props {
  teacherName: string
  startDate: string
  onStartDateChange: (next: string) => void
  endDate: string
  onEndDateChange: (next: string) => void
  slots: LiveTimetableSlot[]
  onSlotsChange: (next: LiveTimetableSlot[]) => void
  capacity: string
  onCapacityChange: (next: string) => void
  recurringAvailability: AvailabilitySlot[]
  exceptions: AvailabilityExceptionResponse[]
}

export default function WizardStepSlots({
  teacherName,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  slots,
  onSlotsChange,
  capacity,
  onCapacityChange,
  recurringAvailability,
  exceptions,
}: Props) {
  const projected = computeProjectedSessions(startDate, endDate, slots, recurringAvailability, exceptions)

  const slotOutsideAvailability = (slot: LiveTimetableSlot) => {
    if (!slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) return false
    return !recurringAvailability.some(
      (av) =>
        av.dayOfWeek === slot.dayOfWeek &&
        av.startTime.slice(0, 5) <= slot.startTime.slice(0, 5) &&
        av.endTime.slice(0, 5) >= slot.endTime.slice(0, 5)
    )
  }

  const outsideDays = slots
    .filter(slotOutsideAvailability)
    .map((slot) => WEEKDAYS_ORDERED.find((w) => w.value === slot.dayOfWeek)?.label ?? '')
    .filter(Boolean)
  const uniqueOutsideDays = [...new Set(outsideDays)]

  const updateSlot = (index: number, patch: Partial<LiveTimetableSlot>) => {
    onSlotsChange(slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)))
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_270px]">
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField label="Từ ngày" value={startDate} onChange={onStartDateChange} required />
          <DateField label="Đến ngày" value={endDate} min={startDate} onChange={onEndDateChange} required />
        </div>

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-medium text-text-primary">Khung giờ hàng tuần</legend>
          {slots.map((slot, index) => {
            const isOutside = slotOutsideAvailability(slot)
            return (
              <div
                key={index}
                className="grid grid-cols-[minmax(0,1fr)_14px_minmax(0,1fr)_44px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_100px_14px_100px_44px]"
              >
                <div className="col-span-full sm:col-span-1">
                  <SelectField
                    ariaLabel={`Thứ của khung ${index + 1}`}
                    value={slot.dayOfWeek}
                    onChange={(value) => updateSlot(index, { dayOfWeek: value as DayOfWeek })}
                    triggerClassName={cn(
                      fieldControlClass,
                      'min-h-11',
                      isOutside && 'border-[#f3c58b] bg-[#fff6ea]'
                    )}
                    options={WEEKDAYS_ORDERED.map((w) => ({ id: w.value, label: w.label }))}
                  />
                </div>
                <ClockSelect
                  ariaLabel={`Bắt đầu khung ${index + 1}`}
                  value={slot.startTime}
                  onChange={(next) => updateSlot(index, { startTime: next })}
                />
                <span aria-hidden="true" className="text-center text-[#526984]">
                  –
                </span>
                <ClockSelect
                  ariaLabel={`Kết thúc khung ${index + 1}`}
                  value={slot.endTime}
                  onChange={(next) => updateSlot(index, { endTime: next })}
                />
                <button
                  type="button"
                  aria-label={`Xóa khung ${index + 1}`}
                  disabled={slots.length === 1}
                  onClick={() => onSlotsChange(slots.filter((_, i) => i !== index))}
                  className="inline-flex size-11 items-center justify-center rounded-xl border border-card-border bg-card-background text-[#526984] hover:bg-background-gray-secondary disabled:opacity-40"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            )
          })}

          {uniqueOutsideDays.length > 0 && (
            <p className="m-0 text-[13px] text-[#7a3d00]">
              {uniqueOutsideDays.join(', ')} nằm ngoài giờ rảnh của {teacherName}
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              onSlotsChange([
                ...slots,
                {
                  dayOfWeek: slots[slots.length - 1]?.dayOfWeek === 'MONDAY' ? 'THURSDAY' : 'MONDAY',
                  startTime: slots[slots.length - 1]?.startTime ?? '19:30',
                  endTime: slots[slots.length - 1]?.endTime ?? '21:30',
                },
              ])
            }
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-dashed border-[#a9c3e0] bg-card-background px-4 text-sm font-semibold text-[#0b3a82] hover:bg-[#f6f9ff]"
          >
            <Plus size={16} aria-hidden="true" />
            Thêm khung giờ
          </button>
        </fieldset>

        <label className="flex max-w-[200px] flex-col gap-1.5 text-sm font-medium text-text-primary">
          Số chỗ mỗi buổi
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="Không giới hạn"
            value={capacity}
            onChange={(e) => onCapacityChange(e.target.value)}
            className={cn(fieldControlClass, 'min-h-11')}
          />
        </label>
      </div>

      <aside
        aria-label="Dự kiến"
        className="flex flex-col gap-3.5 self-start rounded-2xl border border-card-border bg-[#f8faff] p-4.5"
      >
        <h2 className="m-0 text-[15px] font-semibold text-text-primary">Dự kiến</h2>
        <div className="text-[40px] leading-none font-bold text-[#0b3a82]">
          {projected.count}{' '}
          <span className="text-base font-semibold text-text-primary">buổi</span>
        </div>
        <dl className="m-0 grid grid-cols-[92px_minmax(0,1fr)] gap-x-2 gap-y-2 text-[13px]">
          <dt className="text-[#526984]">Buổi đầu</dt>
          <dd className="m-0 text-text-primary">
            {projected.firstDate ? `${shortDayLabel(projected.firstDate)} ${formatDdMmYyyy(projected.firstDate)}` : '—'}
          </dd>
          <dt className="text-[#526984]">Buổi cuối</dt>
          <dd className="m-0 text-text-primary">
            {projected.lastDate ? `${shortDayLabel(projected.lastDate)} ${formatDdMmYyyy(projected.lastDate)}` : '—'}
          </dd>
          <dt className="text-[#526984]">Phòng Zoom</dt>
          <dd className="m-0 text-text-primary">Tạo riêng mỗi buổi</dd>
        </dl>
        {projected.outsideCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-[#f3c58b] bg-[#fff6ea] px-3 py-2.5 text-[13px] text-[#7a3d00]">
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            {projected.outsideCount} buổi ngoài giờ rảnh
          </div>
        )}
      </aside>
    </div>
  )
}

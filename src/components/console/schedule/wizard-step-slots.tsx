import { Plus, Trash2 } from '../icons'
import ClockSelect from './clock-select'
import DateField from '../date-field'
import SelectField from '../select-field'
import Button from '../button'
import Notice from '../notice'
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
                className="grid grid-cols-[minmax(0,1fr)_14px_minmax(0,1fr)_36px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_100px_14px_100px_36px]"
              >
                <div className="col-span-full sm:col-span-1">
                  <SelectField
                    ariaLabel={`Thứ của khung ${index + 1}`}
                    value={slot.dayOfWeek}
                    onChange={(value) => updateSlot(index, { dayOfWeek: value as DayOfWeek })}
                    triggerClassName={cn(fieldControlClass, isOutside && 'border-badge-warning-icon-color bg-badge-warning-background')}
                    options={WEEKDAYS_ORDERED.map((w) => ({ id: w.value, label: w.label }))}
                  />
                </div>
                <ClockSelect
                  ariaLabel={`Bắt đầu khung ${index + 1}`}
                  value={slot.startTime}
                  onChange={(next) => updateSlot(index, { startTime: next })}
                />
                <span aria-hidden="true" className="text-center text-text-tertiary">
                  –
                </span>
                <ClockSelect
                  ariaLabel={`Kết thúc khung ${index + 1}`}
                  value={slot.endTime}
                  onChange={(next) => updateSlot(index, { endTime: next })}
                />
                <Button
                  size="icon"
                  appearance="ghost"
                  aria-label={`Xóa khung ${index + 1}`}
                  disabled={slots.length === 1}
                  onClick={() => onSlotsChange(slots.filter((_, i) => i !== index))}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              </div>
            )
          })}

          {uniqueOutsideDays.length > 0 && (
            <p className="text-xs text-text-secondary">
              {uniqueOutsideDays.join(', ')} nằm ngoài giờ rảnh của {teacherName}
            </p>
          )}

          <Button
            size="sm"
            appearance="outline"
            className="self-start"
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
          >
            <Plus size={16} aria-hidden="true" />
            Thêm khung giờ
          </Button>
        </fieldset>
      </div>

      <aside
        aria-label="Dự kiến"
        className="flex flex-col gap-3.5 self-start rounded-xl border border-card-border bg-background-gray-secondary p-4"
      >
        <h2 className="text-sm font-medium text-text-primary">Dự kiến</h2>
        <div className="text-4xl leading-none font-semibold text-text-primary">
          {projected.count}{' '}
          <span className="text-base font-medium text-text-secondary">buổi</span>
        </div>
        <dl className="m-0 grid grid-cols-[92px_minmax(0,1fr)] gap-x-2 gap-y-2 text-sm">
          <dt className="text-text-tertiary">Buổi đầu</dt>
          <dd className="m-0 text-text-primary">
            {projected.firstDate ? `${shortDayLabel(projected.firstDate)} ${formatDdMmYyyy(projected.firstDate)}` : '—'}
          </dd>
          <dt className="text-text-tertiary">Buổi cuối</dt>
          <dd className="m-0 text-text-primary">
            {projected.lastDate ? `${shortDayLabel(projected.lastDate)} ${formatDdMmYyyy(projected.lastDate)}` : '—'}
          </dd>
          <dt className="text-text-tertiary">Phòng Zoom</dt>
          <dd className="m-0 text-text-primary">Tạo riêng mỗi buổi</dd>
        </dl>
        {projected.outsideCount > 0 && (
          <Notice tone="warning">{projected.outsideCount} buổi ngoài giờ rảnh</Notice>
        )}
      </aside>
    </div>
  )
}

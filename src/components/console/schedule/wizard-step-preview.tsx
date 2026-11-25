import { useState } from 'react'
import { AlertTriangle } from '../icons'
import ClockSelect from './clock-select'
import DateField from '../date-field'
import Notice from '../notice'
import { fieldControlClass } from '../form-field'
import type { LiveTimetablePreviewSession } from '../../../services/liveClassService'
import { formatDdMmYyyy, shortDayLabel } from '../../../lib/liveScheduleFormat'
import { cn } from '../../../lib/cn'

export interface WizardEditableSession extends LiveTimetablePreviewSession {
  rowKey: string
  included: boolean
}

interface Props {
  title: string
  teacherName: string
  subjectName: string
  capacity: string
  sessions: WizardEditableSession[]
  blockingErrors: string[]
  warnings: string[]
  previewBusy: boolean
  onToggleIncluded: (rowKey: string) => void
  onUpdateSessionTime: (rowKey: string, date: string, start: string, end: string) => Promise<void>
}

export default function WizardStepPreview({
  title,
  teacherName,
  subjectName,
  capacity,
  sessions,
  blockingErrors,
  warnings,
  previewBusy,
  onToggleIncluded,
  onUpdateSessionTime,
}: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editError, setEditError] = useState('')

  const firstTimeRange = sessions[0]
    ? `${sessions[0].start.slice(0, 5)} – ${sessions[0].end.slice(0, 5)}`
    : ''
  const hasAttention = sessions.some((s) => s.included && Boolean(s.attention))

  const rowsWithOrder = (() => {
    let seq = 0
    return sessions.map((session) => {
      const order = session.included ? ++seq : session.index
      return { session, order }
    })
  })()

  const openEdit = (session: WizardEditableSession) => {
    setEditingKey(session.rowKey)
    setEditDate(session.date)
    setEditStart(session.start.slice(0, 5))
    setEditEnd(session.end.slice(0, 5))
    setEditError('')
  }

  const applyEdit = async () => {
    if (!editingKey) return
    if (!editDate || !editStart || !editEnd || editStart >= editEnd) {
      setEditError('Giờ kết thúc phải sau giờ bắt đầu.')
      return
    }
    setEditError('')
    await onUpdateSessionTime(editingKey, editDate, editStart, editEnd)
    setEditingKey(null)
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <strong className="text-base text-text-primary">{title}</strong>
        <span className="text-[#526984]">
          {[
            teacherName,
            subjectName,
            firstTimeRange,
            capacity ? `${capacity} chỗ` : 'Không giới hạn chỗ',
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>

      {blockingErrors.length > 0 && (
        <Notice tone="danger">
          <div className="space-y-1">
            {blockingErrors.map((err) => (
              <p key={err} className="m-0 text-sm">
                {err}
              </p>
            ))}
          </div>
        </Notice>
      )}

      {warnings.length > 0 && (
        <Notice tone="warning">
          <div className="space-y-1">
            {warnings.map((warn) => (
              <p key={warn} className="m-0 text-sm">
                {warn}
              </p>
            ))}
          </div>
        </Notice>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-card-border text-left text-[13px] text-[#526984]">
              <th scope="col" className="w-11 p-2 font-medium">
                <span className="sr-only">Tạo buổi này</span>
              </th>
              <th scope="col" className="p-2 font-medium">Buổi</th>
              <th scope="col" className="p-2 font-medium">Ngày</th>
              <th scope="col" className="p-2 font-medium">Giờ</th>
              <th scope="col" className="p-2 font-medium">Kiểm tra</th>
              <th scope="col" className="w-24 p-2">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rowsWithOrder.map(({ session, order }) => {
              const displayLabel = `${session.subject} · Buổi ${order}`
              const hasBlock = session.included && session.blockingErrors.length > 0
              const hasWarn = session.included && Boolean(session.attention)
              const isEditing = editingKey === session.rowKey

              return (
                <tr
                  key={session.rowKey}
                  className={cn(
                    'border-b border-[#eef3f9]',
                    hasBlock
                      ? 'bg-[#fff5f5]'
                      : !session.included || hasWarn
                        ? 'bg-[#fffaf3]'
                        : ''
                  )}
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={session.included}
                      disabled={previewBusy}
                      aria-label={`Tạo buổi ${session.index}`}
                      onChange={() => onToggleIncluded(session.rowKey)}
                      className="size-5 cursor-pointer accent-[#0b3a82]"
                    />
                  </td>
                  <td className={cn('px-2 py-2', !session.included && 'text-[#526984]')}>
                    {displayLabel}
                  </td>
                  <td className={cn('px-2 py-2 whitespace-nowrap', !session.included && 'text-[#526984]')}>
                    {isEditing ? (
                      <DateField
                        label="Ngày"
                        hideLabel
                        compact
                        value={editDate}
                        onChange={setEditDate}
                        disabled={previewBusy}
                      />
                    ) : (
                      `${shortDayLabel(session.date)} ${formatDdMmYyyy(session.date)}`
                    )}
                  </td>
                  <td className={cn('px-2 py-2 whitespace-nowrap', !session.included && 'text-[#526984]')}>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <ClockSelect
                          compact
                          ariaLabel="Giờ bắt đầu mới"
                          disabled={previewBusy}
                          value={editStart}
                          onChange={setEditStart}
                          className="w-24"
                        />
                        <span>–</span>
                        <ClockSelect
                          compact
                          ariaLabel="Giờ kết thúc mới"
                          disabled={previewBusy}
                          value={editEnd}
                          onChange={setEditEnd}
                          className="w-24"
                        />
                      </div>
                    ) : (
                      `${session.start.slice(0, 5)} – ${session.end.slice(0, 5)}`
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {!session.included ? (
                      <span className="text-[#526984]">Bỏ qua</span>
                    ) : hasBlock ? (
                      <span className="text-[#a3261a]">{session.blockingErrors[0]}</span>
                    ) : hasWarn ? (
                      <span className="text-[#7a3d00]">Ngoài giờ rảnh</span>
                    ) : (
                      <span className="text-[#0b3a82]">Hợp lệ</span>
                    )}
                    {isEditing && editError && (
                      <p className="m-0 mt-1 text-xs text-[#a3261a]">{editError}</p>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={previewBusy}
                          onClick={() => void applyEdit()}
                          className="min-h-9 rounded-lg bg-[#0b3a82] px-2.5 text-xs font-semibold text-white"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          disabled={previewBusy}
                          onClick={() => setEditingKey(null)}
                          className="min-h-9 rounded-lg border border-card-border bg-card-background px-2 text-xs text-text-primary"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (hasWarn || hasBlock || !session.included) ? (
                      <button
                        type="button"
                        disabled={previewBusy}
                        onClick={() => openEdit(session)}
                        className="min-h-9 rounded-lg border border-card-border bg-card-background px-3 text-[13px] text-text-primary hover:bg-background-gray-secondary"
                      >
                        Đổi giờ
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hasAttention && (
        <div
          role="note"
          className="flex items-center gap-2.5 rounded-xl border border-[#f3c58b] bg-[#fff6ea] px-3.5 py-3 text-[13px] text-[#7a3d00]"
        >
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          Buổi ngoài giờ rảnh vẫn tạo được; giảng viên sẽ thấy cảnh báo trên lịch của mình
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import ClockSelect from './clock-select'
import DateField from '../date-field'
import Button from '../button'
import Notice from '../notice'
import Status from '../status'
import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from '../../tailgrids/core/table'
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
        <span className="text-text-tertiary">
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

      <div className="overflow-hidden rounded-xl border border-card-border">
        <TableRoot fullBleed>
          <TableHeader className="bg-background-gray-secondary [&_th]:border-border-secondary">
            <TableRow>
              <TableHead scope="col" className="w-11 px-3 py-3">
                <span className="sr-only">Tạo buổi này</span>
              </TableHead>
              {['Buổi', 'Ngày', 'Giờ', 'Kiểm tra'].map((label) => (
                <TableHead key={label} scope="col" className="px-3 py-3 text-xs font-semibold whitespace-nowrap text-text-secondary">
                  {label}
                </TableHead>
              ))}
              <TableHead scope="col" className="w-28 px-3 py-3">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowsWithOrder.map(({ session, order }) => {
              const displayLabel = `${session.subject} · Buổi ${order}`
              const hasBlock = session.included && session.blockingErrors.length > 0
              const hasWarn = session.included && Boolean(session.attention)
              const isEditing = editingKey === session.rowKey

              return (
                <TableRow
                  key={session.rowKey}
                  className={cn(hasBlock ? 'bg-badge-error-background/50' : hasWarn ? 'bg-badge-warning-background/50' : '')}
                >
                  <TableCell className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={session.included}
                      disabled={previewBusy}
                      aria-label={`Tạo buổi ${session.index}`}
                      onChange={() => onToggleIncluded(session.rowKey)}
                      className="size-4 cursor-pointer accent-brand-500"
                    />
                  </TableCell>
                  <TableCell className={cn('px-3 py-2', !session.included && 'text-text-tertiary')}>
                    {displayLabel}
                  </TableCell>
                  <TableCell className={cn('px-3 py-2 whitespace-nowrap', !session.included && 'text-text-tertiary')}>
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
                  </TableCell>
                  <TableCell className={cn('px-3 py-2 whitespace-nowrap', !session.included && 'text-text-tertiary')}>
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
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {!session.included ? (
                      <Status>Bỏ qua</Status>
                    ) : hasBlock ? (
                      <span className="text-sm text-danger">{session.blockingErrors[0]}</span>
                    ) : hasWarn ? (
                      <Status tone="warning">Ngoài giờ rảnh</Status>
                    ) : (
                      <Status tone="success">Hợp lệ</Status>
                    )}
                    {isEditing && editError && <p className="mt-1 text-xs text-danger">{editError}</p>}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" disabled={previewBusy} onClick={() => void applyEdit()}>
                          Lưu
                        </Button>
                        <Button size="sm" appearance="ghost" disabled={previewBusy} onClick={() => setEditingKey(null)}>
                          Hủy
                        </Button>
                      </div>
                    ) : (hasWarn || hasBlock || !session.included) ? (
                      <Button size="sm" appearance="outline" disabled={previewBusy} onClick={() => openEdit(session)}>
                        Đổi giờ
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </TableRoot>
      </div>

      {hasAttention && (
        <Notice tone="warning">Buổi ngoài giờ rảnh vẫn tạo được; giảng viên sẽ thấy cảnh báo trên lịch của mình</Notice>
      )}
    </div>
  )
}

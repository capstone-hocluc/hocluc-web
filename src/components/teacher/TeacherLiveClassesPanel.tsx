import { useState, type FormEvent } from 'react'
import Button from '../console/button'
import ConsoleSheet from '../console/sheet'
import Notice from '../console/notice'
import Field, { fieldControlClass, textareaControlClass } from '../console/form-field'
import ScheduleResourceState from '../console/schedule/schedule-resource-state'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { formatDateTime, formatTime } from '../../lib/courseFormat'
import {
  getMyLiveClasses,
  getTeacherZoomAccount,
  updateLiveClassDetails,
  type ConsoleLiveClass,
} from '../../services/liveClassService'

function DetailsSheet({ liveClass, onClose, onSaved }: {
  liveClass: ConsoleLiveClass
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setErrorMessage('')
    try {
      await updateLiveClassDetails(liveClass.id, {
        title: String(form.get('title') || '').trim(),
        description: String(form.get('description') || '').trim(),
      })
      onSaved()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không lưu được thông tin buổi học.')
      setBusy(false)
    }
  }

  return (
    <ConsoleSheet open onClose={onClose} closeDisabled={busy} title="Thông tin buổi học">
      <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
        {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
        <Field label="Tiêu đề">
          <input name="title" autoComplete="off" required maxLength={500} disabled={busy}
            defaultValue={liveClass.detailsFilled ? liveClass.title : ''} placeholder={liveClass.title} className={fieldControlClass} />
        </Field>
        <Field label="Mô tả">
          <textarea name="description" rows={4} maxLength={5000} disabled={busy}
            defaultValue={liveClass.description ?? ''} className={textareaControlClass} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-card-border pt-4">
          <Button type="button" appearance="outline" disabled={busy} onClick={onClose}>Đóng</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
        </div>
      </form>
    </ConsoleSheet>
  )
}

/** The teacher's coming live classes; each needs its title and description filled in before it runs. */
export default function TeacherLiveClassesPanel({ teacherId }: { teacherId: string }) {
  const resource = useScheduleResource('teacher-live-classes:' + teacherId, getMyLiveClasses)
  const zoom = useScheduleResource('teacher-zoom:' + teacherId, () => getTeacherZoomAccount(teacherId))
  const [editing, setEditing] = useState<ConsoleLiveClass | null>(null)
  const classes = resource.data ?? []
  const missingZoom = zoom.status === 'ready' && zoom.data?.zoomEnabled && !zoom.data.zoomEmail

  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium text-text-primary">Lớp trực tuyến</h2>
      {missingZoom && (
        <Notice tone="warning">
          Bạn chưa được cấp tài khoản Zoom nên chưa thể được xếp lớp trực tuyến. Vui lòng liên hệ quản trị viên để được cấp.
        </Notice>
      )}
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        empty={!classes.length}
        emptyMessage="Chưa có lớp trực tuyến sắp tới."
        onRetry={resource.reload}
      >
        <div className="space-y-2">
          {classes.map((liveClass) => (
            <div key={liveClass.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border bg-card-background px-4 py-3">
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-medium text-text-primary">{liveClass.title}</p>
                <p className="m-0 text-xs text-text-tertiary">
                  {formatDateTime(liveClass.startTime)} – {formatTime(liveClass.endTime)}
                  {liveClass.courseTitle ? ` · ${liveClass.courseTitle}` : ''}
                  {` · ${liveClass.bookedCount ?? 0}${liveClass.capacity ? `/${liveClass.capacity}` : ''} học viên giữ chỗ`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!liveClass.detailsFilled && <span className="text-xs font-medium text-badge-warning-text">Chưa có tiêu đề</span>}
                <Button size="sm" appearance={liveClass.detailsFilled ? 'outline' : 'fill'} onClick={() => setEditing(liveClass)}>
                  {liveClass.detailsFilled ? 'Sửa thông tin' : 'Điền thông tin'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScheduleResourceState>
      {editing && (
        <DetailsSheet
          liveClass={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            resource.reload()
          }}
        />
      )}
    </section>
  )
}

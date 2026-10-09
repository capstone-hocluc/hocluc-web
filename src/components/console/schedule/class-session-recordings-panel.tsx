import { useEffect, useState, type FormEvent } from 'react'
import { ExternalLink, PlayCircle, RefreshCw } from '../icons'
import { getClassSessionRecordings, attachClassSessionRecording } from '../../../services/classSessionRecordingService'
import type { ClassSessionRecordingResponse, ClassSessionResponse, MeetingProvider } from '../../../types/scheduling'
import type { ManagementRole } from '../../management/ManagementRouteGuard'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getErrorMessage } from '../../../lib/errors'
import Button from '../button'
import ConfirmDialog from '../confirm-dialog'
import Notice from '../notice'
import Field, { fieldControlClass } from '../form-field'
import ScheduleResourceState from './schedule-resource-state'
import { safeExternalUrl } from '../../../lib/scheduling'
import { useUnsavedActionGuard } from '../../../hooks/useUnsavedActionGuard'

type ActorRole = Extract<ManagementRole, 'STAFF' | 'MANAGER' | 'TEACHER'> | 'STUDENT'

export default function ClassSessionRecordingsPanel({
  session,
  role,
}: {
  session: ClassSessionResponse
  role: ActorRole
}) {
  const resource = useScheduleResource(
    role === 'STUDENT' ? null : 'class-session-recordings:' + session.id,
    async () => ({
      records: await getClassSessionRecordings(session.id),
      receivedAt: Date.now(),
    })
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [title, setTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [provider, setProvider] = useState<MeetingProvider>('ZOOM')
  const [clock, setClock] = useState(0)
  const draftDirty = title.trim() !== '' || videoUrl.trim() !== '' || provider !== 'ZOOM'
  const unsavedGuard = useUnsavedActionGuard(draftDirty, busy)
  const receivedAt = resource.data?.receivedAt

  useEffect(() => {
    if (!receivedAt) return
    const expireIn = Math.max(0, receivedAt + 6 * 60 * 60 * 1000 - Date.now())
    const timer = window.setTimeout(() => setClock(Date.now()), expireIn)
    return () => window.clearTimeout(timer)
  }, [receivedAt])

  if (role === 'STUDENT') {
    return (
      <Notice tone="warning">
        Bản ghi của buổi học sẽ khả dụng sau khi quyền truy cập lớp được xác nhận.
      </Notice>
    )
  }

  const attach = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await attachClassSessionRecording(session.id, {
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        provider,
      })
      setTitle('')
      setVideoUrl('')
      setProvider('ZOOM')
      setNotice('Đã gắn bản ghi. Đang tải lại danh sách.')
      resource.reload()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 border-t border-card-border pt-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-text-primary">Bản ghi</h3>
        <Button size="sm" appearance="ghost" className="ml-auto" disabled={busy} onClick={resource.reload}>
          <RefreshCw size={14} />
          Làm mới link
        </Button>
      </div>
      {error && <Notice tone="danger">{error}</Notice>}
      {notice && <Notice tone="info">{notice}</Notice>}
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        empty={!resource.data?.records.length}
        emptyMessage="Chưa có bản ghi."
        onRetry={resource.reload}
      >
        <div className="flex flex-col gap-2">
          {(resource.data?.records ?? []).map((record) => (
            <RecordingRow
              key={record.id}
              record={record}
              streamExpired={Boolean(record.streamUrl && receivedAt && clock >= receivedAt + 6 * 60 * 60 * 1000)}
            />
          ))}
        </div>
      </ScheduleResourceState>
      {role === 'STAFF' || role === 'MANAGER' ? (
        <form className="grid gap-3 rounded-lg bg-background-gray-secondary p-3 sm:grid-cols-2" onSubmit={attach}>
          <Field label="Tên bản ghi">
            <input name="title" autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} required className={fieldControlClass} />
          </Field>
          <Field label="Nền tảng">
            <select name="provider" autoComplete="off" value={provider} onChange={(event) => setProvider(event.target.value as MeetingProvider)} disabled={busy} className={fieldControlClass}>
              <option value="ZOOM">Zoom</option>
              <option value="GOOGLE_MEET">Google Meet</option>
              <option value="MICROSOFT_TEAMS">Microsoft Teams</option>
              <option value="OTHER">Khác</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="URL video">
              <input name="videoUrl" autoComplete="off" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} disabled={busy} type="url" required className={fieldControlClass} placeholder="https://" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? 'Đang gắn…' : 'Gắn bản ghi'}
            </Button>
          </div>
        </form>
      ) : null}
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          title="Bỏ thông tin chưa lưu?"
          description="Bản ghi bạn vừa nhập chưa được gửi."
          cancelLabel="Tiếp tục chỉnh sửa"
          confirmLabel="Bỏ thay đổi"
          variant="danger"
          onCancel={unsavedGuard.cancelDiscard}
          onConfirm={unsavedGuard.confirmDiscard}
        />
      )}
    </section>
  )
}

function RecordingRow({ record, streamExpired }: { record: ClassSessionRecordingResponse; streamExpired: boolean }) {
  const url = record.streamUrl
    ? streamExpired ? null : safeExternalUrl(record.streamUrl)
    : safeExternalUrl(record.videoUrl)
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card-border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{record.title}</p>
        <p className="mt-1 text-xs text-text-tertiary">
          {record.durationSeconds ? Math.round(record.durationSeconds / 60) + ' phút' : 'Chưa rõ thời lượng'}
          {record.sectionTitle ? ' · ' + record.sectionTitle : ''}
        </p>
      </div>
      {url ? (
        <Button asChild size="sm" appearance="outline">
          <a href={url} target="_blank" rel="noreferrer">
            <PlayCircle size={14} />
            Mở
            <ExternalLink size={13} />
          </a>
        </Button>
      ) : (
        <span className="text-xs text-text-tertiary">{streamExpired ? 'Link hết hạn, hãy làm mới.' : 'Chưa có link'}</span>
      )}
    </article>
  )
}
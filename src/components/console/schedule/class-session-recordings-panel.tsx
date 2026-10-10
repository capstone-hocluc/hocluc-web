import { useEffect, useState, type FormEvent } from 'react'
import { ExternalLink, Pencil, PlayCircle, RefreshCw, Trash2 } from '../icons'
import {
  attachClassSessionRecording,
  deleteClassSessionRecording,
  getClassSessionRecordings,
  updateClassSessionRecording,
} from '../../../services/classSessionRecordingService'
import type { ClassSessionRecordingResponse, ClassSessionResponse, MeetingProvider } from '../../../types/scheduling'
import type { ManagementRole } from '../../management/ManagementRouteGuard'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getErrorMessage } from '../../../lib/errors'
import Button from '../button'
import ConfirmDialog from '../confirm-dialog'
import ConsoleSheet from '../sheet'
import Notice from '../notice'
import Field, { fieldControlClass } from '../form-field'
import ScheduleResourceState from './schedule-resource-state'
import { safeExternalUrl } from '../../../lib/scheduling'
import { useUnsavedActionGuard } from '../../../hooks/useUnsavedActionGuard'

type ActorRole = Extract<ManagementRole, 'STAFF' | 'MANAGER' | 'TEACHER'> | 'STUDENT'

const providerOptions: Array<{ id: MeetingProvider; label: string }> = [
  { id: 'ZOOM', label: 'Zoom' },
  { id: 'GOOGLE_MEET', label: 'Google Meet' },
  { id: 'MICROSOFT_TEAMS', label: 'Microsoft Teams' },
  { id: 'OTHER', label: 'Khác' },
]

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
  const [editing, setEditing] = useState<ClassSessionRecordingResponse | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editVideoUrl, setEditVideoUrl] = useState('')
  const [editProvider, setEditProvider] = useState<MeetingProvider>('ZOOM')
  const [removing, setRemoving] = useState<ClassSessionRecordingResponse | null>(null)
  const [clock, setClock] = useState(0)
  const draftDirty = title.trim() !== '' || videoUrl.trim() !== '' || provider !== 'ZOOM'
  const unsavedGuard = useUnsavedActionGuard(draftDirty, busy)
  const receivedAt = resource.data?.receivedAt
  // The BE also lets a TEACHER attach/edit a recording; TEACHER reaches recordings from its own
  // screens, while this console panel is only rendered for STAFF and MANAGER.
  const canManage = role === 'STAFF' || role === 'MANAGER'

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

  const openEditor = (record: ClassSessionRecordingResponse) => {
    setError('')
    setNotice('')
    setEditing(record)
    setEditTitle(record.title)
    setEditVideoUrl(record.videoUrl ?? '')
    setEditProvider(record.provider ?? 'ZOOM')
  }

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await updateClassSessionRecording(session.id, editing.id, {
        title: editTitle.trim(),
        videoUrl: editVideoUrl.trim(),
        provider: editProvider,
      })
      setEditing(null)
      setNotice('Đã cập nhật bản ghi.')
      resource.reload()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const removeRecord = async () => {
    if (!removing) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await deleteClassSessionRecording(session.id, removing.id)
      setRemoving(null)
      setNotice('Đã xoá bản ghi khỏi buổi học.')
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
              disabled={busy}
              onEdit={canManage ? () => openEditor(record) : undefined}
              onDelete={canManage ? () => setRemoving(record) : undefined}
            />
          ))}
        </div>
      </ScheduleResourceState>
      {canManage ? (
        <form className="grid gap-3 rounded-lg bg-background-gray-secondary p-3 sm:grid-cols-2" onSubmit={attach}>
          <Field label="Tên bản ghi">
            <input name="title" autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} required className={fieldControlClass} />
          </Field>
          <Field label="Nền tảng">
            <select name="provider" autoComplete="off" value={provider} onChange={(event) => setProvider(event.target.value as MeetingProvider)} disabled={busy} className={fieldControlClass}>
              {providerOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
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
      {editing && (
        <ConsoleSheet open onClose={() => setEditing(null)} closeDisabled={busy} title="Sửa bản ghi">
          <form className="flex flex-col gap-4" onSubmit={saveEdit}>
            {error && <Notice tone="danger">{error}</Notice>}
            <Field label="Tên bản ghi">
              <input
                name="editTitle"
                autoComplete="off"
                required
                disabled={busy}
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className={fieldControlClass}
              />
            </Field>
            <Field label="Nền tảng">
              <select
                name="editProvider"
                disabled={busy}
                value={editProvider}
                onChange={(event) => setEditProvider(event.target.value as MeetingProvider)}
                className={fieldControlClass}
              >
                {providerOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="URL video">
              <input
                name="editVideoUrl"
                autoComplete="off"
                type="url"
                disabled={busy}
                value={editVideoUrl}
                onChange={(event) => setEditVideoUrl(event.target.value)}
                className={fieldControlClass}
                placeholder="https://"
              />
            </Field>
            <div className="flex justify-end gap-2 border-t border-card-border pt-4">
              <Button type="button" appearance="outline" disabled={busy} onClick={() => setEditing(null)}>Đóng</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
            </div>
          </form>
        </ConsoleSheet>
      )}
      {removing && (
        <ConfirmDialog
          title="Xoá bản ghi?"
          description={<>Bản ghi “{removing.title}” sẽ bị gỡ khỏi buổi học.</>}
          cancelLabel="Giữ lại"
          confirmLabel="Xoá bản ghi"
          variant="danger"
          busy={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={removeRecord}
        />
      )}
    </section>
  )
}

function RecordingRow({
  record,
  streamExpired,
  disabled,
  onEdit,
  onDelete,
}: {
  record: ClassSessionRecordingResponse
  streamExpired: boolean
  disabled?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
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
      <div className="flex flex-wrap items-center gap-2">
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
        {onEdit && (
          <Button size="sm" appearance="outline" disabled={disabled} onClick={onEdit}>
            <Pencil size={13} />
            Sửa
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="danger" appearance="outline" disabled={disabled} onClick={onDelete}>
            <Trash2 size={13} />
            Xoá
          </Button>
        )}
      </div>
    </article>
  )
}

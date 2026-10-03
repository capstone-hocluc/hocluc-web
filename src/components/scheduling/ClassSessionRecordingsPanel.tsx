import { useEffect, useState, type FormEvent } from 'react'
import { ExternalLink, Play, RefreshCw, Video } from 'lucide-react'
import { getClassSessionRecordings, attachClassSessionRecording } from '../../services/classSessionRecordingService'
import type { ClassSessionRecordingResponse, ClassSessionResponse, MeetingProvider } from '../../types/scheduling'
import type { ManagementRole } from '../management/ManagementRouteGuard'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getErrorMessage } from '../../lib/errors'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import Notice from '../ui/Notice'
import ScheduleResourceState from './ScheduleResourceState'
import { safeExternalUrl } from '../../lib/scheduling'
import { useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'

type ActorRole = Extract<ManagementRole, 'STAFF' | 'MANAGER' | 'TEACHER'> | 'STUDENT'

const fieldClass =
  'h-10 max-[767px]:h-11 w-full rounded-xl border border-border-subtle bg-surface-input px-3 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

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
    <section className="space-y-3 border-t border-border-subtle pt-4">
      <div className="flex items-center gap-2">
        <Video size={17} className="text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-text-heading">Bản ghi của buổi</h3>
        <Button size="sm" appearance="ghost" className="ml-auto max-[767px]:min-h-11" disabled={busy} onClick={resource.reload}>
          <RefreshCw size={14} />
          Tải link mới
        </Button>
      </div>
      <Notice tone="info">
        Link phát có thể hết hạn sau tối đa 6 giờ; tải lại danh sách để xin URL mới. URL chỉ được giữ trong bộ nhớ giao diện.
      </Notice>
      {error && <Notice tone="danger">{error}</Notice>}
      {notice && <Notice tone="info">{notice}</Notice>}
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        empty={!resource.data?.records.length}
        emptyMessage="Chưa có bản ghi đính kèm."
        onRetry={resource.reload}
      >
        <div className="space-y-2">
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
        <form className="grid gap-2 rounded-xl bg-surface-soft p-3 sm:grid-cols-2" onSubmit={attach}>
          <label className="text-xs font-medium text-text-heading">
            Tên bản ghi
            <input name="title" autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} required className={fieldClass + ' mt-1'} />
          </label>
          <label className="text-xs font-medium text-text-heading">
            Nền tảng
            <select name="provider" autoComplete="off" value={provider} onChange={(event) => setProvider(event.target.value as MeetingProvider)} disabled={busy} className={fieldClass + ' mt-1'}>
              <option value="ZOOM">Zoom</option>
              <option value="GOOGLE_MEET">Google Meet</option>
              <option value="MICROSOFT_TEAMS">Microsoft Teams</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <label className="text-xs font-medium text-text-heading sm:col-span-2">
            URL video
            <input name="videoUrl" autoComplete="off" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} disabled={busy} type="url" required className={fieldClass + ' mt-1'} placeholder="https://example.com/recording/…" />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" className="max-[767px]:min-h-11" disabled={busy}>
              <Video size={15} />
              {busy ? 'Đang gắn…' : 'Gắn URL bản ghi'}
            </Button>
          </div>
        </form>
      ) : (
        <Notice tone="warning">
          Chức năng gắn bản ghi cho giáo viên sẽ khả dụng khi quyền phụ trách buổi học được xác nhận.
        </Notice>
      )}
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          title="Bỏ thông tin bản ghi chưa lưu?"
          description="Thông tin bản ghi bạn vừa nhập chưa được gửi lên máy chủ. Nếu tiếp tục, những thay đổi này sẽ bị bỏ."
          cancelLabel="Tiếp tục chỉnh sửa"
          confirmLabel="Bỏ thay đổi"
          variant="danger"
          mobileTouchTargets
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
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-heading">{record.title}</p>
        <p className="mt-1 text-xs text-text-muted">
          {record.durationSeconds ? Math.round(record.durationSeconds / 60) + ' phút' : 'Thời lượng chưa rõ'}
          {record.sectionTitle ? ' · ' + record.sectionTitle : ''}
        </p>
      </div>
      {url ? (
        <Button asChild size="sm" appearance="outline" className="max-[767px]:min-h-11">
          <a href={url} target="_blank" rel="noreferrer">
            <Play size={14} />
            Mở bản ghi
            <ExternalLink size={13} />
          </a>
        </Button>
      ) : (
        <span className="text-xs text-text-muted">
          {streamExpired ? 'Link phát đã hết hạn, hãy tải link mới.' : 'URL bản ghi chưa sẵn sàng'}
        </span>
      )}
    </article>
  )
}

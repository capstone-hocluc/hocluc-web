import { type FormEvent, useState } from 'react'
import Button from '../console/button'
import Notice from '../console/notice'
import { Input } from '../tailgrids/core/input'
import { Label } from '../tailgrids/core/label'
import { TextField } from '../tailgrids/core/text-field'
import { Skeleton } from '../tailgrids/core/skeleton'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { assignTeacherZoomAccount, getTeacherZoomAccount, zoomErrorMessage } from '../../services/liveClassService'

/** The Zoom user a teacher hosts their live classes on; only an administrator changes it. */
export default function TeacherZoomPanel({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const resource = useScheduleResource(`teacher-zoom:${userId}`, () => getTeacherZoomAccount(userId))
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  if (resource.status === 'loading' || resource.status === 'idle') {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  if (resource.status !== 'ready' || !resource.data) {
    return <Notice tone="danger">{resource.errorMessage || 'Không tải được tài khoản Zoom.'}</Notice>
  }

  const current = resource.data.zoomEmail ?? ''
  const value = draft ?? current

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await assignTeacherZoomAccount(userId, value)
      setDraft(null)
      setSaved(true)
      resource.reload()
    } catch (requestError) {
      setError(zoomErrorMessage(requestError, 'Không lưu được tài khoản Zoom.'))
    } finally {
      setBusy(false)
    }
  }

  if (!canEdit) {
    return current ? (
      <p className="text-sm text-text-primary">{current}</p>
    ) : (
      <Notice tone="warning">Giáo viên này chưa được cấp tài khoản Zoom.</Notice>
    )
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
      {!current && <Notice tone="warning">Giáo viên này chưa được cấp tài khoản Zoom.</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      {saved && <Notice tone="info">Đã lưu tài khoản Zoom.</Notice>}
      <TextField className="gap-2" type="email" name="zoomEmail" autoComplete="off" value={value} disabled={busy}
        onChange={(next) => { setDraft(next); setSaved(false) }}>
        <Label>Email tài khoản Zoom</Label>
        <Input className="w-full" />
      </TextField>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || value.trim() === current}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
      </div>
    </form>
  )
}

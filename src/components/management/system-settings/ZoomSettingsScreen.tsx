import Button from '../../console/button'
import Card from '../../console/card'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import Skeleton from '../../ui/Skeleton'
import { useZoomSettings } from '../../../hooks/useZoomSettings'
import type { ZoomForm } from '../../../services/zoomSettingsService'

const fields: { key: Exclude<keyof ZoomForm, 'enabled'>; label: string; secret?: boolean }[] = [
  { key: 'oauthClientId', label: 'OAuth client ID' }, { key: 'oauthClientSecret', label: 'OAuth client secret', secret: true },
  { key: 'redirectUri', label: 'Địa chỉ chuyển hướng OAuth' }, { key: 'sdkKey', label: 'SDK key' },
  { key: 'sdkSecret', label: 'SDK secret', secret: true }, { key: 'webhookSecret', label: 'Khóa webhook', secret: true },
  { key: 'accountId', label: 'Account ID' }, { key: 'clientId', label: 'Server-to-server client ID' },
  { key: 'clientSecret', label: 'Server-to-server client secret', secret: true },
]
export default function ZoomSettingsScreen() {
  const s = useZoomSettings()
  return <section className="flex flex-col gap-5"><PageHeading title="Zoom" />
    {s.loading ? <Card className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-16" />)}</Card> : <Card className="flex flex-col gap-5">
      {s.error && <Notice tone="danger">{s.error}</Notice>}{s.message && <Notice>{s.message}</Notice>}
      {!s.settings?.encryptionAvailable && <Notice tone="warning">Máy chủ chưa có khóa mã hóa cấu hình.</Notice>}
      <Notice tone="warning">Đổi ứng dụng OAuth sẽ yêu cầu giáo viên kết nối lại Zoom.</Notice>
      <p className="text-sm text-text-secondary">Nguồn: {s.settings?.source === 'database' ? 'Đã lưu' : 'Môi trường'}</p>
      <label className="flex items-center gap-2"><input type="checkbox" checked={s.form.enabled} disabled={s.busy} onChange={e => s.update('enabled', e.target.checked)} /> Bật Zoom</label>
      <div className="grid gap-5 sm:grid-cols-2">{fields.map(field => <Field key={field.key} label={field.label}><input type={field.secret ? 'password' : 'text'} autoComplete={field.secret ? 'off' : undefined} className={fieldControlClass} placeholder={field.secret ? s.settings?.secrets[field.key] : undefined} value={s.form[field.key]} disabled={s.busy} onChange={e => s.update(field.key, e.target.value)} /></Field>)}</div>
      <p className="text-sm text-text-secondary">Quyền OAuth: user:read:user, user:read:zak, meeting:write:meeting, meeting:read:meeting, meeting:update:meeting, meeting:delete:meeting, meeting:update:status, meeting:write:registrant, meeting:update:registrant_status, cloud_recording:read:list_recording_files.</p>
      {s.result && <Notice tone={s.result.status === 'valid' ? 'info' : 'danger'}>{s.result.message}</Notice>}
      <div className="flex flex-wrap gap-3"><Button appearance="outline" disabled={s.busy} onClick={() => void s.test()}>Kiểm tra</Button><Button disabled={s.busy} onClick={() => void s.save()}>Lưu</Button></div>
    </Card>}
  </section>
}

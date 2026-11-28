import Button from '../../console/button'
import Card from '../../console/card'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import Skeleton from '../../ui/Skeleton'
import { useEmailSettings } from '../../../hooks/useEmailSettings'

export default function EmailSettingsScreen() {
  const s = useEmailSettings()
  return <section className="flex flex-col gap-5">
    <PageHeading title="Email" />
    {s.loading ? <Card className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16" />)}</Card> : <Card className="flex flex-col gap-5">
      {s.error && <Notice tone="danger">{s.error}</Notice>}
      {s.message && <Notice>{s.message}</Notice>}
      {!s.settings?.encryptionAvailable && <Notice tone="warning">Máy chủ chưa có khóa mã hóa cấu hình.</Notice>}
      <p className="text-sm text-text-secondary">Nguồn: {s.settings?.source === 'database' ? 'Đã lưu' : 'Môi trường'}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Máy chủ SMTP"><input className={fieldControlClass} value={s.form.host} disabled={s.busy} onChange={e => s.update('host', e.target.value)} /></Field>
        <Field label="Cổng"><input type="number" min={1} max={65535} className={fieldControlClass} value={s.form.port} disabled={s.busy} onChange={e => s.update('port', Number(e.target.value))} /></Field>
        <Field label="Tên đăng nhập"><input className={fieldControlClass} value={s.form.username} disabled={s.busy} onChange={e => s.update('username', e.target.value)} /></Field>
        <Field label="Mật khẩu SMTP"><input type="password" autoComplete="off" className={fieldControlClass} placeholder={s.settings?.maskedPassword} value={s.form.password} disabled={s.busy} onChange={e => s.update('password', e.target.value)} /></Field>
        <Field label="Email gửi"><input type="email" className={fieldControlClass} value={s.form.from} disabled={s.busy} onChange={e => s.update('from', e.target.value)} /></Field>
        <Field label="Tên người gửi"><input className={fieldControlClass} value={s.form.fromName} disabled={s.busy} onChange={e => s.update('fromName', e.target.value)} /></Field>
      </div>
      <div className="flex gap-5"><label className="flex items-center gap-2"><input type="checkbox" checked={s.form.tls} disabled={s.busy} onChange={e => s.update('tls', e.target.checked)} /> TLS</label><label className="flex items-center gap-2"><input type="checkbox" checked={s.form.ssl} disabled={s.busy} onChange={e => s.update('ssl', e.target.checked)} /> SSL</label></div>
      <p className="text-sm text-text-secondary">Email thử chỉ gửi đến địa chỉ tài khoản của bạn.</p>
      {s.result && <Notice tone={s.result.ok ? 'info' : 'danger'}>{s.result.message}</Notice>}
      <div className="flex flex-wrap gap-3"><Button appearance="outline" disabled={s.busy} onClick={() => void s.test()}>Gửi email thử</Button><Button disabled={s.busy} onClick={() => void s.save()}>Lưu</Button></div>
    </Card>}
  </section>
}

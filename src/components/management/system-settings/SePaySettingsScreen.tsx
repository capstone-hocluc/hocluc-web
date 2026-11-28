import Button from '../../console/button'
import Card from '../../console/card'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import Skeleton from '../../ui/Skeleton'
import { useSePaySettings } from '../../../hooks/useSePaySettings'
import { API_BASE_URL } from '../../../lib/api'

export default function SePaySettingsScreen() {
  const s = useSePaySettings()
  return <section className="flex flex-col gap-5">
    <PageHeading title="Thanh toán SePay" />
    {s.loading ? <Card className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16" />)}</Card> : <Card className="flex flex-col gap-5">
      {s.error && <Notice tone="danger">{s.error}</Notice>}
      {s.message && <Notice>{s.message}</Notice>}
      {!s.settings?.encryptionAvailable && <Notice tone="warning">Máy chủ chưa có khóa mã hóa cấu hình.</Notice>}
      <p className="text-sm text-text-secondary">Nguồn: {s.settings?.source === 'database' ? 'Đã lưu' : 'Môi trường'}</p>
      <label className="flex items-center gap-2"><input type="checkbox" checked={s.form.enabled} disabled={s.busy} onChange={e => s.update('enabled', e.target.checked)} /> Bật SePay</label>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Mã ngân hàng"><input className={fieldControlClass} value={s.form.bankCode} disabled={s.busy} onChange={e => s.update('bankCode', e.target.value)} /></Field>
        <Field label="Số tài khoản"><input className={fieldControlClass} value={s.form.accountNumber} disabled={s.busy} onChange={e => s.update('accountNumber', e.target.value)} /></Field>
        <Field label="Tên chủ tài khoản"><input className={fieldControlClass} value={s.form.accountName} disabled={s.busy} onChange={e => s.update('accountName', e.target.value)} /></Field>
        <Field label="Khóa webhook"><input type="password" autoComplete="off" className={fieldControlClass} placeholder={s.settings?.maskedWebhookSecret} value={s.form.webhookSecret} disabled={s.busy} onChange={e => s.update('webhookSecret', e.target.value)} /></Field>
        <Field label="Thời hạn webhook (giây)"><input type="number" min={1} max={900} className={fieldControlClass} value={s.form.webhookMaxAgeSeconds} disabled={s.busy} onChange={e => s.update('webhookMaxAgeSeconds', Number(e.target.value))} /></Field>
        <Field label="Thời hạn thanh toán (phút)"><input type="number" min={1} max={1440} className={fieldControlClass} value={s.form.paymentExpireMinutes} disabled={s.busy} onChange={e => s.update('paymentExpireMinutes', Number(e.target.value))} /></Field>
        <Field label="URL webhook"><input readOnly className={fieldControlClass} value={`${API_BASE_URL}/api/v1/payments/webhook/sepay`} /></Field>
      </div>
      <p className="text-sm text-text-secondary">Kiểm tra chỉ xác thực cấu hình tại chỗ, không gọi SePay.</p>
      {s.result && <Notice tone={s.result.ok ? 'info' : 'danger'}>{s.result.message}</Notice>}
      <div className="flex flex-wrap gap-3"><Button appearance="outline" disabled={s.busy} onClick={() => void s.test()}>Kiểm tra</Button><Button disabled={s.busy} onClick={() => void s.save()}>Lưu</Button></div>
    </Card>}
  </section>
}

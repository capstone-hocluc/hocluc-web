import Button from '../../console/button'
import Card from '../../console/card'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import Skeleton from '../../ui/Skeleton'
import { useComposeSettings } from '../../../hooks/useComposeSettings'
import type { ComposeValues } from '../../../services/composeSettingsService'
const fields: { key: Exclude<keyof ComposeValues, 'mathSandboxUrl'>; label: string; min: number; max: number; step: number }[] = [
  { key: 'reuseRatio', label: 'Tỷ lệ dùng lại câu hỏi (0–1)', min: 0, max: 1, step: 0.01 },
  { key: 'maxCellsPerCall', label: 'Số ô mỗi lần gọi (1–200)', min: 1, max: 200, step: 1 },
  { key: 'minHardShare', label: 'Tỷ lệ câu khó tối thiểu (0–0,5)', min: 0, max: 0.5, step: 0.01 },
  { key: 'maxRepairAttempts', label: 'Số lần sửa tối đa (0–2)', min: 0, max: 2, step: 1 },
  { key: 'maxAnswerRewrites', label: 'Số lần viết lại tối đa (0–2)', min: 0, max: 2, step: 1 },
  { key: 'consecutiveFailureLimit', label: 'Số lỗi liên tiếp tối đa (1–100)', min: 1, max: 100, step: 1 },
  { key: 'similarityThreshold', label: 'Ngưỡng trùng lặp (0–1)', min: 0, max: 1, step: 0.01 },
  { key: 'parallelism', label: 'Số phần chạy song song (1–20)', min: 1, max: 20, step: 1 },
  { key: 'maxTokensPerJob', label: 'Token tối đa mỗi đề (0–100.000.000)', min: 0, max: 100000000, step: 1 },
]
export default function ComposeSettingsCard() {
  const s = useComposeSettings()
  return <Card className="flex flex-col gap-5"><h2 className="text-lg font-semibold text-text-primary">Thông số soạn đề</h2>
    {s.loading ? <div className="grid gap-5 sm:grid-cols-2">{fields.map(field => <Skeleton key={field.key} className="h-16" />)}</div> : <>
      {s.error && <Notice tone="danger">{s.error}</Notice>}{s.message && <Notice>{s.message}</Notice>}
      <p className="text-sm text-text-secondary">Nguồn: {s.settings?.source === 'database' ? 'Đã lưu' : 'Môi trường'} · Token tối đa bằng 0 là không giới hạn.</p>
      <div className="grid gap-5 sm:grid-cols-2">{fields.map(field => <Field key={field.key} label={field.label}><input type="number" min={field.min} max={field.max} step={field.step} className={fieldControlClass} value={s.form[field.key]} disabled={s.busy} onChange={e => s.update(field.key, Number(e.target.value))} /></Field>)}
        <Field label="Địa chỉ math sandbox"><input type="url" className={fieldControlClass} value={s.form.mathSandboxUrl} disabled={s.busy} onChange={e => s.update('mathSandboxUrl', e.target.value)} /></Field>
      </div><div><Button disabled={s.busy} onClick={() => void s.save()}>Lưu thông số</Button></div>
    </>}
  </Card>
}

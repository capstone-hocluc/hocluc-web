import Button from '../../console/button'
import Card from '../../console/card'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import Skeleton from '../../ui/Skeleton'
import { useConfidenceSettings } from '../../../hooks/useConfidenceSettings'
import type { ConfidenceValues } from '../../../services/confidenceSettingsService'
const fields: { key: keyof ConfidenceValues; label: string }[] = [
  { key: 'reviewBelow', label: 'Ngưỡng đưa câu hỏi đi duyệt' },
  { key: 'minLabelConfidence', label: 'Ngưỡng gán nhãn tối thiểu' },
  { key: 'chatSubjectMinConfidence', label: 'Ngưỡng nhận diện môn học' },
]
export default function ConfidenceSettingsScreen() {
  const s = useConfidenceSettings()
  return <section className="flex flex-col gap-5"><PageHeading title="Ngưỡng tin cậy AI" />
    {s.loading ? <Card className="grid gap-5 sm:grid-cols-2">{fields.map(field => <Skeleton key={field.key} className="h-16" />)}</Card> : <Card className="flex flex-col gap-5">
      {s.error && <Notice tone="danger">{s.error}</Notice>}{s.message && <Notice>{s.message}</Notice>}
      <p className="text-sm text-text-secondary">Nguồn: {s.settings?.source === 'database' ? 'Đã lưu' : 'Môi trường'}</p>
      <p className="text-sm text-text-secondary">Mỗi ngưỡng từ 0 đến 1.</p>
      <div className="grid gap-5 sm:grid-cols-2">{fields.map(field => <Field key={field.key} label={field.label}><input type="number" min={0} max={1} step={0.01} className={fieldControlClass} value={s.form[field.key]} disabled={s.busy} onChange={e => s.update(field.key, Number(e.target.value))} /></Field>)}</div>
      <div><Button disabled={s.busy} onClick={() => void s.save()}>Lưu</Button></div>
    </Card>}
  </section>
}

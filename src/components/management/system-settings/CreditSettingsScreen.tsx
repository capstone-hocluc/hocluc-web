import Button from '../../console/button'
import Card from '../../console/card'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import Skeleton from '../../ui/Skeleton'
import { useCreditSettings } from '../../../hooks/useCreditSettings'
import type { CreditValues } from '../../../services/creditSettingsService'

const fields: { key: Exclude<keyof CreditValues, 'milestones'>; label: string; min?: number; max: number }[] = [
  { key: 'mentorQuestionPrice', label: 'Hỏi Mentor (sao)', max: 1000000 }, { key: 'liveClassPrice', label: 'Vào lớp trực tiếp (sao)', max: 1000000 },
  { key: 'aiSolvePrice', label: 'Giải ảnh bằng AI (sao)', max: 1000000 }, { key: 'freezePrice', label: 'Bảo vệ chuỗi (sao)', max: 1000000 },
  { key: 'dailyReward', label: 'Thưởng mỗi ngày (sao)', max: 1000000 }, { key: 'monthlyCap', label: 'Giới hạn thưởng tháng (sao)', max: 1000000 },
  { key: 'bonusTtlSeconds', label: 'Hạn sao thưởng (giây)', max: 316224000 }, { key: 'maxFreezes', label: 'Số lần bảo vệ tối đa', max: 1000 },
  { key: 'practicePassPercentage', label: 'Điểm đạt luyện tập (%)', max: 100 }, { key: 'defaultHoldTtlSeconds', label: 'Hạn giữ mặc định (giây)', max: 316224000 },
  { key: 'mentorReplyWindowSeconds', label: 'Hạn trả lời Mentor (giây)', max: 316224000 }, { key: 'aiSolveHoldTtlSeconds', label: 'Hạn giải AI (giây)', max: 316224000 },
  { key: 'holdSweepMs', label: 'Chu kỳ hoàn sao (mili giây)', min: 1000, max: 86400000 }, { key: 'holdSweepBatch', label: 'Số lượt hoàn mỗi đợt', min: 1, max: 10000 },
  { key: 'maxImageBytes', label: 'Ảnh giải AI tối đa (byte)', min: 1, max: 104857600 },
]
export default function CreditSettingsScreen() {
  const s = useCreditSettings()
  return <section className="flex flex-col gap-5"><PageHeading title="Giá và Sao" />
    {s.loading ? <Card className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-16" />)}</Card> : <Card className="flex flex-col gap-5">
      {s.error && <Notice tone="danger">{s.error}</Notice>}{s.message && <Notice>{s.message}</Notice>}
      <p className="text-sm text-text-secondary">Giá mới chỉ áp dụng cho lượt giữ hoặc tính phí mới.</p>
      <p className="text-sm text-text-secondary">Nguồn: {s.settings?.source === 'database' ? 'Đã lưu' : 'Môi trường'}</p>
      <div className="grid gap-5 sm:grid-cols-2">{fields.map(field => <Field key={field.key} label={field.label}><input type="number" min={field.min ?? 0} max={field.max} step={1} className={fieldControlClass} value={s.form[field.key]} disabled={s.busy} onChange={e => s.update(field.key, Number(e.target.value))} /></Field>)}
        <Field label="Mốc thưởng (ngày:sao)"><input className={fieldControlClass} value={s.milestones} disabled={s.busy} placeholder="7:5, 30:20" onChange={e => s.setMilestones(e.target.value)} /></Field>
      </div><div><Button disabled={s.busy} onClick={() => void s.save()}>Lưu</Button></div>
    </Card>}
  </section>
}

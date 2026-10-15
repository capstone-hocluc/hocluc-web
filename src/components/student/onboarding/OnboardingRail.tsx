import { Check } from '../../console/icons'
import { cn } from '../../../lib/cn'

const railCard =
  'rounded-3xl border-[1.5px] border-line-card bg-surface p-[22px] shadow-card'
const railKicker =
  'inline-flex items-center gap-2 text-xs font-black tracking-[0.1em] uppercase'

const perks = [
  'Gợi ý môn học nên ưu tiên',
  'Mốc điểm mục tiêu rõ ràng hơn',
  'Lộ trình ôn luyện bám sát ngành học',
]

// Right-hand column: highlight card, what the student gets, and a small tip.
function OnboardingRail() {
  return (
    <aside
      className="flex min-w-0 flex-col gap-4 max-[701px]:order-2"
      aria-label="Tóm tắt cá nhân hóa"
    >
      <div
        className={cn(
          railCard,
          "border-primary bg-primary text-white shadow-[0_5px_0_#0797d6]"
        )}
      >
        <span className={cn(railKicker, 'relative z-1 text-white/90')}>Lộ trình tinh gọn</span>
        <h2 className="relative z-1 my-2.5 text-2xl leading-[1.12] font-black tracking-[-0.6px]">
          Hồ sơ này giúp hệ thống hiểu bạn nhanh hơn.
        </h2>
        <p className="relative z-1 text-[15px] leading-[1.65] text-white/90">
          Chỉ vài thông tin cốt lõi, nhưng đủ để đề xuất bài tập, môn học và nhịp ôn luyện phù hợp
          với mục tiêu của bạn.
        </p>
      </div>
      <div className={railCard}>
        <span className={cn(railKicker, 'text-primary-text')}>Bạn sẽ nhận được</span>
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {perks.map((perk) => (
            <li
              key={perk}
              className="flex items-start gap-2.5 text-[15px] leading-normal font-bold text-text-heading"
            >
              <Check size={16} className="mt-0.5 shrink-0 text-primary-text" />
              {perk}
            </li>
          ))}
        </ul>
      </div>
      <div className={railCard}>
        <span className={cn(railKicker, 'text-primary-text')}>Gợi ý nhỏ</span>
        <p className="mt-3 text-[15px] leading-[1.7] text-text-body">
          Hãy chọn trường và ngành gần nhất với mục tiêu thật của bạn. Những chi tiết này làm cho
          phần gợi ý sau đó trông “đúng người” hơn rất nhiều.
        </p>
      </div>
    </aside>
  )
}

export default OnboardingRail

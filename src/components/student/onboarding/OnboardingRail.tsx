import { Check } from 'lucide-react'
import { cn } from '../../../lib/cn'

const railCard =
  'rounded-3xl border border-line-shell bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,255,0.94))] p-[22px] shadow-[0_16px_34px_rgba(17,24,58,0.06)]'
const railKicker =
  'inline-flex items-center gap-2 text-[11px] font-black tracking-[1.3px] uppercase'

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
          "relative overflow-hidden border-transparent bg-[linear-gradient(145deg,var(--color-primary)_0%,var(--color-primary-dark)_70%,var(--color-primary-dark)_100%)] text-surface shadow-[0_24px_44px_rgba(28, 176, 246,0.22)] after:absolute after:-right-[50px] after:-bottom-[70px] after:size-[180px] after:rounded-full after:bg-[rgba(251,195,79,0.16)] after:blur-[6px] after:content-['']"
        )}
      >
        <span className={cn(railKicker, 'relative z-1 text-white/78')}>Lộ trình tinh gọn</span>
        <h2 className="relative z-1 my-2.5 text-[24px] leading-[1.12] tracking-[-0.6px]">
          Hồ sơ này giúp hệ thống hiểu bạn nhanh hơn.
        </h2>
        <p className="relative z-1 text-[13px] leading-[1.65] text-white/78">
          Chỉ vài thông tin cốt lõi, nhưng đủ để đề xuất bài tập, môn học và nhịp ôn luyện phù hợp
          với mục tiêu của bạn.
        </p>
      </div>
      <div className={railCard}>
        <span className={cn(railKicker, 'text-primary')}>Bạn sẽ nhận được</span>
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {perks.map((perk) => (
            <li
              key={perk}
              className="flex items-start gap-2.5 text-[13px] leading-normal text-text-emphasis"
            >
              <Check size={14} className="mt-0.5 shrink-0 text-primary" />
              {perk}
            </li>
          ))}
        </ul>
      </div>
      <div className={railCard}>
        <span className={cn(railKicker, 'text-primary')}>Gợi ý nhỏ</span>
        <p className="mt-3 text-[13px] leading-[1.7] text-text-body">
          Hãy chọn trường và ngành gần nhất với mục tiêu thật của bạn. Những chi tiết này làm cho
          phần gợi ý sau đó trông “đúng người” hơn rất nhiều.
        </p>
      </div>
    </aside>
  )
}

export default OnboardingRail

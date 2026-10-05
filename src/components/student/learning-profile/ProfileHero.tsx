import { CalendarDays, Pencil } from 'lucide-react'
import Button from '../../ui/Button'

// Pill button of the hero (exam date / edit profile).
const heroButton =
  'h-auto gap-2 rounded-full border-[#bde8f8] bg-white/78 px-3 text-[12px] font-black transition hover:-translate-y-px hover:border-primary hover:bg-[#f7fbff]'

interface ProfileHeroProps {
  displayName: string
  exam: string
  metrics: { label: string; value: number | string }[]
  maxScore: number
  onPickExamDate: () => void
  onEditProfile: () => void
}

// Title, greeting card with the owl and the "Tổng quan năng lực" summary.
function ProfileHero({
  displayName,
  exam,
  metrics,
  maxScore,
  onPickExamDate,
  onEditProfile,
}: ProfileHeroProps) {
  return (
    <>
      <header className="mb-3.5 flex items-end justify-between gap-[18px]">
        <div>
          <h1 className="mb-[7px] text-[30px] leading-[1.15] font-black text-text-heading max-[760px]:text-[24px]">
            Hồ sơ năng lực
          </h1>
          <p className="text-[14px] leading-[1.55] text-text-secondary">
            Theo dõi năng lực và sự tiến bộ trong quá trình ôn thi ĐGNL
          </p>
        </div>
      </header>

      <article className="relative mb-3.5 overflow-hidden rounded-[26px] border border-[#cde9ff] bg-[linear-gradient(rgba(28, 176, 246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(28, 176, 246,0.05)_1px,transparent_1px),radial-gradient(circle_at_88%_12%,rgba(251,195,79,0.22),transparent_24%),linear-gradient(135deg,#eaf7ff_0%,#f3f8ff_100%)] bg-[length:64px_64px,64px_64px,auto,auto] px-5 pt-[18px] pb-5 shadow-[0_14px_34px_rgba(17,24,58,0.06)] max-[760px]:rounded-[22px] max-[760px]:p-4">
        <div className="relative z-1 flex items-center justify-between gap-3.5 max-[760px]:flex-col max-[760px]:items-start">
          <div className="flex min-w-0 items-center gap-3.5 max-[760px]:items-start">
            <img
              className="size-[76px] flex-none object-contain drop-shadow-[0_12px_18px_rgba(28, 176, 246,0.14)] max-[1181px]:size-[70px] max-[760px]:size-[62px]"
              src="/owl-welcome-wave.png"
              alt=""
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2 className="mb-1 text-[24px] leading-[1.2] font-black text-text-heading max-[760px]:text-[21px]">
                Hi, <span className="text-primary">{displayName}</span>
              </h2>
              <p className="max-w-[560px] text-[13px] leading-[1.55] font-[750] text-[#42506f]">
                Hãy tiếp tục học mỗi ngày - nỗ lực của bạn sẽ được đền đáp!
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-[7px]">
                <strong className="text-[13px] font-black text-primary">{exam}</strong>
                <Button
                  appearance="outline"
                  className={`${heroButton} min-h-8 [&>svg]:size-[15px]`}
                  onClick={onPickExamDate}
                >
                  <CalendarDays size={15} />
                  Chọn ngày thi của bạn
                </Button>
              </div>
            </div>
          </div>
          <Button
            appearance="outline"
            className={`${heroButton} min-h-[38px] flex-none bg-surface px-4 shadow-[0_10px_22px_rgba(28, 176, 246,0.08)] [&>svg]:size-4`}
            onClick={onEditProfile}
          >
            <Pencil size={16} />
            Chỉnh sửa hồ sơ
          </Button>
        </div>

        <div className="relative z-1 mt-4 rounded-[18px] border border-[rgba(221,234,248,0.96)] bg-white/90 p-3.5 shadow-[0_10px_24px_rgba(17,24,58,0.045)] max-[760px]:mt-3.5 max-[760px]:p-3">
          <strong className="mb-2.5 block text-[15px] font-black text-text-heading">
            Tổng quan năng lực
          </strong>
          <div className="grid grid-cols-3 gap-2.5 max-[760px]:grid-cols-1">
            {metrics.map((metric) => (
              <div
                className="min-w-0 rounded-[14px] border border-[#e1ecfb] bg-[#f7fbff] px-[13px] py-[11px]"
                key={metric.label}
              >
                <span className="mb-[5px] block text-[12px] font-[850] text-text-secondary">
                  {metric.label}
                </span>
                <b className="text-[20px] leading-none font-black text-text-heading">
                  {metric.value}{' '}
                  <small className="text-[12px] font-[850] text-text-faint">/ {maxScore}</small>
                </b>
              </div>
            ))}
          </div>
        </div>
      </article>
    </>
  )
}

export default ProfileHero

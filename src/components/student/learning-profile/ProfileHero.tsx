import { CalendarDays, Pencil } from '../../console/icons'
import Button from '../../ui/Button'

interface ProfileHeroProps {
  displayName: string
  exam: string
  metrics: { label: string; value: number | string }[]
  maxScore: number
  onPickExamDate: () => void
  onEditProfile: () => void
}

// Title, greeting card with Mai and the "Tổng quan năng lực" summary.
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
          <h1 className="mb-[7px] text-[28px] leading-[1.15] font-black tracking-[-0.5px] text-text-heading max-[760px]:text-2xl">
            Hồ sơ năng lực
          </h1>
          <p className="text-[15px] leading-[1.55] text-text-body">
            Theo dõi năng lực và sự tiến bộ trong quá trình ôn thi ĐGNL
          </p>
        </div>
      </header>

      <article className="relative mb-4 overflow-hidden rounded-3xl border-[1.5px] border-line-brand bg-surface-brand px-5 pt-[18px] pb-5 shadow-[0_5px_0_#b9e3f7] max-[760px]:p-4">
        <div className="relative z-1 flex items-center justify-between gap-3.5 max-[760px]:flex-col max-[760px]:items-start">
          <div className="flex min-w-0 items-center gap-3.5 max-[760px]:items-start">
            <img
              className="size-[76px] flex-none object-contain drop-shadow-[0_12px_18px_rgba(28, 176, 246,0.14)] max-[1181px]:size-[70px] max-[760px]:size-[62px]"
              src="/landing-v2/assets/mai-avatar-interaction.webp"
              alt=""
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2 className="mb-1 text-[24px] leading-[1.2] font-black text-text-heading max-[760px]:text-[21px]">
                Hi, <span className="text-primary">{displayName}</span>
              </h2>
              <p className="max-w-[560px] text-[15px] leading-[1.55] font-bold text-text-body">
                Hãy tiếp tục học mỗi ngày - nỗ lực của bạn sẽ được đền đáp!
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-[7px]">
                <strong className="text-[15px] font-black text-primary-text">{exam}</strong>
                <Button
                  appearance="outline"
                  size="sm"
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
            className="flex-none"
            onClick={onEditProfile}
          >
            <Pencil size={16} />
            Chỉnh sửa hồ sơ
          </Button>
        </div>

        <div className="relative z-1 mt-4 rounded-2xl border-[1.5px] border-line-card bg-surface p-4 shadow-card-soft max-[760px]:mt-3.5 max-[760px]:p-3">
          <strong className="mb-3 block text-[17px] font-black text-text-heading">
            Tổng quan năng lực
          </strong>
          <div className="grid grid-cols-3 gap-2.5 max-[760px]:grid-cols-1">
            {metrics.map((metric) => (
              <div
                className="min-w-0 rounded-2xl border-[1.5px] border-line-card bg-surface-brand px-3.5 py-3"
                key={metric.label}
              >
                <span className="mb-1 block text-[13px] font-bold text-text-body">
                  {metric.label}
                </span>
                <b className="text-2xl leading-none font-black tracking-[-0.4px] text-text-heading">
                  {metric.value}{' '}
                  <small className="text-[13px] font-bold text-text-muted">/ {maxScore}</small>
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

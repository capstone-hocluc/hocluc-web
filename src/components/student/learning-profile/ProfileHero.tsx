import { CalendarDays, Pencil } from '../../console/icons'
import StudentPageHeader from '../layout/StudentPageHeader'
import Button from '../../ui/Button'

interface ProfileHeroProps {
  displayName: string
  exam: string
  metrics: { label: string; value: number | string }[]
  maxScore: number
  onPickExamDate: () => void
  onEditProfile: () => void
}

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
      <StudentPageHeader
        title="Hồ sơ năng lực"
        description="Theo dõi năng lực và sự tiến bộ trong quá trình ôn thi ĐGNL."
        actions={
          <Button appearance="outline" onClick={onEditProfile}>
            <Pencil size={16} />
            Chỉnh sửa hồ sơ
          </Button>
        }
      />
      <article className="mb-6 rounded-2xl border border-line-card bg-surface p-6 max-[760px]:p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <img src="/hocluc-mark.svg" width="32" height="40" alt="" className="mt-1 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-text-heading">Xin chào, {displayName}</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-body">
                Mỗi buổi học là một bước tiến gần hơn tới mục tiêu của bạn.
              </p>
              <p className="mt-3 text-sm font-semibold text-primary-text">{exam}</p>
            </div>
          </div>
          <Button appearance="ghost" onClick={onPickExamDate}>
            <CalendarDays size={16} />
            Chọn ngày thi
          </Button>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-6 border-t border-line-soft pt-6 max-[560px]:grid-cols-1 max-[560px]:gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0">
              <dt className="text-sm font-medium text-text-body">{metric.label}</dt>
              <dd className="mt-2 text-3xl font-bold tabular-nums text-text-heading">
                {metric.value}
                <span className="ml-2 text-sm font-medium text-text-muted">/ {maxScore}</span>
              </dd>
            </div>
          ))}
        </dl>
      </article>
    </>
  )
}

export default ProfileHero

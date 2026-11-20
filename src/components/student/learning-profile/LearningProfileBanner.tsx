import { Pencil } from '../../console/icons'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import { getUserDisplayName } from '../../../lib/userDisplay'
import type { ResourceStatus } from '../../../hooks/usePageResource'
import type { UserProfile } from '../../../services/userService'
import type { CourseCompetency } from '../../../services/freeExamService'
import styles from './LearningProfileBanner.module.css'

interface Props {
  profile: UserProfile | null
  result: CourseCompetency | null
  resultStatus: ResourceStatus
  onEdit: () => void
}

const levels: Record<string, string> = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung bình', ADVANCED: 'Nâng cao' }

export default function LearningProfileBanner({ profile, result, resultStatus, onEdit }: Props) {
  const saved = profile?.studentProfile
  const exam = saved?.targetExam === 'VNUHCM_DGNL' ? 'ĐGNL ĐHQG TP.HCM' : 'Chưa có dữ liệu'
  const resultPlaceholder = resultStatus === 'loading' ? 'Đang tải…' : resultStatus !== 'ready' ? 'Chưa tải được kết quả' : 'Chưa có dữ liệu'
  const name = getUserDisplayName(profile) || 'bạn'
  return <Card as="section" className={`${styles.banner} p-5 max-[640px]:p-4`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex min-w-0 flex-1 items-start gap-4 max-[640px]:basis-full max-[640px]:gap-3">
      <div className={styles.ribbon}>
        <img src="/mascot/01.png" width="56" height="56" alt="Linh vật HOCLUC" className="size-14 object-contain max-[640px]:size-12" />
      </div>
      <div className="min-w-0 pt-1">
        <h2 className={`${styles.greeting} text-[28px] leading-tight font-bold break-words max-[640px]:text-2xl`}>Xin chào, {name}</h2>
        <p className="mt-1 text-sm leading-relaxed text-text-heading">Mỗi bài học là một bước tiến gần hơn tới mục tiêu của bạn.</p>
      </div>
    </div>
      <Button appearance="outline" shape="pill" disabled={!profile} className={`${styles.editButton} ml-auto`} onClick={onEdit}><Pencil size={16} />Chỉnh sửa hồ sơ</Button>
    </div>
    <div className={styles.metricGroups}>
      <section className="min-w-0 rounded-3xl bg-surface p-4" aria-labelledby="profile-goal-heading">
        <h3 id="profile-goal-heading" className="mb-2 text-base font-bold text-text-heading">Mục tiêu học tập của bạn</h3>
        <dl className={styles.metrics}>
          <BannerMetric label="Kỳ thi" value={`${exam}${saved?.targetExamYear ? ` · ${saved.targetExamYear}` : ''}`} />
          <BannerMetric label="Điểm mục tiêu" value={saved?.targetScore == null ? 'Chưa có dữ liệu' : `${saved.targetScore} / 1200`} />
        </dl>
      </section>
      <section className="min-w-0 rounded-3xl bg-surface p-4" aria-labelledby="profile-entry-heading">
        <h3 id="profile-entry-heading" className="mb-2 text-base font-bold text-text-heading">Năng lực theo khóa đang chọn</h3>
        <dl className={styles.metrics}>
          <BannerMetric label="Tỷ lệ điểm tổng hợp" value={resultStatus === 'ready' && result?.overallPercentage != null ? `${result.overallPercentage}%` : resultPlaceholder} />
          <BannerMetric label="Mức năng lực" value={resultStatus === 'ready' && result?.level ? levels[result.level] ?? result.level : resultPlaceholder} />
        </dl>
      </section>
    </div>
  </Card>
}

function BannerMetric({ label, value }: { label: string; value: string }) {
  return <div className={styles.metric}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
}

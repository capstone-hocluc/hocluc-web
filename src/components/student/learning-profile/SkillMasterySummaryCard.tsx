import { ArrowRight } from '../../console/icons'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'
import Notice from '../../ui/Notice'
import StatusBadge from '../../ui/StatusBadge'
import SkillMasterySummarySkeleton from './SkillMasterySummarySkeleton'
import { useMySkillMastery } from '../../../hooks/useStudentRoadmap'
import { formatPercent, formatWeaknessSource } from '../../../lib/roadmapFormat'

interface SkillMasterySummaryCardProps {
  onOpenRoadmap: () => void
}

export default function SkillMasterySummaryCard({ onOpenRoadmap }: SkillMasterySummaryCardProps) {
  const { data, status, errorMessage, reload } = useMySkillMastery()
  const topWeakSkills = (data?.weakSkills ?? []).slice(0, 3)

  return (
    <Card as="section" aria-label="Mức độ nắm vững kỹ năng" className="min-w-0 space-y-4 rounded-3xl p-5 max-[640px]:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="mb-0 text-lg font-bold">Mức độ nắm vững kỹ năng</CardTitle>
        <Button
          size="sm"
          appearance="outline"
          className="border-primary-text text-primary-text"
          onClick={onOpenRoadmap}
        >
          Xem lộ trình học
          <ArrowRight size={16} />
        </Button>
      </div>

      {status === 'loading' && <SkillMasterySummarySkeleton />}

      {status === 'error' && (
        <Notice tone="danger">
          <span>{errorMessage || 'Không thể tải mức độ nắm vững kỹ năng.'}</span>
          <Button size="sm" appearance="outline" onClick={reload}>
            Thử lại
          </Button>
        </Notice>
      )}

      {status === 'ready' && data && (
        <>
          <div className="grid gap-3 rounded-2xl bg-surface-brand p-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Đã vững', value: data.masteredCount },
              { label: 'Đang cải thiện', value: data.developingCount },
              { label: 'Cần củng cố', value: data.weakCount },
              { label: 'Chưa đủ dữ liệu', value: data.insufficientCount },
            ].map((tile) => (
              <div key={tile.label}>
                <p className="text-xs text-text-secondary">{tile.label}</p>
                <strong className="mt-1 block text-lg text-primary-text">{tile.value}</strong>
              </div>
            ))}
          </div>

          {data.totalAssessedSkills === 0 && topWeakSkills.length === 0 ? (
            <Notice tone="info">Chưa có dữ liệu kỹ năng từ bài thi đã chấm.</Notice>
          ) : topWeakSkills.length > 0 ? (
            <ul className="grid gap-2.5 sm:grid-cols-3" aria-label="Kỹ năng cần củng cố hàng đầu">
              {topWeakSkills.map((skill) => (
                <li
                  key={skill.skillCode}
                  className="flex min-w-0 flex-col justify-between gap-2 rounded-xl border border-line-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-sm font-semibold break-words text-text-heading">
                      {skill.skillNameVi}
                    </strong>
                    <StatusBadge tone="danger" size="sm">
                      {skill.source === 'SELF_ASSESSMENT' && skill.totalAttempts === 0
                        ? formatWeaknessSource(skill.source)
                        : formatPercent(skill.rawScore)}
                    </StatusBadge>
                  </div>
                  {skill.categoryName && (
                    <span className="text-xs text-text-secondary">{skill.categoryName}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Notice tone="info">Chưa phát hiện kỹ năng cần củng cố.</Notice>
          )}
        </>
      )}
    </Card>
  )
}

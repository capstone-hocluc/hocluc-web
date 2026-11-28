import Card, { CardTitle } from '../../ui/Card'
import Notice from '../../ui/Notice'
import StatusBadge from '../../ui/StatusBadge'
import { formatPercent, formatWeaknessSource } from '../../../lib/roadmapFormat'
import type { StudentWeakSkill } from '../../../services/roadmapService'
import styles from './RoadmapWeakSkillsPanel.module.css'

interface RoadmapWeakSkillsPanelProps {
  weakSkills: StudentWeakSkill[]
}

export default function RoadmapWeakSkillsPanel({ weakSkills }: RoadmapWeakSkillsPanelProps) {
  return (
    <Card as="section" padding="lg" radius="xl" className="space-y-3">
      <CardTitle className="mb-0 text-lg">Kỹ năng cần củng cố</CardTitle>
      {weakSkills.length === 0 ? (
        <Notice tone="info">Chưa phát hiện kỹ năng cần củng cố.</Notice>
      ) : (
        <ul className={styles.list}>
          {weakSkills.map((skill) => {
            const prereqs = [
              ...skill.weakPrerequisiteCodes,
              ...skill.unassessedPrerequisiteCodes,
            ]
            return (
              <li key={skill.skillCode} className={styles.item}>
                <div className={styles.topRow}>
                  <strong className={styles.name}>{skill.skillNameVi}</strong>
                  <span className={styles.score}>
                    {skill.source === 'SELF_ASSESSMENT' && skill.totalAttempts === 0
                      ? formatWeaknessSource(skill.source)
                      : formatPercent(skill.rawScore)}
                  </span>
                </div>
                {skill.categoryName && <p className={styles.meta}>{skill.categoryName}</p>}
                <div className={styles.badges}>
                  {skill.rootCause && (
                    <StatusBadge tone="danger" size="sm">
                      {skill.blocksSkillCodes.length > 0
                        ? `Chặn ${skill.blocksSkillCodes.length} kỹ năng`
                        : 'Nguyên nhân gốc'}
                    </StatusBadge>
                  )}
                  {skill.source === 'SELF_ASSESSMENT' && skill.totalAttempts > 0 && (
                    <StatusBadge tone="info" size="sm">
                      {formatWeaknessSource(skill.source)}
                    </StatusBadge>
                  )}
                  {prereqs.map((code) => (
                    <StatusBadge key={code} tone="neutral" size="sm">
                      Nền: {code}
                    </StatusBadge>
                  ))}
                </div>
                {skill.reason && <p className={styles.reason}>{skill.reason}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

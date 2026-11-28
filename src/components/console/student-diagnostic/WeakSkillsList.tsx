import Notice from '../notice'
import Status from '../status'
import { formatPercent, formatWeaknessSource } from '../../../lib/roadmapFormat'
import type { StudentWeakSkill } from '../../../services/roadmapService'

interface WeakSkillsListProps {
  weakSkills: StudentWeakSkill[]
  skillNamesByCode: Record<string, string>
}

export default function WeakSkillsList({
  weakSkills,
  skillNamesByCode,
}: WeakSkillsListProps) {
  if (weakSkills.length === 0) {
    return <Notice tone="info">Chưa ghi nhận kỹ năng cần củng cố.</Notice>
  }

  return (
    <ul className="space-y-2.5">
      {weakSkills.map((skill) => {
        const prereqCodes = [
          ...skill.weakPrerequisiteCodes,
          ...skill.unassessedPrerequisiteCodes,
        ]
        const accuracyText =
          skill.totalAttempts > 0
            ? `${formatPercent(skill.rawScore)} (${skill.correctAttempts}/${skill.totalAttempts})`
            : formatWeaknessSource(skill.source)

        return (
          <li
            key={skill.skillCode}
            className="space-y-2 rounded-lg border border-card-border bg-card-background p-3.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-words text-text-primary">{skill.skillNameVi}</p>
                {skill.categoryName && (
                  <p className="mt-0.5 text-xs text-text-tertiary">{skill.categoryName}</p>
                )}
              </div>
              <span className="shrink-0 text-sm font-semibold text-badge-danger-text">
                {accuracyText}
              </span>
            </div>

            {(skill.rootCause || skill.source === 'SELF_ASSESSMENT' || prereqCodes.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {skill.rootCause && (
                  <Status tone="danger">
                    {skill.blocksSkillCodes.length > 0
                      ? `Chặn ${skill.blocksSkillCodes.length} kỹ năng`
                      : 'Nguyên nhân gốc'}
                  </Status>
                )}
                {skill.source === 'SELF_ASSESSMENT' && skill.totalAttempts > 0 && (
                  <Status tone="info">{formatWeaknessSource(skill.source)}</Status>
                )}
                {prereqCodes.map((code) => (
                  <Status key={code} tone="neutral">
                    Nền: {skillNamesByCode[code] ?? code}
                  </Status>
                ))}
              </div>
            )}

            {skill.reason && (
              <p className="text-xs leading-relaxed text-text-secondary">{skill.reason}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

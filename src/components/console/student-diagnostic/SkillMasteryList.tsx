import { useMemo, useState } from 'react'
import DateTime from '../detail/date-time'
import Notice from '../notice'
import SelectField from '../select-field'
import Status from '../status'
import { Progress } from '../../tailgrids/core/progress'
import {
  SKILL_MASTERY_LABELS,
  SKILL_MASTERY_TONES,
  toPercentValue,
} from '../../../lib/roadmapFormat'
import type {
  SkillMasteryStatus,
  StudentMasterySkillItem,
  StudentSubjectSummary,
} from '../../../services/roadmapService'

interface SkillMasteryListProps {
  skills: StudentMasterySkillItem[]
  subjects: StudentSubjectSummary[]
}

const STATUS_OPTIONS: { id: 'ALL' | SkillMasteryStatus; label: string }[] = [
  { id: 'ALL', label: 'Tất cả trạng thái' },
  { id: 'WEAK', label: SKILL_MASTERY_LABELS.WEAK },
  { id: 'INSUFFICIENT', label: SKILL_MASTERY_LABELS.INSUFFICIENT },
  { id: 'DEVELOPING', label: SKILL_MASTERY_LABELS.DEVELOPING },
  { id: 'MASTERED', label: SKILL_MASTERY_LABELS.MASTERED },
  { id: 'UNASSESSED', label: SKILL_MASTERY_LABELS.UNASSESSED },
]

export default function SkillMasteryList({ skills, subjects }: SkillMasteryListProps) {
  const [subjectFilter, setSubjectFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | SkillMasteryStatus>('ALL')

  const subjectOptions = useMemo(() => {
    const entries = new Map<string, string>()
    for (const subject of subjects) {
      if (subject.categoryId) {
        entries.set(subject.categoryId, subject.categoryName)
      }
    }
    return [
      { id: 'ALL', label: 'Tất cả môn' },
      ...Array.from(entries, ([id, label]) => ({ id, label })),
    ]
  }, [subjects])

  const filtered = useMemo(() => {
    return skills.filter((skill) => {
      if (subjectFilter !== 'ALL' && skill.categoryId !== subjectFilter) return false
      if (statusFilter !== 'ALL' && skill.status !== statusFilter) return false
      return true
    })
  }, [skills, subjectFilter, statusFilter])

  if (skills.length === 0) {
    return <Notice tone="info">Chưa có dữ liệu kỹ năng của học viên.</Notice>
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          ariaLabel="Lọc theo môn học"
          value={subjectFilter}
          onChange={setSubjectFilter}
          options={subjectOptions}
        />
        <SelectField
          ariaLabel="Lọc theo trạng thái nắm vững"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as 'ALL' | SkillMasteryStatus)}
          options={STATUS_OPTIONS}
        />
      </div>

      {filtered.length === 0 ? (
        <Notice tone="info">Không có kỹ năng phù hợp bộ lọc.</Notice>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((skill) => (
            <li
              key={skill.skillCode}
              className="space-y-2.5 rounded-lg border border-card-border bg-card-background p-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium break-words text-text-primary">{skill.skillNameVi}</p>
                  {skill.categoryName && (
                    <p className="mt-0.5 text-xs text-text-tertiary">{skill.categoryName}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Status tone={SKILL_MASTERY_TONES[skill.status]}>
                    {SKILL_MASTERY_LABELS[skill.status]}
                  </Status>
                  {skill.dueForReview && <Status tone="warning">Cần ôn</Status>}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Progress
                  progress={toPercentValue(skill.cappedMastery)}
                  withLabel
                  className="min-w-44 flex-1"
                />
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
                  <span>
                    {skill.correctAttempts}/{skill.totalAttempts} câu đúng
                  </span>
                  <span>
                    Gần nhất: <DateTime value={skill.lastAnsweredAt} />
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import Button from '../button'
import Notice from '../notice'
import {
  ConsoleSubTabsList,
  ConsoleSubTabsTrigger,
  ConsoleTabs,
  ConsoleTabsContent,
} from '../tabs'
import { useStudentDiagnostic } from '../../../hooks/useStudentDiagnostic'
import RoadmapProgressOverview from './RoadmapProgressOverview'
import SkillMasteryList from './SkillMasteryList'
import StudentLearningDiagnosticSkeleton from './StudentLearningDiagnosticSkeleton'
import WeakSkillsList from './WeakSkillsList'

interface StudentLearningDiagnosticPanelProps {
  studentId: string
  active?: boolean
}

type DiagnosticTab = 'weak' | 'skills' | 'roadmap'

export default function StudentLearningDiagnosticPanel({
  studentId,
  active = true,
}: StudentLearningDiagnosticPanelProps) {
  const [subTab, setSubTab] = useState<DiagnosticTab>('weak')
  const { mastery, roadmap, selectCourse, reloadAll } = useStudentDiagnostic(studentId, active)

  const skillNamesByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of mastery.data?.skills ?? []) {
      map[item.skillCode] = item.skillNameVi
    }
    return map
  }, [mastery.data?.skills])

  if (mastery.status === 'idle' || (mastery.status === 'loading' && !mastery.data)) {
    return <StudentLearningDiagnosticSkeleton />
  }

  if (mastery.status === 'forbidden') {
    return <Notice tone="danger">Bạn không có quyền xem năng lực học viên này.</Notice>
  }

  if (mastery.status === 'error' || !mastery.data) {
    return (
      <Notice tone="danger">
        <span>{mastery.errorMessage || 'Không thể tải dữ liệu năng lực học viên.'}</span>
        <Button size="sm" appearance="ghost" onClick={reloadAll}>
          Thử lại
        </Button>
      </Notice>
    )
  }

  const data = mastery.data
  const tiles = [
    { label: 'Đã vững', value: data.masteredCount },
    { label: 'Đang cải thiện', value: data.developingCount },
    { label: 'Cần củng cố', value: data.weakCount },
    { label: 'Cần ôn tập', value: data.dueReviewCount },
  ]

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border border-card-border bg-card-background px-3 py-2.5"
          >
            <dt className="text-xs text-text-tertiary">{tile.label}</dt>
            <dd className="mt-1 text-lg font-semibold text-text-primary">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <ConsoleTabs
        value={subTab}
        onValueChange={(value) => setSubTab(value as DiagnosticTab)}
      >
        <ConsoleSubTabsList aria-label="Chi tiết năng lực học viên">
          <ConsoleSubTabsTrigger value="weak">
            Điểm yếu ({data.weakSkills.length})
          </ConsoleSubTabsTrigger>
          <ConsoleSubTabsTrigger value="skills">
            Kỹ năng ({data.skills.length})
          </ConsoleSubTabsTrigger>
          <ConsoleSubTabsTrigger value="roadmap">Lộ trình</ConsoleSubTabsTrigger>
        </ConsoleSubTabsList>

        <ConsoleTabsContent value="weak">
          <WeakSkillsList weakSkills={data.weakSkills} skillNamesByCode={skillNamesByCode} />
        </ConsoleTabsContent>

        <ConsoleTabsContent value="skills">
          <SkillMasteryList skills={data.skills} subjects={data.subjects} />
        </ConsoleTabsContent>

        <ConsoleTabsContent value="roadmap">
          <RoadmapProgressOverview
            roadmap={roadmap.data}
            loading={roadmap.status === 'loading'}
            errorMessage={
              roadmap.status === 'forbidden'
                ? 'Bạn không có quyền xem lộ trình học viên này.'
                : roadmap.errorMessage
            }
            onRetry={roadmap.reload}
            onSelectCourse={selectCourse}
          />
        </ConsoleTabsContent>
      </ConsoleTabs>
    </div>
  )
}

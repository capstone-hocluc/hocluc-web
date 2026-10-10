import { useMemo, useState } from 'react'
import { CalendarDays } from '../../components/console/icons'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { usePageResource } from '../../hooks/usePageResource'
import { buildLearningProfileViewModel } from '../../lib/studentViewModel'
import { loadStudentSnapshot } from '../../services/studentService'
import ResourceState from '../../components/student/common/ResourceState'
import { SegmentedTabs } from '../../components/student/learning-profile/controls'
import ProfileHero from '../../components/student/learning-profile/ProfileHero'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import { LearningProfileDataProvider } from './learning-profile/LearningProfileProvider'
import type { LearningProfileData } from '../../data/learningProfile'
import { getUserDisplayName } from '../../lib/userDisplay'
import { tabs } from './learning-profile/icons'
import OverviewTab from './learning-profile/OverviewTab'
import LearningTab from './learning-profile/LearningTab'
import PracticeTab from './learning-profile/PracticeTab'
import { useTransientMessage } from '../../hooks/useTransientMessage'
import StudentToast from '../../components/student/common/StudentToast'

interface LearningProfileProps {
  onEditProfile: () => void
}

const pageClass =
  'px-[18px] pt-2.5 pb-11 text-text-heading max-[760px]:px-0 max-[760px]:pt-2 max-[760px]:pb-8'

// The original Learning Profile UI. Data: API overlay (student profile, placement
// result + attempts, course progress, lessons completed) over the prototype data
// in data/learningProfile.ts for everything the backend has no endpoint for.
function LearningProfile({ onEditProfile }: LearningProfileProps) {
  const { profile: currentUser } = useCurrentUser()
  const { data, status, errorMessage, reload } = usePageResource(loadStudentSnapshot, [], {
    forbidden: false,
    notFound: false,
  })
  const vm = useMemo(
    () => (data ? buildLearningProfileViewModel(data, currentUser) : null),
    [data, currentUser]
  )

  return (
    <>
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <StudentPageContainer width="wide" className={pageClass}>
            <Skeleton className="h-[560px] rounded-[28px]" />
          </StudentPageContainer>
        }
        error={{ title: 'Không thể tải hồ sơ năng lực' }}
      />
      {status === 'ready' && vm && (
        <LearningProfileDataProvider value={vm}>
          <LearningProfileContent profile={vm} onEditProfile={onEditProfile} />
        </LearningProfileDataProvider>
      )}
    </>
  )
}

function LearningProfileContent({
  profile,
  onEditProfile,
}: {
  profile: LearningProfileData
  onEditProfile: () => void
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const { message, show } = useTransientMessage(2600)
  const [analysis, setAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { profile: currentUser } = useCurrentUser()
  const displayName = getUserDisplayName(currentUser) || profile.studentName
  const heroMetrics = [
    { label: 'Hiện tại', value: profile.currentScore },
    { label: 'Điểm gần nhất', value: profile.latestScore },
    { label: 'Mục tiêu', value: profile.targetScore },
  ]

  const showMessage = (text = 'Tính năng này đang được phát triển.') => show(text)

  const runAnalysis = () => {
    if (isAnalyzing) return

    setIsAnalyzing(true)
    window.setTimeout(() => {
      setAnalysis({
        ...profile.aiAnalysisHistory[0],
        id: 'analysis-current',
        createdAt: 'Hôm nay',
      })
      setIsAnalyzing(false)
      showMessage('Phân tích hoàn tất.')
    }, 760)
  }

  return (
    <StudentPageContainer width="wide" className={pageClass}>
      <StudentToast message={message} />

      <ProfileHero
        displayName={displayName}
        exam={profile.exam}
        metrics={heroMetrics}
        maxScore={profile.maxScore}
        onPickExamDate={() => showMessage('Tính năng chọn ngày thi đang được phát triển.')}
        onEditProfile={onEditProfile}
      />

      <div className="mt-3.5 mb-4 flex items-center justify-between gap-3.5 max-[760px]:flex-col max-[760px]:items-stretch">
        <SegmentedTabs
          variant="page"
          ariaLabel="Hồ sơ năng lực"
          tabs={tabs}
          active={activeTab}
          onChange={setActiveTab}
          idPrefix="hl-profile"
        />
        <Button
          appearance="outline"
          className="h-auto min-h-[38px] rounded-xl border-line-blue px-3.5 text-[12px] font-black text-text-body shadow-[0_10px_22px_rgba(17,24,58,0.04)] hover:bg-surface [&>svg]:size-4 [&>svg]:text-primary"
          onClick={() => showMessage('Tính năng lọc theo thời gian đang được phát triển.')}
        >
          <CalendarDays size={16} />
          01/06/2025 - 31/08/2025
        </Button>
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          panelId="hl-profile-panel-overview"
          labelledBy="hl-profile-tab-overview"
          analysis={analysis}
          isAnalyzing={isAnalyzing}
          onAnalyze={runAnalysis}
          onAction={(text) =>
            showMessage(text || 'Tính năng phân tích chi tiết đang được phát triển.')
          }
        />
      )}
      {activeTab === 'learning' && (
        <LearningTab
          panelId="hl-profile-panel-learning"
          labelledBy="hl-profile-tab-learning"
          onAction={() => showMessage()}
        />
      )}
      {activeTab === 'practice' && (
        <PracticeTab
          panelId="hl-profile-panel-practice"
          labelledBy="hl-profile-tab-practice"
          onAction={() => showMessage('Tính năng luyện tập theo đề xuất đang được phát triển.')}
        />
      )}
    </StudentPageContainer>
  )
}

export default LearningProfile

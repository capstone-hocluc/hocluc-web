import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Target } from '../../components/console/icons'
import MascotState from '../../components/common/MascotState'
import StreakCard from '../../components/credits/StreakCard'
import SavedLearningGoals from '../../components/student/learning-profile/SavedLearningGoals'
import { SegmentedTabs } from '../../components/student/learning-profile/controls'
import { CourseDistribution, CourseMockExamResults, LearningCourseList, type ProfileNavigate } from '../../components/student/learning-profile/LearningCoursePanel'
import CourseLearningAnalytics from '../../components/student/learning-profile/CourseLearningAnalytics'
import LearningPracticePanel from '../../components/student/learning-profile/LearningPracticePanel'
import LearningProfileBanner from '../../components/student/learning-profile/LearningProfileBanner'
import bannerStyles from '../../components/student/learning-profile/LearningProfileBanner.module.css'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import Button from '../../components/ui/Button'
import Card, { CardTitle } from '../../components/ui/Card'
import Progress from '../../components/ui/Progress'
import Skeleton from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { usePageResource } from '../../hooks/usePageResource'
import { studentRoutes } from '../../lib/studentRoutes'
import { formatDuration } from '../../lib/courseFormat'
import { getLearningProfilePlacement, getLearningProfileCourses } from '../../services/learningProfileService'
import type { PlacementResult } from '../../services/assessmentService'

const tabs = [{ key: 'overview', label: 'Tổng quan' }, { key: 'learning', label: 'Học tập' }]
const levels: Record<string, string> = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung bình', ADVANCED: 'Nâng cao' }
interface LearningProfileProps { onNavigate: ProfileNavigate }

function LearningProfile({ onNavigate }: LearningProfileProps) {
  const { profile } = useCurrentUser()
  const tabsRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const assessmentRef = useRef<HTMLElement>(null)
  const scrollToAssessment = useRef(new URLSearchParams(window.location.search).get('tab') === 'practice')
  const scrollToPanel = useRef(false)
  const [activeTab, setActiveTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    return requested === 'plan' || requested === 'practice' ? 'learning' : tabs.some((tab) => tab.key === requested) ? requested! : 'overview'
  })
  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    if (['plan', 'practice'].includes(search.get('tab') ?? '')) {
      search.set('tab', 'learning')
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?${search}${window.location.hash}`)
    }
  }, [])
  useEffect(() => {
    const topbar = document.querySelector('.student-topbar')
    const updateOffset = () => {
      const offset = Math.ceil(topbar?.getBoundingClientRect().height ?? 72) + 8
      tabsRef.current?.style.setProperty('--profile-tabs-top', `${offset}px`)
      if (panelRef.current) {
        panelRef.current.style.scrollMarginTop = `${offset + (tabsRef.current?.offsetHeight ?? 60) + 16}px`
      }
    }
    updateOffset()
    const observer = new ResizeObserver(updateOffset)
    if (topbar) observer.observe(topbar)
    if (tabsRef.current) observer.observe(tabsRef.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!scrollToPanel.current) return
    scrollToPanel.current = false
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [activeTab])
  const placement = usePageResource(getLearningProfilePlacement, [])
  const courses = usePageResource(getLearningProfileCourses, [])
  useEffect(() => {
    if (activeTab !== 'learning' || !scrollToAssessment.current || courses.status === 'loading') return
    const section = assessmentRef.current
    if (!section) return
    scrollToAssessment.current = false
    section.style.scrollMarginTop = panelRef.current?.style.scrollMarginTop ?? '160px'
    section.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [activeTab, courses.status])
  const items = courses.data ?? []
  const changeTab = (key: string) => {
    const tabBar = tabsRef.current
    scrollToPanel.current = Boolean(tabBar && tabBar.getBoundingClientRect().top <= parseFloat(getComputedStyle(tabBar).top) + 1)
    setActiveTab(key)
    const search = new URLSearchParams(window.location.search)
    search.set('tab', key)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${search}`)
  }
  const courseState = <ResourceState imageSrc="/mascot/03.png" status={courses.status} errorMessage={courses.errorMessage} onRetry={courses.reload}
    loading={<Skeleton className="h-64 rounded-3xl" />} error={{ title: 'Không thể tải các khóa học đã đăng ký' }} />
  const courseList = (overview = false) => <>
    {overview && (courses.status !== 'ready' || items.length === 0) && <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Tiến độ học tập</h2><Button appearance="ghost" onClick={() => changeTab('learning')}>Xem tất cả<ArrowRight size={16} /></Button></div>}
    {courseState}
    {courses.status === 'ready' && (items.length ? <LearningCourseList title={overview ? 'Tiến độ học tập' : undefined} onViewAll={overview ? () => changeTab('learning') : undefined} courses={items} onNavigate={onNavigate} onRetry={courses.reload} /> : <MascotState imageSrc="/mascot/03.png" title="Bạn chưa có khóa học nào" message="Khám phá khóa học phù hợp để bắt đầu hành trình học tập."
      actionLabel="Khám phá khóa học" onAction={() => onNavigate('/courses')} />)}
  </>
  const placementState = <ResourceState imageSrc="/mascot/03.png" status={placement.status} errorMessage={placement.errorMessage} onRetry={placement.reload}
    loading={<Skeleton className="h-60 rounded-3xl" />} error={{ title: 'Không thể tải kết quả đánh giá đầu vào' }} />
  const noPlacement = <MascotState imageSrc="/mascot/03.png" title="Bạn chưa có kết quả đánh giá đầu vào" message="Làm bài đánh giá để xem tỷ lệ trả lời đúng và kết quả theo từng lĩnh vực."
    actionLabel="Làm bài đánh giá" onAction={() => onNavigate(studentRoutes.placement())} />
  return (
    <StudentPageContainer width="fluid" className="space-y-4 pb-8">
      <StudentPageHeader title="Hồ sơ năng lực" description="Theo dõi quá trình học tập và sự tiến bộ của bạn." className={`${bannerStyles.pageHeading} mb-0 border-b-0 pb-0`} />
      <LearningProfileBanner profile={profile} result={placement.data} resultStatus={placement.status} onEdit={() => onNavigate(studentRoutes.profile())} />
      <div ref={tabsRef} className={bannerStyles.stickyTabs}><SegmentedTabs variant="profile" ariaLabel="Hồ sơ năng lực" tabs={tabs} active={activeTab} onChange={changeTab} idPrefix="hl-profile" /></div>
      <section ref={panelRef} role="tabpanel" id={`hl-profile-panel-${activeTab}`} aria-labelledby={`hl-profile-tab-${activeTab}`} className="space-y-4">
        {activeTab === 'overview' && <>
          <div className="grid w-full items-start gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_320px] min-[1600px]:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              {courseList(true)}
            </div>
            <aside className="min-w-0">
              <section aria-labelledby="profile-streak-heading" className="min-w-0 space-y-3"><h2 id="profile-streak-heading" className="flex min-h-11 items-center text-lg font-bold">Chuỗi học tập</h2><StreakCard /></section>
            </aside>
          </div>
              <Card as="section" className="w-full rounded-3xl p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><CardTitle className="mb-1 text-lg">Kết quả đánh giá gần nhất</CardTitle><p className="text-xs text-text-body">Đánh giá đầu vào · Kết quả đã chấm gần nhất, có thể thuộc đề trước đó.</p></div>
                  {placement.status === 'ready' && placement.data && <Button size="sm" shape="pill" appearance="outline" className="border-primary-text text-primary-text not-disabled:hover:bg-primary/6" onClick={() => { scrollToAssessment.current = true; changeTab('learning') }}>Xem năng lực theo lĩnh vực<ArrowRight size={15} /></Button>}
                </div>
                {placementState}
                {placement.status === 'ready' && (placement.data ? <LatestPlacementSummary result={placement.data} /> : noPlacement)}
              </Card>
          <SavedLearningGoals />
        </>}
        {activeTab === 'learning' && <>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-primary-text">Tổng quan học tập</h2><p className="mt-1 text-sm text-text-body">Tiếp tục học, theo dõi kết quả và lịch sử luyện đề.</p></div><Button size="sm" shape="pill" appearance="outline" className="border-primary-text text-primary-text not-disabled:hover:bg-primary/6" onClick={() => onNavigate(studentRoutes.courses())}>Khóa học của tôi<ArrowRight size={16} /></Button></div>
          <div className="grid items-start gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_320px] min-[1600px]:grid-cols-[minmax(0,1fr)_360px]">
            <section aria-label="Khóa học của bạn" className="min-w-0">{courseList()}</section>
            {courses.status === 'ready' && items.length > 0 && <CourseDistribution courses={items} />}
          </div>
          {courses.status === 'ready' && <CourseLearningAnalytics courses={items} onNavigate={onNavigate} onRetry={courses.reload} />}
          <section ref={assessmentRef} aria-label="Năng lực và luyện đề" className="space-y-4 pt-4">
          <div><h2 className="text-xl font-bold text-primary-text">Đánh giá năng lực và luyện đề</h2><p className="mt-1 text-sm text-text-body">Theo dõi năng lực đầu vào, xem lịch sử và tiếp tục luyện tập.</p></div>
          {placementState}
          {placement.status === 'ready' && (placement.data ? <PlacementCompetency result={placement.data} onOpenPlacement={() => onNavigate(studentRoutes.placement())} /> : noPlacement)}
          <LearningPracticePanel onNavigate={onNavigate} />
          {courses.status === 'ready' && <CourseMockExamResults courses={items} onNavigate={onNavigate} />}
          </section>
        </>}
      </section>
    </StudentPageContainer>
  )
}

function LatestPlacementSummary({ result }: { result: PlacementResult }) {
  const percentage = Math.max(0, Math.min(100, result.overallPercentage))
  const metrics = [
    ['Tổng số câu', result.totalQuestions == null ? 'Chưa có dữ liệu' : `${result.totalQuestions} câu`],
    ['Trả lời đúng', result.correctCount == null ? 'Chưa có dữ liệu' : result.totalQuestions == null ? `${result.correctCount} câu đúng` : `${result.correctCount}/${result.totalQuestions} câu đúng`],
    ['Chưa đúng', result.wrongCount == null ? 'Chưa có dữ liệu' : `${result.wrongCount} câu`],
    ['Thời gian làm', result.timeSpentSeconds == null ? 'Chưa có dữ liệu' : result.timeSpentSeconds > 0 && result.timeSpentSeconds < 60 ? `${result.timeSpentSeconds} giây` : formatDuration(result.timeSpentSeconds)],
  ]
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-brand p-3">
      <div className="flex items-center gap-3">
        <div className="grid size-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-primary) ${percentage * 3.6}deg, var(--color-line-soft) 0)` }}>
          <strong className="grid size-16 place-items-center rounded-full bg-surface text-xl text-primary-text">{result.overallPercentage}%</strong>
        </div>
        <div><p className="mb-1 text-xs text-text-body">Tỷ lệ trả lời đúng</p>{result.level && <StatusBadge tone="assessment">{levels[result.level] ?? result.level}</StatusBadge>}</div>
      </div>
      <dl className="grid min-w-0 flex-1 basis-80 grid-cols-2 gap-x-4 gap-y-3 min-[900px]:grid-cols-4">
        {metrics.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-text-body">{label}</dt><dd className="mt-1 text-sm font-bold break-words text-text-heading">{value}</dd></div>)}
      </dl>
    </div>
    {(result.strongCategoryName || result.weakCategoryName) && <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-body">
      {result.strongCategoryName && <p>Môn mạnh nhất: <strong className="font-semibold text-text-heading">{result.strongCategoryName}</strong></p>}
      {result.weakCategoryName && <p>Cần cải thiện: <strong className="font-semibold text-text-heading">{result.weakCategoryName}</strong></p>}
    </div>}
  </div>
}

function PlacementCompetency({ result, onOpenPlacement }: { result: PlacementResult; onOpenPlacement: () => void }) {
  return (
      <Card as="section" className="min-w-0 space-y-3 rounded-3xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><CardTitle className="mb-1 text-lg">Kết quả đánh giá đầu vào</CardTitle><p className="text-xs text-text-body">Kết quả đầu vào gần nhất đã được chấm; có thể thuộc đề trước đó.</p></div>
          <StatusBadge tone="assessment">{levels[result.level] ?? result.level}</StatusBadge>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-brand p-3">
          <div className="grid size-20 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--color-primary) ${Math.max(0, Math.min(100, result.overallPercentage)) * 3.6}deg, var(--color-line-soft) 0)` }}>
            <span className="grid size-16 place-items-center rounded-full bg-surface text-xl font-bold text-primary-text">{result.overallPercentage}%</span>
          </div>
          <div className="min-w-0 flex-1"><p className="text-xs text-text-body">Tỷ lệ trả lời đúng</p>
            {result.totalQuestions != null && <p className="mt-1 text-sm font-bold text-text-heading">{result.correctCount}/{result.totalQuestions} câu đúng</p>}
          </div>
          <Button appearance="outline" shape="pill" size="sm" className="border-primary-text text-primary-text not-disabled:hover:bg-primary/6" onClick={onOpenPlacement}>Bài đánh giá đầu vào<ArrowRight size={15} /></Button>
        </div>
        <div className="grid gap-2 min-[640px]:grid-cols-2">
          <div className="flex min-w-0 items-start gap-2 rounded-xl border border-line-card px-3 py-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" /><div className="min-w-0"><h3 className="text-xs text-text-body">Môn mạnh nhất</h3><p className="mt-1 text-sm font-semibold break-words">{result.strongCategoryName || 'Bài đánh giá chưa xác định môn mạnh nhất.'}</p></div></div>
          <div className="flex min-w-0 items-start gap-2 rounded-xl border border-line-card px-3 py-2"><Target size={18} className="mt-0.5 shrink-0 text-assess" /><div className="min-w-0"><h3 className="text-xs text-text-body">Môn cần cải thiện</h3><p className="mt-1 text-sm font-semibold break-words">{result.weakCategoryName || 'Bài đánh giá chưa xác định môn cần cải thiện.'}</p></div></div>
        </div>
        <h3 className="text-sm font-semibold text-text-heading">Kết quả theo lĩnh vực</h3>
        {result.categories.length ? <ul aria-label="Kết quả theo lĩnh vực" tabIndex={result.categories.length > 4 ? 0 : undefined} className="grid max-h-60 gap-2 overflow-y-auto p-1 min-[640px]:grid-cols-2 min-[1400px]:grid-cols-3">
          {result.categories.map((category) => <li key={category.categoryId} className="min-w-0 rounded-2xl border border-line-card p-3">
            <div className="flex items-start justify-between gap-2 text-sm"><span className="font-semibold text-text-heading">{category.categoryName}</span>
              <strong className="shrink-0 text-primary-text">{category.percentage}%</strong></div>
            <Progress value={category.percentage} className="my-2" aria-label={`Tỷ lệ đúng môn ${category.categoryName}`} />
            <p className="text-xs text-text-body">{category.correctCount}/{category.totalCount} câu đúng</p>
          </li>)}
        </ul> : <MascotState imageSrc="/mascot/03.png" className="min-h-0 border-0 bg-surface-brand p-3 [&>img]:size-16" title="Chưa có kết quả phân loại theo môn cho bài đánh giá này." />}
      </Card>
  )
}

export default LearningProfile

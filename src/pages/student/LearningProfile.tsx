import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from '../../components/console/icons'
import MascotState from '../../components/common/MascotState'
import StreakCard from '../../components/credits/StreakCard'
import SavedLearningGoals from '../../components/student/learning-profile/SavedLearningGoals'
import { SegmentedTabs } from '../../components/student/learning-profile/controls'
import { CourseDistribution, CourseMockExamResults, LearningCourseList, type ProfileNavigate } from '../../components/student/learning-profile/LearningCoursePanel'
import CourseLearningAnalytics from '../../components/student/learning-profile/CourseLearningAnalytics'
import CourseCompetencyPanel from '../../components/student/learning-profile/CourseCompetencyPanel'
import SkillMasterySummaryCard from '../../components/student/learning-profile/SkillMasterySummaryCard'
import LearningPracticePanel from '../../components/student/learning-profile/LearningPracticePanel'
import SuggestedCourses from '../../components/student/course/SuggestedCourses'
import { useCourseCompetency } from '../../hooks/useCourseCompetency'
import LearningProfileBanner from '../../components/student/learning-profile/LearningProfileBanner'
import bannerStyles from '../../components/student/learning-profile/LearningProfileBanner.module.css'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { usePageResource } from '../../hooks/usePageResource'
import { studentRoutes } from '../../lib/studentRoutes'
import { getLearningProfileCourses } from '../../services/learningProfileService'

const tabs = [{ key: 'overview', label: 'Tổng quan' }, { key: 'learning', label: 'Học tập' }]
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
  const competency = useCourseCompetency()
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
  return (
    <StudentPageContainer width="fluid" className="space-y-4 pb-8">
      <StudentPageHeader title="Hồ sơ năng lực" description="Theo dõi quá trình học tập và sự tiến bộ của bạn." className={`${bannerStyles.pageHeading} mb-0 border-b-0 pb-0`} />
      <LearningProfileBanner profile={profile} result={competency.data} resultStatus={competency.status} onEdit={() => onNavigate(studentRoutes.profile())} />
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
          <CourseCompetencyPanel competency={competency} onNavigate={onNavigate} compact />
          <SkillMasterySummaryCard onOpenRoadmap={() => onNavigate(studentRoutes.roadmap())} />
          <SavedLearningGoals />
          <SuggestedCourses compact onOpen={course => onNavigate(course.purchased ? studentRoutes.courseStudy(course.id) : `/courses/${encodeURIComponent(course.id)}`)} />
        </>}
        {activeTab === 'learning' && <>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-primary-text">Tổng quan học tập</h2><p className="mt-1 text-sm text-text-body">Tiếp tục học, theo dõi kết quả và lịch sử luyện đề.</p></div><Button size="sm" shape="pill" appearance="outline" className="border-primary-text text-primary-text not-disabled:hover:bg-primary/6" onClick={() => onNavigate(studentRoutes.courses())}>Khóa học của tôi<ArrowRight size={16} /></Button></div>
          <div className="grid items-start gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_320px] min-[1600px]:grid-cols-[minmax(0,1fr)_360px]">
            <section aria-label="Khóa học của bạn" className="min-w-0">{courseList()}</section>
            {courses.status === 'ready' && items.length > 0 && <CourseDistribution courses={items} />}
          </div>
          {courses.status === 'ready' && <CourseLearningAnalytics courses={items} onNavigate={onNavigate} onRetry={courses.reload} />}
          <section ref={assessmentRef} aria-label="Năng lực và luyện đề" className="space-y-4 pt-4">
          <div><h2 className="text-xl font-bold text-primary-text">Đánh giá năng lực và luyện đề</h2><p className="mt-1 text-sm text-text-body">Theo dõi năng lực tổng hợp theo khóa và tiếp tục làm đề miễn phí.</p></div>
          <CourseCompetencyPanel competency={competency} onNavigate={onNavigate} />
          <LearningPracticePanel onNavigate={onNavigate} />
          {courses.status === 'ready' && <CourseMockExamResults courses={items} onNavigate={onNavigate} />}
          </section>
        </>}
      </section>
    </StudentPageContainer>
  )
}

export default LearningProfile

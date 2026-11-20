import { useEffect, useState } from 'react'
import CourseOverview from '../../components/student/course/CourseOverview'
import NextLiveClassCard from '../../components/student/course/NextLiveClassCard'
import StudyCurriculum from '../../components/student/course/StudyCurriculum'
import CourseLiveClassesTab from '../../components/student/course/CourseLiveClassesTab'
import CourseTutorMascot from '../../components/student/course/CourseTutorMascot'
import CourseExamsTab from '../../components/student/course/CourseExamsTab'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Skeleton from '../../components/ui/Skeleton'
import Button from '../../components/ui/Button'
import { BookOpen, CalendarDays, FileQuestion } from '../../components/console/icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { usePageResource } from '../../hooks/usePageResource'
import { getCourseStudy } from '../../services/courseService'
import AppLink from '../../components/landing-page/AppLink'
import styles from '../../components/student/course/CourseStudyAppearance.module.css'

interface CourseStudyPageProps {
  courseId: string
  onBackToMyCourses: () => void
  onViewCourseInfo: () => void
  onOpenLesson: (lessonId: string, courseId?: string) => void
  onOpenQuiz: (quizId: string, tab?: 'exams') => void
  onOpenTutor: () => void
}

type StudyTab = 'content' | 'exams' | 'live'

const TABS: { key: StudyTab; label: string }[] = [
  { key: 'content', label: 'Nội dung học' },
  { key: 'exams', label: 'Bài thi' },
  { key: 'live', label: 'Lớp học trực tuyến' },
]

// A SECTION bought on its own has no roadmap, live-class series or mock exam of its own.
const MAIN_ONLY_TABS: StudyTab[] = ['exams', 'live']

function isStudyTab(value: string | null): value is StudyTab {
  return TABS.some((tab) => tab.key === value)
}

// Rendered inside StudentLayout (header + sidebar come from the layout).
function CourseStudyPage({
  courseId,
  onBackToMyCourses,
  onViewCourseInfo,
  onOpenLesson,
  onOpenQuiz,
  onOpenTutor,
}: CourseStudyPageProps) {
  const {
    data: study,
    status,
    errorMessage,
    reload,
  } = usePageResource(() => getCourseStudy(courseId), [courseId])
  const [activeTab, setActiveTab] = useState<StudyTab>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    return isStudyTab(tab) ? tab : 'content'
  })
  const [reminderDismissed, setReminderDismissed] = useState(false)
  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    if (search.get('tab') !== 'plan') return
    search.delete('tab')
    window.history.replaceState(window.history.state, '',
      `${window.location.pathname}${search.size ? `?${search}` : ''}${window.location.hash}`)
  }, [])

  // A course bought as a single SECTION has no roadmap, live-class series or mock exam tabs.
  const isSection = study?.courseType === 'SECTION'
  const visibleTabs = isSection ? TABS.filter((tab) => !MAIN_ONLY_TABS.includes(tab.key)) : TABS
  const effectiveTab = visibleTabs.some((tab) => tab.key === activeTab) ? activeTab : 'content'

  const handleTabChange = (value: string) => {
    if (!isStudyTab(value)) return
    setActiveTab(value)

    // Keep the selected tab in the URL for reload and browser navigation.
    const search = new URLSearchParams(window.location.search)
    if (value === 'content') search.delete('tab')
    else search.set('tab', value)
    const query = search.toString()
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    )
  }

  return (
    <StudentPageContainer width="fluid" className="pb-8">
      <ResourceState
        imageSrc="/mascot/03.png"
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <div className="flex flex-col gap-5">
            <Skeleton className="h-[150px]" />
            <Skeleton className="h-10 w-[420px] max-w-full" />
            <Skeleton className="h-80" />
          </div>
        }
        forbidden={{
          title: 'Chưa thể truy cập khóa học',
          message: 'Bạn chưa có quyền truy cập khóa học này.',
          actionLabel: 'Xem thông tin khóa học',
          onAction: onViewCourseInfo,
        }}
        notFound={{
          title: 'Không tìm thấy khóa học',
          message: 'Khóa học này không tồn tại hoặc đã bị gỡ.',
          actionLabel: 'Quay lại Khóa học của tôi',
          onAction: onBackToMyCourses,
        }}
        error={{ title: 'Không thể tải nội dung khóa học' }}
      />

      {status === 'ready' && study && (
        <Tabs
          value={effectiveTab}
          onValueChange={handleTabChange}
          className="flex flex-col gap-6"
        >
          <CourseOverview study={study} onBack={onBackToMyCourses} onOpenLesson={onOpenLesson} />
          {study.showPlacementReminder && !reminderDismissed && <aside className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line-card bg-surface p-4" aria-label="Nhắc thi thử miễn phí">
            <div><h2 className="font-semibold">Thử sức trước khi bắt đầu học</h2><p className="mt-1 text-sm text-text-secondary">Làm đề miễn phí của khóa để xem đánh giá năng lực. Bạn vẫn có thể tiếp tục học ngay.</p></div>
            <div className="flex flex-wrap gap-2"><Button size="sm" appearance="outline" onClick={() => setReminderDismissed(true)}>Để sau</Button><Button asChild size="sm"><AppLink href={`/student/assessments?tab=free&course=${encodeURIComponent(courseId)}`}>Xem đề miễn phí</AppLink></Button></div>
          </aside>}

          <div>
            <TabsList className={styles.studyTabs} aria-label="Nội dung khóa học">
              {visibleTabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.key === 'content' ? <BookOpen size={18} /> : tab.key === 'exams' ? <FileQuestion size={18} /> : <CalendarDays size={18} />}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className={styles.tabPanel}>
              <TabsContent value="content" className="flex flex-col gap-5">
                {study.nextLiveClass && (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
                    <NextLiveClassCard liveClass={study.nextLiveClass} />
                  </div>
                )}
                <StudyCurriculum
                  phases={study.phases}
                  currentLessonId={study.continueLessonId}
                  currentCourseId={study.continueSectionCourseId}
                  onOpenLesson={onOpenLesson}
                  onOpenQuiz={onOpenQuiz}
                />
              </TabsContent>

              <TabsContent value="live">
                <CourseLiveClassesTab courseId={courseId} />
              </TabsContent>

              <TabsContent value="exams">
                <CourseExamsTab courseId={courseId} onOpenQuiz={(quizId) => onOpenQuiz(quizId, 'exams')} />
              </TabsContent>

          </div>
          </div>
          <CourseTutorMascot onOpenTutor={onOpenTutor} />
        </Tabs>
      )}
    </StudentPageContainer>
  )
}

export default CourseStudyPage

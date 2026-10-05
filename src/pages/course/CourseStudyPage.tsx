import { useState } from 'react'
import CourseOverview from '../../components/student/course/CourseOverview'
import NextLiveClassCard from '../../components/student/course/NextLiveClassCard'
import StudyGroupCard from '../../components/student/course/StudyGroupCard'
import StudyCurriculum from '../../components/student/course/StudyCurriculum'
import CourseLiveClassesTab from '../../components/student/course/CourseLiveClassesTab'
import CourseEnrollmentPlanTab from '../../components/student/course/CourseEnrollmentPlanTab'
import CourseExamsTab from '../../components/student/course/CourseExamsTab'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Skeleton from '../../components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { usePageResource } from '../../hooks/usePageResource'
import { getCourseStudy, type Course } from '../../services/courseService'

interface CourseStudyPageProps {
  courseId: string
  onBackToMyCourses: () => void
  onViewCourseInfo: () => void
  onOpenLesson: (lessonId: string) => void
  onOpenQuiz: (quizId: string) => void
  onOpenCourse: (course: Course) => void
  onEditProfile: () => void
}

type StudyTab = 'content' | 'exams' | 'live' | 'plan'

const TABS: { key: StudyTab; label: string }[] = [
  { key: 'content', label: 'Nội dung học' },
  { key: 'exams', label: 'Bài thi' },
  { key: 'live', label: 'Lớp học trực tuyến' },
  { key: 'plan', label: 'Lộ trình học' },
]

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
  onOpenCourse,
  onEditProfile,
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

  const handleTabChange = (value: string) => {
    if (!isStudyTab(value)) return
    setActiveTab(value)

    // Keep the selected tab in the current history entry so returning from a
    // quiz detail page restores the student's place in the course.
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
    <StudentPageContainer className="pb-8">
      <ResourceState
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
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex flex-col gap-5"
        >
          <CourseOverview study={study} onBack={onBackToMyCourses} onOpenLesson={onOpenLesson} />

          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="content" className="flex flex-col gap-5">
            {study.nextLiveClass && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
                <NextLiveClassCard liveClass={study.nextLiveClass} />
              </div>
            )}
            <StudyGroupCard
              key={`${courseId}-${study.activeStudyGroupId ?? 'none'}`}
              courseId={courseId}
              initialGroupId={study.activeStudyGroupId}
              onCompleteProfile={onEditProfile}
              onRefreshStudy={reload}
            />
            <StudyCurriculum
              phases={study.phases}
              currentLessonId={study.continueLessonId}
              onOpenLesson={onOpenLesson}
              onOpenQuiz={onOpenQuiz}
            />
          </TabsContent>

          <TabsContent value="live">
            <CourseLiveClassesTab courseId={courseId} />
          </TabsContent>

          <TabsContent value="exams">
            <CourseExamsTab courseId={courseId} onOpenQuiz={onOpenQuiz} />
          </TabsContent>

          <TabsContent value="plan">
            <CourseEnrollmentPlanTab courseId={courseId} onOpenCourse={onOpenCourse} />
          </TabsContent>
        </Tabs>
      )}
    </StudentPageContainer>
  )
}

export default CourseStudyPage

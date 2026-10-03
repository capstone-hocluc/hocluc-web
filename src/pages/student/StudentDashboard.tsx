import { useEffect, useMemo, useState } from 'react'
import { studyPlan, testPractice, todaysGoal } from '../../data/studentDashboard'
import { usePageResource } from '../../hooks/usePageResource'
import { useTransientMessage } from '../../hooks/useTransientMessage'
import { buildDashboardViewModel, type DashboardViewModel } from '../../lib/studentViewModel'
import { loadStudentSnapshot } from '../../services/studentService'
import ResourceState from '../../components/student/common/ResourceState'
import SectionHeader from '../../components/student/common/SectionHeader'
import StudentToast from '../../components/student/common/StudentToast'
import CarouselControls from '../../components/student/dashboard/CarouselControls'
import CompetencyPanel from '../../components/student/dashboard/CompetencyPanel'
import CourseMiniCard from '../../components/student/dashboard/CourseMiniCard'
import { linkButtonClass } from '../../components/student/dashboard/cta'
import GoalCard from '../../components/student/dashboard/GoalCard'
import {
  RecentLessonCard,
  StarScore,
  StudyPlanCard,
} from '../../components/student/dashboard/LearningCards'
import PracticeTestCard from '../../components/student/dashboard/PracticeTestCard'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'

const getVisibleCounts = () => {
  if (typeof window === 'undefined') {
    return { courses: 3, practice: 4 }
  }

  if (window.innerWidth < 768) {
    return { courses: 1, practice: 1 }
  }

  if (window.innerWidth < 1200) {
    return { courses: 2, practice: 2 }
  }

  return { courses: 3, practice: 4 }
}

interface StudentDashboardProps {
  onOpenLearningProfile: () => void
  onOpenMyCourses: () => void
  onOpenCourse: (courseId: string) => void
  onContinueLearning: (courseId: string, lessonId: string | null) => void
}

// The dotted background lives on the page container; children that must sit above
// it (the grid and the practice section) are `relative z-1`.
const pageClass =
  "relative px-[18px] pt-3.5 pb-10 before:pointer-events-none before:fixed before:inset-x-0 before:top-[86px] before:bottom-0 before:z-0 before:bg-[radial-gradient(#dce8f7_1.2px,transparent_1.2px)] before:bg-[length:18px_18px] before:opacity-[0.42] before:content-[''] max-[760px]:px-0 max-[760px]:pt-2 max-[760px]:pb-[30px]"

// Layout and sections are the original dashboard. Data: real API for courses,
// progress, recent lesson, competency and lessons-completed (view-model);
// everything the backend has no endpoint for (daily goal, study plan, practice
// tests, streak, study time...) still comes from data/studentDashboard.ts.
function StudentDashboard(props: StudentDashboardProps) {
  const { data, status, errorMessage, reload } = usePageResource(loadStudentSnapshot, [], {
    forbidden: false,
    notFound: false,
  })
  const vm = useMemo(() => (data ? buildDashboardViewModel(data) : null), [data])

  return (
    <StudentPageContainer width="wide" className={pageClass}>
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={<Skeleton className="relative z-1 h-[640px] rounded-[28px]" />}
        error={{ title: 'Không thể tải tổng quan học tập' }}
      />
      {status === 'ready' && vm && <DashboardContent vm={vm} {...props} />}
    </StudentPageContainer>
  )
}

function DashboardContent({
  vm,
  onOpenLearningProfile,
  onOpenMyCourses,
  onOpenCourse,
  onContinueLearning,
}: StudentDashboardProps & { vm: DashboardViewModel }) {
  const [visibleCounts, setVisibleCounts] = useState(getVisibleCounts)
  const [courseStartRaw, setCourseStartIndex] = useState(0)
  const [practiceStartRaw, setPracticeStartIndex] = useState(0)
  const { message, show: showMessage } = useTransientMessage(2600)

  const courseVisibleCount = visibleCounts.courses
  const practiceVisibleCount = visibleCounts.practice
  const maxCourseStartIndex = Math.max(0, vm.courses.length - courseVisibleCount)
  const maxPracticeStartIndex = Math.max(0, testPractice.length - practiceVisibleCount)
  // Clamp while rendering: the carousel offset must follow resizes and list changes.
  const courseStartIndex = Math.min(courseStartRaw, maxCourseStartIndex)
  const practiceStartIndex = Math.min(practiceStartRaw, maxPracticeStartIndex)
  const visibleCourses = vm.courses.slice(courseStartIndex, courseStartIndex + courseVisibleCount)
  const visiblePracticeItems = testPractice.slice(
    practiceStartIndex,
    practiceStartIndex + practiceVisibleCount
  )

  useEffect(() => {
    const syncVisibleCounts = () => setVisibleCounts(getVisibleCounts())

    syncVisibleCounts()
    window.addEventListener('resize', syncVisibleCounts)
    return () => window.removeEventListener('resize', syncVisibleCounts)
  }, [])

  const showComingSoon = () => showMessage('Tính năng đang được phát triển.')
  const { recentLesson, summary } = vm

  return (
    <>
      <StudentToast message={message} />

      <div className="relative z-1 grid grid-cols-[minmax(0,1fr)_360px] items-stretch gap-10 max-[1181px]:grid-cols-1 max-[1181px]:gap-[30px]">
        <div className="flex min-w-0 flex-col gap-6">
          <GoalCard
            title={todaysGoal.title}
            description={todaysGoal.description}
            lockedNote={todaysGoal.lockedNote}
            onStart={showComingSoon}
          />

          <section>
            <SectionHeader title="Bài học gần nhất" />
            {recentLesson ? (
              <RecentLessonCard
                badge={recentLesson.lessonNo}
                title={recentLesson.title}
                meta={
                  <>
                    {recentLesson.course} · {recentLesson.meta}{' '}
                    <StarScore>{recentLesson.score}</StarScore>
                  </>
                }
                actionLabel="Tiếp tục học"
                onAction={() => onContinueLearning(recentLesson.courseId, recentLesson.lessonId)}
              />
            ) : (
              <RecentLessonCard
                badge="--"
                title="Bạn chưa có bài học nào"
                meta="Đăng ký khóa học để bắt đầu học."
                actionLabel="Khóa học của tôi"
                onAction={onOpenMyCourses}
              />
            )}
          </section>

          <section>
            <SectionHeader title="Kế hoạch ôn thi" />
            <StudyPlanCard
              text={`${studyPlan.title}. ${studyPlan.description}`}
              actionLabel="Khởi tạo"
              onAction={() => showMessage('Tính năng Kế hoạch ôn thi đang được phát triển.')}
            />
          </section>

          <section>
            <SectionHeader
              title="Khóa học của tôi"
              actions={
                <>
                  <CarouselControls
                    label="Điều hướng khóa học"
                    canPrevious={courseStartIndex > 0}
                    canNext={courseStartIndex < maxCourseStartIndex}
                    onPrevious={() => setCourseStartIndex(Math.max(0, courseStartIndex - 1))}
                    onNext={() =>
                      setCourseStartIndex(Math.min(maxCourseStartIndex, courseStartIndex + 1))
                    }
                  />
                  <Button appearance="ghost" className={linkButtonClass} onClick={onOpenMyCourses}>
                    Xem tất cả
                  </Button>
                </>
              }
            />
            {vm.courses.length === 0 ? (
              <p className="py-6 text-sm text-text-secondary">Bạn chưa đăng ký khóa học nào.</p>
            ) : (
              <div
                className="mt-4 grid gap-[18px] overflow-hidden"
                style={{ gridTemplateColumns: `repeat(${courseVisibleCount}, minmax(0, 1fr))` }}
              >
                {visibleCourses.map((course) => (
                  <CourseMiniCard
                    key={course.id}
                    title={course.title}
                    category={course.category}
                    progress={course.progress}
                    score={course.score}
                    onOpen={() => onOpenCourse(course.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="flex h-full min-w-0 flex-col gap-6">
          <section className="flex h-full flex-col gap-3.5">
            <SectionHeader
              title="Hồ sơ năng lực"
              titleClassName="text-base leading-normal"
              actions={
                <Button
                  appearance="ghost"
                  className={linkButtonClass}
                  onClick={onOpenLearningProfile}
                >
                  Xem tất cả
                </Button>
              }
            />
            <CompetencyPanel dimensions={vm.dimensions} summary={summary} />
          </section>
        </aside>
      </div>

      <section className="relative z-1 mt-7">
        <SectionHeader
          title="Luyện đề"
          actions={
            <>
              <CarouselControls
                label="Điều hướng luyện đề"
                canPrevious={practiceStartIndex > 0}
                canNext={practiceStartIndex < maxPracticeStartIndex}
                onPrevious={() => setPracticeStartIndex(Math.max(0, practiceStartIndex - 1))}
                onNext={() =>
                  setPracticeStartIndex(Math.min(maxPracticeStartIndex, practiceStartIndex + 1))
                }
              />
              <Button appearance="ghost" className={linkButtonClass} onClick={showComingSoon}>
                Xem tất cả
              </Button>
            </>
          }
        />
        <div
          className="mt-4 grid gap-[18px] overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${practiceVisibleCount}, minmax(0, 1fr))` }}
        >
          {visiblePracticeItems.map((item) => (
            <PracticeTestCard
              key={item.id}
              title={item.title}
              tone={item.tone}
              questions={item.questions}
              duration={item.duration}
              badge={item.badge}
              score={item.score}
              status={item.status}
              onOpen={() => showMessage(`${item.title}: tính năng luyện đề đang được phát triển.`)}
            />
          ))}
        </div>
      </section>
    </>
  )
}

export default StudentDashboard

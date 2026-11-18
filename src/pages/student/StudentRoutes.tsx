import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import StudentLayout from '../../components/student/layout/StudentLayout'
import SchedulingPageFallback from '../../components/scheduling/SchedulingPageFallback'
import { isStudentAssessmentsPath, parseStudentRoute, studentRoutes, type StudentRoute } from '../../lib/studentRoutes'
import { getAttempt, type QuizDetail } from '../../services/assessmentService'
import { usePageResource } from '../../hooks/usePageResource'
import ResourceState from '../../components/student/common/ResourceState'
import StudentChatPage from './StudentChatPage'
import StudentAiSolvePage from './StudentAiSolvePage'
import ChatFeatureGate from '../../components/chat-feature-gate'
import MascotState from '../../components/common/MascotState'
import StudentDashboard from './StudentDashboard'
import MyCourses from './MyCourses'
import StudentAssessments from './StudentAssessments'
import CourseDetail from './CourseDetail'
import LearningActivity from './LearningActivity'
import VideoLearningPage from './VideoLearningPage'
import LearningProfile from './LearningProfile'
import AccountProfile, { type AccountSection } from './AccountProfile'
import CourseStudyPage from '../course/CourseStudyPage'
import LessonPage from '../course/LessonPage'
import QuizDetailPage from '../assessments/QuizDetailPage'
import QuizAttemptPage from '../assessments/QuizAttemptPage'
import QuizReviewPage from '../assessments/QuizReviewPage'

const StudentSchedulePage = lazy(() => import('./StudentSchedulePage'))

interface StudentNavigationState {
  quizReturnTo?: string
  lessonStudyCourseId?: string
  placementReturnTo?: string
  tutorReturnTo?: string
}

interface StudentRoutesProps {
  route: StudentRoute
  currentPath: string
  /** Navigate to any app path (student or public, e.g. /courses/:id). */
  navigate: (path: string, state?: StudentNavigationState) => void
  onLogout: () => void
  logoutLoading: boolean
}

function quizCoursePath(quiz: QuizDetail | null) {
  if (quiz?.type === 'PLACEMENT') return studentRoutes.assessments('free')
  if (!quiz?.sectionCourseId) return studentRoutes.courses()
  if (quiz.lessonId) return studentRoutes.lesson(quiz.sectionCourseId, quiz.lessonId)
  return studentRoutes.courseStudy(quiz.sectionCourseId, quiz.type === 'EXAM' ? 'exams' : undefined)
}

// Every authenticated learning screen renders inside the one StudentLayout
// (topbar + sidebar); the route only decides which page fills the content
// area. The `key`s remount a page when its target changes, as App did before.
function StudentRoutes({
  route,
  currentPath,
  navigate,
  onLogout,
  logoutLoading,
}: StudentRoutesProps) {
  // Keep the study context with each navigation entry, including after a reload.
  const returnPath: unknown = window.history.state?.quizReturnTo
  const studyCourseId: unknown = window.history.state?.lessonStudyCourseId
  const isProfileReturn = typeof returnPath === 'string' &&
    (returnPath === studentRoutes.learningProfile() || returnPath.startsWith(`${studentRoutes.learningProfile()}?`))
  const quizReturnTo = typeof returnPath === 'string' && (returnPath.startsWith('/student/courses/') || isProfileReturn || returnPath === '/free-exams' || isStudentAssessmentsPath(returnPath))
    ? returnPath : new URLSearchParams(window.location.search).get('from') === 'free-exams' ? '/free-exams' : undefined
  const lessonStudyCourseId = typeof studyCourseId === 'string' ? studyCourseId : undefined
  const navigateQuiz = (path: string, returnTo = quizReturnTo) =>
    navigate(path, { quizReturnTo: returnTo, lessonStudyCourseId })
  const tutorOrigin: unknown = window.history.state?.tutorReturnTo
  const tutorOriginRoute = typeof tutorOrigin === 'string' ? parseStudentRoute(tutorOrigin) : null
  const tutorReturnTo = typeof tutorOrigin === 'string' &&
    (tutorOriginRoute?.name === 'course-study' || tutorOriginRoute?.name === 'lesson')
    ? tutorOrigin : studentRoutes.courses()
  const openTutor = (studyId?: string) => navigate(studentRoutes.tutor(), {
    tutorReturnTo: `${window.location.pathname}${window.location.search}`,
    lessonStudyCourseId: studyId ?? lessonStudyCourseId,
  })

  const page = (): ReactNode => {
    switch (route.name) {
      case 'assessments':
        return <StudentAssessments onOpenQuiz={quizId => navigateQuiz(studentRoutes.quiz(quizId), `${window.location.pathname}${window.location.search}`)} />
      case 'dashboard':
        return (
          <StudentDashboard
            onOpenLearningProfile={() => navigate(studentRoutes.learningProfile())}
            onOpenMyCourses={() => navigate(studentRoutes.courses())}
            onOpenCourse={(courseId) => navigate(studentRoutes.courseStudy(courseId))}
            onContinueLearning={(courseId, lessonId) =>
              navigate(
                lessonId ? studentRoutes.lesson(courseId, lessonId) : studentRoutes.courseStudy(courseId)
              )
            }
          />
        )
      case 'chat':
        return <ChatFeatureGate><StudentChatPage conversationId={route.conversationId} onSelectConversation={(id) => navigate(studentRoutes.chat(id))} /></ChatFeatureGate>
      case 'schedule':
        return <StudentSchedulePage />
      case 'tutor':
        return <StudentAiSolvePage onOpenWallet={() => navigate(studentRoutes.wallet())}
          onBack={() => navigate(tutorReturnTo, { lessonStudyCourseId })} />
      // Listed in the sidebar, not built yet.
      case 'roadmap':
        return (
          <MascotState
            title="Lộ trình của tôi đang phát triển"
            message="Tính năng này đã có trong kế hoạch và sẽ sớm ra mắt."
          />
        )
      case 'learning-profile':
        return <LearningProfile onNavigate={(path, studyCourseId) => navigate(path, {
          lessonStudyCourseId: studyCourseId,
          placementReturnTo: `${window.location.pathname}${window.location.search}`,
          quizReturnTo: `${window.location.pathname}${window.location.search}`,
        })} />
      case 'profile':
      case 'wallet': {
        const requestedSection = route.name === 'wallet' ? 'wallet' : new URLSearchParams(window.location.search).get('section')
        const section: AccountSection = requestedSection === 'wallet' || requestedSection === 'orders' || requestedSection === 'security'
          ? requestedSection : 'personal'
        return <AccountProfile section={section} onChangeSection={(value) => navigate(studentRoutes.profile(value))}
          onOpenPayment={(orderId) => navigate(`/orders/${encodeURIComponent(orderId)}/payment`)}
          onOpenOrder={(orderId) => navigate(`/orders/${encodeURIComponent(orderId)}`)}
          onBrowseCourses={() => navigate('/courses')} />
      }
      case 'courses':
        return (
          <MyCourses
            onOpenCourse={(course) => navigate(studentRoutes.courseStudy(course.id))}
            onOpenSuggestedCourse={(course) => navigate(course.purchased ? studentRoutes.courseStudy(course.id) : `/courses/${encodeURIComponent(course.id)}`)}
            onBrowseCourses={() => navigate('/courses')}
          />
        )
      case 'course-study':
        return (
          <CourseStudyPage
            key={route.courseId}
            courseId={route.courseId}
            onBackToMyCourses={() => navigate(studentRoutes.courses())}
            onViewCourseInfo={() => navigate(`/courses/${encodeURIComponent(route.courseId)}`)}
            onOpenLesson={(lessonId, lessonCourseId) => navigate(
              studentRoutes.lesson(lessonCourseId ?? route.courseId, lessonId),
              { lessonStudyCourseId: route.courseId }
            )}
            onOpenQuiz={(quizId, tab) => navigateQuiz(studentRoutes.quiz(quizId), tab === 'exams'
              ? `${window.location.pathname}${window.location.search}` : studentRoutes.courseStudy(route.courseId, tab))}
            onOpenTutor={() => openTutor(route.courseId)}
          />
        )
      case 'lesson':
        return (
          <LessonPage
            key={`${route.courseId}-${route.lessonId}`}
            courseId={route.courseId}
            lessonId={route.lessonId}
            onBackToStudy={() => navigate(studentRoutes.courseStudy(lessonStudyCourseId ?? route.courseId))}
            onNavigateLesson={(lessonId, lessonCourseId) =>
              navigate(studentRoutes.lesson(lessonCourseId ?? route.courseId, lessonId), { lessonStudyCourseId })
            }
            onOpenQuiz={(quizId) => navigateQuiz(studentRoutes.quiz(quizId), studentRoutes.lesson(route.courseId, route.lessonId))}
            onOpenTutor={() => openTutor()}
          />
        )
      case 'course-detail':
        return (
          <CourseDetail
            courseId={route.courseId}
            onBack={() => navigate(studentRoutes.courses())}
            onOpenActivity={(courseId, type, activityId) =>
              navigate(studentRoutes.activity(courseId, type, activityId))
            }
          />
        )
      case 'activity':
        if (route.activityType === 'lessons') {
          return (
            <VideoLearningPage
              courseId={route.courseId}
              activityId={route.activityId}
              onBackCourse={() => navigate(studentRoutes.courseDetail(route.courseId))}
              onCourses={() => navigate(studentRoutes.courses())}
              onNavigateActivity={(courseId, type, activityId) =>
                navigate(studentRoutes.activity(courseId, type, activityId))
              }
            />
          )
        }
        return (
          <LearningActivity
            courseId={route.courseId}
            routeType={route.activityType}
            activityId={route.activityId}
            onBack={() => navigate(studentRoutes.courseDetail(route.courseId))}
          />
        )
      case 'quiz':
        return (
          <QuizDetailPage
            key={route.quizId}
            quizId={route.quizId}
            onBack={(quiz) => navigate(quizReturnTo ?? quizCoursePath(quiz), { lessonStudyCourseId })}
            onStartAttempt={(quizId, attemptId) =>
              navigateQuiz(studentRoutes.quizAttempt(quizId, attemptId))
            }
            onOpenReview={(attemptId) => navigateQuiz(studentRoutes.attemptReview(attemptId))}
            onOpenCompetency={(courseId) => navigate(`/student/learning-profile?tab=learning&courseId=${encodeURIComponent(courseId)}`)}
          />
        )
      case 'quiz-attempt':
        return (
          <QuizAttemptPage
            key={route.attemptId}
            quizId={route.quizId}
            attemptId={route.attemptId}
            onExit={(quizId) => navigateQuiz(studentRoutes.quiz(quizId))}
            onSubmitted={(attemptId) => navigateQuiz(studentRoutes.attemptReview(attemptId))}
          />
        )
      case 'attempt-review':
        return (
          <QuizReviewPage
            key={route.attemptId}
            attemptId={route.attemptId}
            backLabel={isProfileReturn ? 'Quay lại hồ sơ năng lực' : undefined}
            onOpenCompetency={(courseId) => navigate(`/student/learning-profile?tab=learning&courseId=${encodeURIComponent(courseId)}`)}
            onBackToQuiz={(quizId) => isProfileReturn ? navigate(quizReturnTo!) : navigateQuiz(studentRoutes.quiz(quizId))}
          />
        )
      case 'placement':
        return <FreeExamRedirect navigate={navigate} />
      case 'placement-attempt':
        return <LegacyAssessmentRedirect key={route.attemptId} attemptId={route.attemptId} navigate={navigate} />
      case 'placement-result':
        return <LegacyAssessmentRedirect navigate={navigate} />
      case 'placement-review':
        return <LegacyAssessmentRedirect key={route.attemptId} attemptId={route.attemptId} review navigate={navigate} />
    }
  }

  return (
    <StudentLayout currentPath={currentPath} onNavigate={navigate} onLogout={onLogout} logoutLoading={logoutLoading}>
      <Suspense fallback={<SchedulingPageFallback title="Lịch học" />}>{page()}</Suspense>
    </StudentLayout>
  )
}

function FreeExamRedirect({ navigate }: { navigate: (path: string) => void }) {
  useEffect(() => { navigate(studentRoutes.assessments('free')) }, [navigate])
  return <p role="status">Đang mở danh sách đề thi thử miễn phí…</p>
}

function LegacyAssessmentRedirect({ attemptId, review = false, navigate }: { attemptId?: string; review?: boolean; navigate: (path: string) => void }) {
  const resource = usePageResource(() => attemptId ? getAttempt(attemptId) : Promise.resolve(null), [attemptId])
  useEffect(() => {
    if (resource.status !== 'ready') return
    if (!attemptId) navigate('/student/learning-profile?tab=learning')
    else if (resource.data) navigate(review || resource.data.status === 'GRADED'
      ? studentRoutes.attemptReview(attemptId) : studentRoutes.quizAttempt(resource.data.quizId, attemptId))
  }, [attemptId, review, navigate, resource.data, resource.status])
  return <ResourceState status={resource.status} errorMessage={resource.errorMessage} onRetry={resource.reload}
    loading={<p role="status">Đang mở bài thi…</p>} error={{ title: 'Không thể mở bài thi cũ' }} />
}

export default StudentRoutes

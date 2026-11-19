import { lazy, Suspense, type ReactNode } from 'react'
import StudentLayout from '../../components/student/layout/StudentLayout'
import SchedulingPageFallback from '../../components/scheduling/SchedulingPageFallback'
import { studentRoutes, type StudentRoute } from '../../lib/studentRoutes'
import type { QuizDetail } from '../../services/assessmentService'
import StudentChatPage from './StudentChatPage'
import StudentWalletPage from './StudentWalletPage'
import StudentAiSolvePage from './StudentAiSolvePage'
import ChatFeatureGate from '../../components/chat-feature-gate'
import MascotState from '../../components/common/MascotState'
import StudentDashboard from './StudentDashboard'
import MyCourses from './MyCourses'
import CourseDetail from './CourseDetail'
import LearningActivity from './LearningActivity'
import VideoLearningPage from './VideoLearningPage'
import LearningProfile from './LearningProfile'
import AccountProfile from './AccountProfile'
import CourseStudyPage from '../course/CourseStudyPage'
import LessonPage from '../course/LessonPage'
import QuizDetailPage from '../assessments/QuizDetailPage'
import QuizAttemptPage from '../assessments/QuizAttemptPage'
import QuizReviewPage from '../assessments/QuizReviewPage'
import PlacementIntroPage from '../assessments/PlacementIntroPage'
import PlacementAttemptPage from '../assessments/PlacementAttemptPage'
import PlacementResultPage from '../assessments/PlacementResultPage'
import PlacementReviewPage from '../assessments/PlacementReviewPage'

const StudentSchedulePage = lazy(() => import('./StudentSchedulePage'))

interface StudentNavigationState {
  quizReturnTo?: string
  lessonStudyCourseId?: string
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
  const quizReturnTo = typeof returnPath === 'string' && returnPath.startsWith('/student/courses/')
    ? returnPath : undefined
  const lessonStudyCourseId = typeof studyCourseId === 'string' ? studyCourseId : undefined
  const navigateQuiz = (path: string, returnTo = quizReturnTo) =>
    navigate(path, { quizReturnTo: returnTo, lessonStudyCourseId })

  const page = (): ReactNode => {
    switch (route.name) {
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
      case 'wallet':
        return <StudentWalletPage onOpenPayment={(orderId) => navigate(`/orders/${encodeURIComponent(orderId)}/payment`)} />
      case 'tutor':
        return <StudentAiSolvePage onOpenWallet={() => navigate(studentRoutes.wallet())} />
      // Listed in the sidebar, not built yet.
      case 'roadmap':
        return (
          <MascotState
            title="Lộ trình của tôi đang phát triển"
            message="Tính năng này đã có trong kế hoạch và sẽ sớm ra mắt."
          />
        )
      case 'learning-profile':
        return <LearningProfile onEditProfile={() => navigate(studentRoutes.profile())} />
      case 'profile':
        return <AccountProfile />
      case 'courses':
        return (
          <MyCourses
            onOpenCourse={(course) => navigate(studentRoutes.courseStudy(course.id))}
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
            onOpenGiftStudy={(giftId) => navigate(studentRoutes.courseStudy(giftId))}
            onOpenQuiz={(quizId, tab) => navigateQuiz(studentRoutes.quiz(quizId), studentRoutes.courseStudy(route.courseId, tab))}
            onOpenCourse={(course) => navigate(`/courses/${course.id}`)}
            onEditProfile={() => navigate(studentRoutes.profile('student'))}
          />
        )
      case 'lesson':
        return (
          <LessonPage
            key={`${route.courseId}-${route.lessonId}`}
            courseId={route.courseId}
            lessonId={route.lessonId}
            onBackToStudy={() => navigate(studentRoutes.courseStudy(lessonStudyCourseId ?? route.courseId))}
            onNavigateLesson={(lessonId) =>
              navigate(studentRoutes.lesson(route.courseId, lessonId), { lessonStudyCourseId })
            }
            onOpenQuiz={(quizId) => navigateQuiz(studentRoutes.quiz(quizId), studentRoutes.lesson(route.courseId, route.lessonId))}
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
            onBackToQuiz={(quizId) => navigateQuiz(studentRoutes.quiz(quizId))}
          />
        )
      case 'placement':
        return (
          <PlacementIntroPage
            onStartAttempt={(attemptId) => navigate(studentRoutes.placementAttempt(attemptId))}
            onOpenReview={(attemptId) => navigate(studentRoutes.placementReview(attemptId))}
            onBack={() => navigate(studentRoutes.dashboard())}
          />
        )
      case 'placement-attempt':
        return (
          <PlacementAttemptPage
            key={route.attemptId}
            attemptId={route.attemptId}
            onExit={() => navigate(studentRoutes.placement())}
            onSubmitted={() => navigate(studentRoutes.placementResult())}
          />
        )
      case 'placement-result':
        return (
          <PlacementResultPage
            onOpenReview={(attemptId) => navigate(studentRoutes.placementReview(attemptId))}
            onOpenCourse={(course) => navigate(`/courses/${course.id}`)}
          />
        )
      case 'placement-review':
        return (
          <PlacementReviewPage
            key={route.attemptId}
            attemptId={route.attemptId}
            onBack={() => navigate(studentRoutes.placementResult())}
          />
        )
    }
  }

  return (
    <StudentLayout
      currentPath={currentPath}
      onNavigate={navigate}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      <Suspense fallback={<SchedulingPageFallback title="Lịch học" />}>
        {page()}
      </Suspense>
    </StudentLayout>
  )
}

export default StudentRoutes

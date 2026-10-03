import { lazy, Suspense, type ReactNode } from 'react'
import StudentLayout from '../../components/student/layout/StudentLayout'
import SchedulingPageFallback from '../../components/scheduling/SchedulingPageFallback'
import { studentRoutes, type StudentRoute } from '../../lib/studentRoutes'
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

interface StudentRoutesProps {
  route: StudentRoute
  currentPath: string
  /** Navigate to any app path (student or public, e.g. /courses/:id). */
  navigate: (path: string) => void
  onLogout: () => void
  logoutLoading: boolean
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
      case 'schedule':
        return <StudentSchedulePage />
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
            onOpenLesson={(lessonId) => navigate(studentRoutes.lesson(route.courseId, lessonId))}
            onOpenQuiz={(quizId) => navigate(studentRoutes.quiz(quizId))}
            onOpenCourse={(course) => navigate(`/courses/${course.id}`)}
          />
        )
      case 'lesson':
        return (
          <LessonPage
            key={`${route.courseId}-${route.lessonId}`}
            courseId={route.courseId}
            lessonId={route.lessonId}
            onBackToStudy={() => navigate(studentRoutes.courseStudy(route.courseId))}
            onNavigateLesson={(lessonId) =>
              navigate(studentRoutes.lesson(route.courseId, lessonId))
            }
            onOpenQuiz={(quizId) => navigate(studentRoutes.quiz(quizId))}
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
            onStartAttempt={(quizId, attemptId) =>
              navigate(studentRoutes.quizAttempt(quizId, attemptId))
            }
            onOpenReview={(attemptId) => navigate(studentRoutes.attemptReview(attemptId))}
          />
        )
      case 'quiz-attempt':
        return (
          <QuizAttemptPage
            key={route.attemptId}
            quizId={route.quizId}
            attemptId={route.attemptId}
            onExit={(quizId) => navigate(studentRoutes.quiz(quizId))}
            onSubmitted={(attemptId) => navigate(studentRoutes.attemptReview(attemptId))}
          />
        )
      case 'attempt-review':
        return (
          <QuizReviewPage
            key={route.attemptId}
            attemptId={route.attemptId}
            onBackToQuiz={(quizId) => navigate(studentRoutes.quiz(quizId))}
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

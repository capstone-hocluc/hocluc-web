import { lazy, Suspense, useState } from 'react'
import { CheckCircle2 } from '../console/icons'
import TeacherCourses from './TeacherCourses'
import ConsoleShell from '../console/console-shell'
import ProfilePage from '../console/profile-page'
import TeacherQuiz from './TeacherQuiz'
import TeacherAssignments from './TeacherAssignments'
import TeacherMockExams from './TeacherMockExams'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'
import { DashboardActions, RoleDashboardWelcome } from '../common/DashboardWelcome'
import { QuestionReview, TeacherAttempts } from '../management/quiz-review-screens'
import { ManagementScreen } from '../management/ManagementDashboard'
import { ForbiddenPage } from '../console/access-states'
import { buildNavSections, canAccessPage } from '../../lib/console-nav'

// Old teacher URL for the question review page.
const PAGE_ALIASES: Record<string, string> = { questions: 'question-review' }

// Course sub-pages (quiz editor, assignments) belong to "Lớp của tôi".
function menuPageOf(page: string) {
  return /^(quiz-new-|quiz-|assignments-)/.test(page) ? 'courses' : page
}

const TeacherSchedulePage = lazy(() => import('../../pages/teacher/TeacherSchedulePage'))
const TeacherAvailabilityPage = lazy(() => import('../../pages/teacher/TeacherAvailabilityPage'))

function TeacherDashboard({
  onBack,
  onNavigate,
  onLogout,
  logoutLoading = false,
  page: requestedPage = 'dashboard',
}) {
  const page = PAGE_ALIASES[requestedPage] ?? requestedPage
  const quizCreateMode = page.startsWith('quiz-new-')
  const quizCourseId = quizCreateMode
    ? page.replace('quiz-new-', '')
    : page.startsWith('quiz-')
      ? page.replace('quiz-', '')
      : null
  const assignmentCourseId = page.startsWith('assignments-')
    ? page.replace('assignments-', '')
    : null
  const detailCourseId = quizCourseId || assignmentCourseId
  const [notice, setNotice] = useState('')
  const [view, setView] = useState(detailCourseId ? 'courses' : page)
  const [selectedCourse, setSelectedCourse] = useState(() =>
    detailCourseId ? { id: detailCourseId, name: 'Khóa học' } : null
  )
  const [quizCourse, setQuizCourse] = useState(() =>
    quizCourseId ? { id: quizCourseId, name: 'Khóa học theo đường dẫn' } : null
  )
  const [assignmentCourse, setAssignmentCourse] = useState(() =>
    assignmentCourseId ? { id: assignmentCourseId, name: 'Khóa học' } : null
  )
  const [assignmentPreset, setAssignmentPreset] = useState(null)

  const action = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2500)
  }
  const openCourses = () => {
    setSelectedCourse(null)
    if (onNavigate) onNavigate('courses')
    else setView('courses')
  }
  const openCourse = (course) => {
    setQuizCourse(null)
    setAssignmentPreset(null)
    setSelectedCourse({ ...course, name: course.title })
    setView('courses')
  }
  const openQuiz = (course) => {
    setQuizCourse(course)
    setSelectedCourse(course)
    setView('courses')
    if (onNavigate) onNavigate(`quiz-new-${course.id}`)
  }
  const openAssignments = (course, module = null) => {
    setAssignmentCourse(course)
    setSelectedCourse(course)
    setView('courses')
    if (module) {
      setAssignmentPreset({ targetType: 'Bài học', target: module.lesson || module.title })
      return
    }
    setAssignmentPreset(null)
    if (onNavigate) onNavigate(`assignments-${course.id}`)
  }
  const navigate = (key: string) => {
    if (onNavigate) onNavigate(key)
    else {
      setView(key)
      if (key === 'dashboard') setSelectedCourse(null)
    }
  }
  const sections = buildNavSections('TEACHER')
  const allowed = view === 'profile' || canAccessPage('TEACHER', menuPageOf(view))
  const teacherScreens = [
    'dashboard',
    'courses',
    'schedule',
    'availability',
    'question-review',
    'attempts',
    'profile',
    'mock-exams',
  ]
  return (
    <ConsoleShell
      sections={sections}
      activeKey={view}
      onNavigate={navigate}
      onOpenProfile={() => navigate('profile')}
      onLogout={() => onLogout?.()}
      logoutLoading={logoutLoading}
    >
      <div className="flex flex-col gap-5">
        {notice && (
          <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-lg border border-card-border bg-card-background px-4 py-3 text-sm text-text-primary shadow-lg">
            <CheckCircle2 size={17} />
            {notice}
          </div>
        )}
        {!allowed ? (
          <ForbiddenPage />
        ) : !teacherScreens.includes(menuPageOf(view)) ? (
          <ManagementScreen role="TEACHER" page={view} onNavigate={navigate} />
        ) : view === 'schedule' ? (
          <Suspense fallback={<SchedulingPageFallback title="Lịch dạy" />}>
            <TeacherSchedulePage />
          </Suspense>
        ) : view === 'availability' ? (
          <Suspense fallback={<SchedulingPageFallback title="Giờ rảnh" />}>
            <TeacherAvailabilityPage />
          </Suspense>
        ) : view === 'question-review' ? (
          <QuestionReview />
        ) : view === 'attempts' ? (
          <TeacherAttempts />
        ) : view === 'profile' ? (
          <ProfilePage />
        ) : view === 'mock-exams' ? (
          <TeacherMockExams onBack={() => onNavigate?.('dashboard')} onAction={action} />
        ) : view === 'dashboard' ? (
          <>
            <RoleDashboardWelcome role="TEACHER" />
            <DashboardActions role="TEACHER" onNavigate={navigate} />
          </>
        ) : assignmentCourse ? (
          <TeacherAssignments
            course={assignmentCourse}
            assignmentPreset={assignmentPreset}
            onBack={() => (onNavigate ? onNavigate('courses') : setAssignmentCourse(null))}
            onAction={action}
          />
        ) : quizCourse ? (
          <TeacherQuiz
            course={quizCourse}
            startCreating={quizCreateMode}
            onBack={() => (onNavigate ? onNavigate('courses') : setQuizCourse(null))}
            onAction={action}
          />
        ) : (
          <TeacherCourses
            selectedCourse={selectedCourse}
            onOpenCourse={openCourse}
            onBack={openCourses}
            onOpenQuiz={openQuiz}
            onOpenAssignments={openAssignments}
          />
        )}
      </div>
    </ConsoleShell>
  )
}

export default TeacherDashboard

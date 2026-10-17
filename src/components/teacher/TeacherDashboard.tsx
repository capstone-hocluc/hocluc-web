import { lazy, Suspense, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
} from '../console/icons'
import TeacherCourses from './TeacherCourses'
import ConsoleShell from '../console/console-shell'
import ProfilePage from '../console/profile-page'
import TeacherAssignments from './TeacherAssignments'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'
import TeacherPageHeader from './TeacherPageHeader'
import QuizConsoleScreen from '../management/quiz/QuizConsoleScreen'
import { isQuizPage, quizMenuPage } from '../../lib/console-routes'
import { ManagementScreen } from '../management/ManagementDashboard'
import { ForbiddenPage } from '../console/access-states'
import { buildNavSections, canAccessPage } from '../../lib/console-nav'

// Old teacher URL for the question review page.
const PAGE_ALIASES: Record<string, string> = { questions: 'question-review' }

// Course sub-pages (quiz editor, assignments) belong to "Lớp của tôi".
function menuPageOf(page: string) {
  if (isQuizPage(page)) return quizMenuPage(page)
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
    if (onNavigate) onNavigate(`quiz-${course.id}`)
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
  const shortcuts = [
    { key: 'courses', title: 'Lớp của tôi', icon: BookOpen },
    { key: 'schedule', title: 'Lịch dạy', icon: CalendarDays },
    { key: 'availability', title: 'Giờ rảnh', icon: Clock3 },
    { key: 'mock-exams', title: 'Bài thi thử', icon: ClipboardCheck },
  ]
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
      activeKey={menuPageOf(view)}
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
        ) : isQuizPage(page) ? (
          <QuizConsoleScreen role="TEACHER" page={page} onNavigate={navigate} />
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
        ) : view === 'profile' ? (
          <ProfilePage />
        ) : view === 'dashboard' ? (
          <>
            <TeacherPageHeader title="Tổng quan" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {shortcuts.map(({ key, title, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigate(key)}
                  className="group flex items-center gap-4 rounded-xl border border-card-border bg-card-background p-5 text-left transition-colors hover:bg-background-gray-secondary"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-badge-blue-background text-badge-blue-icon-color">
                    <Icon size={20} />
                  </span>
                  <span className="flex-1 text-base font-medium text-text-primary">{title}</span>
                  <ArrowRight
                    size={16}
                    className="text-icon-tertiary transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              ))}
            </div>
          </>
        ) : assignmentCourse ? (
          <TeacherAssignments
            course={assignmentCourse}
            assignmentPreset={assignmentPreset}
            onBack={() => (onNavigate ? onNavigate('courses') : setAssignmentCourse(null))}
            onAction={action}
          />
        ) : quizCourse ? (
          <QuizConsoleScreen role="TEACHER" page={`quiz-${quizCourse.id}`} onNavigate={navigate} />
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

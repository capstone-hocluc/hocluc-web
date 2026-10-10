import { lazy, Suspense, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  ListChecks,
} from '../console/icons'
import TeacherCourses from './TeacherCourses'
import ConsoleShell from '../console/console-shell'
import ProfilePage from '../console/profile-page'
import TeacherQuiz from './TeacherQuiz'
import TeacherAssignments from './TeacherAssignments'
import TeacherMockExams from './TeacherMockExams'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'
import TeacherPageHeader from './TeacherPageHeader'
import { QuestionReview, TeacherAttempts } from '../management/quiz-review-screens'

const TeacherSchedulePage = lazy(() => import('../../pages/teacher/TeacherSchedulePage'))
const TeacherAvailabilityPage = lazy(() => import('../../pages/teacher/TeacherAvailabilityPage'))

function TeacherDashboard({ onBack, onNavigate, onLogout, logoutLoading = false, page = 'dashboard' }) {
  const quizCreateMode = page.startsWith('quiz-new-')
  const quizCourseId = quizCreateMode ? page.replace('quiz-new-', '') : page.startsWith('quiz-') ? page.replace('quiz-', '') : null
  const assignmentCourseId = page.startsWith('assignments-') ? page.replace('assignments-', '') : null
  const detailCourseId = quizCourseId || assignmentCourseId
  const [notice, setNotice] = useState('')
  const [view, setView] = useState(detailCourseId ? 'courses' : page)
  const [selectedCourse, setSelectedCourse] = useState(() => (detailCourseId ? { id: detailCourseId, name: 'Khóa học' } : null))
  const [quizCourse, setQuizCourse] = useState(() => quizCourseId
    ? { id: quizCourseId, name: 'Khóa học theo đường dẫn' }
    : null)
  const [assignmentCourse, setAssignmentCourse] = useState(() => (assignmentCourseId ? { id: assignmentCourseId, name: 'Khóa học' } : null))
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
  const shortcuts = [
    { key: 'courses', title: 'Lớp học', icon: BookOpen },
    { key: 'schedule', title: 'Lịch dạy', icon: CalendarDays },
    { key: 'availability', title: 'Giờ rảnh', icon: Clock3 },
    { key: 'mock-exams', title: 'Bài thi thử', icon: ClipboardCheck },
  ]
  const sections = [
    { label: 'Tổng quan', items: [{ key: 'dashboard', title: 'Tổng quan', icon: LayoutDashboard }] },
    {
      label: 'Giảng dạy',
      items: [
        { key: 'courses', title: 'Lớp học', icon: BookOpen },
        { key: 'schedule', title: 'Lịch dạy', icon: CalendarDays },
        { key: 'availability', title: 'Giờ rảnh', icon: Clock3 },
      ],
    },
    {
      label: 'Đánh giá',
      items: [
        { key: 'mock-exams', title: 'Bài thi thử', icon: ClipboardCheck },
        { key: 'questions', title: 'Duyệt câu hỏi', icon: ListChecks },
        { key: 'attempts', title: 'Bài làm học viên', icon: ClipboardCheck },
      ],
    },
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
          {view === 'schedule' ? (
            <Suspense fallback={<SchedulingPageFallback title="Lịch dạy" />}>
              <TeacherSchedulePage />
            </Suspense>
          ) : view === 'availability' ? (
            <Suspense fallback={<SchedulingPageFallback title="Giờ rảnh" />}>
              <TeacherAvailabilityPage />
            </Suspense>
          ) : view === 'questions' ? (
            <QuestionReview />
          ) : view === 'attempts' ? (
            <TeacherAttempts />
          ) : view === 'profile' ? (
            <ProfilePage />
          ) : view === 'mock-exams' ? (
            <TeacherMockExams onBack={() => onNavigate?.('dashboard')} onAction={action} />
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
                    <ArrowRight size={16} className="text-icon-tertiary transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </>
          ) : assignmentCourse ? (
            <TeacherAssignments course={assignmentCourse} assignmentPreset={assignmentPreset} onBack={() => onNavigate ? onNavigate('courses') : setAssignmentCourse(null)} onAction={action} />
          ) : quizCourse ? (
            <TeacherQuiz course={quizCourse} startCreating={quizCreateMode} onBack={() => onNavigate ? onNavigate('courses') : setQuizCourse(null)} onAction={action} />
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



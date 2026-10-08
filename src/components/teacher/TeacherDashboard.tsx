import { lazy, Suspense, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  UserRound,
  Users,
} from 'lucide-react'
import TeacherCourses from './TeacherCourses'
import TeacherInformation from './TeacherInformation'
import TeacherQuiz from './TeacherQuiz'
import TeacherAssignments from './TeacherAssignments'
import TeacherMockExams from './TeacherMockExams'
import TeacherOverview from './TeacherOverview'
import RoleShell, { type RoleShellNavGroup } from '../management/role-shell'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'
import Notice from '../ui/Notice'

const TeacherSchedulePage = lazy(() => import('../../pages/teacher/TeacherSchedulePage'))
const TeacherAvailabilityPage = lazy(() => import('../../pages/teacher/TeacherAvailabilityPage'))

// MOCK: class list until the backend exposes the teacher's assigned classes.
const courses = [
  {
    id: 'course-01',
    subject: 'Tư duy định lượng',
    name: 'ĐGNL 12A · K24',
    students: 36,
    sessions: 24,
    progress: 72,
    next: 'Hôm nay · 19:00',
    color: 'blue',
    description: 'Lộ trình luyện thi ĐGNL chuyên sâu dành cho học sinh lớp 12.',
  },
  {
    id: 'course-02',
    subject: 'Luyện đề tổng hợp',
    name: 'ĐGNL 12B · K24',
    students: 34,
    sessions: 22,
    progress: 58,
    next: 'Thứ Năm · 19:00',
    color: 'violet',
    description: 'Rèn kỹ năng, chiến thuật làm đề và đánh giá năng lực định kỳ.',
  },
  {
    id: 'course-03',
    subject: 'Nền tảng toán học',
    name: 'ĐGNL 11A · K25',
    students: 31,
    sessions: 28,
    progress: 46,
    next: 'Thứ Sáu · 17:30',
    color: 'gold',
    description: 'Củng cố nền tảng kiến thức và tư duy toán học cho lớp 11.',
  },
]

const NAV_GROUPS: RoleShellNavGroup[] = [
  { label: 'Tổng quan', items: [{ key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard }] },
  {
    label: 'Giảng dạy',
    items: [
      { key: 'courses', label: 'Lớp học', icon: BookOpen },
      { key: 'schedule', label: 'Lịch dạy', icon: CalendarDays },
      { key: 'availability', label: 'Giờ rảnh', icon: Clock3 },
      { key: 'grading', label: 'Chấm điểm', icon: ClipboardCheck },
      { key: 'students', label: 'Học viên', icon: Users },
    ],
  },
  { label: 'Đánh giá', items: [{ key: 'mock-exams', label: 'Bài thi thử', icon: ClipboardCheck }] },
]

function TeacherDashboard({ onNavigate, onLogout, logoutLoading = false, page = 'dashboard' }) {
  const quizCreateMode = page.startsWith('quiz-new-')
  const quizCourseId = quizCreateMode ? page.replace('quiz-new-', '') : page.startsWith('quiz-') ? page.replace('quiz-', '') : null
  const assignmentCourseId = page.startsWith('assignments-') ? page.replace('assignments-', '') : null
  const detailCourseId = quizCourseId || assignmentCourseId
  const [notice, setNotice] = useState('')
  const [graded, setGraded] = useState([])
  const [view, setView] = useState(detailCourseId ? 'courses' : page)
  const [selectedCourse, setSelectedCourse] = useState(() => courses.find((course) => course.id === detailCourseId) || null)
  const [quizCourse, setQuizCourse] = useState(() => quizCourseId
    ? courses.find((course) => course.id === quizCourseId) || { id: quizCourseId, name: 'Khóa học theo đường dẫn' }
    : null)
  const [assignmentCourse, setAssignmentCourse] = useState(() => courses.find((course) => course.id === assignmentCourseId) || null)
  const [assignmentPreset, setAssignmentPreset] = useState(null)

  const action = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2500)
  }
  const gradeSubmission = (name) => {
    setGraded((items) => [...items, name])
    action(`Đã mở bài làm của ${name} để chấm điểm.`)
  }
  const openCourses = () => {
    setSelectedCourse(null)
    if (onNavigate) onNavigate('courses')
    else setView('courses')
  }
  const openCourse = (course) => {
    setQuizCourse(null)
    setAssignmentPreset(null)
    setSelectedCourse(course)
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
  const breadcrumb =
    view === 'dashboard'
      ? 'Tổng quan'
      : view === 'information'
        ? 'Thông tin cá nhân'
        : view === 'schedule'
          ? 'Lịch dạy'
          : view === 'availability'
            ? 'Giờ rảnh'
        : selectedCourse
          ? selectedCourse.name
          : 'Lớp học của tôi'

  // Sidebar entries that have no screen yet only show a notice.
  const handleNavigate = (key: string) => {
    if (key === 'courses') openCourses()
    else if (key === 'grading') action('Đã lọc các bài tập cần chấm.')
    else if (key === 'students') action('Danh sách học viên đang được chuẩn bị.')
    else onNavigate?.(key)
  }

  return (
    <RoleShell
      roleLabel="Giáo viên"
      areaLabel="Giảng dạy"
      pageTitle={breadcrumb}
      navGroups={NAV_GROUPS}
      activeKey={view}
      onNavigate={handleNavigate}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
      accountItems={[
        { label: 'Hồ sơ cá nhân', icon: UserRound, onSelect: () => onNavigate?.('information') },
      ]}
    >
      {notice && (
        <Notice>
          <CheckCircle2 size={17} />
          {notice}
        </Notice>
      )}
    {view === 'schedule' ? (
      <Suspense fallback={<SchedulingPageFallback title="Lịch dạy" />}>
        <TeacherSchedulePage />
      </Suspense>
    ) : view === 'availability' ? (
      <Suspense fallback={<SchedulingPageFallback title="Giờ rảnh" />}>
        <TeacherAvailabilityPage />
      </Suspense>
    ) : view === 'information' ? (
      <TeacherInformation onBack={() => onNavigate?.('dashboard')} onNotify={action} />
    ) : view === 'mock-exams' ? (
      <TeacherMockExams onBack={() => onNavigate?.('dashboard')} onAction={action} />
    ) : view === 'dashboard' ? (
      <TeacherOverview
        courses={courses}
        graded={graded}
        onOpenSchedule={() => onNavigate?.('schedule')}
        onOpenCourses={openCourses}
        onOpenCourse={openCourse}
        onGrade={gradeSubmission}
        onNotify={action}
      />
    ) : assignmentCourse ? (
      <TeacherAssignments course={assignmentCourse} assignmentPreset={assignmentPreset} onBack={() => onNavigate ? onNavigate('courses') : setAssignmentCourse(null)} onAction={action} />
    ) : quizCourse ? (
      <TeacherQuiz course={quizCourse} startCreating={quizCreateMode} onBack={() => onNavigate ? onNavigate('courses') : setQuizCourse(null)} onAction={action} />
    ) : (
      <TeacherCourses
        courses={courses}
        selectedCourse={selectedCourse}
        onOpenCourse={openCourse}
        onBack={openCourses}
        onAction={action}
        onOpenQuiz={openQuiz}
        onOpenAssignments={openAssignments}
      />
    )}
    </RoleShell>
  )
}

export default TeacherDashboard

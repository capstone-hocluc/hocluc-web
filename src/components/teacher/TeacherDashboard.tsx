import { lazy, Suspense, type ComponentType, useState } from 'react'
import RoleSwitcher from '../ui/RoleSwitcher'
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  Phone,
  RefreshCw,
  Search,
  Settings,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import Logo from '../common/Logo'
import Avatar from '../ui/Avatar'
import TeacherCourses from './TeacherCourses'
import TeacherInformation from './TeacherInformation'
import TeacherQuiz from './TeacherQuiz'
import TeacherAssignments from './TeacherAssignments'
import TeacherMockExams from './TeacherMockExams'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'

const TeacherSchedulePage = lazy(() => import('../../pages/teacher/TeacherSchedulePage'))
const TeacherAvailabilityPage = lazy(() => import('../../pages/teacher/TeacherAvailabilityPage'))

const overview = [
  {
    label: 'Lớp đang phụ trách',
    value: '04',
    detail: '128 học viên đang theo học',
    icon: BookOpen,
    tone: 'blue',
  },
  {
    label: 'Buổi học tuần này',
    value: '—',
    detail: 'Mở lịch dạy để tải dữ liệu từ máy chủ',
    icon: CalendarDays,
    tone: 'gold',
  },
  {
    label: 'Bài chờ chấm',
    value: '18',
    detail: '06 bài cần xử lý hôm nay',
    icon: ClipboardCheck,
    tone: 'violet',
  },
  {
    label: 'Tỷ lệ tham gia',
    value: '92%',
    detail: 'Tăng 4% so với tuần trước',
    icon: Users,
    tone: 'green',
  },
]

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

const submissions = [
  {
    initials: 'MA',
    name: 'Nguyễn Minh Anh',
    assignment: 'Bài tập: Hàm số bậc hai',
    group: 'ĐGNL 12A · K24',
    submitted: '12 phút trước',
    tone: 'blue',
  },
  {
    initials: 'HL',
    name: 'Trần Hoàng Long',
    assignment: 'Đề luyện tập số 05',
    group: 'ĐGNL 12B · K24',
    submitted: '35 phút trước',
    tone: 'gold',
  },
  {
    initials: 'TM',
    name: 'Lê Thị Mai',
    assignment: 'Bài tập: Phương trình mũ',
    group: 'ĐGNL 11A · K25',
    submitted: '1 giờ trước',
    tone: 'violet',
  },
  {
    initials: 'GH',
    name: 'Phạm Gia Huy',
    assignment: 'Đề luyện tập số 05',
    group: 'ĐGNL 12B · K24',
    submitted: '2 giờ trước',
    tone: 'green',
  },
]

const studentStats = [
  {
    label: 'Hoàn thành bài tập',
    value: '86%',
    note: '+5% so với tuần trước',
    width: 86,
    tone: 'blue',
  },
  {
    label: 'Điểm danh trung bình',
    value: '92%',
    note: '118 / 128 học viên tham gia',
    width: 92,
    tone: 'green',
  },
  {
    label: 'Điểm bài tập trung bình',
    value: '7.8',
    note: 'Mục tiêu tuần: 8.0 điểm',
    width: 78,
    tone: 'gold',
  },
]

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: ComponentType<{ size?: number }>
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`hl-teacher-nav-item ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  )
}

function TeacherDashboard({ onBack, onNavigate, onLogout, logoutLoading = false, page = 'dashboard' }) {
  const quizCreateMode = page.startsWith('quiz-new-')
  const quizCourseId = quizCreateMode ? page.replace('quiz-new-', '') : page.startsWith('quiz-') ? page.replace('quiz-', '') : null
  const assignmentCourseId = page.startsWith('assignments-') ? page.replace('assignments-', '') : null
  const detailCourseId = quizCourseId || assignmentCourseId
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [graded, setGraded] = useState([])
  const [view, setView] = useState(detailCourseId ? 'courses' : page)
  const [selectedCourse, setSelectedCourse] = useState(() => courses.find((course) => course.id === detailCourseId) || null)
  const [quizCourse, setQuizCourse] = useState(() => quizCourseId
    ? courses.find((course) => course.id === quizCourseId) || { id: quizCourseId, name: 'Khóa học theo đường dẫn' }
    : null)
  const [assignmentCourse, setAssignmentCourse] = useState(() => courses.find((course) => course.id === assignmentCourseId) || null)
  const [assignmentPreset, setAssignmentPreset] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)

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
    setSidebarOpen(false)
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

  return (
    <main className="hl-teacher-app">
      <aside className={`hl-teacher-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="hl-teacher-brand">
          <Logo light />
          <button
            type="button"
            className="hl-teacher-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="hl-teacher-nav">
          <span className="hl-teacher-group-label">Tổng quan</span>
          <NavItem
            icon={LayoutDashboard}
            label="Tổng quan"
            active={view === 'dashboard'}
            onClick={() =>
              onNavigate
                ? onNavigate('dashboard')
                : (setView('dashboard'), setSelectedCourse(null), setSidebarOpen(false))
            }
          />
          <span className="hl-teacher-group-label">Giảng dạy</span>
           <NavItem
            icon={BookOpen}
            label="Lớp học"
            active={view === 'courses'}
            onClick={openCourses}
          />
          <NavItem
            icon={CalendarDays}
            label="Lịch dạy"
            active={view === 'schedule'}
            onClick={() => onNavigate ? onNavigate('schedule') : setView('schedule')}
          />
          <NavItem
            icon={Clock3}
            label="Giờ rảnh"
            active={view === 'availability'}
            onClick={() => onNavigate ? onNavigate('availability') : setView('availability')}
          />
          <NavItem
            icon={ClipboardCheck}
            label="Chấm điểm"
            onClick={() => action('Đã lọc các bài tập cần chấm.')}
          />
          <NavItem
            icon={Users}
            label="Học viên"
            onClick={() => action('Danh sách học viên đang được chuẩn bị.')}
          />
          <span className="hl-teacher-group-label">Đánh giá</span>
          <NavItem icon={ClipboardCheck} label="Bài thi thử" active={view === 'mock-exams'} onClick={() => onNavigate ? onNavigate('mock-exams') : setView('mock-exams')} />
        </nav>
      </aside>
      {sidebarOpen && (
        <button
          type="button"
          className="hl-teacher-overlay"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <section className="hl-teacher-content">
       <div className="hl-teacher-card">
        <header className="hl-teacher-header">
          <button
            type="button"
            className="hl-teacher-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={21} />
          </button>
          <button
            type="button"
            className="hl-teacher-search"
            onClick={() => action('Tìm kiếm toàn hệ thống đang được chuẩn bị.')}
          >
            <Search size={16} />
            <span>Tìm kiếm...</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="hl-teacher-header-actions">
            <RoleSwitcher />
            {view !== 'schedule' && view !== 'availability' && (
              <button
                type="button"
                className="hl-teacher-icon-button hl-teacher-refresh"
                onClick={() => action('Đã làm mới dữ liệu.')}
              >
                <RefreshCw size={16} />
                <span>Làm mới</span>
              </button>
            )}
            <button
              type="button"
              className="hl-teacher-icon-button"
              onClick={() => action('Đã chuyển chế độ giao diện.')}
              aria-label="Chế độ tối"
            >
              <Moon size={17} />
            </button>
            <button
              type="button"
              className="hl-teacher-icon-button"
              onClick={() => action('Bạn có 4 thông báo mới.')}
              aria-label="Thông báo"
            >
              <Bell size={19} />
              <i />
            </button>
            <div className="hl-teacher-profile-wrap">
              <button
                type="button"
                className="hl-teacher-profile-trigger"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="Mở hồ sơ giảng viên"
                aria-expanded={profileOpen}
              >
                <Avatar aria-label="Nguyễn Hoài Nam" fallback="HN" className="size-8 rounded-[7px]" />
                <span className="hl-teacher-profile-trigger-name">Nguyễn Hoài Nam</span>
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div className="hl-teacher-profile-menu">
                  <div className="hl-teacher-profile-summary">
                    <Avatar aria-label="Nguyễn Hoài Nam" fallback="HN" className="size-[42px]" />
                    <div>
                      <strong>Nguyễn Hoài Nam</strong>
                      <small>Giảng viên Toán</small>
                    </div>
                  </div>
                  <div className="hl-teacher-profile-info">
                    <span>
                      <Mail size={15} />
                      nam.nguyen@hocluc.com
                    </span>
                    <span>
                      <Phone size={15} />
                      0901 234 567
                    </span>
                  </div>
                  <div className="hl-teacher-profile-links">
                    <button type="button" onClick={() => onNavigate?.('information')}>
                      <UserRound size={17} />
                      Hồ sơ cá nhân
                    </button>
                    <button
                      type="button"
                      onClick={() => action('Cài đặt giảng viên đang được chuẩn bị.')}
                    >
                      <Settings size={17} />
                      Cài đặt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        onLogout?.()
                      }}
                      disabled={logoutLoading}
                    >
                      <LogOut size={17} />
                      {logoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="hl-teacher-back" onClick={onBack}>
              Về trang chủ
            </button>
          </div>
        </header>
        <div className="hl-teacher-main">
          <div className="hl-teacher-breadcrumb">
            <span>Giảng dạy</span>
            <ChevronRight size={14} />
            <strong>{breadcrumb}</strong>
          </div>
          {notice && (
            <div className="hl-teacher-toast">
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
          ) : view === 'information' ? (
            <TeacherInformation onBack={() => onNavigate?.('dashboard')} onNotify={action} />
          ) : view === 'mock-exams' ? (
            <TeacherMockExams onBack={() => onNavigate?.('dashboard')} onAction={action} />
          ) : view === 'dashboard' ? (
            <>
              <div className="hl-teacher-title">
                <div>
                  <h1>Tổng quan</h1>
                  <p>Theo dõi lớp học, lịch dạy và bài cần chấm.</p>
                </div>
                <div className="hl-teacher-welcome-actions">
                  <div className="hl-teacher-mascot-message">
                    Chúc Thầy một ngày giảng dạy hiệu quả nhé!
                  </div>
                  <img src="/owl-teacher-teaching.png" alt="Mascot HocLuc" />
                  <button
                    type="button"
                    className="hl-teacher-primary"
                    onClick={() => onNavigate?.('schedule')}
                  >
                    <CalendarDays size={16} />
                    Xem lịch dạy
                  </button>
                </div>
              </div>
              <section className="hl-teacher-kpis">
                {overview.map(({ label, value, detail, icon: Icon, tone }) => (
                  <article className="hl-teacher-kpi" key={label}>
                    <span className={tone}>
                      <Icon size={20} />
                    </span>
                    <div>
                      <p>{label}</p>
                      <strong>{value}</strong>
                      <small>{detail}</small>
                    </div>
                  </article>
                ))}
              </section>

              <div className="hl-teacher-dashboard-grid">
                <div className="hl-teacher-column">
                  <section className="hl-teacher-panel">
                    <div className="hl-teacher-panel-heading">
                      <div>
                        <h2>Lớp học phụ trách</h2>
                      </div>
                      <button type="button" onClick={openCourses}>
                        Xem tất cả <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="hl-teacher-course-list">
                      {courses.map((course) => (
                        <article key={course.id} className="hl-teacher-course">
                          <div className={`hl-teacher-course-mark ${course.color}`}>
                            <BookOpen size={20} />
                          </div>
                          <div className="hl-teacher-course-info">
                            <span>{course.subject}</span>
                            <h3>{course.name}</h3>
                            <p>
                              <Users size={13} /> {course.students} học viên <i />{' '}
                              <Clock3 size={13} /> {course.next}
                            </p>
                            <div className="hl-teacher-progress">
                              <b style={{ width: `${course.progress}%` }} />
                              <small>{course.progress}% chương trình</small>
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label={`Xem lớp ${course.name}`}
                            onClick={() => openCourse(course)}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                  <section className="hl-teacher-panel">
                    <div className="hl-teacher-panel-heading">
                      <div>
                        <h2>Buổi học sắp tới</h2>
                      </div>
                      <button type="button" onClick={() => onNavigate?.('schedule')}>
                        Xem lịch <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="hl-teacher-sessions">
                      <p className="text-sm text-text-muted">
                        Lịch thật được tải ở trang Lịch dạy để tránh hiển thị dữ liệu mẫu.
                      </p>
                      <button type="button" onClick={() => onNavigate?.('schedule')}>
                        Mở lịch dạy <ArrowRight size={14} />
                      </button>
                    </div>
                  </section>
                </div>
                <aside className="hl-teacher-column">
                  <section className="hl-teacher-panel hl-teacher-grading-panel">
                    <div className="hl-teacher-panel-heading">
                      <div>
                        <h2>
                          Cần chấm điểm <em>{submissions.length - graded.length}</em>
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => action('Đã hiển thị tất cả bài nộp cần chấm.')}
                      >
                        Xem tất cả
                      </button>
                    </div>
                    <div className="hl-teacher-submissions">
                      {submissions.map((item) => (
                        <article
                          key={item.name}
                          className={graded.includes(item.name) ? 'is-graded' : ''}
                        >
                          <span className={`hl-teacher-avatar ${item.tone}`}>{item.initials}</span>
                          <div>
                            <h3>{item.name}</h3>
                            <p>{item.assignment}</p>
                            <small>
                              {item.group} · {item.submitted}
                            </small>
                          </div>
                          <button
                            type="button"
                            disabled={graded.includes(item.name)}
                            onClick={() => gradeSubmission(item.name)}
                          >
                            {graded.includes(item.name) ? <CheckCircle2 size={17} /> : 'Chấm'}
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                  <section className="hl-teacher-panel">
                    <div className="hl-teacher-panel-heading">
                      <div>
                        <h2>Thống kê học viên</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => action('Báo cáo học viên chi tiết đang được chuẩn bị.')}
                      >
                        Báo cáo
                      </button>
                    </div>
                    <div className="hl-teacher-stats">
                      {studentStats.map((stat) => (
                        <div key={stat.label}>
                          <div>
                            <span>{stat.label}</span>
                            <strong>{stat.value}</strong>
                          </div>
                          <p>{stat.note}</p>
                          <i>
                            <b className={stat.tone} style={{ width: `${stat.width}%` }} />
                          </i>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="hl-teacher-tip">
                    <FileCheck2 size={21} />
                    <div>
                      <strong>Gợi ý cho hôm nay</strong>
                      <p>Hoàn tất 6 bài chấm ưu tiên trước buổi học lúc 19:00.</p>
                    </div>
                  </section>
                </aside>
              </div>
            </>
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
        </div>
       </div>
      </section>
    </main>
  )
}

export default TeacherDashboard

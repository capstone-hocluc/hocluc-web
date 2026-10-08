import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Layers3,
  PlayCircle,
  Users,
} from 'lucide-react'
import TeacherLessonEditor from './TeacherLessonEditor'

const courseModules = [
  { title: 'Chương 01 · Hàm số và đồ thị', lesson: 'Bài 06 · Hàm số bậc hai', lessons: 6, status: 'Đã hoàn thành', progress: 100 },
  {
    title: 'Chương 02 · Phương trình, bất phương trình',
    lesson: 'Bài 08 · Phương trình mũ',
    lessons: 8,
    status: 'Đang giảng dạy',
    progress: 62,
  },
  { title: 'Chương 03 · Xác suất và thống kê', lesson: 'Bài 10 · Xác suất cơ bản', lessons: 5, status: 'Sắp mở', progress: 0 },
]

function CourseCard({ course, onOpen }) {
  return (
    <button type="button" className="hl-teacher-assigned-card" onClick={() => onOpen(course)}>
      <div className="hl-teacher-assigned-cover">
        <BookOpen size={25} />
        <span>{course.subject}</span>
      </div>
      <div className="hl-teacher-assigned-body">
        <span className="hl-teacher-eyebrow">KHÓA HỌC ĐƯỢC PHÂN CÔNG</span>
        <h2>{course.name}</h2>
        <p>{course.description || `Lộ trình ${course.subject.toLowerCase()} dành cho học viên.`}</p>
        <div>
          <span>
            <Users size={15} />
            {course.students} học viên
          </span>
          <span>
            <CalendarDays size={15} />
            {course.sessions || '24'} buổi học
          </span>
        </div>
        <i>
          <b style={{ width: `${course.progress}%` }} />
        </i>
        <small>{course.progress}% chương trình đã triển khai</small>
      </div>
      <span className="hl-teacher-assigned-arrow">
        <ArrowRight size={19} />
      </span>
    </button>
  )
}

function CourseDetail({ course, onBack, onAction, onOpenQuiz, onOpenAssignments }) {
  const [activeModule, setActiveModule] = useState(courseModules[0].title)
  const [activeQuickAction, setActiveQuickAction] = useState('')
  const [modules, setModules] = useState(courseModules)
  const [contentModalOpen, setContentModalOpen] = useState(false)
  const [contentTitle, setContentTitle] = useState('')
  const [editingLesson, setEditingLesson] = useState(null)
  const selectQuickAction = (label, message) => {
    setActiveQuickAction(label)
    onAction(message)
  }
  const addContent = (event) => {
    event.preventDefault()
    if (!contentTitle.trim()) return
    const newModule = {
      title: contentTitle.trim(),
      lesson: contentTitle.trim(),
      lessons: 0,
      status: 'Sắp mở',
      progress: 0,
    }
    setModules((items) => [...items, newModule])
    setActiveModule(newModule.title)
    setContentTitle('')
    setContentModalOpen(false)
    onAction(`Đã thêm “${newModule.title}” vào nội dung lớp.`)
  }
  if (editingLesson) return <TeacherLessonEditor course={course} lesson={editingLesson} onBack={() => setEditingLesson(null)} />
  return (
    <section className="hl-teacher-course-management">
      <button type="button" className="hl-teacher-text-back" onClick={onBack}>
        <ArrowLeft size={16} />
        Quay lại lớp học của tôi
      </button>
      <section className="hl-teacher-course-hero">
        <div className="hl-teacher-course-hero-icon">
          <BookOpen size={28} />
        </div>
        <div>
          <h1>{course.name}</h1>
          <p>
            {course.subject} · {course.students} học viên · {course.sessions || '24'} buổi học
          </p>
        </div>
        <button
          type="button"
          className="hl-teacher-primary"
          onClick={() => setContentModalOpen(true)}
        >
          <Layers3 size={16} />
          Thêm nội dung
        </button>
      </section>
      <div className="hl-teacher-course-detail-grid">
        <section className="hl-teacher-panel">
          <div className="hl-teacher-panel-heading">
            <div>
              <h2>Nội dung khóa học</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveModule(modules[0].title)
                onAction('Đã hiển thị toàn bộ nội dung khóa học.')
              }}
            >
              Xem tất cả
            </button>
          </div>
          <div className="hl-teacher-module-list">
            {modules.map((module) => (
              <article
                key={module.title}
                className={activeModule === module.title ? 'is-selected' : ''}
              >
                <span className={module.progress === 100 ? 'is-done' : ''}>
                  {module.progress === 100 ? <CheckCircle2 size={18} /> : <Layers3 size={18} />}
                </span>
                <div>
                  <h3>{module.title}</h3>
                  <p>
                    {module.lessons} bài học · {module.status}
                  </p>
                  <i>
                    <b style={{ width: `${module.progress}%` }} />
                  </i>
                </div>
                <button
                  type="button"
                  aria-label={`Mở ${module.title}`}
                  onClick={() => setEditingLesson(module)}
                >
                  <ArrowRight size={17} />
                </button>
                {activeModule === module.title && (
                  <button
                    type="button"
                    className="hl-teacher-module-assignment"
                    onClick={() => onOpenAssignments(course, module)}
                  >
                    <ClipboardList size={14} />
                    Giao bài tập theo bài học
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
        <aside className="hl-teacher-course-side">
          <section className="hl-teacher-panel">
            <h2>Tiến độ triển khai</h2>
            <div className="hl-teacher-course-progress">
              <strong>{course.progress}%</strong>
              <p>Đã hoàn thành chương trình</p>
              <i>
                <b style={{ width: `${course.progress}%` }} />
              </i>
            </div>
            <div className="hl-teacher-course-facts">
              <span>
                <b>12</b>Bài học đã mở
              </span>
              <span>
                <b>08</b>Buổi đã dạy
              </span>
            </div>
          </section>
          <section className="hl-teacher-panel">
            <h2>Thao tác nhanh</h2>
            <div className="hl-teacher-quick-actions">
              <button
                type="button"
                className={activeQuickAction === 'schedule' ? 'is-active' : ''}
                onClick={() => selectQuickAction('schedule', 'Đã mở lịch học của lớp.')}
              >
                <CalendarDays size={17} />
                Quản lý lịch học
              </button>
              <button
                type="button"
                className={activeQuickAction === 'assignments' ? 'is-active' : ''}
                onClick={() => onOpenAssignments(course)}
              >
                <ClipboardList size={17} />
                Quản lý bài tập
              </button>
              <button
                type="button"
                className={activeQuickAction === 'quiz' ? 'is-active' : ''}
                onClick={() => onOpenQuiz(course)}
              >
                <ClipboardList size={17} />
                Quản lý bài kiểm tra
              </button>
              <button
                type="button"
                className={activeQuickAction === 'students' ? 'is-active' : ''}
                onClick={() => selectQuickAction('students', 'Đã mở danh sách học viên.')}
              >
                <Users size={17} />
                Xem học viên
              </button>
              <button
                type="button"
                className={activeQuickAction === 'live' ? 'is-active' : ''}
                onClick={() => selectQuickAction('live', 'Đã mở không gian lớp trực tuyến.')}
              >
                <PlayCircle size={17} />
                Vào lớp trực tuyến
              </button>
            </div>
          </section>
        </aside>
      </div>
      {contentModalOpen && (
        <div
          className="hl-teacher-modal-backdrop"
          role="presentation"
          onMouseDown={() => setContentModalOpen(false)}
        >
          <form
            className="hl-teacher-modal"
            onSubmit={addContent}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="hl-teacher-modal-close"
              onClick={() => setContentModalOpen(false)}
              aria-label="Đóng"
            >
              <span>×</span>
            </button>
            <h2>Thêm nội dung</h2>
            <p>Tạo một chương mới cho lớp học này.</p>
            <label>
              Tên chương
              <input
                autoFocus
                required
                value={contentTitle}
                onChange={(event) => setContentTitle(event.target.value)}
                placeholder="Ví dụ: Chương 04 · Hình học không gian"
              />
            </label>
            <div className="hl-teacher-modal-actions">
              <button type="button" onClick={() => setContentModalOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="hl-teacher-primary">
                <Layers3 size={15} />
                Thêm nội dung
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

function TeacherCourses({ courses, selectedCourse, onOpenCourse, onBack, onAction, onOpenQuiz, onOpenAssignments }) {
  if (selectedCourse)
    return <CourseDetail course={selectedCourse} onBack={onBack} onAction={onAction} onOpenQuiz={onOpenQuiz} onOpenAssignments={onOpenAssignments} />
  return (
    <section className="hl-teacher-courses-page">
      <div className="hl-teacher-title">
        <div>
          <h1>Lớp học</h1>
          <p>Các lớp được phân công.</p>
        </div>
      </div>
      <section className="hl-teacher-courses-summary">
        <div>
          <BookOpen size={21} />
          <span>
            <strong>{courses.length} khóa học</strong>
            <small>Đang được phân công</small>
          </span>
        </div>
        <div>
          <Users size={21} />
          <span>
            <strong>
              {courses.reduce((total, course) => total + course.students, 0)} học viên
            </strong>
            <small>Đang theo học</small>
          </span>
        </div>
        <div>
          <CalendarDays size={21} />
          <span>
            <strong>08 buổi học</strong>
            <small>Trong tuần này</small>
          </span>
        </div>
      </section>
      <section className="hl-teacher-panel">
        <div className="hl-teacher-panel-heading">
          <div>
            <h2>Danh sách lớp học được phân công</h2>
          </div>
        </div>
        <div className="hl-teacher-assigned-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onOpen={onOpenCourse} />
          ))}
        </div>
      </section>
    </section>
  )
}

export default TeacherCourses

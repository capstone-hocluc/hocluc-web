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
import TeacherPageHeader from './TeacherPageHeader'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { Field, Input } from '../ui/Field'
import Modal from '../ui/Modal'
import Progress from '../ui/Progress'
import { cn } from '../../lib/cn'

// MOCK: chapters until the backend exposes course content to teachers.
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

function PanelTitle({ children }) {
  return <h2 className="mb-4 text-base font-semibold text-text-heading">{children}</h2>
}

function SummaryTile({ icon: Icon, value, label }) {
  return (
    <Card padding="md" radius="lg" className="flex items-center gap-3 text-primary">
      <Icon size={21} />
      <span>
        <strong className="block text-sm text-text-strong">{value}</strong>
        <small className="block text-xs text-text-subtle">{label}</small>
      </span>
    </Card>
  )
}

function CourseCard({ course, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(course)}
      className="group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border border-border-primary bg-surface text-left text-text-heading transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card"
    >
      <div className="flex min-h-24 flex-col justify-between bg-linear-to-br from-badge-info-bg to-surface-soft p-4 text-primary">
        <BookOpen size={25} />
        <span className="max-w-[170px] text-xs font-bold text-text-body">{course.subject}</span>
      </div>
      <div className="p-4">
        <span className="block text-[11px] font-bold tracking-[0.08em] text-primary">KHÓA HỌC ĐƯỢC PHÂN CÔNG</span>
        <h2 className="my-1.5 text-[15px] font-semibold">{course.name}</h2>
        <p className="min-h-10 text-xs leading-relaxed text-text-muted">
          {course.description || `Lộ trình ${course.subject.toLowerCase()} dành cho học viên.`}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Users size={15} />
            {course.students} học viên
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays size={15} />
            {course.sessions || '24'} buổi học
          </span>
        </div>
        <Progress value={course.progress} size="sm" className="mt-3" />
        <small className="mt-1.5 block text-xs font-semibold text-text-subtle">
          {course.progress}% chương trình đã triển khai
        </small>
      </div>
      <ArrowRight size={19} className="absolute top-26 right-3.5 text-primary opacity-80" />
    </button>
  )
}

function QuickAction({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 rounded-[9px] border bg-surface p-2.5 text-left text-[13px] font-semibold transition-colors hover:border-primary hover:bg-surface-hover hover:text-primary',
        active ? 'border-primary bg-surface-hover text-primary' : 'border-border-primary text-text-body'
      )}
    >
      <Icon size={17} />
      {children}
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
    <section className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit cursor-pointer items-center gap-1.5 text-[13px] font-bold text-primary"
      >
        <ArrowLeft size={16} />
        Quay lại lớp học của tôi
      </button>
      <section className="grid grid-cols-[45px_minmax(0,1fr)] items-center gap-3.5 rounded-2xl border border-border-primary bg-linear-to-br from-surface to-surface-soft p-4 sm:grid-cols-[55px_minmax(0,1fr)_auto] sm:p-5">
        <div className="grid size-11 place-items-center rounded-[13px] bg-badge-info-bg text-primary sm:size-13">
          <BookOpen size={28} />
        </div>
        <div>
          <h1 className="my-1 text-[17px] font-semibold text-text-heading sm:text-[21px]">{course.name}</h1>
          <p className="text-xs text-text-muted">
            {course.subject} · {course.students} học viên · {course.sessions || '24'} buổi học
          </p>
        </div>
        <Button className="col-span-full sm:col-span-1" onClick={() => setContentModalOpen(true)}>
          <Layers3 size={16} />
          Thêm nội dung
        </Button>
      </section>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(290px,0.85fr)] lg:gap-[18px]">
        <Card as="section" padding="lg" radius="lg">
          <div className="mb-4 flex items-center justify-between gap-2.5">
            <h2 className="text-base font-semibold text-text-heading">Nội dung khóa học</h2>
            <Button
              appearance="ghost"
              size="sm"
              onClick={() => {
                setActiveModule(modules[0].title)
                onAction('Đã hiển thị toàn bộ nội dung khóa học.')
              }}
            >
              Xem tất cả
            </Button>
          </div>
          <div className="grid">
            {modules.map((module) => {
              const selected = activeModule === module.title
              return (
                <article
                  key={module.title}
                  className={cn(
                    'grid grid-cols-[37px_minmax(0,1fr)_22px] items-center gap-2.5 border-b border-border-subtle py-3 last:border-0 last:pb-0',
                    selected && '-mx-2 rounded-[10px] border-transparent bg-surface-hover px-2'
                  )}
                >
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-[10px]',
                      module.progress === 100
                        ? 'bg-badge-success-bg text-badge-success-text'
                        : 'bg-surface-hover text-primary'
                    )}
                  >
                    {module.progress === 100 ? <CheckCircle2 size={18} /> : <Layers3 size={18} />}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-text-strong">{module.title}</h3>
                    <p className="mt-1 text-xs text-text-subtle">
                      {module.lessons} bài học · {module.status}
                    </p>
                    <Progress value={module.progress} size="sm" className="mt-2" />
                  </div>
                  <button
                    type="button"
                    aria-label={`Mở ${module.title}`}
                    onClick={() => setEditingLesson(module)}
                    className="grid cursor-pointer place-items-center text-text-subtle hover:text-primary"
                  >
                    <ArrowRight size={17} />
                  </button>
                  {selected && (
                    <Button
                      appearance="outline"
                      size="sm"
                      className="col-start-2 w-max text-xs"
                      onClick={() => onOpenAssignments(course, module)}
                    >
                      <ClipboardList size={14} />
                      Giao bài tập theo bài học
                    </Button>
                  )}
                </article>
              )
            })}
          </div>
        </Card>
        <aside className="grid content-start gap-4 lg:gap-[18px]">
          <Card as="section" padding="lg" radius="lg">
            <PanelTitle>Tiến độ triển khai</PanelTitle>
            <strong className="block text-[28px] tracking-[-1px] text-primary">{course.progress}%</strong>
            <p className="mt-1 text-xs text-text-subtle">Đã hoàn thành chương trình</p>
            <Progress value={course.progress} className="mt-3" />
            <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-border-subtle pt-3.5">
              <span className="text-xs text-text-subtle">
                <b className="mb-1 block text-[15px] text-text-strong">12</b>Bài học đã mở
              </span>
              <span className="text-xs text-text-subtle">
                <b className="mb-1 block text-[15px] text-text-strong">08</b>Buổi đã dạy
              </span>
            </div>
          </Card>
          <Card as="section" padding="lg" radius="lg">
            <PanelTitle>Thao tác nhanh</PanelTitle>
            <div className="grid gap-2">
              <QuickAction
                icon={CalendarDays}
                active={activeQuickAction === 'schedule'}
                onClick={() => selectQuickAction('schedule', 'Đã mở lịch học của lớp.')}
              >
                Quản lý lịch học
              </QuickAction>
              <QuickAction
                icon={ClipboardList}
                active={activeQuickAction === 'assignments'}
                onClick={() => onOpenAssignments(course)}
              >
                Quản lý bài tập
              </QuickAction>
              <QuickAction
                icon={ClipboardList}
                active={activeQuickAction === 'quiz'}
                onClick={() => onOpenQuiz(course)}
              >
                Quản lý bài kiểm tra
              </QuickAction>
              <QuickAction
                icon={Users}
                active={activeQuickAction === 'students'}
                onClick={() => selectQuickAction('students', 'Đã mở danh sách học viên.')}
              >
                Xem học viên
              </QuickAction>
              <QuickAction
                icon={PlayCircle}
                active={activeQuickAction === 'live'}
                onClick={() => selectQuickAction('live', 'Đã mở không gian lớp trực tuyến.')}
              >
                Vào lớp trực tuyến
              </QuickAction>
            </div>
          </Card>
        </aside>
      </div>
      <Modal
        open={contentModalOpen}
        onClose={() => setContentModalOpen(false)}
        title="Thêm nội dung"
        description="Tạo một chương mới cho lớp học này."
        maxWidth={430}
      >
        <form onSubmit={addContent} className="grid gap-3">
          <Field label="Tên chương">
            <Input
              autoFocus
              required
              value={contentTitle}
              onChange={(event) => setContentTitle(event.target.value)}
              placeholder="Ví dụ: Chương 04 · Hình học không gian"
            />
          </Field>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" appearance="ghost" onClick={() => setContentModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">
              <Layers3 size={15} />
              Thêm nội dung
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

function TeacherCourses({ courses, selectedCourse, onOpenCourse, onBack, onAction, onOpenQuiz, onOpenAssignments }) {
  if (selectedCourse)
    return <CourseDetail course={selectedCourse} onBack={onBack} onAction={onAction} onOpenQuiz={onOpenQuiz} onOpenAssignments={onOpenAssignments} />
  return (
    <section className="flex flex-col gap-4">
      <TeacherPageHeader title="Lớp học" description="Các lớp được phân công." />
      <section className="grid gap-3.5 sm:grid-cols-3">
        <SummaryTile icon={BookOpen} value={`${courses.length} khóa học`} label="Đang được phân công" />
        <SummaryTile
          icon={Users}
          value={`${courses.reduce((total, course) => total + course.students, 0)} học viên`}
          label="Đang theo học"
        />
        <SummaryTile icon={CalendarDays} value="08 buổi học" label="Trong tuần này" />
      </section>
      <Card as="section" padding="lg" radius="lg">
        <PanelTitle>Danh sách lớp học được phân công</PanelTitle>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onOpen={onOpenCourse} />
          ))}
        </div>
      </Card>
    </section>
  )
}

export default TeacherCourses

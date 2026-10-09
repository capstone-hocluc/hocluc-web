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
} from '../console/icons'
import TeacherLessonEditor from './TeacherLessonEditor'
import TeacherPageHeader from './TeacherPageHeader'
import Button from '../console/button'
import Panel from '../console/panel'
import ConsoleDialog from '../console/dialog'
import { Input } from '../tailgrids/core/input'
import { Label } from '../tailgrids/core/label'
import { TextField } from '../tailgrids/core/text-field'
import { Progress } from '../tailgrids/core/progress'
import { cn } from '../../lib/cn'

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
    <button
      type="button"
      onClick={() => onOpen(course)}
      className="group flex flex-col gap-4 rounded-xl border border-card-border bg-card-background p-5 text-left transition-colors hover:bg-background-gray-secondary"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-badge-blue-background text-badge-blue-icon-color">
          <BookOpen size={20} />
        </span>
        <ArrowRight size={16} className="mt-1 text-icon-tertiary transition-transform group-hover:translate-x-0.5" />
      </div>
      <div>
        <h3 className="text-base font-medium text-text-primary">{course.name}</h3>
        <p className="mt-0.5 text-sm text-text-tertiary">{course.subject}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <Users size={15} />
          {course.students} học viên
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} />
          {course.sessions} buổi
        </span>
      </div>
      <Progress progress={course.progress} withLabel className="max-w-none" />
    </button>
  )
}

const quickActionClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-secondary'

function CourseDetail({ course, onBack, onAction, onOpenQuiz, onOpenAssignments }) {
  const [activeModule, setActiveModule] = useState(courseModules[0].title)
  const [modules, setModules] = useState(courseModules)
  const [contentModalOpen, setContentModalOpen] = useState(false)
  const [contentTitle, setContentTitle] = useState('')
  const [editingLesson, setEditingLesson] = useState(null)
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
    onAction(`Đã thêm “${newModule.title}”.`)
  }
  if (editingLesson) return <TeacherLessonEditor course={course} lesson={editingLesson} onBack={() => setEditingLesson(null)} />
  return (
    <section className="flex flex-col gap-5">
      <div>
        <Button appearance="ghost" size="sm" type="button" onClick={onBack}>
          <ArrowLeft size={16} />
          Quay lại
        </Button>
      </div>
      <TeacherPageHeader
        title={course.name}
        description={`${course.subject} · ${course.students} học viên · ${course.sessions} buổi`}
        actions={
          <Button type="button" onClick={() => setContentModalOpen(true)}>
            <Layers3 size={16} />
            Thêm nội dung
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Panel title="Nội dung khóa học">
          <div className="flex flex-col gap-3">
            {modules.map((module) => (
              <article
                key={module.title}
                className={cn(
                  'rounded-lg border p-4',
                  activeModule === module.title
                    ? 'border-brand-500 bg-background-gray-secondary'
                    : 'border-card-border',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-full',
                      module.progress === 100
                        ? 'bg-badge-success-background text-badge-success-icon-color'
                        : 'bg-badge-blue-background text-badge-blue-icon-color',
                    )}
                  >
                    {module.progress === 100 ? <CheckCircle2 size={18} /> : <Layers3 size={18} />}
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setActiveModule(module.title)}
                  >
                    <h3 className="truncate text-sm font-medium text-text-primary">{module.title}</h3>
                    <p className="text-xs text-text-tertiary">
                      {module.lessons} bài · {module.status}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Mở ${module.title}`}
                    className="rounded-md p-1.5 text-icon-tertiary hover:text-text-primary"
                    onClick={() => setEditingLesson(module)}
                  >
                    <ArrowRight size={17} />
                  </button>
                </div>
                <Progress progress={module.progress} className="mt-3 max-w-none" />
                {activeModule === module.title && (
                  <Button
                    type="button"
                    appearance="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => onOpenAssignments(course, module)}
                  >
                    <ClipboardList size={14} />
                    Giao bài tập
                  </Button>
                )}
              </article>
            ))}
          </div>
        </Panel>

        <aside className="flex flex-col gap-5">
          <Panel title="Tiến độ">
            <p className="text-2xl leading-8 font-semibold text-text-primary">{course.progress}%</p>
            <Progress progress={course.progress} className="mt-3 max-w-none" />
          </Panel>
          <Panel title="Thao tác nhanh">
            <div className="-mx-2 flex flex-col">
              <button type="button" className={quickActionClass} onClick={() => onOpenAssignments(course)}>
                <ClipboardList size={17} className="text-icon-tertiary" />
                Bài tập
              </button>
              <button type="button" className={quickActionClass} onClick={() => onOpenQuiz(course)}>
                <ClipboardList size={17} className="text-icon-tertiary" />
                Bài kiểm tra
              </button>
              <button type="button" className={quickActionClass} onClick={() => onAction('Đã mở danh sách học viên.')}>
                <Users size={17} className="text-icon-tertiary" />
                Học viên
              </button>
              <button type="button" className={quickActionClass} onClick={() => onAction('Đã mở lớp trực tuyến.')}>
                <PlayCircle size={17} className="text-icon-tertiary" />
                Lớp trực tuyến
              </button>
            </div>
          </Panel>
        </aside>
      </div>

      <ConsoleDialog open={contentModalOpen} onClose={() => setContentModalOpen(false)} title="Thêm nội dung" maxWidth={480}>
        <form className="flex flex-col gap-4" onSubmit={addContent}>
          <TextField className="gap-2" autoFocus required value={contentTitle} onChange={setContentTitle}>
            <Label>Tên chương</Label>
            <Input className="w-full" placeholder="Ví dụ: Chương 04 · Hình học" />
          </TextField>
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <Button appearance="outline" type="button" onClick={() => setContentModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">Thêm</Button>
          </div>
        </form>
      </ConsoleDialog>
    </section>
  )
}

function TeacherCourses({ courses, selectedCourse, onOpenCourse, onBack, onAction, onOpenQuiz, onOpenAssignments }) {
  if (selectedCourse)
    return <CourseDetail course={selectedCourse} onBack={onBack} onAction={onAction} onOpenQuiz={onOpenQuiz} onOpenAssignments={onOpenAssignments} />
  return (
    <section className="flex flex-col gap-5">
      <TeacherPageHeader title="Lớp học" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} onOpen={onOpenCourse} />
        ))}
      </div>
    </section>
  )
}

export default TeacherCourses

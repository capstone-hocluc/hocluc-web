import { ArrowLeft, LockKeyhole } from '../console/icons'
import Notice from '../console/notice'
import Button from '../console/button'
import Panel from '../console/panel'
import TeacherPageHeader from './TeacherPageHeader'

interface TeacherLessonEditorProps {
  course: { name: string }
  lesson: {
    lesson?: string
    title?: string
    content?: string
    description?: string
  }
  onBack: () => void
}

const fieldClass =
  'w-full rounded-lg border border-card-border bg-background-gray-secondary px-3.5 py-2.5 text-sm text-text-primary outline-none'

function TeacherLessonEditor({ course, lesson, onBack }: TeacherLessonEditorProps) {
  const lessonTitle = lesson.lesson || lesson.title || 'Bài học'
  const lessonContent = lesson.content || lesson.description || ''

  return (
    <section className="flex flex-col gap-5">
      <div>
        <Button appearance="ghost" size="sm" type="button" onClick={onBack}>
          <ArrowLeft size={16} />
          Quay lại
        </Button>
      </div>
      <TeacherPageHeader title="Chi tiết bài học" description={`${course.name} · ${lessonTitle}`} />
      <Notice tone="warning">Chỉ xem: chưa có API lưu bài học.</Notice>

      <Panel title="Nội dung bài học">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Tên bài học
            <input className={fieldClass} value={lessonTitle} readOnly aria-readonly="true" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Nội dung
            <textarea className={`${fieldClass} min-h-32`} value={lessonContent} readOnly aria-readonly="true" />
          </label>
        </div>
      </Panel>

      <Panel title="Tài liệu và video">
        <Notice tone="info" className="items-start">
          <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <span>Tải lên media đang tạm khóa.</span>
        </Notice>
      </Panel>
    </section>
  )
}

export default TeacherLessonEditor

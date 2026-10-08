import { LockKeyhole } from 'lucide-react'
import TeacherPageHeader, { TeacherBackLink } from './TeacherPageHeader'
import Card from '../ui/Card'
import { Field, Input, Textarea } from '../ui/Field'
import Notice from '../ui/Notice'

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

function TeacherLessonEditor({ course, lesson, onBack }: TeacherLessonEditorProps) {
  const lessonTitle = lesson.lesson || lesson.title || 'Bài học'
  const lessonContent = lesson.content || lesson.description || ''

  return (
    <section className="flex max-w-[1080px] flex-col gap-4">
      <TeacherBackLink onClick={onBack}>Quay lại nội dung khóa học</TeacherBackLink>

      <TeacherPageHeader title="Chi tiết bài học" description={`${course.name} · ${lessonTitle}`} />

      <Notice tone="warning">
        Màn hình này đang dùng dữ liệu khóa học mẫu. BE chưa có API lưu nội dung bài học, nên
        chỉnh sửa và xuất bản đang tạm khóa.
      </Notice>

      <Card as="section" padding="lg" radius="lg">
        <h2 className="text-base font-semibold text-text-heading">Nội dung bài học</h2>
        <p className="mt-1 mb-4 text-sm text-text-subtle">Chỉ xem cho tới khi có API lưu bài học.</p>
        <div className="grid gap-3.5">
          <Field label="Tên bài học">
            <Input value={lessonTitle} readOnly aria-readonly="true" />
          </Field>
          <Field label="Nội dung chi tiết">
            <Textarea className="min-h-44" value={lessonContent} readOnly aria-readonly="true" />
          </Field>
        </div>
      </Card>

      <Card as="section" padding="lg" radius="lg">
        <h2 className="text-base font-semibold text-text-heading">Tài liệu và video</h2>
        <p className="mt-1 mb-4 text-sm text-text-subtle">Tải lên và chỉnh sửa media đang tạm khóa.</p>
        <Notice tone="info" className="items-start">
          <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <span>
            Chưa thể thêm hoặc xóa media: màn hình chưa có lesson ID thật, và endpoint upload của BE
            chưa xác thực quyền sở hữu bài học. PDF/Office cũng chưa được BE hỗ trợ trong contract
            hiện tại.
          </span>
        </Notice>
      </Card>
    </section>
  )
}

export default TeacherLessonEditor

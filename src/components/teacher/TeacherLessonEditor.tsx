import { ArrowLeft, LockKeyhole } from 'lucide-react'
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
    <section className="hl-teacher-lesson-editor">
      <button type="button" className="hl-teacher-text-back" onClick={onBack}>
        <ArrowLeft size={16} />
        Quay lại nội dung khóa học
      </button>

      <div className="hl-teacher-title">
        <div>
          <h1>Chi tiết bài học</h1>
          <p>
            {course.name} · {lessonTitle}
          </p>
        </div>
      </div>

      <Notice tone="warning" className="mb-4">
        Màn hình này đang dùng dữ liệu khóa học mẫu. BE chưa có API lưu nội dung bài học, nên
        chỉnh sửa và xuất bản đang tạm khóa.
      </Notice>

      <section className="hl-teacher-panel">
        <div className="hl-teacher-panel-heading">
          <div>
            <h2>Nội dung bài học</h2>
            <p className="hl-teacher-lesson-note">Chỉ xem cho tới khi có API lưu bài học.</p>
          </div>
        </div>
        <div className="hl-teacher-lesson-form">
          <label>
            Tên bài học
            <input value={lessonTitle} readOnly aria-readonly="true" />
          </label>
          <label>
            Nội dung chi tiết
            <textarea value={lessonContent} readOnly aria-readonly="true" />
          </label>
        </div>
      </section>

      <section className="hl-teacher-panel mt-4">
        <div className="hl-teacher-panel-heading">
          <div>
            <h2>Tài liệu và video</h2>
            <p className="hl-teacher-lesson-note">Tải lên và chỉnh sửa media đang tạm khóa.</p>
          </div>
        </div>
        <Notice tone="info" className="items-start">
          <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <span>
            Chưa thể thêm hoặc xóa media: màn hình chưa có lesson ID thật, và endpoint upload của BE
            chưa xác thực quyền sở hữu bài học. PDF/Office cũng chưa được BE hỗ trợ trong contract
            hiện tại.
          </span>
        </Notice>
      </section>
    </section>
  )
}

export default TeacherLessonEditor

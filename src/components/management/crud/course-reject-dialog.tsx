import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'

const MAX_NOTE = 2000

// The reviewer's reason is what the author reads, so it is required.
export default function CourseRejectDialog({
  courseTitle,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  courseTitle: string
  busy: boolean
  error: string
  onCancel: () => void
  onSubmit: (note: string) => void
}) {
  const [note, setNote] = useState('')
  const trimmed = note.trim()
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !trimmed) return
    onSubmit(trimmed)
  }
  return (
    <ConsoleDialog
      open
      title="Trả lại khóa học"
      description={`"${courseTitle}" sẽ quay về trạng thái nháp, kèm lý do bên dưới để người soạn chỉnh sửa.`}
      onClose={onCancel}
      onSubmit={submit}
      dismissable={!busy}
      maxWidth={520}
      footer={
        <>
          <Button appearance="outline" onClick={onCancel} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" variant="danger" disabled={busy || !trimmed}>
            {busy ? 'Đang gửi...' : 'Trả lại'}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
        <Field label="Lý do trả lại" hint={`${note.length}/${MAX_NOTE} ký tự`}>
          <textarea
            name="note"
            required
            autoFocus
            maxLength={MAX_NOTE}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={textareaControlClass}
            placeholder="Ví dụ: Chương 2 thiếu bài học đã xuất bản; học phí chưa đúng bảng giá."
          />
        </Field>
      </fieldset>
    </ConsoleDialog>
  )
}

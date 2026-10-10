import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import SelectField from '../../console/select-field'
import Notice from '../../console/notice'
import {
  LESSON_CONTENT_TYPES,
  saveAdminLesson,
  type LessonAdmin,
  type LessonContentType,
} from '../../../services/lessonAdminService'
import { getFieldErrors } from '../../../lib/errors'
import { crudError, unknownMutation } from './crud-errors'

interface Props {
  chapterId: string
  lesson: LessonAdmin | null
  onClose: () => void
  onSaved: () => void
}

export default function LessonEditorDialog({ chapterId, lesson, onClose, onSaved }: Props) {
  const [contentType, setContentType] = useState<LessonContentType>(lesson?.contentType ?? 'TEXT')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (busy || uncertain) return
    const data = new FormData(event.currentTarget)
    const duration = String(data.get('durationSeconds') ?? '').trim()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await saveAdminLesson(chapterId, lesson, {
        title: String(data.get('title') ?? '').trim(),
        description: String(data.get('description') ?? '').trim() || null,
        contentType,
        content: String(data.get('content') ?? '').trim() || null,
        videoUrl: String(data.get('videoUrl') ?? '').trim() || null,
        durationSeconds: duration ? Number(duration) : null,
        instructorContent: String(data.get('instructorContent') ?? '').trim() || null,
        instructorNotes: String(data.get('instructorNotes') ?? '').trim() || null,
      })
      onSaved()
    } catch (err) {
      setError(crudError(err))
      setFieldErrors(getFieldErrors(err))
      setUncertain(unknownMutation(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      title={lesson ? 'Sửa bài học' : 'Thêm bài học'}
      onClose={onClose}
      onSubmit={(e) => void submit(e)}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            {uncertain ? 'Đóng và kiểm tra' : 'Hủy'}
          </Button>
          <Button type="submit" disabled={busy || uncertain}>
            {busy ? 'Đang lưu...' : 'Lưu bài học'}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
        {uncertain && (
          <Notice tone="warning">
            Chưa rõ kết quả lưu. Đóng form và tải lại danh sách trước khi thử tiếp.
          </Notice>
        )}
        <Field label="Tên bài học">
          <input
            name="title"
            required
            maxLength={500}
            defaultValue={lesson?.title}
            className={fieldControlClass}
            aria-invalid={!!fieldErrors.title}
          />
        </Field>
        <Field label="Loại nội dung">
          <SelectField
            ariaLabel="Loại nội dung"
            value={contentType}
            onChange={(value) => setContentType(value as LessonContentType)}
            options={LESSON_CONTENT_TYPES.map((item) => ({ id: item.id, label: item.label }))}
            disabled={busy}
          />
        </Field>
        <Field label="Mô tả">
          <textarea
            name="description"
            maxLength={10000}
            defaultValue={lesson?.description ?? ''}
            className={textareaControlClass}
          />
        </Field>
        <Field label="Nội dung bài học" hint="Hỗ trợ văn bản/markdown tuỳ loại nội dung.">
          <textarea
            name="content"
            maxLength={200000}
            defaultValue={lesson?.content ?? ''}
            className={`${textareaControlClass} min-h-40`}
            aria-invalid={!!fieldErrors.content}
          />
        </Field>
        {contentType === 'VIDEO' && (
          <>
            <Field label="Đường dẫn video">
              <input
                name="videoUrl"
                maxLength={255}
                defaultValue={lesson?.videoUrl ?? ''}
                placeholder="https://…"
                className={fieldControlClass}
                aria-invalid={!!fieldErrors.videoUrl}
              />
            </Field>
            <Field label="Thời lượng (giây)">
              <input
                name="durationSeconds"
                type="number"
                min={0}
                step={1}
                defaultValue={lesson?.durationSeconds ?? ''}
                className={fieldControlClass}
              />
            </Field>
          </>
        )}
        <Field label="Nội dung dành cho giảng viên" hint="Chỉ hiển thị cho người dạy, không cho học sinh.">
          <textarea
            name="instructorContent"
            maxLength={200000}
            defaultValue={lesson?.instructorContent ?? ''}
            className={textareaControlClass}
          />
        </Field>
        <Field label="Ghi chú giảng viên">
          <textarea
            name="instructorNotes"
            maxLength={100000}
            defaultValue={lesson?.instructorNotes ?? ''}
            className={textareaControlClass}
          />
        </Field>
        {Object.entries(fieldErrors).map(([field, message]) => (
          <p key={field} role="alert" className="text-sm text-danger">
            {field}: {message}
          </p>
        ))}
      </fieldset>
    </ConsoleDialog>
  )
}

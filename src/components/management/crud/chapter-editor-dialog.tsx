import SelectField from '../../console/select-field'
import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import { saveAdminChapter, type ChapterAdmin } from '../../../services/chapterAdminService'
import type { ContentSection } from '../../../services/contentSectionService'
import { getFieldErrors } from '../../../lib/errors'
import { crudError, unknownMutation } from './crud-errors'

interface Props {
  courseId: string
  chapter: ChapterAdmin | null
  /** The course's content sections; the choice is hidden when it has none. */
  sections?: ContentSection[]
  /** Section a new chapter starts in (the group whose "Thêm chương" was pressed). */
  defaultSectionId?: string | null
  onClose: () => void
  onSaved: () => void
}

export default function ChapterEditorDialog({
  courseId,
  chapter,
  sections = [],
  defaultSectionId = null,
  onClose,
  onSaved,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (busy || uncertain) return
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      const sectionId = String(data.get('sectionId') ?? '')
      await saveAdminChapter(courseId, chapter, {
        title: String(data.get('title') ?? '').trim(),
        description: String(data.get('description') ?? '').trim() || null,
        // Only a course with sections shows the choice; without it the chapter is left where it is.
        ...(sections.length
          ? sectionId
            ? { sectionId }
            : chapter?.sectionId
              ? { clearSection: true }
              : {}
          : {}),
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
      title={chapter ? 'Sửa chương' : 'Thêm chương'}
      onClose={onClose}
      onSubmit={(e) => void submit(e)}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            {uncertain ? 'Đóng và kiểm tra' : 'Hủy'}
          </Button>
          <Button type="submit" disabled={busy || uncertain}>
            {busy ? 'Đang lưu...' : 'Lưu chương'}
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
        <Field label="Tên chương">
          <input
            name="title"
            required
            maxLength={500}
            defaultValue={chapter?.title}
            className={fieldControlClass}
            aria-invalid={!!fieldErrors.title}
          />
        </Field>
        {sections.length > 0 && (
          <Field label="Phần học" hint="Nhóm chương theo phần để học viên dễ theo dõi lộ trình.">
            <SelectField
              ariaLabel="Phần học"
              name="sectionId"
              defaultValue={chapter ? (chapter.sectionId ?? '') : (defaultSectionId ?? '')}
              triggerClassName={fieldControlClass}
              options={[
                { id: '', label: 'Chưa xếp vào phần nào' },
                ...sections.map((section) => ({
                  id: String(section.id),
                  label: section.phaseName ? `${section.phaseName} · ${section.title}` : section.title,
                })),
              ]}
            />
          </Field>
        )}
        <Field label="Mô tả">
          <textarea
            name="description"
            maxLength={10000}
            defaultValue={chapter?.description ?? ''}
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

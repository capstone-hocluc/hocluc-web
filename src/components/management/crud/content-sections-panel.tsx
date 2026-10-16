import { useState } from 'react'
import Panel from '../../console/panel'
import Button from '../../console/button'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import { ArrowDown, ArrowUp, Plus } from '../../console/icons'
import type { CourseAdminPhase } from '../../../services/courseAdminService'
import {
  deleteContentSection,
  orderContentSections,
  type ContentSection,
} from '../../../services/contentSectionService'
import { crudError, unknownMutation } from './crud-errors'
import { movedIds } from './course-labels'
import ContentSectionEditorDialog from './content-section-editor-dialog'

interface Props {
  courseId: string
  sections: ContentSection[]
  phases: CourseAdminPhase[]
  readOnly: boolean
  /** Reloads the sections (and whatever depends on them) after any change. */
  onChanged: () => void
}

// A course groups its chapters into sections ("Phần học"), optionally inside a phase.
export default function ContentSectionsPanel({ courseId, sections, phases, readOnly, onChanged }: Props) {
  const [editor, setEditor] = useState<{ section: ContentSection | null } | null>(null)
  const [removal, setRemoval] = useState<ContentSection | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function act(action: () => Promise<unknown>, success: string) {
    if (busy) return false
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(success)
      onChanged()
      return true
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        setNotice('Chưa rõ kết quả thao tác. Đã yêu cầu tải lại để kiểm tra.')
        onChanged()
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  const move = (index: number, direction: -1 | 1) =>
    act(
      () =>
        orderContentSections(
          courseId,
          movedIds(
            sections.map((item) => item.id),
            index,
            direction
          )
        ),
      'Đã đổi thứ tự phần học.'
    )

  return (
    <Panel
      title="Phần học"
      action={
        !readOnly && (
          <Button size="sm" appearance="outline" disabled={busy} onClick={() => setEditor({ section: null })}>
            <Plus size={14} />
            Thêm phần học
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {notice && (
          <Notice tone="info">
            <span role="status">{notice}</span>
          </Notice>
        )}
        {error && !removal && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
        {sections.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            Chưa có phần học. Có thể thêm chương trực tiếp vào khóa, hoặc nhóm các chương thành phần học
            (ví dụ "Đọc hiểu", "Từ vựng") để học viên dễ theo dõi.
          </p>
        ) : (
          <ol className="divide-y divide-card-border">
            {sections.map((section, index) => (
              <li
                key={section.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-text-primary">{section.title}</h3>
                  <p className="text-xs text-text-tertiary">
                    {[section.phaseName, `${section.chapterCount} chương`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {!readOnly && (
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      size="icon"
                      appearance="ghost"
                      aria-label={`Đưa ${section.title} lên`}
                      disabled={busy || index === 0}
                      onClick={() => void move(index, -1)}
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      size="icon"
                      appearance="ghost"
                      aria-label={`Đưa ${section.title} xuống`}
                      disabled={busy || index === sections.length - 1}
                      onClick={() => void move(index, 1)}
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button
                      size="sm"
                      appearance="outline"
                      aria-label={`Sửa phần học ${section.title}`}
                      disabled={busy}
                      onClick={() => setEditor({ section })}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      appearance="ghost"
                      variant="danger"
                      aria-label={`Xóa phần học ${section.title}`}
                      disabled={busy}
                      onClick={() => {
                        setError('')
                        setRemoval(section)
                      }}
                    >
                      Xóa
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      {editor && (
        <ContentSectionEditorDialog
          courseId={courseId}
          section={editor.section}
          phases={phases}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            setNotice('Đã lưu phần học.')
            onChanged()
          }}
        />
      )}
      {removal && (
        <ConfirmDialog
          title="Xóa phần học?"
          description={
            <>
              Phần học "{removal.title}". Chỉ xóa được khi phần này không còn chương.
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel="Xóa phần học"
          variant="danger"
          busy={busy}
          onCancel={() => setRemoval(null)}
          onConfirm={async () => {
            if (await act(() => deleteContentSection(courseId, removal.id), 'Đã xóa phần học.')) {
              setRemoval(null)
            }
          }}
        />
      )}
    </Panel>
  )
}

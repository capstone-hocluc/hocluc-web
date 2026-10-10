import { useState, type FormEvent } from 'react'
import Panel from '../../console/panel'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import { ArrowUp, ArrowDown, Plus } from '../../console/icons'
import type { CourseAdmin, CourseAdminPhase } from '../../../services/courseAdminService'
import { movedIds, type CourseMutation, type CourseRemoval } from './course-labels'

interface Props {
  course: CourseAdmin
  readOnly: boolean
  busy: boolean
  mutate: CourseMutation
  remove: CourseRemoval
  error: string
}
export default function CoursePhasesPanel({
  course,
  readOnly,
  busy,
  mutate,
  remove,
  error,
}: Props) {
  const [editor, setEditor] = useState<{ phase: CourseAdminPhase | null } | null>(null)
  async function save(event: FormEvent<HTMLFormElement>) {
    if (!editor || busy) return
    const data = new FormData(event.currentTarget)
    const saved = await mutate(
      `phases${editor.phase ? `/${editor.phase.id}` : ''}`,
      editor.phase ? 'PUT' : 'POST',
      {
        name: String(data.get('name') ?? '').trim(),
        description: String(data.get('description') ?? '').trim() || null,
        expectedUpdatedAt: editor.phase?.updatedAt,
      }
    )
    if (saved) setEditor(null)
  }
  return (
    <Panel
      title="Giai đoạn"
      action={
        !readOnly && (
          <Button
            size="sm"
            appearance="outline"
            onClick={() => setEditor({ phase: null })}
            disabled={busy}
          >
            <Plus size={14} />
            Thêm
          </Button>
        )
      }
    >
      {!course.phases.length ? (
        <p className="text-sm text-text-tertiary">
          Chưa có giai đoạn. Có thể gắn SECTION không theo giai đoạn.
        </p>
      ) : (
        <ol className="divide-y divide-card-border">
          {course.phases.map((phase, index) => (
            <li
              key={phase.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <h3 className="font-medium text-text-primary">{phase.name}</h3>
                {phase.description && (
                  <p className="mt-1 max-w-prose text-sm text-text-tertiary">{phase.description}</p>
                )}
              </div>
              {!readOnly && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    appearance="ghost"
                    aria-label={`Đưa ${phase.name} lên`}
                    disabled={busy || index === 0}
                    onClick={() =>
                      void mutate('phases/order', 'PUT', {
                        ids: movedIds(
                          course.phases.map((p) => p.id),
                          index,
                          -1
                        ),
                      })
                    }
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    size="icon"
                    appearance="ghost"
                    aria-label={`Đưa ${phase.name} xuống`}
                    disabled={busy || index === course.phases.length - 1}
                    onClick={() =>
                      void mutate('phases/order', 'PUT', {
                        ids: movedIds(
                          course.phases.map((p) => p.id),
                          index,
                          1
                        ),
                      })
                    }
                  >
                    <ArrowDown size={16} />
                  </Button>
                  <Button
                    size="sm"
                    appearance="outline"
                    disabled={busy}
                    onClick={() => setEditor({ phase })}
                  >
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    appearance="ghost"
                    variant="danger"
                    disabled={busy}
                    onClick={() => remove(`phases/${phase.id}`, phase.name)}
                  >
                    Xóa
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {editor && (
        <ConsoleDialog
          open
          title={editor.phase ? 'Sửa giai đoạn' : 'Thêm giai đoạn'}
          onClose={() => setEditor(null)}
          onSubmit={(e) => void save(e)}
          dismissable={!busy}
          footer={
            <>
              <Button appearance="outline" disabled={busy} onClick={() => setEditor(null)}>
                Hủy
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </>
          }
        >
          <fieldset disabled={busy} className="flex flex-col gap-4">
            {error && (
              <Notice tone="danger">
                <span role="alert">{error}</span>
              </Notice>
            )}
            <Field label="Tên giai đoạn">
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={editor.phase?.name}
                className={fieldControlClass}
              />
            </Field>
            <Field label="Mô tả">
              <textarea
                name="description"
                maxLength={10000}
                defaultValue={editor.phase?.description ?? ''}
                className={textareaControlClass}
              />
            </Field>
          </fieldset>
        </ConsoleDialog>
      )}
    </Panel>
  )
}

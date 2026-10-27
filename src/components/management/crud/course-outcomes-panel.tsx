import { useState } from 'react'
import Panel from '../../console/panel'
import Button from '../../console/button'
import Notice from '../../console/notice'
import Status from '../../console/status'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import { Pencil, Plus, Trash2 } from '../../console/icons'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import {
  getCourseOutcomes,
  replaceCourseOutcomes,
  type CourseOutcome,
} from '../../../services/courseOutcomeService'
import { crudError } from './crud-errors'

interface Draft {
  code: string
  description: string
  skills: string
}

const toDraft = (outcome: CourseOutcome): Draft => ({
  code: outcome.code,
  description: outcome.description,
  skills: outcome.skills.map((skill) => skill.code).join(', '),
})
const skillCodes = (text: string) =>
  text
    .split(/[,;\s]+/)
    .map((code) => code.trim())
    .filter(Boolean)

/** Course learning outcomes (CLO), each measured by skills of the subject's active label set. */
export default function CourseOutcomesPanel({
  courseId,
  readOnly,
}: {
  courseId: string
  readOnly: boolean
}) {
  const resource = useScheduleResource(`course-outcomes:${courseId}`, () =>
    getCourseOutcomes(courseId)
  )
  const [drafts, setDrafts] = useState<Draft[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = (index: number, patch: Partial<Draft>) =>
    setDrafts((current) =>
      current ? current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)) : current
    )

  async function save() {
    if (!drafts || busy) return
    setBusy(true)
    setError('')
    try {
      await replaceCourseOutcomes(
        courseId,
        drafts.map((draft) => ({
          code: draft.code.trim() || null,
          description: draft.description.trim(),
          skillCodes: skillCodes(draft.skills),
        }))
      )
      setDrafts(null)
      resource.reload()
    } catch (err) {
      setError(crudError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title="Chuẩn đầu ra (CLO)"
      action={
        readOnly || drafts ? undefined : (
          <Button
            appearance="outline"
            disabled={!resource.data}
            onClick={() => setDrafts((resource.data ?? []).map(toDraft))}
          >
            <Pencil size={16} />
            Sửa chuẩn đầu ra
          </Button>
        )
      }
    >
      {drafts ? (
        <div className="flex flex-col gap-4">
          {error && (
            <Notice tone="danger">
              <span role="alert">{error}</span>
            </Notice>
          )}
          {drafts.map((draft, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-card-border p-4 sm:grid-cols-[8rem_1fr_auto]"
            >
              <input
                aria-label={`Mã chuẩn đầu ra ${index + 1}`}
                className={fieldControlClass}
                placeholder={`CLO${index + 1}`}
                value={draft.code}
                maxLength={20}
                disabled={busy}
                onChange={(e) => update(index, { code: e.target.value })}
              />
              <div className="flex flex-col gap-3">
                <textarea
                  aria-label={`Mô tả chuẩn đầu ra ${index + 1}`}
                  className={textareaControlClass}
                  placeholder="Học xong, học sinh có thể…"
                  value={draft.description}
                  maxLength={2000}
                  disabled={busy}
                  onChange={(e) => update(index, { description: e.target.value })}
                />
                <input
                  aria-label={`Kỹ năng đo chuẩn đầu ra ${index + 1}`}
                  className={fieldControlClass}
                  placeholder="Mã kỹ năng, cách nhau bằng dấu phẩy (TV.S12, TV.S13)"
                  value={draft.skills}
                  disabled={busy}
                  onChange={(e) => update(index, { skills: e.target.value })}
                />
              </div>
              <Button
                size="sm"
                appearance="ghost"
                variant="danger"
                aria-label={`Xóa chuẩn đầu ra ${index + 1}`}
                disabled={busy}
                onClick={() => setDrafts(drafts.filter((_, i) => i !== index))}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <p className="text-xs text-text-tertiary">
            Mã kỹ năng lấy từ bộ nhãn đang dùng của môn. Để trống mã CLO thì hệ thống tự đặt theo
            thứ tự.
          </p>
          <div className="flex flex-wrap justify-between gap-3">
            <Button
              appearance="outline"
              disabled={busy || drafts.length >= 20}
              onClick={() => setDrafts([...drafts, { code: '', description: '', skills: '' }])}
            >
              <Plus size={16} />
              Thêm chuẩn đầu ra
            </Button>
            <div className="flex gap-2">
              <Button
                appearance="ghost"
                disabled={busy}
                onClick={() => {
                  setDrafts(null)
                  setError('')
                }}
              >
                Hủy
              </Button>
              <Button
                disabled={busy || drafts.some((draft) => !draft.description.trim())}
                onClick={() => void save()}
              >
                Lưu
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ScheduleResourceState
          status={resource.status}
          errorMessage={resource.errorMessage}
          onRetry={resource.reload}
        >
          {!resource.data?.length ? (
            <p className="text-sm text-text-tertiary">
              Chưa có chuẩn đầu ra. Mỗi chuẩn đầu ra nói học sinh làm được gì sau khóa, và gắn với
              kỹ năng trong master data để sau này đo mức đạt.
            </p>
          ) : (
            <ul className="divide-y divide-card-border">
              {resource.data.map((outcome) => (
                <li key={outcome.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex gap-3">
                    <span className="w-16 shrink-0 font-medium text-text-primary">
                      {outcome.code}
                    </span>
                    <span className="whitespace-pre-line text-sm text-text-primary">
                      {outcome.description}
                    </span>
                  </div>
                  {outcome.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-19">
                      {outcome.skills.map((skill) => (
                        <Status key={skill.code} tone="neutral">
                          {skill.code}
                          {skill.name ? ` · ${skill.name}` : ''}
                        </Status>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScheduleResourceState>
      )}
    </Panel>
  )
}

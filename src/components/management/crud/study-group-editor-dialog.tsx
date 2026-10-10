import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass } from '../../console/form-field'
import SelectField from '../../console/select-field'
import Notice from '../../console/notice'
import {
  createAdminStudyGroup,
  updateAdminStudyGroup,
  type StudyGroupAdmin,
} from '../../../services/studyGroupAdminService'
import type { StudyGroupHouseType, StudyGroupLevel } from '../../../services/studyGroupService'
import { getFieldErrors } from '../../../lib/errors'
import { crudError, unknownMutation } from './crud-errors'
import { HOUSE_TYPE_LABELS, LEVEL_OPTIONS } from './study-group-labels'

interface Props {
  courseId: string
  group: StudyGroupAdmin | null
  onClose: () => void
  onSaved: () => void
}

export default function StudyGroupEditorDialog({ courseId, group, onClose, onSaved }: Props) {
  const [houseType, setHouseType] = useState<StudyGroupHouseType>(group?.houseType ?? 'NEN_MONG')
  const [level, setLevel] = useState<StudyGroupLevel | 'NONE'>(group?.level ?? 'NONE')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (busy || uncertain) return
    const data = new FormData(event.currentTarget)
    const rawCapacity = String(data.get('capacity') ?? '').trim()
    setBusy(true)
    setError('')
    setFields({})
    try {
      const payload = {
        name: String(data.get('name') ?? '').trim(),
        houseType,
        level: level === 'NONE' ? null : level,
        capacity: rawCapacity === '' ? null : Number(rawCapacity),
      }
      if (group) await updateAdminStudyGroup(courseId, group.id, payload)
      else await createAdminStudyGroup(courseId, payload)
      onSaved()
    } catch (err) {
      setError(crudError(err))
      setFields(getFieldErrors(err))
      setUncertain(unknownMutation(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      title={group ? 'Sửa nhóm học' : 'Tạo nhóm học'}
      description={group ? group.name : 'Nhóm mới thuộc khóa đang chọn và bắt đầu với sĩ số 0.'}
      onClose={onClose}
      onSubmit={(e) => void submit(e)}
      maxWidth={640}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            {uncertain ? 'Đóng và kiểm tra' : 'Hủy'}
          </Button>
          <Button type="submit" disabled={busy || uncertain}>
            {busy ? 'Đang lưu...' : 'Lưu nhóm'}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
        {uncertain && (
          <Notice tone="warning">Chưa rõ kết quả lưu. Đóng form và tải lại trước khi thử tiếp.</Notice>
        )}
        <Field label="Tên nhóm">
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={group?.name}
            className={fieldControlClass}
            aria-invalid={!!fields.name}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nhà">
            <SelectField
              ariaLabel="Nhà của nhóm"
              value={houseType}
              onChange={(value) => setHouseType(value as StudyGroupHouseType)}
              disabled={busy}
              options={(Object.entries(HOUSE_TYPE_LABELS) as [StudyGroupHouseType, string][]).map(
                ([id, label]) => ({ id, label })
              )}
            />
          </Field>
          <Field label="Trình độ" hint="Mọi trình độ nếu không giới hạn.">
            <SelectField
              ariaLabel="Trình độ của nhóm"
              value={level}
              onChange={(value) => setLevel(value as StudyGroupLevel | 'NONE')}
              disabled={busy}
              options={LEVEL_OPTIONS}
            />
          </Field>
        </div>
        <Field label="Sĩ số tối đa" hint="Để trống nếu không giới hạn. Không thể thấp hơn sĩ số hiện tại.">
          <input
            name="capacity"
            type="number"
            min={0}
            max={1000}
            step={1}
            defaultValue={group?.capacity ?? ''}
            placeholder="Không giới hạn"
            className={fieldControlClass}
            aria-invalid={!!fields.capacity}
          />
        </Field>
        {Object.entries(fields).map(([field, message]) => (
          <p key={field} role="alert" className="text-sm text-danger">
            {field}: {message}
          </p>
        ))}
      </fieldset>
    </ConsoleDialog>
  )
}

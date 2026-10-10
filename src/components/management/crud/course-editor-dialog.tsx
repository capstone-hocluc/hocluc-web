import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import SelectField from '../../console/select-field'
import Notice from '../../console/notice'
import { Checkbox } from '../../tailgrids/core/checkbox'
import {
  saveAdminCourse,
  type AccessMode,
  type CourseAdmin,
  type CourseType,
} from '../../../services/courseAdminService'
import type { Category } from '../../../services/categoryService'
import { getFieldErrors } from '../../../lib/errors'
import { crudError, unknownMutation } from './crud-errors'

interface Props {
  course: CourseAdmin | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export default function CourseEditorDialog({ course, categories, onClose, onSaved }: Props) {
  const [courseType, setCourseType] = useState<CourseType>(course?.courseType ?? 'MAIN')
  const [categoryId, setCategoryId] = useState(course?.categoryId ?? 'NONE')
  const [paid, setPaid] = useState(course?.paid ?? false)
  const [track, setTrack] = useState(course?.track ?? 'NONE')
  const [targetExam, setTargetExam] = useState(course?.targetExam ?? 'NONE')
  const [accessMode, setAccessMode] = useState<AccessMode>(course?.accessMode ?? 'FIXED_END_DATE')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (busy || uncertain) return
    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '').trim() || null
    setBusy(true)
    setError('')
    setFields({})
    try {
      await saveAdminCourse(course?.id ?? null, {
        courseType,
        title: text('title') ?? '',
        slug: text('slug') ?? undefined,
        description: text('description'),
        shortIntroduction: text('shortIntroduction'),
        imageUrl: text('imageUrl'),
        videoUrl: text('videoUrl'),
        categoryId: categoryId === 'NONE' ? null : categoryId,
        paid,
        price: paid ? Number(data.get('price')) : 0,
        track: courseType === 'MAIN' ? (track === 'NONE' ? null : track) : (course?.track ?? null),
        startDate: courseType === 'MAIN' ? text('startDate') : (course?.startDate ?? null),
        endDate: courseType === 'MAIN' ? text('endDate') : (course?.endDate ?? null),
        targetExam: targetExam === 'NONE' ? null : targetExam,
        examSessionDate:
          courseType === 'MAIN' ? text('examSessionDate') : (course?.examSessionDate ?? null),
        accessMode,
        accessDays: accessMode === 'DAYS_FROM_PURCHASE' ? Number(data.get('accessDays')) : null,
        expectedUpdatedAt: course?.updatedAt,
      })
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
      title={course ? 'Sửa khóa học' : 'Tạo khóa học'}
      description={course ? course.title : 'Khóa mới được tạo ở trạng thái nháp.'}
      onClose={onClose}
      onSubmit={(e) => void submit(e)}
      maxWidth={760}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            {uncertain ? 'Đóng và kiểm tra' : 'Hủy'}
          </Button>
          <Button type="submit" disabled={busy || uncertain}>
            {busy ? 'Đang lưu...' : 'Lưu khóa học'}
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
          <Notice tone="warning">
            Chưa rõ kết quả lưu. Đóng form và tải lại trước khi thử tiếp.
          </Notice>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Loại khóa">
            <SelectField
              ariaLabel="Loại khóa"
              value={courseType}
              onChange={(value) => setCourseType(value as CourseType)}
              disabled={!!course || busy}
              options={[
                { id: 'MAIN', label: 'MAIN · Trọn bộ' },
                { id: 'SECTION', label: 'SECTION · Khóa nhỏ' },
              ]}
            />
          </Field>
          <Field label="Danh mục">
            <SelectField
              ariaLabel="Danh mục khóa học"
              value={categoryId}
              onChange={setCategoryId}
              disabled={busy}
              options={[
                { id: 'NONE', label: 'Chưa phân loại' },
                ...categories
                  .filter((c) => c.active || c.id === course?.categoryId)
                  .map((c) => ({ id: c.id, label: `${c.name}${c.active ? '' : ' · Ngừng dùng'}` })),
              ]}
            />
          </Field>
        </div>
        <Field label="Tên khóa học">
          <input
            name="title"
            required
            maxLength={500}
            defaultValue={course?.title}
            className={fieldControlClass}
            aria-invalid={!!fields.title}
          />
        </Field>
        <Field label="Slug" hint="Để trống để tạo tự động. Loại khóa không đổi sau khi tạo.">
          <input
            name="slug"
            maxLength={500}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={course?.slug}
            className={fieldControlClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ảnh khóa học">
            <input
              name="imageUrl"
              maxLength={2000}
              defaultValue={course?.imageUrl ?? ''}
              placeholder="https://…"
              className={fieldControlClass}
            />
          </Field>
          <Field label="Video giới thiệu">
            <input
              name="videoUrl"
              maxLength={2000}
              defaultValue={course?.videoUrl ?? ''}
              placeholder="https://…"
              className={fieldControlClass}
            />
          </Field>
        </div>
        <Field label="Giới thiệu ngắn">
          <textarea
            name="shortIntroduction"
            maxLength={10000}
            defaultValue={course?.shortIntroduction ?? ''}
            className={textareaControlClass}
          />
        </Field>
        <Field label="Mô tả">
          <textarea
            name="description"
            maxLength={50000}
            defaultValue={course?.description ?? ''}
            className={textareaControlClass}
          />
        </Field>
        <div className="flex flex-col gap-3 border-t border-card-border pt-4">
          <Checkbox isSelected={paid} onChange={setPaid} isDisabled={busy}>
            Khóa có học phí
          </Checkbox>
          {paid && (
            <Field label="Học phí (VND)">
              <input
                name="price"
                type="number"
                min={0.0001}
                max={999999999999999}
                step="0.0001"
                required
                defaultValue={course?.price ?? ''}
                className={fieldControlClass}
              />
            </Field>
          )}
        </div>
        <Field label="Kỳ thi">
          <SelectField
            ariaLabel="Kỳ thi khóa học"
            value={targetExam}
            onChange={setTargetExam}
            disabled={busy}
            options={[
              { id: 'NONE', label: 'Không giới hạn' },
              { id: 'VNUHCM_DGNL', label: 'ĐGNL ĐHQG TP.HCM' },
            ]}
          />
        </Field>
        {courseType === 'MAIN' && (
          <div className="grid gap-4 border-t border-card-border pt-4 sm:grid-cols-2">
            <Field label="Lộ trình">
              <SelectField
                ariaLabel="Lộ trình khóa học"
                value={track}
                onChange={setTrack}
                disabled={busy}
                options={[
                  { id: 'NONE', label: 'Chưa đặt' },
                  { id: 'LONG', label: 'Dài hạn' },
                  { id: 'STANDARD', label: 'Tiêu chuẩn' },
                  { id: 'SPRINT_ROUND2', label: 'Nước rút đợt 2' },
                ]}
              />
            </Field>
            <Field label="Ngày thi">
              <input
                name="examSessionDate"
                type="date"
                defaultValue={course?.examSessionDate ?? ''}
                className={fieldControlClass}
              />
            </Field>
            <Field label="Ngày bắt đầu">
              <input
                name="startDate"
                type="date"
                defaultValue={course?.startDate ?? ''}
                className={fieldControlClass}
              />
            </Field>
            <Field label="Ngày kết thúc">
              <input
                name="endDate"
                type="date"
                defaultValue={course?.endDate ?? ''}
                className={fieldControlClass}
              />
            </Field>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-card-border pt-4">
          <Field label="Hạn dùng khóa">
            <SelectField
              ariaLabel="Hạn dùng khóa học"
              value={accessMode}
              onChange={(value) => setAccessMode(value as AccessMode)}
              disabled={busy}
              options={[
                { id: 'FIXED_END_DATE', label: 'Theo ngày kết thúc khóa' },
                { id: 'DAYS_FROM_PURCHASE', label: 'N ngày kể từ khi mua' },
              ]}
            />
          </Field>
          {accessMode === 'DAYS_FROM_PURCHASE' ? (
            <Field label="Số ngày truy cập" hint="Tính từ lúc thanh toán thành công hoặc ghi danh tay.">
              <input
                name="accessDays"
                type="number"
                min={1}
                max={3650}
                step={1}
                required
                defaultValue={course?.accessDays ?? 90}
                className={fieldControlClass}
                aria-invalid={!!fields.accessDays}
              />
            </Field>
          ) : (
            <p className="text-xs text-text-tertiary">
              {courseType === 'MAIN'
                ? 'Quyền truy cập kết thúc vào cuối ngày kết thúc của khóa.'
                : 'SECTION không có ngày kết thúc — chọn “N ngày kể từ khi mua” nếu muốn giới hạn thời gian học.'}
            </p>
          )}
        </div>
        {Object.entries(fields).map(([field, message]) => (
          <p key={field} role="alert" className="text-sm text-danger">
            {field}: {message}
          </p>
        ))}
      </fieldset>
    </ConsoleDialog>
  )
}

import { useState, type FormEvent, type ReactNode } from 'react'
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
import { COURSE_TYPE_LABELS } from './course-labels'
import { crudError, unknownMutation } from './crud-errors'
import CourseImageField from './course-image-field'

type StepId = 'info' | 'pricing' | 'schedule' | 'access'

const STEP_LABELS: Record<StepId, string> = {
  info: 'Thông tin',
  pricing: 'Học phí & kỳ thi',
  schedule: 'Lịch học',
  access: 'Hạn dùng',
}

// Which step owns a server-side field error, so a rejected save lands on the right panel.
const FIELD_STEP: Record<string, StepId> = {
  courseType: 'info',
  title: 'info',
  description: 'info',
  shortIntroduction: 'info',
  imageUrl: 'info',
  videoUrl: 'info',
  categoryId: 'info',
  paid: 'pricing',
  price: 'pricing',
  targetExam: 'pricing',
  track: 'schedule',
  startDate: 'schedule',
  endDate: 'schedule',
  examSessionDate: 'schedule',
  accessMode: 'access',
  accessDays: 'access',
}

function StepPanel({ id, active, children }: { id: StepId; active: boolean; children: ReactNode }) {
  // Hidden, not unmounted: every step's inputs stay in the form so FormData reads them all on save.
  return (
    <div data-step={id} hidden={!active} className="flex min-w-0 flex-col gap-5">
      {children}
    </div>
  )
}

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
  const [targetExam, setTargetExam] = useState(course?.targetExam ?? 'VNUHCM_DGNL')
  const [price, setPrice] = useState(course?.price ? String(Math.round(course.price)) : '')
  const [accessMode, setAccessMode] = useState<AccessMode>(course?.accessMode ?? 'FIXED_END_DATE')
  const [stepIndex, setStepIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)
  // SECTION courses have no start/end/exam dates, so that step is skipped for them.
  const steps: StepId[] =
    courseType === 'MAIN'
      ? ['info', 'pricing', 'schedule', 'access']
      : ['info', 'pricing', 'access']
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]
  const isLastStep = stepIndex >= steps.length - 1

  function goNext(form: HTMLFormElement | null) {
    const panel = form?.querySelector<HTMLElement>(`[data-step="${currentStep}"]`)
    const controls = panel?.querySelectorAll<HTMLInputElement>('input, textarea') ?? []
    for (const control of controls) {
      if (!control.checkValidity()) {
        control.reportValidity()
        return
      }
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (busy || uncertain || uploading) return
    if (!isLastStep) {
      goNext(event.currentTarget)
      return
    }
    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '').trim() || null
    setBusy(true)
    setError('')
    setFields({})
    try {
      await saveAdminCourse(course?.id ?? null, {
        courseType,
        title: text('title') ?? '',
        description: text('description'),
        shortIntroduction: text('shortIntroduction'),
        imageUrl: text('imageUrl'),
        videoUrl: text('videoUrl'),
        categoryId: categoryId === 'NONE' ? null : categoryId,
        paid,
        price: paid ? Number(price) : 0,
        track: courseType === 'MAIN' ? (track === 'NONE' ? null : track) : (course?.track ?? null),
        startDate: courseType === 'MAIN' ? text('startDate') : (course?.startDate ?? null),
        endDate: courseType === 'MAIN' ? text('endDate') : (course?.endDate ?? null),
        targetExam,
        examSessionDate:
          courseType === 'MAIN' ? text('examSessionDate') : (course?.examSessionDate ?? null),
        accessMode,
        accessDays: accessMode === 'DAYS_FROM_PURCHASE' ? Number(data.get('accessDays')) : null,
        expectedUpdatedAt: course?.updatedAt,
      })
      onSaved()
    } catch (err) {
      setError(crudError(err))
      const fieldErrors = getFieldErrors(err)
      setFields(fieldErrors)
      const failedStep = Object.keys(fieldErrors)
        .map((name) => FIELD_STEP[name])
        .find((id) => id && steps.includes(id))
      if (failedStep) setStepIndex(steps.indexOf(failedStep))
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
          {stepIndex > 0 && (
            <Button
              appearance="outline"
              onClick={() => setStepIndex((index) => index - 1)}
              disabled={busy}
            >
              Quay lại
            </Button>
          )}
          {isLastStep ? (
            <Button key="save" type="submit" disabled={busy || uncertain || uploading}>
              {busy ? 'Đang lưu...' : 'Lưu khóa học'}
            </Button>
          ) : (
            <Button
              key="next"
              onClick={(event) => goNext(event.currentTarget.closest('form'))}
              disabled={busy || uploading}
            >
              Tiếp tục
            </Button>
          )}
        </>
      }
    >
      <fieldset
        disabled={busy}
        className="flex min-w-0 flex-col gap-5"
        onKeyDown={(event) => {
          // Enter inside a text input advances the wizard instead of submitting a half-filled form.
          if (event.key === 'Enter' && !isLastStep && event.target instanceof HTMLInputElement) {
            event.preventDefault()
            goNext(event.currentTarget.closest('form'))
          }
        }}
      >
        <ol className="flex items-center gap-2 text-sm" aria-label="Các bước tạo khóa học">
          {steps.map((id, index) => (
            <li
              key={id}
              aria-current={index === stepIndex ? 'step' : undefined}
              className={`flex items-center gap-2 ${index === stepIndex ? 'font-semibold text-text-primary' : 'text-text-tertiary'}`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs ${index <= stepIndex ? 'bg-button-primary-background text-button-primary-text' : 'bg-background-gray-secondary text-text-tertiary'}`}
              >
                {index + 1}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[id]}</span>
              {index < steps.length - 1 && <span className="h-px w-6 bg-card-border" aria-hidden />}
            </li>
          ))}
        </ol>
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
        <StepPanel id="info" active={currentStep === 'info'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loại khóa">
              <SelectField
                ariaLabel="Loại khóa"
                value={courseType}
                onChange={(value) => setCourseType(value as CourseType)}
                disabled={!!course || busy}
                options={[
                  { id: 'MAIN', label: COURSE_TYPE_LABELS.MAIN },
                  { id: 'SECTION', label: COURSE_TYPE_LABELS.SECTION },
                ]}
              />
            </Field>
            <Field label="Môn học">
              <SelectField
                ariaLabel="Môn học khóa học"
                value={categoryId}
                onChange={setCategoryId}
                disabled={busy}
                options={[
                  { id: 'NONE', label: 'Chưa phân loại' },
                  ...categories
                    .filter((c) => c.active || c.id === course?.categoryId)
                    .map((c) => ({
                      id: c.id,
                      label: `${c.name}${c.active ? '' : ' · Ngừng dùng'}`,
                    })),
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
          <div className="grid gap-4">
            <CourseImageField
              name="imageUrl"
              defaultValue={course?.imageUrl ?? ''}
              disabled={busy}
              onUploadingChange={setUploading}
            />
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
        </StepPanel>
        <StepPanel id="pricing" active={currentStep === 'pricing'}>
          <div className="flex flex-col gap-3">
            <Checkbox isSelected={paid} onChange={setPaid} isDisabled={busy}>
              Khóa có học phí
            </Checkbox>
            {paid && (
              <Field label="Học phí (VND)">
                <input
                  name="price"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  maxLength={19}
                  placeholder="0"
                  value={price ? Number(price).toLocaleString('vi-VN') : ''}
                  onChange={(event) =>
                    setPrice(event.target.value.replace(/\D/g, '').replace(/^0+/, ''))
                  }
                  className={fieldControlClass}
                  aria-invalid={!!fields.price}
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
              options={[{ id: 'VNUHCM_DGNL', label: 'ĐGNL ĐHQG TP.HCM' }]}
            />
          </Field>
        </StepPanel>
        {courseType === 'MAIN' && (
          <StepPanel id="schedule" active={currentStep === 'schedule'}>
            <div className="grid gap-4 sm:grid-cols-2">
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
          </StepPanel>
        )}
        <StepPanel id="access" active={currentStep === 'access'}>
          <div className="flex flex-col gap-3">
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
              <Field
                label="Số ngày truy cập"
                hint="Tính từ lúc thanh toán thành công hoặc ghi danh tay."
              >
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
                  : 'Khóa nhỏ không có ngày kết thúc — chọn “N ngày kể từ khi mua” nếu muốn giới hạn thời gian học.'}
              </p>
            )}
          </div>
        </StepPanel>
        {Object.entries(fields).map(([field, message]) => (
          <p key={field} role="alert" className="text-sm text-danger">
            {field}: {message}
          </p>
        ))}
      </fieldset>
    </ConsoleDialog>
  )
}

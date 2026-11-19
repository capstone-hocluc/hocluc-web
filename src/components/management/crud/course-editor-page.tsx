import { useState, type FormEvent, type ReactNode } from 'react'
import Button from '../../console/button'
import Card from '../../console/card'
import DateRangeField from '../../console/date-range-field'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import SelectField from '../../console/select-field'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Check } from '../../console/icons'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { cn } from '../../../lib/cn'
import { getFieldErrors } from '../../../lib/errors'
import { getCategories, type Category } from '../../../services/categoryService'
import {
  getAdminCourse,
  saveAdminCourse,
  type AccessMode,
  type CourseAdmin,
  type CourseType,
} from '../../../services/courseAdminService'
import { getAdminExamYears } from '../../../services/examYearService'
import { COURSE_TYPE_LABELS } from './course-labels'
import { courseSaleGaps } from './course-steps'
import { crudError, unknownMutation } from './crud-errors'
import CourseImageField from './course-image-field'
import CourseVideoField from './course-video-field'
import CourseExamSessionPicker, { LEGACY_SESSION, NO_SESSION } from './course-exam-session-picker'
import { formatExamDate } from './exam-year-labels'

type StepId = 'info' | 'media' | 'schedule' | 'pricing'

const STEP_LABELS: Record<StepId, string> = {
  info: 'Thông tin',
  media: 'Ảnh & video',
  schedule: 'Lịch học',
  pricing: 'Học phí & hạn dùng',
}

// Which step owns a field, so a rejected save opens the step holding the field the server named.
const FIELD_STEP: Record<string, StepId> = {
  courseType: 'info',
  title: 'info',
  description: 'info',
  shortIntroduction: 'info',
  categoryId: 'info',
  imageUrl: 'media',
  videoUrl: 'media',
  track: 'schedule',
  startDate: 'schedule',
  endDate: 'schedule',
  examSessionDate: 'schedule',
  examSessionId: 'schedule',
  paid: 'pricing',
  price: 'pricing',
  targetExam: 'pricing',
  estimatedDurationMinutes: 'pricing',
  accessMode: 'pricing',
  accessDays: 'pricing',
}

const FIELD_LABELS: Record<string, string> = {
  courseType: 'Loại khóa',
  title: 'Tên khóa học',
  description: 'Mô tả',
  shortIntroduction: 'Giới thiệu ngắn',
  imageUrl: 'Ảnh khóa học',
  videoUrl: 'Video giới thiệu',
  categoryId: 'Môn học',
  price: 'Học phí',
  estimatedDurationMinutes: 'Thời lượng',
  track: 'Lộ trình',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  examSessionDate: 'Ngày thi',
  examSessionId: 'Đợt thi',
  accessMode: 'Hạn dùng',
  accessDays: 'Số ngày truy cập',
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
  /** The course to edit, or null to create one. */
  courseId: string | null
  /** Subject of the rail selection, used when a new course is created from that subject. */
  initialCategoryId?: string
  onClose: () => void
  onSaved: (course: CourseAdmin) => void
}

// The course form as its own page: steps across the top, one step's fields at a time, so the whole
// form fits on screen. Loads the course and the subjects it needs, then hands them to the form.
export default function CourseEditorPage({ courseId, initialCategoryId, onClose, onSaved }: Props) {
  const course = useScheduleResource(courseId ? `course-detail:${courseId}` : null, () =>
    getAdminCourse(courseId ?? '')
  )
  const categories = useScheduleResource('course-categories', getCategories)
  const loading = courseId ? course : categories
  const ready = categories.status === 'ready' && (!courseId || course.status === 'ready')

  return (
    <section className="flex flex-col gap-5">
      <PageHeading
        title={courseId ? 'Sửa khóa học' : 'Tạo khóa học'}
        parent="Khóa học"
        onBack={onClose}
        backLabel={courseId ? 'Quay lại khóa học' : 'Quay lại danh sách khóa'}
      />
      <ScheduleResourceState
        skeleton="detail"
        status={ready ? 'ready' : categories.status === 'ready' ? loading.status : categories.status}
        errorMessage={categories.errorMessage || loading.errorMessage}
        onRetry={() => {
          categories.reload()
          if (courseId) course.reload()
        }}
      >
        {ready && (
          <CourseEditorForm
            key={course.data?.updatedAt ?? 'new'}
            course={courseId ? (course.data ?? null) : null}
            categories={categories.data ?? []}
            initialCategoryId={initialCategoryId}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </ScheduleResourceState>
    </section>
  )
}

function CourseEditorForm({
  course,
  categories,
  initialCategoryId,
  onClose,
  onSaved,
}: {
  course: CourseAdmin | null
  categories: Category[]
  initialCategoryId?: string
  onClose: () => void
  onSaved: (course: CourseAdmin) => void
}) {
  const [courseType, setCourseType] = useState<CourseType>(course?.courseType ?? 'MAIN')
  const [categoryId, setCategoryId] = useState(course?.categoryId ?? initialCategoryId ?? 'NONE')
  const [imageUrl, setImageUrl] = useState(course?.imageUrl ?? '')
  const [shortIntroduction, setShortIntroduction] = useState(course?.shortIntroduction ?? '')
  const [description, setDescription] = useState(course?.description ?? '')
  // One amount: empty or 0 is a free course, anything above is its price.
  const [price, setPrice] = useState(course?.paid && course.price ? String(Math.round(course.price)) : '')
  const [track, setTrack] = useState(course?.track ?? 'NONE')
  const [dates, setDates] = useState({ from: course?.startDate ?? '', to: course?.endDate ?? '' })
  const [accessMode, setAccessMode] = useState<AccessMode>(course?.accessMode ?? 'FIXED_END_DATE')
  const [examSessionChoice, setExamSessionChoice] = useState(
    course?.examSession?.id ?? (course?.examSessionDate ? LEGACY_SESSION : NO_SESSION)
  )
  const examYears = useScheduleResource(
    courseType === 'MAIN' ? 'course-editor-exam-years' : null,
    getAdminExamYears
  )
  const [step, setStep] = useState<StepId>('info')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)

  const isMain = courseType === 'MAIN'
  // A SECTION course has no dates or exam, so it skips the schedule step.
  const steps: StepId[] = isMain ? ['info', 'media', 'schedule', 'pricing'] : ['info', 'media', 'pricing']
  const current = steps.includes(step) ? step : 'info'
  const index = steps.indexOf(current)
  const isLast = index === steps.length - 1
  const sessionId = isMain && ![NO_SESSION, LEGACY_SESSION].includes(examSessionChoice) ? examSessionChoice : null
  const chosenSession = (examYears.data ?? [])
    .flatMap((year) => year.sessions)
    .find((session) => session.id === sessionId)
  const gaps = courseSaleGaps({
    courseType,
    categoryId: categoryId === 'NONE' ? null : categoryId,
    imageUrl,
    shortIntroduction,
    description,
    startDate: dates.from || null,
    endDate: dates.to || null,
    examSessionId: sessionId,
  })
  const amount = Number(price || 0)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || uncertain || uploading) return
    const form = event.currentTarget
    // The browser cannot point at a field in a hidden step, so open that step first, then let it speak.
    const invalid = form.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:invalid, textarea:invalid')
    if (invalid) {
      const owner = invalid.closest<HTMLElement>('[data-step]')?.dataset.step as StepId | undefined
      if (owner) setStep(owner)
      window.requestAnimationFrame(() => invalid.reportValidity())
      return
    }
    const data = new FormData(form)
    const text = (name: string) => String(data.get(name) ?? '').trim() || null
    const hours = text('estimatedDurationHours')
    setBusy(true)
    setError('')
    setFields({})
    try {
      const saved = await saveAdminCourse(course?.id ?? null, {
        courseType,
        title: text('title') ?? '',
        description: description.trim() || null,
        shortIntroduction: shortIntroduction.trim() || null,
        imageUrl: imageUrl.trim() || null,
        videoUrl: text('videoUrl'),
        categoryId: categoryId === 'NONE' ? null : categoryId,
        paid: amount > 0,
        price: amount,
        estimatedDurationMinutes: hours ? Math.round(Number(hours) * 60) : null,
        track: isMain ? (track === 'NONE' ? null : track) : (course?.track ?? null),
        startDate: isMain ? dates.from || null : (course?.startDate ?? null),
        endDate: isMain ? dates.to || null : (course?.endDate ?? null),
        // Only one exam is taught today, so the field is not shown; a course keeps the one it has.
        targetExam: course?.targetExam ?? 'VNUHCM_DGNL',
        examSessionId: sessionId,
        examSessionDate:
          isMain && examSessionChoice !== LEGACY_SESSION ? null : (course?.examSessionDate ?? null),
        accessMode,
        accessDays: accessMode === 'DAYS_FROM_PURCHASE' ? Number(data.get('accessDays')) : null,
        expectedUpdatedAt: course?.updatedAt,
      })
      onSaved(saved)
    } catch (err) {
      setError(crudError(err))
      const fieldErrors = getFieldErrors(err)
      setFields(fieldErrors)
      setUncertain(unknownMutation(err))
      const failed = Object.keys(fieldErrors)
        .map((name) => FIELD_STEP[name])
        .find((id) => id && steps.includes(id))
      if (failed) setStep(failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex w-full max-w-4xl flex-col gap-4">
      {error && (
        <Notice tone="danger">
          <span role="alert">
            {error}
            {Object.keys(fields).length > 0 && (
              <span className="mt-1 block">
                {Object.entries(fields)
                  .map(([field, message]) => `${FIELD_LABELS[field] ?? field}: ${message}`)
                  .join(' · ')}
              </span>
            )}
          </span>
        </Notice>
      )}
      {uncertain && (
        <Notice tone="warning">Chưa rõ kết quả lưu. Quay lại và tải lại trang trước khi thử tiếp.</Notice>
      )}

      <Card padding="none" className="overflow-hidden">
        <ol aria-label="Các bước" className="flex items-center gap-3 overflow-x-auto border-b border-card-border px-5 py-4">
          {steps.map((id, position) => {
            const missing = gaps.filter((gap) => FIELD_STEP[gap.field] === id).length
            const active = id === current
            return (
              <li key={id} className={cn('flex min-w-0 items-center gap-3', position < steps.length - 1 && 'flex-1')}>
                <button
                  type="button"
                  aria-current={active ? 'step' : undefined}
                  onClick={() => setStep(id)}
                  className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent p-1 text-left"
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold',
                      active
                        ? 'bg-primary text-white'
                        : missing === 0
                          ? 'bg-badge-success-background text-badge-success-text'
                          : 'border border-card-border bg-background-gray-secondary text-text-secondary'
                    )}
                  >
                    {!active && missing === 0 ? <Check size={16} aria-hidden="true" /> : position + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className={cn('text-sm font-medium whitespace-nowrap', active ? 'text-text-primary' : 'text-text-secondary')}>
                      {STEP_LABELS[id]}
                    </span>
                    <span className={cn('text-xs whitespace-nowrap', missing > 0 ? 'text-badge-warning-text' : 'text-text-tertiary')}>
                      {missing > 0 ? `Thiếu ${missing}` : 'Đã đủ'}
                    </span>
                  </span>
                </button>
                {position < steps.length - 1 && <span aria-hidden="true" className="h-px min-w-6 flex-1 bg-card-border" />}
              </li>
            )
          })}
        </ol>

        <fieldset disabled={busy} className="min-w-0 border-0 px-5 py-5">
          <legend className="sr-only">{STEP_LABELS[current]}</legend>

          <StepPanel id="info" active={current === 'info'}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Loại khóa" hint={course ? 'Không đổi được sau khi tạo.' : undefined}>
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
              <Field label="Môn học" required>
                <SelectField
                  ariaLabel="Môn học khóa học"
                  value={categoryId}
                  onChange={setCategoryId}
                  disabled={busy}
                  invalid={!!fields.categoryId}
                  options={[
                    { id: 'NONE', label: 'Chưa phân loại' },
                    ...categories
                      .filter((c) => c.active || c.id === course?.categoryId || c.id === initialCategoryId)
                      .map((c) => ({ id: c.id, label: `${c.name}${c.active ? '' : ' · Ngừng dùng'}` })),
                  ]}
                />
              </Field>
            </div>
            <Field label="Tên khóa học" required>
              <input
                name="title"
                required
                maxLength={500}
                defaultValue={course?.title}
                className={fieldControlClass}
                aria-invalid={!!fields.title}
              />
            </Field>
            <Field label="Giới thiệu ngắn" required hint="Một hai câu dưới tên khóa trên trang khóa học.">
              <textarea
                name="shortIntroduction"
                maxLength={10000}
                rows={2}
                value={shortIntroduction}
                onChange={(event) => setShortIntroduction(event.target.value)}
                className={cn(textareaControlClass, 'min-h-16')}
                aria-invalid={!!fields.shortIntroduction}
              />
            </Field>
            <Field label="Mô tả" required>
              <textarea
                name="description"
                maxLength={50000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={cn(textareaControlClass, 'min-h-32')}
                aria-invalid={!!fields.description}
              />
            </Field>
          </StepPanel>

          <StepPanel id="media" active={current === 'media'}>
            <CourseImageField
              name="imageUrl"
              defaultValue={course?.imageUrl ?? ''}
              disabled={busy}
              required
              onChange={setImageUrl}
              onUploadingChange={setUploading}
            />
            <CourseVideoField
              name="videoUrl"
              defaultValue={course?.videoUrl ?? ''}
              disabled={busy}
              onUploadingChange={setUploading}
            />
          </StepPanel>

          {isMain && (
            <StepPanel id="schedule" active={current === 'schedule'}>
              <Field label="Lộ trình" hint="Lộ trình nước rút đợt 2 chỉ chọn được các đợt 2.">
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
              <CourseExamSessionPicker
                years={examYears.data}
                loading={examYears.status === 'loading' || examYears.status === 'idle'}
                value={examSessionChoice}
                onChange={setExamSessionChoice}
                track={track}
                current={course?.examSession ?? null}
                legacyDate={course?.examSessionDate && !course.examSession ? course.examSessionDate : null}
                disabled={busy}
                invalid={!!fields.examSessionId}
                required
              />
              <DateRangeField
                label="Thời gian khóa học"
                names={['startDate', 'endDate']}
                value={dates}
                onChange={setDates}
                disabled={busy}
                invalid={!!fields.startDate || !!fields.endDate}
                max={chosenSession?.examStartDate}
                markRequired
                showSummary
                hint={
                  chosenSession ? `Kết thúc trước ngày thi ${formatExamDate(chosenSession.examStartDate)}.` : undefined
                }
              />
            </StepPanel>
          )}

          <StepPanel id="pricing" active={current === 'pricing'}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Học phí (VND)" hint={amount > 0 ? 'Khóa thu phí.' : 'Để trống là khóa miễn phí.'}>
                <input
                  name="price"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={19}
                  placeholder="Miễn phí"
                  value={price ? Number(price).toLocaleString('vi-VN') : ''}
                  onChange={(event) => setPrice(event.target.value.replace(/\D/g, '').replace(/^0+/, ''))}
                  className={fieldControlClass}
                  aria-invalid={!!fields.price}
                />
              </Field>
              <Field label="Thời lượng học (giờ)" hint="Tổng giờ học ước tính, hiện ở mục “Thời lượng” trên trang khóa học.">
                <input
                  name="estimatedDurationHours"
                  type="number"
                  inputMode="decimal"
                  min={0.5}
                  max={1600}
                  step={0.5}
                  defaultValue={course?.estimatedDurationMinutes ? course.estimatedDurationMinutes / 60 : ''}
                  className={fieldControlClass}
                  aria-invalid={!!fields.estimatedDurationMinutes}
                />
              </Field>
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
                <Field label="Số ngày truy cập" required hint="Tính từ lúc thanh toán thành công hoặc ghi danh tay.">
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
                <p className="self-end pb-2.5 text-sm text-text-tertiary">
                  {isMain
                    ? dates.to
                      ? `Học viên học được đến hết ngày ${formatExamDate(dates.to)}.`
                      : 'Học viên học được đến hết ngày kết thúc của khóa.'
                    : 'Khóa nhỏ không có ngày kết thúc. Chọn “N ngày kể từ khi mua” để giới hạn thời gian học.'}
                </p>
              )}
            </div>
          </StepPanel>
        </fieldset>

        <footer className="flex flex-wrap items-center gap-3 border-t border-card-border px-5 py-3">
          <p
            className="min-w-0 flex-1 truncate text-sm text-text-secondary"
            aria-live="polite"
            title={gaps.length > 0 ? gaps.map((gap) => gap.label).join(', ') : undefined}
          >
            {gaps.length > 0 ? `Còn thiếu ${gaps.length} mục để gửi duyệt` : 'Đủ thông tin để gửi duyệt'}
          </p>
          <Button appearance="ghost" onClick={onClose} disabled={busy}>
            {uncertain ? 'Quay lại và kiểm tra' : 'Hủy'}
          </Button>
          {index > 0 && (
            <Button appearance="outline" onClick={() => setStep(steps[index - 1])} disabled={busy}>
              Quay lại
            </Button>
          )}
          {/* A draft saves from any step; nothing here has to be filled before the course is sent for review. */}
          <Button
            type="submit"
            appearance={isLast ? 'fill' : 'outline'}
            disabled={busy || uncertain || uploading}
          >
            {busy ? 'Đang lưu...' : 'Lưu khóa học'}
          </Button>
          {!isLast && (
            <Button onClick={() => setStep(steps[index + 1])} disabled={busy}>
              Tiếp tục
            </Button>
          )}
        </footer>
      </Card>
    </form>
  )
}

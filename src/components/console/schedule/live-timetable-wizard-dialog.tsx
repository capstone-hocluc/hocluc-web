import { Check } from '../icons'
import Button from '../button'
import ConsoleDialog from '../dialog'
import Notice from '../notice'
import type { Course } from '../../../services/courseService'
import type { UserSummary } from '../../../services/userService'
import { useLiveTimetableWizard } from '../../../hooks/useLiveTimetableWizard'
import WizardStepTeacher from './wizard-step-teacher'
import WizardStepSlots from './wizard-step-slots'
import WizardStepPreview from './wizard-step-preview'
import { cn } from '../../../lib/cn'

interface Props {
  open: boolean
  courses: Course[]
  teachers: UserSummary[]
  initialCourseId?: string
  onClose: () => void
  onCreated: () => void
}

const STEPS = [
  { id: 1 as const, label: 'Lớp và giảng viên' },
  { id: 2 as const, label: 'Khung giờ' },
  { id: 3 as const, label: 'Xem trước' },
]

export default function LiveTimetableWizardDialog(props: Props) {
  if (!props.open) return null
  return <LiveTimetableWizardBody {...props} />
}

function LiveTimetableWizardBody({
  open,
  courses,
  teachers,
  initialCourseId,
  onClose,
  onCreated,
}: Props) {
  const wizard = useLiveTimetableWizard({
    open,
    courses,
    teachers,
    initialCourseId,
    onCreated,
  })

  const footer = (
    <div className="flex w-full items-center justify-between gap-3">
      {wizard.step === 1 ? (
        <div />
      ) : (
        <Button
          appearance="outline"
          disabled={wizard.busy}
          onClick={() => {
            wizard.setErrorMessage('')
            wizard.setStep(wizard.step === 3 ? 2 : 1)
          }}
        >
          Quay lại
        </Button>
      )}

      <div className="flex items-center gap-2">
        {wizard.step === 1 && (
          <>
            <Button appearance="outline" disabled={wizard.busy} onClick={onClose}>
              Hủy
            </Button>
            <Button disabled={wizard.busy || wizard.subjectsLoading || wizard.zoomMissing} onClick={wizard.goToStep2}>
              Tiếp tục
            </Button>
          </>
        )}
        {wizard.step === 2 && (
          <Button disabled={wizard.busy} onClick={() => void wizard.runPreview()}>
            {wizard.busy ? 'Đang kiểm tra…' : 'Xem trước'}
          </Button>
        )}
        {wizard.step === 3 && (
          <Button
            disabled={wizard.busy || wizard.includedCount === 0 || wizard.previewBlockingErrors.length > 0}
            onClick={() => void wizard.submitCreate()}
          >
            {wizard.busy ? 'Đang tạo…' : `Tạo ${wizard.includedCount} buổi`}
          </Button>
        )}
      </div>
    </div>
  )
  return (
    <ConsoleDialog
      open={open}
      onClose={onClose}
      dismissable={!wizard.busy}
      title="Xếp lịch dạy"
      maxWidth={880}
      height={760}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        <ol
          aria-label="Các bước"
          className="m-0 flex list-none flex-wrap gap-2 border-b border-card-border pb-4 pl-0"
        >
          {STEPS.map((item) => {
            const done = wizard.step > item.id
            const active = wizard.step === item.id
            return (
              <li
                key={item.id}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex flex-1 items-center gap-2.5 text-sm',
                  active ? 'font-semibold text-brand-500' : done ? 'text-brand-500' : 'text-text-tertiary'
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    active
                      ? 'bg-brand-500 text-white'
                      : done
                        ? 'bg-badge-blue-background text-brand-500'
                        : 'border border-card-border text-text-tertiary'
                  )}
                >
                  {done ? <Check size={14} aria-hidden="true" /> : item.id}
                </span>
                {item.label}
              </li>
            )
          })}
        </ol>

        {wizard.errorMessage && <Notice tone="danger">{wizard.errorMessage}</Notice>}

        {wizard.step === 1 && (
          <WizardStepTeacher
            title={wizard.title}
            onTitleChange={wizard.setTitle}
            courseId={wizard.courseId}
            onCourseChange={wizard.setCourseId}
            courses={courses}
            teacherId={wizard.teacherId}
            onTeacherChange={wizard.setTeacherId}
            teachers={teachers}
            teacherName={wizard.teacherName}
            subjectId={wizard.subjectId}
            onSubjectChange={wizard.setSubjectId}
            subjects={wizard.subjects}
            subjectsLoading={wizard.subjectsLoading}
            availability={wizard.availability}
            availabilityLoading={wizard.availabilityLoading}
            zoomAccount={wizard.zoomAccount}
            zoomMissing={wizard.zoomMissing}
            teachingLoadLabel={wizard.teachingLoadLabel}
          />
        )}

        {wizard.step === 2 && (
          <WizardStepSlots
            teacherName={wizard.teacherName}
            startDate={wizard.startDate}
            onStartDateChange={wizard.setStartDate}
            endDate={wizard.endDate}
            onEndDateChange={wizard.setEndDate}
            slots={wizard.slots}
            onSlotsChange={wizard.setSlots}
            recurringAvailability={wizard.availability?.recurringSlots ?? []}
            exceptions={wizard.availability?.exceptions ?? []}
          />
        )}

        {wizard.step === 3 && (
          <WizardStepPreview
            title={wizard.title.trim()}
            teacherName={wizard.teacherName}
            subjectName={wizard.subjectName}
            sessions={wizard.previewSessions}
            blockingErrors={wizard.previewBlockingErrors}
            warnings={wizard.previewWarnings}
            previewBusy={wizard.busy}
            onToggleIncluded={wizard.toggleIncluded}
            onUpdateSessionTime={wizard.updateSessionTime}
          />
        )}
      </div>
    </ConsoleDialog>
  )
}

import { Check } from '../icons'
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
        <button
          type="button"
          disabled={wizard.busy}
          onClick={() => {
            wizard.setErrorMessage('')
            wizard.setStep(wizard.step === 3 ? 2 : 1)
          }}
          className="min-h-11 rounded-xl border border-card-border bg-card-background px-5 text-[15px] font-semibold text-text-primary hover:bg-background-gray-secondary disabled:opacity-50"
        >
          Quay lại
        </button>
      )}

      <div className="flex items-center gap-3">
        {wizard.step === 1 && (
          <button
            type="button"
            disabled={wizard.busy}
            onClick={onClose}
            className="min-h-11 rounded-xl border border-card-border bg-card-background px-5 text-[15px] font-semibold text-text-primary hover:bg-background-gray-secondary"
          >
            Hủy
          </button>
        )}

        {wizard.step === 1 && (
          <button
            type="button"
            disabled={wizard.busy || wizard.subjectsLoading || wizard.zoomMissing}
            onClick={wizard.goToStep2}
            className="min-h-11 rounded-xl bg-[#0b3a82] px-6 text-[15px] font-semibold text-white hover:bg-[#082e68] disabled:opacity-50"
          >
            Tiếp tục
          </button>
        )}

        {wizard.step === 2 && (
          <button
            type="button"
            disabled={wizard.busy}
            onClick={() => void wizard.runPreview()}
            className="min-h-11 rounded-xl bg-[#0b3a82] px-6 text-[15px] font-semibold text-white hover:bg-[#082e68] disabled:opacity-50"
          >
            {wizard.busy ? 'Đang kiểm tra…' : 'Xem trước'}
          </button>
        )}

        {wizard.step === 3 && (
          <button
            type="button"
            disabled={
              wizard.busy ||
              wizard.includedCount === 0 ||
              wizard.previewBlockingErrors.length > 0
            }
            onClick={() => void wizard.submitCreate()}
            className="min-h-11 rounded-xl bg-[#0b3a82] px-6 text-[15px] font-semibold text-white hover:bg-[#082e68] disabled:opacity-50"
          >
            {wizard.busy ? 'Đang tạo…' : `Tạo ${wizard.includedCount} buổi`}
          </button>
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
                  active
                    ? 'font-semibold text-[#0b3a82]'
                    : done
                      ? 'text-[#0b3a82]'
                      : 'text-[#526984]'
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[13px]',
                    active
                      ? 'bg-[#0b3a82] text-white'
                      : done
                        ? 'bg-[#edf5ff] text-[#0b3a82]'
                        : 'border border-[#c3d3e6] text-[#526984]'
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
            capacity={wizard.capacity}
            onCapacityChange={wizard.setCapacity}
            recurringAvailability={wizard.availability?.recurringSlots ?? []}
            exceptions={wizard.availability?.exceptions ?? []}
          />
        )}

        {wizard.step === 3 && (
          <WizardStepPreview
            title={wizard.title.trim()}
            teacherName={wizard.teacherName}
            subjectName={wizard.subjectName}
            capacity={wizard.capacity}
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

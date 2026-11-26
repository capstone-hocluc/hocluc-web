import Notice from '../notice'
import SelectField from '../select-field'
import Field, { fieldControlClass } from '../form-field'
import type { Course } from '../../../services/courseService'
import type { TeachableSubject, TeacherZoomAccount } from '../../../services/liveClassService'
import type { UserSummary } from '../../../services/userService'
import type { TeacherAvailabilityResponse } from '../../../types/scheduling'
import TeacherAvailabilitySummaryCard from './teacher-availability-summary-card'
import { cn } from '../../../lib/cn'

interface Props {
  title: string
  onTitleChange: (next: string) => void
  courseId: string
  onCourseChange: (next: string) => void
  courses: Course[]
  teacherId: string
  onTeacherChange: (next: string) => void
  teachers: UserSummary[]
  teacherName: string
  subjectId: string
  onSubjectChange: (next: string) => void
  subjects: TeachableSubject[]
  subjectsLoading: boolean
  availability?: TeacherAvailabilityResponse | null
  availabilityLoading: boolean
  zoomAccount?: TeacherZoomAccount | null
  zoomMissing: boolean
  teachingLoadLabel: string
}

function formatTeacherLabel(t: UserSummary): string {
  return t.displayName || [t.firstName, t.lastName].filter(Boolean).join(' ') || t.email
}

export default function WizardStepTeacher({
  title,
  onTitleChange,
  courseId,
  onCourseChange,
  courses,
  teacherId,
  onTeacherChange,
  teachers,
  teacherName,
  subjectId,
  onSubjectChange,
  subjects,
  subjectsLoading,
  availability,
  availabilityLoading,
  zoomAccount,
  zoomMissing,
  teachingLoadLabel,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {zoomMissing && (
        <Notice tone="danger">
          Giảng viên chưa kết nối Zoom. Giảng viên cần vào trang Lịch dạy để kết nối tài khoản Zoom trước khi xếp lịch.
        </Notice>
      )}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_310px]">
      <div className="flex flex-col gap-4">
        <Field label="Tên lớp">
          <input
            type="text"
            value={title}
            maxLength={400}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Ví dụ: Toán tối thứ Hai, thứ Năm"
            className={fieldControlClass}
          />
        </Field>

        <Field label="Khóa học">
          <SelectField
            ariaLabel="Khóa học"
            value={courseId}
            onChange={onCourseChange}
            disabled={!courses.length}
            placeholder="Chọn khóa học"
            options={courses.map((c) => ({ id: c.id, label: c.title }))}
          />
        </Field>

        <Field label="Giảng viên">
          <SelectField
            ariaLabel="Giảng viên"
            value={teacherId}
            onChange={onTeacherChange}
            disabled={!teachers.length}
            placeholder="Chọn giảng viên"
            options={teachers.map((t) => ({ id: t.id, label: formatTeacherLabel(t) }))}
          />
        </Field>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-medium text-text-primary">Môn học</legend>
          {subjectsLoading ? (
            <p className="m-0 text-sm text-text-tertiary">Đang tải môn giảng viên dạy được…</p>
          ) : subjects.length === 0 ? (
            <p className="m-0 text-sm text-danger">
              {teacherName
                ? `${teacherName} chưa được phân công quyền dạy môn nào.`
                : 'Chọn giảng viên để xem môn dạy được.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => {
                const selected = subject.id === subjectId
                return (
                  <label
                    key={subject.id}
                    className={cn(
                      'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm transition-colors',
                      selected
                        ? 'border border-brand-500 bg-badge-blue-background font-medium text-brand-500'
                        : 'border border-card-border bg-card-background text-text-primary hover:bg-background-gray-secondary'
                    )}
                  >
                    <input
                      type="radio"
                      name="wizard-subject"
                      checked={selected}
                      onChange={() => onSubjectChange(subject.id)}
                      className="accent-brand-500"
                    />
                    {subject.name}
                  </label>
                )
              })}
            </div>
          )}
          {teacherName && subjects.length > 0 && (
            <p className="text-xs text-text-tertiary">Chỉ hiện môn {teacherName} dạy được</p>
          )}
        </fieldset>
      </div>

      <TeacherAvailabilitySummaryCard
        teacherName={teacherName}
        availability={availability}
        loading={availabilityLoading}
        zoomAccount={zoomAccount}
        teachingLoadLabel={teachingLoadLabel}
      />
      </div>
    </div>
  )
}

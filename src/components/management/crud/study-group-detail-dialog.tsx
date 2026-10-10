import { useState, type ReactNode } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Status from '../../console/status'
import SelectField from '../../console/select-field'
import Notice from '../../console/notice'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { useScheduleResource, type ScheduleResourceStatus } from '../../../hooks/useScheduleResource'
import { getCategories, type Category } from '../../../services/categoryService'
import { getUsers, type UserSummary } from '../../../services/userService'
import {
  addGroupMember,
  assignGroupMentor,
  getAdminStudyGroup,
  getMentorStrengths,
  removeGroupMember,
  removeGroupMentor,
  replaceMentorStrengths,
  type MentorStrength,
  type StudyGroupAdminDetail,
} from '../../../services/studyGroupAdminService'
import { EMPTY, formatDate } from './crud-format'
import { crudError } from './crud-errors'
import { LEVEL_LABELS, MEMBER_STATUS_LABELS, MEMBER_STATUS_TONES } from './study-group-labels'

interface Resource<T> {
  data: T | null
  status: ScheduleResourceStatus
  errorMessage: string
  reload: () => void
}

interface Props {
  courseId: string
  groupId: string
  readOnly: boolean
  onClose: () => void
  /** Notifies the list so the headcount and mentors it shows stay in sync. */
  onChanged: () => void
}

const nameOf = (user: { displayName?: string; firstName?: string; lastName?: string; email: string }) =>
  user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email

export default function StudyGroupDetailDialog({ courseId, groupId, readOnly, onClose, onChanged }: Props) {
  const [version, setVersion] = useState(0)
  const [mentorId, setMentorId] = useState('NONE')
  const [studentId, setStudentId] = useState('NONE')
  const [strengthMentorId, setStrengthMentorId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const detail = useScheduleResource(`study-group:${courseId}:${groupId}:${version}`, () =>
    getAdminStudyGroup(courseId, groupId)
  )
  const categories = useScheduleResource('study-group-categories', getCategories)
  const mentors = useScheduleResource(readOnly ? null : 'study-group-mentors', () =>
    getUsers({ role: 'MENTOR', status: 'ACTIVE', size: 100 })
  )
  const students = useScheduleResource(readOnly ? null : 'study-group-students', () =>
    getUsers({ role: 'STUDENT', status: 'ACTIVE', size: 100 })
  )
  // The strengths panel follows the first mentor until the operator picks another one.
  const activeStrengthMentor = strengthMentorId || detail.data?.mentors[0]?.id || ''
  const strengths = useScheduleResource(
    activeStrengthMentor ? `study-group-strengths:${courseId}:${activeStrengthMentor}` : null,
    () => getMentorStrengths(courseId, activeStrengthMentor)
  )

  async function run(action: () => Promise<unknown>, message: string) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(message)
      setVersion((current) => current + 1)
      onChanged()
    } catch (err) {
      setError(crudError(err))
    } finally {
      setBusy(false)
    }
  }

  const assignedMentorIds = new Set((detail.data?.mentors ?? []).map((mentor) => mentor.id))
  const activeMemberIds = new Set(
    (detail.data?.members ?? [])
      .filter((member) => member.status === 'ACTIVE')
      .map((member) => member.studentId)
  )
  const mentorOptions = (mentors.data?.content ?? []).filter(
    (mentor) => !assignedMentorIds.has(mentor.id)
  )
  const studentOptions = (students.data?.content ?? []).filter(
    (student) => !activeMemberIds.has(student.id)
  )

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title={detail.data?.name ?? 'Nhóm học'}
      description={detail.data ? `${detail.data.courseTitle} · ${detail.data.houseLabel}` : undefined}
      maxWidth={760}
      dismissable={!busy}
      footer={
        <Button appearance="outline" onClick={onClose} disabled={busy}>
          Đóng
        </Button>
      }
    >
      <div className="flex min-w-0 flex-col gap-5">
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
        {notice && (
          <Notice tone="info">
            <span role="status">{notice}</span>
          </Notice>
        )}
        <ScheduleResourceState
          status={detail.status}
          errorMessage={detail.errorMessage}
          onRetry={detail.reload}
        >
          {detail.data && (
            <GroupDetail
              detail={detail.data}
              readOnly={readOnly}
              busy={busy}
              mentorId={mentorId}
              mentorOptions={mentorOptions}
              mentorsReady={mentors.status === 'ready'}
              studentId={studentId}
              studentOptions={studentOptions}
              studentsReady={students.status === 'ready'}
              onMentorId={setMentorId}
              onStudentId={setStudentId}
              onAssignMentor={() =>
                void run(
                  () => assignGroupMentor(courseId, groupId, mentorId, false),
                  'Đã gán mentor.'
                ).then(() => setMentorId('NONE'))
              }
              onRemoveMentor={(id) =>
                void run(() => removeGroupMentor(courseId, groupId, id), 'Đã gỡ mentor.')
              }
              onMakePrimary={(id) =>
                void run(() => assignGroupMentor(courseId, groupId, id, true), 'Đã đặt mentor chính.')
              }
              onAddMember={() =>
                void run(
                  () => addGroupMember(courseId, groupId, studentId),
                  'Đã thêm học viên vào nhóm.'
                ).then(() => setStudentId('NONE'))
              }
              onRemoveMember={(id) =>
                void run(() => removeGroupMember(courseId, groupId, id), 'Đã gỡ học viên khỏi nhóm.')
              }
              strengthenMentorId={activeStrengthMentor}
              onStrengthenMentorId={setStrengthMentorId}
              strengths={strengths}
              categories={categories}
              onSaveStrengths={(mentor, categoryIds) =>
                void run(
                  () => replaceMentorStrengths(courseId, mentor, categoryIds),
                  'Đã lưu môn mạnh của mentor.'
                )
              }
            />
          )}
        </ScheduleResourceState>
      </div>
    </ConsoleDialog>
  )
}

interface GroupDetailProps {
  detail: StudyGroupAdminDetail
  readOnly: boolean
  busy: boolean
  mentorId: string
  mentorOptions: UserSummary[]
  mentorsReady: boolean
  studentId: string
  studentOptions: UserSummary[]
  studentsReady: boolean
  onMentorId: (value: string) => void
  onStudentId: (value: string) => void
  onAssignMentor: () => void
  onRemoveMentor: (mentorId: string) => void
  onMakePrimary: (mentorId: string) => void
  onAddMember: () => void
  onRemoveMember: (studentId: string) => void
  strengthenMentorId: string
  onStrengthenMentorId: (mentorId: string) => void
  strengths: Resource<MentorStrength>
  categories: Resource<Category[]>
  onSaveStrengths: (mentorId: string, categoryIds: string[]) => void
}

function GroupDetail({
  detail,
  readOnly,
  busy,
  mentorId,
  mentorOptions,
  mentorsReady,
  studentId,
  studentOptions,
  studentsReady,
  onMentorId,
  onStudentId,
  onAssignMentor,
  onRemoveMentor,
  onMakePrimary,
  onAddMember,
  onRemoveMember,
  strengthenMentorId,
  onStrengthenMentorId,
  strengths,
  categories,
  onSaveStrengths,
}: GroupDetailProps) {
  return (
    <>
      <dl className="grid gap-4 sm:grid-cols-3">
        <DetailField label="Nhà">{detail.houseLabel}</DetailField>
        <DetailField label="Trình độ">
          {detail.level ? LEVEL_LABELS[detail.level] : 'Mọi trình độ'}
        </DetailField>
        <DetailField label="Sĩ số">
          {detail.activeStudentCount}
          {detail.capacity === null ? ' · Không giới hạn' : ` / ${detail.capacity}`}
        </DetailField>
      </dl>

      <section className="border-t border-card-border pt-4">
        <h3 className="text-sm font-medium text-text-primary">Mentor</h3>
        {!readOnly && (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <SelectField
              ariaLabel="Mentor cần gán"
              value={mentorId}
              onChange={onMentorId}
              disabled={busy || !mentorsReady}
              options={[
                { id: 'NONE', label: 'Chọn mentor' },
                ...mentorOptions.map((mentor) => ({ id: mentor.id, label: nameOf(mentor) })),
              ]}
            />
            <Button disabled={busy || mentorId === 'NONE'} onClick={onAssignMentor}>
              Gán mentor
            </Button>
          </div>
        )}
        {!detail.mentors.length ? (
          <p className="mt-3 text-sm text-text-tertiary">Chưa gán mentor.</p>
        ) : (
          <ul className="mt-3 divide-y divide-card-border">
            {detail.mentors.map((mentor) => (
              <li key={mentor.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text-primary">{mentor.fullName}</span>
                  {mentor.primaryMentor && <Status tone="info">Mentor chính</Status>}
                  {mentor.strongSubjects.length > 0 && (
                    <span className="text-xs text-text-tertiary">
                      {mentor.strongSubjects.join(', ')}
                    </span>
                  )}
                </span>
                {!readOnly && (
                  <span className="flex gap-2">
                    {!mentor.primaryMentor && (
                      <Button
                        size="sm"
                        appearance="outline"
                        disabled={busy}
                        onClick={() => onMakePrimary(mentor.id)}
                      >
                        Đặt làm chính
                      </Button>
                    )}
                    <Button
                      size="sm"
                      appearance="ghost"
                      variant="danger"
                      disabled={busy}
                      onClick={() => onRemoveMentor(mentor.id)}
                    >
                      Gỡ
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-card-border pt-4">
        <h3 className="text-sm font-medium text-text-primary">
          Học viên ({detail.activeStudentCount})
        </h3>
        {!readOnly && (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <SelectField
              ariaLabel="Học viên cần thêm"
              value={studentId}
              onChange={onStudentId}
              disabled={busy || !studentsReady}
              options={[
                { id: 'NONE', label: 'Chọn học viên' },
                ...studentOptions.map((student) => ({ id: student.id, label: nameOf(student) })),
              ]}
            />
            <Button disabled={busy || studentId === 'NONE'} onClick={onAddMember}>
              Thêm học viên
            </Button>
          </div>
        )}
        {!detail.members.length ? (
          <p className="mt-3 text-sm text-text-tertiary">Nhóm chưa có học viên.</p>
        ) : (
          <ul className="mt-3 divide-y divide-card-border">
            {detail.members.map((member) => (
              <li
                key={member.groupStudentId}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-text-primary">
                    {member.studentName || member.studentEmail}
                  </span>
                  <span className="mt-1 block truncate text-xs text-text-tertiary">
                    {member.studentEmail}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Status tone={MEMBER_STATUS_TONES[member.status]}>
                    {MEMBER_STATUS_LABELS[member.status]}
                  </Status>
                  <span className="text-xs text-text-tertiary">
                    {member.joinedAt ? formatDate(member.joinedAt) : EMPTY}
                  </span>
                  {!readOnly && member.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      appearance="ghost"
                      variant="danger"
                      disabled={busy}
                      onClick={() => onRemoveMember(member.studentId)}
                    >
                      Gỡ
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!readOnly && detail.mentors.length > 0 && (
        <section className="border-t border-card-border pt-4">
          <h3 className="text-sm font-medium text-text-primary">Môn mạnh</h3>
          <p className="mt-1 text-xs text-text-tertiary">
            Dùng để gợi ý nhóm cho học viên yếu đúng môn.
          </p>
          <div className="mt-3">
            <SelectField
              ariaLabel="Mentor cần đặt môn mạnh"
              value={strengthenMentorId}
              onChange={onStrengthenMentorId}
              disabled={busy}
              options={detail.mentors.map((mentor) => ({ id: mentor.id, label: mentor.fullName }))}
            />
          </div>
          <ScheduleResourceState
            status={strengths.status}
            errorMessage={strengths.errorMessage}
            onRetry={strengths.reload}
          >
            {categories.status !== 'ready' || !categories.data || !strengths.data ? (
              <p className="mt-3 text-sm text-text-tertiary">Đang tải môn mạnh...</p>
            ) : (
              <StrengthEditor
                key={`${strengthenMentorId}:${strengths.data.categoryIds.join('|')}`}
                categories={categories.data.filter(
                  (category) => category.active || strengths.data!.categoryIds.includes(category.id)
                )}
                initial={strengths.data.categoryIds}
                busy={busy}
                onSave={(ids) => onSaveStrengths(strengthenMentorId, ids)}
              />
            )}
          </ScheduleResourceState>
        </section>
      )}
    </>
  )
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-text-primary">{children}</dd>
    </div>
  )
}

function StrengthEditor({
  categories,
  initial,
  busy,
  onSave,
}: {
  categories: Category[]
  initial: string[]
  busy: boolean
  onSave: (categoryIds: string[]) => void
}) {
  const [draft, setDraft] = useState<string[]>(initial)
  const dirty =
    draft.length !== initial.length || draft.some((categoryId) => !initial.includes(categoryId))
  return (
    <div className="mt-3">
      {categories.length === 0 ? (
        <p className="text-sm text-text-tertiary">Chưa có danh mục để chọn.</p>
      ) : (
        <div className="flex flex-wrap gap-5" data-testid="mentor-strengths">
          {categories.map((category) => (
            <Checkbox
              key={category.id}
              isSelected={draft.includes(category.id)}
              isDisabled={busy}
              onChange={(checked) =>
                setDraft((current) =>
                  checked
                    ? [...current, category.id]
                    : current.filter((item) => item !== category.id)
                )
              }
            >
              {category.name}
            </Checkbox>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button appearance="outline" disabled={!dirty || busy} onClick={() => setDraft(initial)}>
          Hủy thay đổi
        </Button>
        <Button disabled={!dirty || busy} onClick={() => onSave(draft)}>
          Lưu môn mạnh
        </Button>
      </div>
    </div>
  )
}

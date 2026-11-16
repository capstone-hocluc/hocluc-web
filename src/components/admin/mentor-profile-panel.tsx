import { useRef, useState } from 'react'
import Button from '../console/button'
import DateTime from '../console/detail/date-time'
import DetailSection from '../console/detail/detail-section'
import FormField, { fieldControlClass, textareaControlClass } from '../console/form-field'
import Notice from '../console/notice'
import SelectField from '../console/select-field'
import Status, { type StatusTone } from '../console/status'
import { Skeleton } from '../tailgrids/core/skeleton'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getErrorMessage } from '../../lib/errors'
import {
  COLLABORATION_LABELS,
  MENTOR_DOCUMENT_TYPES,
  deleteMentorDocument,
  getMentorProfile,
  updateMentorProfile,
  uploadMentorDocument,
  type MentorCollaborationStatus,
  type MentorProfileAdmin,
} from '../../services/mentorProfileService'
import FactGrid from './fact-grid'

const STATUS_TONES: Record<MentorCollaborationStatus, StatusTone> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  ENDED: 'neutral',
}
const STATUS_OPTIONS = (Object.keys(COLLABORATION_LABELS) as MentorCollaborationStatus[]).map((id) => ({
  id,
  label: COLLABORATION_LABELS[id],
}))

/** The back-office view of a mentor; administrators also edit it and keep the proof documents. */
export default function MentorProfilePanel({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const resource = useScheduleResource(`mentor-profile:${userId}`, () => getMentorProfile(userId))
  const [editing, setEditing] = useState(false)

  if (resource.status === 'loading') return <MentorProfileSkeleton />
  if (resource.status !== 'ready' || !resource.data) {
    return <Notice tone="danger">{resource.errorMessage || 'Không thể tải hồ sơ mentor.'}</Notice>
  }
  const profile = resource.data
  if (editing) {
    return (
      <MentorProfileForm
        profile={profile}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false)
          resource.reload()
        }}
      />
    )
  }

  const { stats } = profile
  const tiles = [
    { label: 'Đang phụ trách', value: stats.assigned },
    { label: 'Đang hỗ trợ', value: stats.inProgress },
    { label: 'Đã trả lời', value: stats.answered },
    { label: 'Đã hoàn tất', value: stats.resolved },
    { label: 'Nhận hôm nay', value: profile.dailyQuestionLimit ? `${stats.assignedToday}/${profile.dailyQuestionLimit}` : stats.assignedToday },
    { label: 'Từ lúc hỏi đến lần trả lời đầu', value: stats.averageFirstReplyMinutes === null ? '—' : `${stats.averageFirstReplyMinutes} phút` },
  ]

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-card-border px-3 py-2.5">
            <dt className="text-xs text-text-tertiary">{tile.label}</dt>
            <dd className="mt-1 text-lg font-semibold text-text-primary">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <DetailSection title="Nội bộ">
          <FactGrid
            facts={[
              {
                label: 'Trạng thái hợp tác',
                value: <Status tone={STATUS_TONES[profile.collaborationStatus]}>{COLLABORATION_LABELS[profile.collaborationStatus]}</Status>,
              },
              { label: 'Ngày bắt đầu', value: profile.startedOn && <DateTime value={profile.startedOn} absolute /> },
              { label: 'Ngày sinh', value: profile.dateOfBirth && <DateTime value={profile.dateOfBirth} absolute /> },
              { label: 'MSSV', value: profile.studentCode },
              { label: 'Câu hỏi tối đa mỗi ngày', value: profile.dailyQuestionLimit ?? 'Không giới hạn' },
              { label: 'Ghi chú nội bộ', value: profile.internalNote, wide: true },
            ]}
          />
        </DetailSection>

        <DetailSection title="Học sinh thấy">
          <FactGrid
            facts={[
              { label: 'Trường', value: profile.university },
              { label: 'Ngành', value: profile.major },
              {
                label: 'Năm học',
                value: profile.yearOfStudy && `Năm ${profile.yearOfStudy} (nhập học ${profile.enrollmentYear})`,
              },
              { label: 'Môn phụ trách', value: profile.subjects.join(', ') },
              { label: 'Thành tích', value: profile.achievements, wide: true },
              { label: 'Kinh nghiệm', value: profile.experience, wide: true },
            ]}
          />
        </DetailSection>
      </div>

      {canEdit && (
        <DetailSection title="Minh chứng">
          <MentorDocuments profile={profile} onChanged={resource.reload} />
        </DetailSection>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing(true)}>Sửa hồ sơ</Button>
        </div>
      )}
    </div>
  )
}

function MentorDocuments({ profile, onChanged }: { profile: MentorProfileAdmin; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState('')

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      setConfirming(null)
      onChanged()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {profile.documents.length > 0 ? (
        <ul className="divide-y divide-card-border rounded-lg border border-card-border">
          {profile.documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <a
                href={document.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 font-medium break-all text-text-primary underline-offset-2 hover:underline"
              >
                {document.name}
              </a>
              <span className="text-xs text-text-tertiary">{Math.max(1, Math.round(document.sizeBytes / 1024))} KB</span>
              {confirming === document.id ? (
                <>
                  <Button size="sm" appearance="outline" disabled={busy} onClick={() => setConfirming(null)}>
                    Hủy
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => void run(() => deleteMentorDocument(document.id))}>
                    Xóa tệp
                  </Button>
                </>
              ) : (
                <Button size="sm" appearance="ghost" disabled={busy} onClick={() => setConfirming(document.id)}>
                  Xóa
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-tertiary">Chưa có minh chứng.</p>
      )}
      {error && <p role="alert" className="text-sm text-badge-danger-text">{error}</p>}
      <div>
        <Button appearance="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Đang xử lý...' : 'Tải minh chứng'}
        </Button>
        <input
          ref={input}
          type="file"
          accept={MENTOR_DOCUMENT_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void run(() => uploadMentorDocument(profile.userId, file))
          }}
        />
      </div>
    </div>
  )
}

function MentorProfileForm({
  profile,
  onCancel,
  onSaved,
}: {
  profile: MentorProfileAdmin
  onCancel: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState({
    collaborationStatus: profile.collaborationStatus,
    startedOn: profile.startedOn ?? '',
    dateOfBirth: profile.dateOfBirth ?? '',
    studentCode: profile.studentCode ?? '',
    dailyQuestionLimit: profile.dailyQuestionLimit?.toString() ?? '',
    internalNote: profile.internalNote ?? '',
    university: profile.university ?? '',
    major: profile.major ?? '',
    enrollmentYear: profile.enrollmentYear?.toString() ?? '',
    achievements: profile.achievements ?? '',
    experience: profile.experience ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const thisYear = new Date().getFullYear()
  const today = new Date().toISOString().slice(0, 10)
  const set = (field: keyof typeof draft) => (value: string) => setDraft((current) => ({ ...current, [field]: value }))
  const number = (value: string) => (value.trim() ? Number(value) : null)

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await updateMentorProfile(profile.userId, {
        collaborationStatus: draft.collaborationStatus,
        startedOn: draft.startedOn || null,
        dateOfBirth: draft.dateOfBirth || null,
        studentCode: draft.studentCode,
        dailyQuestionLimit: number(draft.dailyQuestionLimit),
        internalNote: draft.internalNote,
        university: draft.university,
        major: draft.major,
        enrollmentYear: number(draft.enrollmentYear),
        achievements: draft.achievements,
        experience: draft.experience,
      })
      onSaved()
    } catch (reason) {
      setError(getErrorMessage(reason))
      setSaving(false)
    }
  }

  return (
    <fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
      <legend className="sr-only">Sửa hồ sơ mentor</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-2 text-sm font-medium text-text-primary">
          Trạng thái hợp tác
          <SelectField
            ariaLabel="Trạng thái hợp tác"
            options={STATUS_OPTIONS}
            value={draft.collaborationStatus}
            disabled={saving}
            onChange={(value) => set('collaborationStatus')(value)}
          />
        </div>
        <FormField label="Ngày bắt đầu">
          <input type="date" value={draft.startedOn} className={fieldControlClass} onChange={(event) => set('startedOn')(event.target.value)} />
        </FormField>
        <FormField label="Ngày sinh">
          <input type="date" value={draft.dateOfBirth} max={today} className={fieldControlClass} onChange={(event) => set('dateOfBirth')(event.target.value)} />
        </FormField>
        <FormField label="MSSV">
          <input value={draft.studentCode} maxLength={30} className={fieldControlClass} onChange={(event) => set('studentCode')(event.target.value)} />
        </FormField>
        <FormField label="Câu hỏi tối đa mỗi ngày">
          <input
            type="number"
            min={1}
            max={500}
            value={draft.dailyQuestionLimit}
            placeholder="Không giới hạn"
            className={fieldControlClass}
            onChange={(event) => set('dailyQuestionLimit')(event.target.value)}
          />
        </FormField>
      </div>
      <FormField label="Ghi chú nội bộ">
        <textarea value={draft.internalNote} maxLength={5000} className={textareaControlClass} onChange={(event) => set('internalNote')(event.target.value)} />
      </FormField>

      <DetailSection title="Học sinh thấy">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Trường">
            <input value={draft.university} maxLength={200} className={fieldControlClass} onChange={(event) => set('university')(event.target.value)} />
          </FormField>
          <FormField label="Ngành">
            <input value={draft.major} maxLength={200} className={fieldControlClass} onChange={(event) => set('major')(event.target.value)} />
          </FormField>
          <FormField label="Năm nhập học">
            <input
              type="number"
              min={1990}
              max={thisYear}
              value={draft.enrollmentYear}
              className={fieldControlClass}
              onChange={(event) => set('enrollmentYear')(event.target.value)}
            />
          </FormField>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="Thành tích">
            <textarea value={draft.achievements} maxLength={3000} className={textareaControlClass} onChange={(event) => set('achievements')(event.target.value)} />
          </FormField>
          <FormField label="Kinh nghiệm">
            <textarea value={draft.experience} maxLength={3000} className={textareaControlClass} onChange={(event) => set('experience')(event.target.value)} />
          </FormField>
        </div>
      </DetailSection>

      {error && <p role="alert" className="text-sm text-badge-danger-text">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button appearance="outline" disabled={saving} onClick={onCancel}>
          Hủy
        </Button>
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
        </Button>
      </div>
    </fieldset>
  )
}

function MentorProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="rounded-lg border border-card-border px-3 py-2.5">
            <Skeleton className="h-3 w-24 max-w-full" />
            <Skeleton className="mt-2 h-6 w-10" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, section) => (
          <div key={section} className="border-t border-card-border pt-4">
            <Skeleton className="h-4 w-28" />
            <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-1.5 h-4 w-36 max-w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

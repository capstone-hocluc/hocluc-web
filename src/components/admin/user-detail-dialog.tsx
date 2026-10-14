import { useState, type FormEvent } from 'react'
import Button from '../console/button'
import { grantedRoles as getGrantedRoles } from '../../lib/role-home'
import { LoaderCircle } from '../console/icons'
import type { UpdateUserRequest, UserProfile, UserRole } from '../../services/userService'
import { getAdminEnrollments } from '../../services/enrollmentAdminService'
import { can } from '../../lib/permissions'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import Status from '../console/status'
import ConsoleDialog from '../console/dialog'
import FormField, { fieldControlClass } from '../console/form-field'
import DateTime from '../console/detail/date-time'
import DetailHeader from '../console/detail/detail-header'
import DetailSection from '../console/detail/detail-section'
import KeyFacts from '../console/detail/key-facts'
import SystemInfo, { SystemRow } from '../console/detail/system-info'
import { getInitials } from '../console/profile-utils'
import { Avatar, AvatarFallback, AvatarImage } from '../tailgrids/core/avatar'
import { Checkbox } from '../tailgrids/core/checkbox'
import {
  ROLE_LABELS,
  STATUS_LABELS,
  SWITCHABLE_ROLES,
  getStatusTone,
  getUserName,
} from './user-labels'

interface UserDetailDialogProps {
  user: UserProfile | null
  loading: boolean
  canGrantRoles: boolean
  grantingRoles: boolean
  /** Administrators may edit the identity fields of any account. */
  canEditProfile: boolean
  savingProfile: boolean
  onClose: () => void
  onSaveRoles: (user: UserProfile, roles: UserRole[]) => Promise<void>
  onSaveProfile: (user: UserProfile, payload: UpdateUserRequest) => Promise<void>
}

const LISTED_COURSES = 3

function UserDetailDialog(props: UserDetailDialogProps) {
  // Editing state belongs to one account: a different user starts in view mode.
  return <UserDetail key={props.user?.id ?? 'none'} {...props} />
}

function UserDetail({
  user,
  loading,
  canGrantRoles,
  grantingRoles,
  canEditProfile,
  savingProfile,
  onClose,
  onSaveRoles,
  onSaveProfile,
}: UserDetailDialogProps) {
  const { profile: viewer } = useCurrentUser()
  const grantedRoles = user ? getGrantedRoles(user) : []
  const busy = grantingRoles || savingProfile
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [error, setError] = useState('')

  // "Khóa học đang học" is a read on the enrollment console, so it needs that permission.
  const showEnrollments = user?.role === 'STUDENT' && !!viewer && can(viewer.role, 'ENROLLMENT_READ')
  const enrollments = useScheduleResource(showEnrollments && user ? `user-enrollments:${user.id}` : null, () =>
    getAdminEnrollments({ studentId: user!.id, status: 'ACTIVE', size: 20 })
  )

  const startEditing = () => {
    if (!user) return
    setDraft({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      phone: user.phone ?? '',
    })
    setError('')
    setEditing(true)
  }

  const trimmed = {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
  }
  const dirty =
    !!user &&
    (trimmed.firstName !== (user.firstName ?? '').trim() ||
      trimmed.lastName !== (user.lastName ?? '').trim() ||
      trimmed.email.toLowerCase() !== user.email.toLowerCase() ||
      trimmed.phone !== (user.phone ?? '').trim())
  const complete = Boolean(trimmed.firstName && trimmed.lastName && trimmed.email)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !dirty || !complete || busy) return
    setError('')
    try {
      await onSaveProfile(user, trimmed)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu tài khoản.')
    }
  }

  const courseTitles = (enrollments.data?.content ?? []).map((item) => item.courseTitle)
  const learningCourses = courseTitles.length
    ? courseTitles.slice(0, LISTED_COURSES).join(', ') +
      (courseTitles.length > LISTED_COURSES ? ` +${courseTitles.length - LISTED_COURSES}` : '')
    : null

  const footer = editing ? (
    <>
      <Button appearance="outline" onClick={() => setEditing(false)} disabled={savingProfile}>
        Hủy
      </Button>
      <Button type="submit" disabled={!dirty || !complete || savingProfile}>
        {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
      </Button>
    </>
  ) : (
    <Button appearance="outline" onClick={onClose} disabled={busy}>
      Đóng
    </Button>
  )

  return (
    <ConsoleDialog
      open={Boolean(user)}
      onClose={onClose}
      title="Chi tiết tài khoản"
      maxWidth={600}
      dismissable={!busy}
      onSubmit={editing ? (event) => void save(event) : undefined}
      footer={footer}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-tertiary">
          <LoaderCircle size={18} className="animate-spin" />
          Đang tải...
        </div>
      ) : user ? (
        <div className="flex flex-col gap-5">
          <DetailHeader
            media={
              <Avatar size="lg">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                <AvatarFallback className="border border-border-secondary-alt bg-background-gray-secondary_alt">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
            }
            title={getUserName(user)}
            subtitle={user.email}
            chips={
              <>
                <Status tone="info">{ROLE_LABELS[user.role]}</Status>
                <Status tone={getStatusTone(user.status ?? 'PENDING')}>{STATUS_LABELS[user.status ?? 'PENDING']}</Status>
              </>
            }
            actions={
              canEditProfile && !editing ? (
                <Button appearance="outline" onClick={startEditing} disabled={busy}>
                  Sửa thông tin
                </Button>
              ) : undefined
            }
          />

          {editing ? (
            <fieldset className="flex flex-col gap-4" disabled={savingProfile}>
              <legend className="sr-only">Sửa thông tin tài khoản</legend>
              <p className="text-xs leading-5 text-text-tertiary">
                Đổi email sẽ đặt lại xác thực và kết thúc các phiên đăng nhập của tài khoản này. Vai trò và trạng thái có mục riêng.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Họ">
                  <input
                    value={draft.firstName}
                    maxLength={100}
                    required
                    className={fieldControlClass}
                    onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))}
                  />
                </FormField>
                <FormField label="Tên">
                  <input
                    value={draft.lastName}
                    maxLength={100}
                    required
                    className={fieldControlClass}
                    onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))}
                  />
                </FormField>
                <FormField label="Email">
                  <input
                    type="email"
                    value={draft.email}
                    maxLength={255}
                    required
                    className={fieldControlClass}
                    onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                  />
                </FormField>
              </div>
              <DetailSection title="Tùy chọn thêm">
                <FormField label="Số điện thoại" hint="Để trống nếu chưa có.">
                  <input
                    value={draft.phone}
                    maxLength={20}
                    className={fieldControlClass}
                    onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                  />
                </FormField>
              </DetailSection>
              {error && <p role="alert" className="text-sm text-badge-danger-text">{error}</p>}
            </fieldset>
          ) : (
            <KeyFacts
              facts={
                user.role === 'STUDENT'
                  ? [
                      { label: 'Số điện thoại', value: user.phone },
                      { label: 'Khóa học đang học', value: learningCourses },
                      { label: 'Đăng nhập gần nhất', value: user.lastLoginAt && <DateTime value={user.lastLoginAt} /> },
                    ]
                  : [
                      { label: 'Số điện thoại', value: user.phone },
                      { label: 'Vai trò được cấp', value: grantedRoles.map((role) => ROLE_LABELS[role]).join(', ') },
                      { label: 'Đăng nhập gần nhất', value: user.lastLoginAt && <DateTime value={user.lastLoginAt} /> },
                    ]
              }
            />
          )}

          {!editing && canGrantRoles && user.role !== 'STUDENT' && (
            <DetailSection title="Vai trò được cấp">
              <RoleEditor key={`${user.id}:${grantedRoles.join(',')}`} user={user} saving={grantingRoles} onSave={onSaveRoles} />
            </DetailSection>
          )}

          <SystemInfo id={user.id} createdAt={user.createdAt} updatedAt={user.updatedAt}>
            <SystemRow label="Xác thực email">{user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</SystemRow>
          </SystemInfo>
        </div>
      ) : null}
    </ConsoleDialog>
  )
}

function RoleEditor({ user, saving, onSave }: {
  user: UserProfile
  saving: boolean
  onSave: (user: UserProfile, roles: UserRole[]) => Promise<void>
}) {
  const original = getGrantedRoles(user)
  const [draft, setDraft] = useState(original)
  const [error, setError] = useState('')
  const dirty = draft.length !== original.length || draft.some((role) => !original.includes(role))
  const save = async () => {
    setError('')
    try { await onSave(user, draft) }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu vai trò.') }
  }
  return (
    <fieldset disabled={saving}>
      <legend className="sr-only">Vai trò được cấp</legend>
      <p className="text-xs leading-5 text-text-tertiary">Để gỡ vai trò đang dùng, người dùng cần chuyển sang vai trò khác trước. Thay đổi quyền sẽ kết thúc các phiên đăng nhập của tài khoản này.</p>
      <div className="mt-3 flex flex-wrap gap-5">
        {SWITCHABLE_ROLES.map((role) => (
          <Checkbox key={role} isSelected={draft.includes(role)} isDisabled={role === user.role || saving}
            onChange={(checked) => setDraft((current) => checked ? [...current, role] : current.filter((item) => item !== role))}>
            {ROLE_LABELS[role]}{role === user.role ? ' (đang dùng)' : ''}
          </Checkbox>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-badge-danger-text">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button appearance="outline" disabled={!dirty || saving} onClick={() => { setDraft(original); setError('') }}>Hủy thay đổi</Button>
        <Button disabled={!dirty || saving || draft.length === 0} onClick={() => void save()}>{saving ? 'Đang lưu...' : 'Lưu vai trò'}</Button>
      </div>
    </fieldset>
  )
}

export default UserDetailDialog

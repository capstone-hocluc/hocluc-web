import { useState, type ReactNode } from 'react'
import Button from '../console/button'
import { grantedRoles as getGrantedRoles } from '../../lib/role-home'
import { LoaderCircle } from '../console/icons'
import type { UpdateUserRequest, UserProfile, UserRole } from '../../services/userService'
import Status from '../console/status'
import ConsoleDialog from '../console/dialog'
import FormField, { fieldControlClass } from '../console/form-field'
import { Checkbox } from '../tailgrids/core/checkbox'
import {
  ROLE_LABELS,
  STATUS_LABELS,
  SWITCHABLE_ROLES,
  formatDate,
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words text-text-primary">{children}</dd>
    </div>
  )
}

function UserDetailDialog({
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
  const grantedRoles = user ? getGrantedRoles(user) : []
  const busy = grantingRoles || savingProfile

  return (
    <ConsoleDialog open={Boolean(user)} onClose={onClose} title="Chi tiết tài khoản" description={user?.email} maxWidth={600} dismissable={!busy}
      footer={<Button appearance="outline" onClick={onClose} disabled={busy}>Đóng</Button>}>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-tertiary">
          <LoaderCircle size={18} className="animate-spin" />
          Đang tải...
        </div>
      ) : user ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Status tone={getStatusTone(user.status ?? 'PENDING')}>{STATUS_LABELS[user.status ?? 'PENDING']}</Status>
            {grantedRoles.map((role) => <Status key={role} tone="info">{ROLE_LABELS[role]}</Status>)}
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên">{getUserName(user)}</Field>
            <Field label="Vai trò đang dùng">{ROLE_LABELS[user.role]}</Field>
            <Field label="Email">{user.email}</Field>
            <Field label="Số điện thoại">{user.phone || 'Chưa cập nhật'}</Field>
            <Field label="Xác thực email">{user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</Field>
            <Field label="Ngày tạo">{formatDate(user.createdAt)}</Field>
            <Field label="Đăng nhập gần nhất">{formatDate(user.lastLoginAt, 'Chưa đăng nhập')}</Field>
          </dl>
          {canEditProfile && (
            <AccountEditor
              key={user.id}
              user={user}
              saving={savingProfile}
              onSave={onSaveProfile}
            />
          )}
          {canGrantRoles && user.role !== 'STUDENT' ? (
            <RoleEditor key={`${user.id}:${grantedRoles.join(',')}`} user={user} saving={grantingRoles} onSave={onSaveRoles} />
          ) : user.role === 'STUDENT' ? (
            <p className="text-sm text-text-tertiary">Tài khoản học sinh chỉ có vai trò Học viên.</p>
          ) : null}
        </div>
      ) : null}
    </ConsoleDialog>
  )
}

function AccountEditor({
  user,
  saving,
  onSave,
}: {
  user: UserProfile
  saving: boolean
  onSave: (user: UserProfile, payload: UpdateUserRequest) => Promise<void>
}) {
  const initial = {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email,
    phone: user.phone ?? '',
  }
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const trimmed = {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
  }
  const dirty =
    trimmed.firstName !== initial.firstName.trim() ||
    trimmed.lastName !== initial.lastName.trim() ||
    trimmed.email.toLowerCase() !== initial.email.toLowerCase() ||
    trimmed.phone !== initial.phone.trim()
  const complete = Boolean(trimmed.firstName && trimmed.lastName && trimmed.email)
  const save = async () => {
    setError('')
    try {
      await onSave(user, trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu tài khoản.')
    }
  }
  return (
    <fieldset className="border-t border-card-border pt-4" disabled={saving}>
      <legend className="text-sm font-medium text-text-primary">Thông tin tài khoản</legend>
      <p className="mt-2 text-xs leading-5 text-text-tertiary">
        Đổi email sẽ đặt lại xác thực và kết thúc các phiên đăng nhập của tài khoản này. Vai trò và trạng thái có mục riêng.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <FormField label="Họ">
          <input
            value={draft.firstName}
            maxLength={100}
            className={fieldControlClass}
            onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))}
          />
        </FormField>
        <FormField label="Tên">
          <input
            value={draft.lastName}
            maxLength={100}
            className={fieldControlClass}
            onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))}
          />
        </FormField>
        <FormField label="Email">
          <input
            type="email"
            value={draft.email}
            maxLength={255}
            className={fieldControlClass}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
          />
        </FormField>
        <FormField label="Số điện thoại" hint="Để trống nếu chưa có.">
          <input
            value={draft.phone}
            maxLength={20}
            className={fieldControlClass}
            onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
          />
        </FormField>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-badge-danger-text">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button appearance="outline" disabled={!dirty || saving} onClick={() => { setDraft(initial); setError('') }}>
          Hủy thay đổi
        </Button>
        <Button disabled={!dirty || saving || !complete} onClick={() => void save()}>
          {saving ? 'Đang lưu...' : 'Lưu thông tin'}
        </Button>
      </div>
    </fieldset>
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
    <fieldset className="border-t border-card-border pt-4" disabled={saving}>
      <legend className="text-sm font-medium text-text-primary">Vai trò được cấp</legend>
      <p className="mt-2 text-xs leading-5 text-text-tertiary">Để gỡ vai trò đang dùng, người dùng cần chuyển sang vai trò khác trước. Thay đổi quyền sẽ kết thúc các phiên đăng nhập của tài khoản này.</p>
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

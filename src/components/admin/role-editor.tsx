import { useState } from 'react'
import type { UserProfile, UserRole } from '../../services/userService'
import Button from '../console/button'
import SelectField from '../console/select-field'
import { PERSONNEL_ROLES, ROLE_LABELS } from './user-labels'

export default function RoleEditor({ user, saving, onSave, onClose }: {
  user: UserProfile
  saving: boolean
  onSave: (user: UserProfile, role: UserRole) => Promise<void>
  onClose: () => void
}) {
  const [draft, setDraft] = useState<UserRole>(user.role)
  const [error, setError] = useState('')
  const dirty = draft !== user.role

  const save = async () => {
    setError('')
    try {
      await onSave(user, draft)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đổi vai trò.')
    }
  }

  return (
    <fieldset disabled={saving} className="flex w-full flex-col gap-2 text-left">
      <legend className="mb-1.5 text-xs text-text-tertiary">Vai trò</legend>
      <SelectField ariaLabel="Vai trò" options={PERSONNEL_ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role] }))}
        value={draft} disabled={saving} onChange={(value) => setDraft(value as UserRole)} />
      {dirty && <p className="text-xs leading-5 text-text-tertiary">Đổi vai trò sẽ kết thúc các phiên đăng nhập của tài khoản này.</p>}
      <div className="flex gap-2">
        <Button size="sm" appearance="outline" className="flex-1" disabled={saving} onClick={onClose}>Hủy</Button>
        <Button size="sm" className="flex-1" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? 'Đang lưu...' : 'Lưu vai trò'}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-badge-danger-text">{error}</p>}
    </fieldset>
  )
}

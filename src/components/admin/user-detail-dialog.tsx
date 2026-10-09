import type { ReactNode } from 'react'
import { LoaderCircle } from '../console/icons'
import type { UserProfile, UserRole } from '../../services/userService'
import Status from '../console/status'
import ConsoleDialog from '../console/dialog'
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
  onClose: () => void
  onToggleRole: (user: UserProfile, role: UserRole, granted: boolean) => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words text-text-primary">{children}</dd>
    </div>
  )
}

function UserDetailDialog({ user, loading, canGrantRoles, grantingRoles, onClose, onToggleRole }: UserDetailDialogProps) {
  const grantedRoles = user ? (user.roles ?? [user.role]) : []

  return (
    <ConsoleDialog open={Boolean(user)} onClose={onClose} title="Chi tiết tài khoản" description={user?.email} maxWidth={600}>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-tertiary">
          <LoaderCircle size={18} className="animate-spin" />
          Đang tải...
        </div>
      ) : user ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Status tone={getStatusTone(user.status ?? 'PENDING')}>{STATUS_LABELS[user.status ?? 'PENDING']}</Status>
            <Status tone="info">{ROLE_LABELS[user.role]}</Status>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên">{getUserName(user)}</Field>
            <Field label="Email">{user.email}</Field>
            <Field label="Số điện thoại">{user.phone || 'Chưa cập nhật'}</Field>
            <Field label="Xác thực email">{user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</Field>
            <Field label="Ngày tạo">{formatDate(user.createdAt)}</Field>
            <Field label="Đăng nhập gần nhất">{formatDate(user.lastLoginAt, 'Chưa đăng nhập')}</Field>
          </dl>
          {canGrantRoles && user.roles && SWITCHABLE_ROLES.includes(user.role) && (
            <fieldset className="border-t border-card-border pt-4" disabled={grantingRoles}>
              <legend className="text-sm font-medium text-text-primary">Vai trò được đổi</legend>
              <div className="mt-3 flex flex-wrap gap-5">
                {SWITCHABLE_ROLES.map((role) => (
                  <Checkbox
                    key={role}
                    isSelected={grantedRoles.includes(role)}
                    isDisabled={role === user.role || grantingRoles}
                    onChange={(checked) => onToggleRole(user, role, checked)}
                  >
                    {ROLE_LABELS[role]}
                  </Checkbox>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      ) : null}
    </ConsoleDialog>
  )
}

export default UserDetailDialog

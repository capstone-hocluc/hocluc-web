import { type FormEvent, useState } from 'react'
import { AlertCircle, LoaderCircle } from '../console/icons'
import { createUser, USER_ROLES, type CreateUserRequest, type UserRole } from '../../services/userService'
import Button from '../console/button'
import SelectField from '../console/select-field'
import ConsoleDialog from '../console/dialog'
import { Input } from '../tailgrids/core/input'
import { Label } from '../tailgrids/core/label'
import { TextField } from '../tailgrids/core/text-field'
import { ROLE_LABELS, getErrorMessage } from './user-labels'

type CreateUserForm = Required<Pick<CreateUserRequest, 'email' | 'password' | 'firstName' | 'lastName' | 'role'>> & {
  displayName: string
  phone: string
}

const EMPTY_FORM: CreateUserForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
  role: 'STUDENT',
}

const ROLE_OPTIONS = USER_ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role] }))

interface UserCreateDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function UserCreateDialog({ open, onClose, onCreated }: UserCreateDialogProps) {
  const [form, setForm] = useState<CreateUserForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof CreateUserForm>(key: K, value: CreateUserForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const close = () => {
    if (loading) return
    setForm(EMPTY_FORM)
    setError('')
    onClose()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createUser({
        ...form,
        displayName: form.displayName.trim() || undefined,
        phone: form.phone.trim() || undefined,
      })
      setForm(EMPTY_FORM)
      onCreated()
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConsoleDialog open={open} onClose={close} title="Tạo tài khoản" maxWidth={640} dismissable={!loading}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField className="gap-2" required autoComplete="family-name" value={form.lastName} onChange={(v) => set('lastName', v)}>
            <Label>Họ</Label>
            <Input className="w-full" />
          </TextField>
          <TextField className="gap-2" required autoComplete="given-name" value={form.firstName} onChange={(v) => set('firstName', v)}>
            <Label>Tên</Label>
            <Input className="w-full" />
          </TextField>
          <TextField className="gap-2" required type="email" autoComplete="username" value={form.email} onChange={(v) => set('email', v)}>
            <Label>Email</Label>
            <Input className="w-full" />
          </TextField>
          <TextField className="gap-2" required type="password" autoComplete="new-password" value={form.password} onChange={(v) => set('password', v)}>
            <Label>Mật khẩu</Label>
            <Input className="w-full" />
          </TextField>
          <TextField className="gap-2" autoComplete="nickname" value={form.displayName} onChange={(v) => set('displayName', v)}>
            <Label>Tên hiển thị</Label>
            <Input className="w-full" />
          </TextField>
          <TextField className="gap-2" type="tel" autoComplete="tel" value={form.phone} onChange={(v) => set('phone', v)}>
            <Label>Số điện thoại</Label>
            <Input className="w-full" />
          </TextField>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-input-label-text-color">Vai trò</span>
          <SelectField
            ariaLabel="Vai trò tài khoản mới"
            options={ROLE_OPTIONS}
            value={form.role}
            disabled={loading}
            className="w-full"
            triggerClassName="w-full"
            onChange={(value) => set('role', value as UserRole)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-badge-danger-bg px-3 py-2 text-sm text-badge-danger-text" role="alert">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-card-border pt-4">
          <Button type="button" appearance="outline" onClick={close} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <LoaderCircle size={15} className="animate-spin" />}
            Tạo
          </Button>
        </div>
      </form>
    </ConsoleDialog>
  )
}

export default UserCreateDialog

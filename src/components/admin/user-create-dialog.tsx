import { type FormEvent, useState } from 'react'
import { AlertCircle, LoaderCircle } from '../console/icons'
import { createUser, type CreateUserRequest, type UserRole } from '../../services/userService'
import Button from '../console/button'
import SelectField from '../console/select-field'
import ConsoleDialog from '../console/dialog'
import { Input } from '../tailgrids/core/input'
import { Label } from '../tailgrids/core/label'
import { TextField } from '../tailgrids/core/text-field'
import { Checkbox } from '../tailgrids/core/checkbox'
import { PERSONNEL_ROLES } from '../../lib/role-home'
import { ROLE_LABELS, getErrorMessage } from './user-labels'

type CreateUserForm = Required<Pick<CreateUserRequest, 'email' | 'password' | 'firstName' | 'lastName' | 'role'>> & {
  displayName: string
  phone: string
  roles: UserRole[]
}

const EMPTY_FORM: CreateUserForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
  role: 'STUDENT',
  roles: ['STUDENT'],
}

const ACCOUNT_TYPES = [{ id: 'STUDENT', label: 'Học sinh' }, { id: 'PERSONNEL', label: 'Nhân sự' }]

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
    if (loading) return
    if (!form.roles.length || !form.roles.includes(form.role)) {
      setError('Chọn ít nhất một vai trò và vai trò khởi đầu trong danh sách đã chọn.')
      return
    }
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
    <ConsoleDialog
      open={open}
      onClose={close}
      title="Tạo tài khoản"
      maxWidth={640}
      dismissable={!loading}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" appearance="outline" onClick={close} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <LoaderCircle size={15} className="animate-spin" />}
            Tạo
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
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
          <span className="text-sm font-medium text-input-label-text-color">Loại tài khoản</span>
          <SelectField ariaLabel="Loại tài khoản" options={ACCOUNT_TYPES}
            value={form.role === 'STUDENT' ? 'STUDENT' : 'PERSONNEL'} disabled={loading}
            onChange={(value) => setForm((current) => ({ ...current,
              role: value === 'STUDENT' ? 'STUDENT' : 'STAFF',
              roles: value === 'STUDENT' ? ['STUDENT'] : ['STAFF'] }))} />
        </div>
        {form.role === 'STUDENT' ? (
          <p className="text-sm text-text-tertiary">Học sinh chỉ có vai trò Học viên.</p>
        ) : (
          <fieldset disabled={loading} className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-medium text-text-primary">Vai trò được cấp</legend>
            <div className="flex flex-wrap gap-4">
              {PERSONNEL_ROLES.map((role) => (
                <Checkbox key={role} isSelected={form.roles.includes(role)} isDisabled={loading}
                  onChange={(checked) => setForm((current) => {
                    const roles = checked ? [...current.roles, role] : current.roles.filter((item) => item !== role)
                    return { ...current, roles, role: roles.includes(current.role) ? current.role : roles[0] ?? current.role }
                  })}>{ROLE_LABELS[role]}</Checkbox>
              ))}
            </div>
            <SelectField ariaLabel="Vai trò khởi đầu" options={form.roles.map((role) => ({ id: role, label: ROLE_LABELS[role] }))}
              value={form.roles.includes(form.role) ? form.role : ''} disabled={loading || !form.roles.length}
              placeholder="Chọn vai trò khởi đầu" onChange={(value) => set('role', value as UserRole)} />
          </fieldset>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-badge-danger-bg px-3 py-2 text-sm text-badge-danger-text" role="alert">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>
    </ConsoleDialog>
  )
}

export default UserCreateDialog

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
import { Skeleton } from '../tailgrids/core/skeleton'
import Notice from '../console/notice'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { PERSONNEL_ROLES } from '../../lib/role-home'
import { subjectRows } from '../../lib/subject-rows'
import { getCategories } from '../../services/categoryService'
import { ROLE_LABELS, getErrorMessage } from './user-labels'

type CreateUserForm = Required<Pick<CreateUserRequest, 'email' | 'password' | 'firstName' | 'lastName' | 'role'>> & {
  displayName: string
  phone: string
}

type AccountType = 'STUDENT' | 'PERSONNEL'

const emptyForm = (type: AccountType): CreateUserForm => ({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
  role: type === 'STUDENT' ? 'STUDENT' : 'STAFF',
})

interface UserCreateDialogProps {
  open: boolean
  /** The list the dialog is opened from: student and personnel accounts are managed apart. */
  accountType: AccountType
  onClose: () => void
  onCreated: () => void
}

function UserCreateDialog({ open, accountType, onClose, onCreated }: UserCreateDialogProps) {
  const [form, setForm] = useState<CreateUserForm>(() => emptyForm(accountType))
  const [mentorSubjects, setMentorSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const mentor = form.role === 'MENTOR'
  const subjects = useScheduleResource(open && mentor ? 'create-user:subjects' : null, async () => subjectRows(await getCategories()))

  const set = <K extends keyof CreateUserForm>(key: K, value: CreateUserForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const reset = () => {
    setForm(emptyForm(accountType))
    setMentorSubjects([])
  }

  const close = () => {
    if (loading) return
    reset()
    setError('')
    onClose()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    if (mentor && !mentorSubjects.length) {
      setError('Chọn ít nhất một môn cho Mentor.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createUser({
        ...form,
        displayName: form.displayName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        scopes: mentor ? mentorSubjects.map((categoryId) => ({ categoryId, capability: 'MENTOR' as const })) : undefined,
      })
      reset()
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

        {form.role === 'STUDENT' ? (
          <p className="text-sm text-text-tertiary">Học sinh chỉ có vai trò Học viên.</p>
        ) : (
          <SelectField ariaLabel="Vai trò" options={PERSONNEL_ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role] }))}
            value={form.role} disabled={loading} onChange={(value) => set('role', value as UserRole)} />
        )}

        {mentor && (
          <fieldset disabled={loading} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-text-primary">Chuyên môn</legend>
            {subjects.status === 'ready' && subjects.data ? (
              <div className="grid max-h-56 content-start gap-2 overflow-y-auto rounded-lg border border-card-border p-3">
                {subjects.data.map(({ category, child }) => (
                  <Checkbox key={category.id} className={child ? 'pl-6' : undefined}
                    isSelected={mentorSubjects.includes(category.id)} isDisabled={loading}
                    onChange={(checked) => setMentorSubjects((current) =>
                      checked ? [...current, category.id] : current.filter((id) => id !== category.id))}>
                    {category.name}
                  </Checkbox>
                ))}
              </div>
            ) : subjects.status === 'loading' ? (
              <div className="flex flex-col gap-2 rounded-lg border border-card-border p-3">
                {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-5 w-48" />)}
              </div>
            ) : (
              <Notice tone="danger">{subjects.errorMessage || 'Không thể tải môn học.'}</Notice>
            )}
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

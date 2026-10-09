import { useRef, useState, type FormEvent } from 'react'
import { LockKeyhole, UserRound } from './icons'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { ROLE_LABELS } from '../../lib/role-home'
import {
  changePassword,
  updateProfile,
  uploadAvatar,
  type UpdateProfileRequest,
} from '../../services/userService'
import { Avatar, AvatarFallback, AvatarImage } from '../tailgrids/core/avatar'
import { Card } from '../tailgrids/core/card'
import { Input } from '../tailgrids/core/input'
import { Label } from '../tailgrids/core/label'
import { TextArea } from '../tailgrids/core/text-area'
import { TextField } from '../tailgrids/core/text-field'
import { cn } from '../../lib/cn'
import Button from './button'
import { getDisplayName, getInitials } from './profile-utils'

type Tab = 'account' | 'security'

const TABS: { id: Tab; title: string; description: string; icon: typeof UserRound }[] = [
  { id: 'account', title: 'Tài khoản', description: 'Thông tin cá nhân', icon: UserRound },
  { id: 'security', title: 'Bảo mật', description: 'Mật khẩu đăng nhập', icon: LockKeyhole },
]

function Feedback({ message, error }: { message: string; error?: boolean }) {
  if (!message) return null
  return (
    <p role={error ? 'alert' : 'status'} className={cn('text-sm', error ? 'text-danger' : 'text-success')}>
      {message}
    </p>
  )
}

function AccountTab() {
  const { profile, loadCurrentUser } = useCurrentUser()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  if (!profile) return null

  const finish = (text: string, error = false) => {
    setMessage(text)
    setFailed(error)
    setBusy(false)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (key: string) => String(form.get(key) ?? '').trim()
    const payload: UpdateProfileRequest = {
      firstName: text('firstName'),
      lastName: text('lastName'),
      displayName: text('displayName') || undefined,
      phone: text('phone') || undefined,
      bio: text('bio') || undefined,
    }
    setBusy(true)
    try {
      await updateProfile(payload)
      await loadCurrentUser()
      finish('Đã lưu thay đổi.')
    } catch (err) {
      finish(err instanceof Error ? err.message : 'Không lưu được thay đổi.', true)
    }
  }

  const onPickAvatar = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      await uploadAvatar(file)
      await loadCurrentUser()
      finish('Đã cập nhật ảnh đại diện.')
    } catch (err) {
      finish(err instanceof Error ? err.message : 'Không tải được ảnh.', true)
    }
  }

  return (
    <Card className="bg-transparent p-5">
      <h2 className="mb-6 text-xl leading-7 font-semibold text-text-primary">Thông tin tài khoản</h2>
      <form className="space-y-6" onSubmit={onSubmit} key={profile.updatedAt ?? profile.id}>
        <div className="flex items-center gap-4">
          <Avatar size="xxl">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={getDisplayName(profile)} />}
            <AvatarFallback>{getInitials(profile)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2.5">
            <Button appearance="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
              Đổi ảnh
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="hidden"
              onChange={(event) => void onPickAvatar(event.target.files?.[0])}
            />
            <p className="text-xs text-text-tertiary">PNG, JPEG hoặc GIF.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField className="w-full gap-2.5">
            <Label>Họ</Label>
            <Input name="lastName" defaultValue={profile.lastName ?? ''} className="w-full" />
          </TextField>
          <TextField className="w-full gap-2.5">
            <Label>Tên</Label>
            <Input name="firstName" defaultValue={profile.firstName ?? ''} className="w-full" />
          </TextField>
          <TextField className="w-full gap-2.5">
            <Label>Tên hiển thị</Label>
            <Input name="displayName" defaultValue={profile.displayName ?? ''} className="w-full" />
          </TextField>
          <TextField className="w-full gap-2.5">
            <Label>Số điện thoại</Label>
            <Input name="phone" defaultValue={profile.phone ?? ''} className="w-full" />
          </TextField>
          <TextField className="w-full gap-2.5" readOnly>
            <Label>Email</Label>
            <Input value={profile.email} readOnly className="w-full" />
          </TextField>
          <TextField className="w-full gap-2.5" readOnly>
            <Label>Vai trò hiện tại</Label>
            <Input value={ROLE_LABELS[profile.role]} readOnly className="w-full" />
          </TextField>
          <TextField className="col-span-1 w-full gap-2.5 md:col-span-2">
            <Label>Giới thiệu</Label>
            <TextArea name="bio" rows={4} defaultValue={profile.bio ?? ''} className="w-full" />
          </TextField>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Feedback message={message} error={failed} />
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function SecurityTab() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const value = (key: string) => String(form.get(key) ?? '')
    if (value('newPassword') !== value('confirmPassword')) {
      setMessage('Mật khẩu xác nhận không khớp.')
      setFailed(true)
      return
    }
    setBusy(true)
    try {
      await changePassword({
        oldPassword: value('oldPassword'),
        newPassword: value('newPassword'),
        confirmPassword: value('confirmPassword'),
      })
      formElement.reset()
      setMessage('Đã đổi mật khẩu.')
      setFailed(false)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không đổi được mật khẩu.')
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="bg-transparent p-5">
      <h2 className="mb-6 text-xl leading-7 font-semibold text-text-primary">Đổi mật khẩu</h2>
      <form className="max-w-md space-y-5" onSubmit={onSubmit}>
        <TextField className="w-full gap-2.5">
          <Label>Mật khẩu hiện tại</Label>
          <Input name="oldPassword" type="password" autoComplete="current-password" className="w-full" required />
        </TextField>
        <TextField className="w-full gap-2.5">
          <Label>Mật khẩu mới</Label>
          <Input name="newPassword" type="password" autoComplete="new-password" className="w-full" required />
        </TextField>
        <TextField className="w-full gap-2.5">
          <Label>Nhập lại mật khẩu mới</Label>
          <Input name="confirmPassword" type="password" autoComplete="new-password" className="w-full" required />
        </TextField>
        <div className="flex items-center justify-between gap-3">
          <Feedback message={message} error={failed} />
          <Button type="submit" disabled={busy} className="ml-auto">
            {busy ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// NextAdmin profile layout: title + tab list on the left, form card on the right.
function ProfilePage() {
  const [tab, setTab] = useState<Tab>('account')

  return (
    <div className="space-y-5">
      <h1 className="text-[28px] leading-8 font-medium text-text-primary">Hồ sơ cá nhân</h1>
      <div className="flex max-w-full flex-col gap-y-6 rounded-xl border-[0.5px] border-card-border bg-card-background p-0 md:flex-row lg:min-h-150">
        <nav className="flex w-full shrink-0 flex-col gap-2 self-stretch border-card-border px-3 py-6 lg:max-w-84.5 lg:border-r">
          {TABS.map(({ id, title, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              data-active={tab === id}
              onClick={() => setTab(id)}
              className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-background-gray-secondary_alt/45 data-[active=true]:bg-background-gray-secondary_alt"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border-secondary-alt bg-background-gray-secondary_alt text-icon-secondary">
                <Icon size={20} />
              </span>
              <span className="flex flex-col items-start gap-1">
                <span className="text-sm font-semibold text-text-primary">{title}</span>
                <span className="text-xs text-text-tertiary">{description}</span>
              </span>
            </button>
          ))}
        </nav>
        <div className="w-full flex-1 p-6">{tab === 'account' ? <AccountTab /> : <SecurityTab />}</div>
      </div>
    </div>
  )
}

export default ProfilePage

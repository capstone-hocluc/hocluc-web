import { useState } from 'react'
import { AlertCircle, CheckCircle2, Circle, Eye, EyeOff, LockKeyhole } from '../../../components/console/icons'
import {
  AccountForm,
  AccountPanel,
  SaveBar,
} from '../../../components/student/profile/AccountPanel'
import { Field, Input } from '../../../components/ui/Field'
import { useSavedIndicator } from '../../../hooks/useSavedIndicator'
import { cn } from '../../../lib/cn'
import { getErrorMessage, getFieldErrors } from '../../../lib/errors'
import { getPasswordRequirements, validatePassword } from '../../../lib/passwordRules'
import { showErrorToast } from '../../../lib/toastBus'
import { changePassword } from '../../../services/userService'

const emptyForm = { oldPassword: '', newPassword: '', confirmPassword: '' }

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  autoComplete: string
  invalid: boolean
  /** Show / hide state; omit to render a plain (always masked-by-parent) field. */
  visible: boolean
  onToggleVisible?: () => void
}

// Password control with a leading lock icon and an optional show/hide button.
function PasswordInput({
  value,
  onChange,
  autoComplete,
  invalid,
  visible,
  onToggleVisible,
}: PasswordInputProps) {
  return (
    <span className="relative block">
      <LockKeyhole size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={cn('pl-9', onToggleVisible && 'pr-10', invalid && 'border-danger')}
      />
      {onToggleVisible && (
        <button
          type="button"
          className="absolute top-1/2 right-2.5 grid -translate-y-1/2 cursor-pointer place-items-center text-text-muted hover:text-primary"
          onClick={onToggleVisible}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </span>
  )
}

function SecurityTab() {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const { saved, flash, clear } = useSavedIndicator()
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const updateField = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    clear()
  }

  const requirements = getPasswordRequirements(form.newPassword)
  const mismatch = form.confirmPassword.length > 0 && form.confirmPassword !== form.newPassword

  const submit = async () => {
    if (saving) return
    const nextErrors: Record<string, string> = {}
    if (!form.oldPassword) nextErrors.oldPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    const passwordIssue = validatePassword(form.newPassword)
    if (passwordIssue) nextErrors.newPassword = passwordIssue
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.'
    else if (form.newPassword !== form.confirmPassword)
      nextErrors.confirmPassword = 'Hai mật khẩu chưa khớp.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    clear()
    try {
      await changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      })
      setForm(emptyForm)
      flash()
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      if (!Object.keys(fieldErrors).length) {
        showErrorToast(getErrorMessage(error) || 'Đổi mật khẩu không thành công.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccountPanel title="Đổi mật khẩu" subtitle="Bảo mật tài khoản của bạn">
      <div className="max-w-[520px]">
        <AccountForm>
          <Field full label="Mật khẩu hiện tại" error={errors.oldPassword}>
            <PasswordInput
              value={form.oldPassword}
              onChange={(value) => updateField('oldPassword', value)}
              autoComplete="current-password"
              invalid={Boolean(errors.oldPassword)}
              visible={showOld}
              onToggleVisible={() => setShowOld((value) => !value)}
            />
          </Field>
          <Field full label="Mật khẩu mới" error={errors.newPassword}>
            <PasswordInput
              value={form.newPassword}
              onChange={(value) => updateField('newPassword', value)}
              autoComplete="new-password"
              invalid={Boolean(errors.newPassword)}
              visible={showNew}
              onToggleVisible={() => setShowNew((value) => !value)}
            />
          </Field>
          <Field
            full
            label="Xác nhận mật khẩu mới"
            error={errors.confirmPassword}
            helper={
              mismatch ? (
                <span className="inline-flex items-center gap-1 font-semibold text-danger">
                  <AlertCircle size={13} />
                  Mật khẩu xác nhận chưa trùng khớp
                </span>
              ) : undefined
            }
          >
            <PasswordInput
              value={form.confirmPassword}
              onChange={(value) => updateField('confirmPassword', value)}
              autoComplete="new-password"
              invalid={Boolean(errors.confirmPassword)}
              visible={showNew}
            />
          </Field>

          <div className="col-span-full rounded-xl bg-surface-soft p-3.5">
            <strong className="text-[13px] text-text-heading">Mật khẩu cần đáp ứng</strong>
            <ul className="mt-2 grid gap-1.5">
              {requirements.map((rule) => (
                <li
                  key={rule.key}
                  className={cn(
                    'flex items-center gap-2 text-[13px]',
                    rule.met ? 'text-badge-success-text' : 'text-text-muted'
                  )}
                >
                  {rule.met ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>

          <SaveBar
            saving={saving}
            saved={saved}
            submitLabel="Đổi mật khẩu"
            savedLabel="Đã cập nhật mật khẩu"
            onSubmit={submit}
          />
        </AccountForm>
      </div>
    </AccountPanel>
  )
}

export default SecurityTab

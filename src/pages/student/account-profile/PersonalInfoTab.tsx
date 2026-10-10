import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, Loader2, Lock } from '../../../components/console/icons'
import {
  AccountForm,
  AccountPanel,
  SaveBar,
} from '../../../components/student/profile/AccountPanel'
import Avatar from '../../../components/ui/Avatar'
import { Field, Input, Textarea } from '../../../components/ui/Field'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useSavedIndicator } from '../../../hooks/useSavedIndicator'
import { getErrorMessage, getFieldErrors } from '../../../lib/errors'
import { showErrorToast } from '../../../lib/toastBus'
import { getUserDisplayName, getUserInitials } from '../../../lib/userDisplay'
import { updateProfile, uploadAvatar } from '../../../services/userService'
import type { UserProfile } from '../../../services/userService'

function buildDraft(profile: UserProfile | null) {
  return {
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    displayName: profile?.displayName || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
    timezone: profile?.timezone || '',
    language: profile?.language || '',
  }
}

type Draft = ReturnType<typeof buildDraft>

const textFields: { key: keyof Draft; label: string; placeholder?: string }[] = [
  { key: 'lastName', label: 'Họ' },
  { key: 'firstName', label: 'Tên' },
  { key: 'displayName', label: 'Tên hiển thị' },
  { key: 'phone', label: 'Số điện thoại' },
]

const localeFields: { key: keyof Draft; label: string; placeholder: string }[] = [
  { key: 'timezone', label: 'Múi giờ', placeholder: 'Asia/Ho_Chi_Minh' },
  { key: 'language', label: 'Ngôn ngữ', placeholder: 'vi' },
]

function PersonalInfoTab() {
  const { profile, loadCurrentUser } = useCurrentUser()
  const [draft, setDraft] = useState(() => buildDraft(profile))
  const [saving, setSaving] = useState(false)
  const { saved, flash, clear } = useSavedIndicator()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    },
    [avatarPreview]
  )

  const displayName = getUserDisplayName(profile) || 'Học sinh'

  const updateField = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    clear()
  }

  const resetDraft = () => {
    setDraft(buildDraft(profile))
    setErrors({})
    clear()
  }

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const nextPreview = URL.createObjectURL(file)
    setAvatarPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return nextPreview
    })

    setAvatarUploading(true)
    try {
      await uploadAvatar(file)
      await loadCurrentUser()
    } catch (error) {
      showErrorToast(getErrorMessage(error) || 'Tải ảnh đại diện không thành công.')
    } finally {
      setAvatarUploading(false)
      setAvatarPreview((current) => {
        if (current) URL.revokeObjectURL(current)
        return null
      })
    }
  }

  const submit = async () => {
    if (saving) return
    setSaving(true)
    clear()
    setErrors({})
    try {
      await updateProfile({
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        displayName: draft.displayName.trim(),
        phone: draft.phone.trim(),
        bio: draft.bio,
        timezone: draft.timezone,
        language: draft.language,
      })
      const updated = await loadCurrentUser()
      setDraft(buildDraft(updated))
      flash()
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      if (!Object.keys(fieldErrors).length) {
        showErrorToast(getErrorMessage(error) || 'Cập nhật thông tin không thành công.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccountPanel title="Hồ sơ">
      <div className="mb-[22px] flex items-center gap-4">
        <div className="relative">
          <Avatar
            src={avatarPreview || profile?.avatarUrl}
            alt={displayName}
            fallback={getUserInitials(profile)}
            className="size-[76px] border border-line-blue text-xl"
          />
          <button
            type="button"
            className="absolute -right-0.5 -bottom-0.5 grid size-7 cursor-pointer place-items-center rounded-full border-2 border-surface bg-primary text-surface disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            aria-label="Đổi ảnh đại diện"
          >
            {avatarUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Camera size={14} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <strong className="truncate text-base text-text-heading">{displayName}</strong>
          <span className="text-[13px] text-text-secondary">JPG hoặc PNG, tối đa 2 MB</span>
        </div>
      </div>

      <AccountForm>
        {textFields.map(({ key, label }) => (
          <Field key={key} label={label} error={errors[key]}>
            <Input value={draft[key]} onChange={(event) => updateField(key, event.target.value)} />
          </Field>
        ))}
        <Field full label="Email" helper="Email dùng để đăng nhập và không thể thay đổi.">
          <span className="relative block">
            <Input value={profile?.email || ''} readOnly disabled className="pr-24" />
            <span className="absolute top-1/2 right-2.5 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-badge-neutral-bg px-2 py-0.5 text-[11px] font-bold text-badge-neutral-text">
              <Lock size={11} />
              Cố định
            </span>
          </span>
        </Field>
        <Field full label="Giới thiệu">
          <Textarea
            value={draft.bio}
            onChange={(event) => updateField('bio', event.target.value)}
          />
        </Field>
        {localeFields.map(({ key, label, placeholder }) => (
          <Field key={key} label={label}>
            <Input
              value={draft[key]}
              placeholder={placeholder}
              onChange={(event) => updateField(key, event.target.value)}
            />
          </Field>
        ))}
        <SaveBar
          saving={saving}
          saved={saved}
          submitLabel="Lưu thay đổi"
          savedLabel="Đã lưu thay đổi"
          onSubmit={submit}
          onCancel={resetDraft}
        />
      </AccountForm>
    </AccountPanel>
  )
}

export default PersonalInfoTab

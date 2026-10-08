import { useState } from 'react'
import {
  Award,
  ChevronLeft,
  Mail,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { Field, Input, Textarea } from '../ui/Field'
import TeacherPageHeader from './TeacherPageHeader'
import { getInitials } from '../../lib/initials'

// MOCK: profile and credentials until the backend exposes the teacher profile.
const initialProfile = {
  name: 'Nguyễn Hoài Nam',
  email: 'nam.nguyen@hocluc.com',
  phone: '0901 234 567',
  subject: 'Giảng viên Toán',
  bio: 'Giảng viên phụ trách các lớp Tư duy định lượng và Luyện đề tổng hợp.',
}

const initialCredentials = [
  {
    id: 1,
    title: 'Thạc sĩ Toán học',
    organization: 'Trường Đại học Khoa học Tự nhiên',
    year: '2020',
  },
  {
    id: 2,
    title: 'Chứng chỉ nghiệp vụ sư phạm',
    organization: 'Đại học Sư phạm TP.HCM',
    year: '2021',
  },
]

function TeacherInformation({ onBack, onNotify }) {
  const [profile, setProfile] = useState(initialProfile)
  const [draft, setDraft] = useState(initialProfile)
  const [editingProfile, setEditingProfile] = useState(false)
  const [credentials, setCredentials] = useState(initialCredentials)
  const [credentialForm, setCredentialForm] = useState({ title: '', organization: '', year: '' })
  const [editingCredentialId, setEditingCredentialId] = useState(null)

  const saveProfile = () => {
    setProfile(draft)
    setEditingProfile(false)
    onNotify('Đã cập nhật thông tin cá nhân.')
  }
  const resetProfile = () => {
    setDraft(profile)
    setEditingProfile(false)
  }
  const submitCredential = (event) => {
    event.preventDefault()
    if (!credentialForm.title.trim() || !credentialForm.organization.trim()) return
    if (editingCredentialId) {
      setCredentials((items) =>
        items.map((item) =>
          item.id === editingCredentialId ? { ...credentialForm, id: item.id } : item
        )
      )
      onNotify('Đã cập nhật chuyên môn/chứng chỉ.')
    } else {
      setCredentials((items) => [...items, { ...credentialForm, id: Date.now() }])
      onNotify('Đã thêm chuyên môn/chứng chỉ.')
    }
    setCredentialForm({ title: '', organization: '', year: '' })
    setEditingCredentialId(null)
  }
  const editCredential = (item) => {
    setCredentialForm({ title: item.title, organization: item.organization, year: item.year })
    setEditingCredentialId(item.id)
  }
  const deleteCredential = (id) => {
    setCredentials((items) => items.filter((item) => item.id !== id))
    if (editingCredentialId === id) {
      setCredentialForm({ title: '', organization: '', year: '' })
      setEditingCredentialId(null)
    }
    onNotify('Đã xóa chuyên môn/chứng chỉ.')
  }

  return (
    <section className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit cursor-pointer items-center gap-1.5 text-[13px] font-bold text-primary"
      >
        <ChevronLeft size={17} />
        Quay lại tổng quan
      </button>
      <TeacherPageHeader title="Thông tin cá nhân" description="Hồ sơ và thông tin chuyên môn." />
      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Card as="section" padding="lg" radius="lg">
          <div className="mb-[22px] flex items-center gap-3.5 border-b border-border-subtle pb-[18px]">
            <Avatar
              aria-label={profile.name}
              fallback={getInitials(profile.name)}
              className="size-[58px] border-2 border-line-brand text-base"
            />
            <div>
              <h2 className="text-[17px] font-semibold text-text-strong">{profile.name}</h2>
              <p className="mt-1 text-xs text-text-muted">{profile.subject}</p>
            </div>
          </div>
          <div className="mb-4 flex items-center justify-between gap-2.5">
            <h2 className="text-base font-semibold text-text-heading">Thông tin liên hệ</h2>
            {!editingProfile && (
              <Button appearance="ghost" size="sm" onClick={() => setEditingProfile(true)}>
                <Pencil size={14} />
                Chỉnh sửa
              </Button>
            )}
          </div>
          {editingProfile ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Họ và tên">
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                />
              </Field>
              <Field label="Số điện thoại">
                <Input
                  value={draft.phone}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                />
              </Field>
              <Field label="Vai trò / chuyên môn">
                <Input
                  value={draft.subject}
                  onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                />
              </Field>
              <Field label="Giới thiệu" full>
                <Textarea
                  value={draft.bio}
                  onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
                />
              </Field>
              <div className="col-span-full flex flex-col-reverse justify-end gap-2 pt-1 sm:flex-row">
                <Button type="button" appearance="ghost" onClick={resetProfile}>
                  Hủy
                </Button>
                <Button type="button" onClick={saveProfile}>
                  <Save size={15} />
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {[
                { icon: UserRound, label: 'Họ và tên', value: profile.name },
                { icon: Mail, label: 'Email', value: profile.email },
                { icon: Phone, label: 'Số điện thoại', value: profile.phone },
                { icon: Award, label: 'Vai trò / chuyên môn', value: profile.subject },
              ].map(({ icon: Icon, label, value }) => (
                <span key={label} className="flex items-center gap-2.5 text-primary">
                  <Icon size={17} />
                  <div className="text-text-heading-soft">
                    <small className="mb-0.5 block text-xs text-text-subtle">{label}</small>
                    <strong className="block text-sm">{value}</strong>
                  </div>
                </span>
              ))}
              <p className="mt-1 rounded-[10px] bg-surface-soft p-3 text-[13px] leading-relaxed text-text-body">
                {profile.bio}
              </p>
            </div>
          )}
        </Card>
        <Card as="section" padding="lg" radius="lg">
          <h2 className="mb-4 text-base font-bold text-primary">Chuyên môn & chứng chỉ</h2>
          <div className="grid">
            {credentials.map((item) => (
              <article
                key={item.id}
                className="grid grid-cols-[37px_minmax(0,1fr)_28px_28px] items-center gap-2 border-b border-border-subtle py-[11px] max-sm:gap-1.5"
              >
                <span className="grid size-9 place-items-center rounded-[10px] bg-badge-info-bg text-primary">
                  <Award size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-text-strong">{item.title}</h3>
                  <p className="mt-0.5 text-xs leading-snug text-text-subtle">
                    {item.organization} · {item.year || 'Chưa cập nhật năm'}
                  </p>
                </div>
                <Button
                  type="button"
                  appearance="ghost"
                  size="icon"
                  className="size-7 rounded-[7px] bg-surface-hover"
                  aria-label={`Sửa ${item.title}`}
                  onClick={() => editCredential(item)}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  appearance="ghost"
                  size="icon"
                  className="size-7 rounded-[7px] bg-badge-danger-bg"
                  aria-label={`Xóa ${item.title}`}
                  onClick={() => deleteCredential(item.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </article>
            ))}
          </div>
          <form
            className="mt-[17px] grid gap-2.5 rounded-xl border border-border-primary bg-surface-soft p-3.5"
            onSubmit={submitCredential}
          >
            <strong className="text-sm text-text-heading-soft">
              {editingCredentialId ? 'Chỉnh sửa chuyên môn/chứng chỉ' : 'Thêm chuyên môn/chứng chỉ'}
            </strong>
            <Field label="Tên bằng cấp / chứng chỉ">
              <Input
                required
                value={credentialForm.title}
                onChange={(event) =>
                  setCredentialForm({ ...credentialForm, title: event.target.value })
                }
                placeholder="Ví dụ: Thạc sĩ Toán học"
              />
            </Field>
            <Field label="Đơn vị cấp">
              <Input
                required
                value={credentialForm.organization}
                onChange={(event) =>
                  setCredentialForm({ ...credentialForm, organization: event.target.value })
                }
                placeholder="Tên đơn vị"
              />
            </Field>
            <Field label="Năm cấp">
              <Input
                value={credentialForm.year}
                onChange={(event) =>
                  setCredentialForm({ ...credentialForm, year: event.target.value })
                }
                placeholder="2026"
              />
            </Field>
            <div className="flex items-center gap-1.5">
              <Button type="submit">
                <Plus size={15} />
                {editingCredentialId ? 'Cập nhật' : 'Thêm mới'}
              </Button>
              {editingCredentialId && (
                <Button
                  type="button"
                  appearance="ghost"
                  onClick={() => {
                    setCredentialForm({ title: '', organization: '', year: '' })
                    setEditingCredentialId(null)
                  }}
                >
                  <X size={15} />
                  Hủy
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </section>
  )
}

export default TeacherInformation

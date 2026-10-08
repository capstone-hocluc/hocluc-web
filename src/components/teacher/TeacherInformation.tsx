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
import { getInitials } from '../../lib/initials'

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
    <section className="hl-teacher-information-page">
      <button type="button" className="hl-teacher-text-back" onClick={onBack}>
        <ChevronLeft size={17} />
        Quay lại tổng quan
      </button>
      <div className="hl-teacher-title">
        <div>
          <h1>Thông tin cá nhân</h1>
          <p>Hồ sơ và thông tin chuyên môn.</p>
        </div>
      </div>
      <div className="hl-teacher-information-grid">
        <section className="hl-teacher-panel hl-teacher-info-profile">
          <div className="hl-teacher-info-identity">
            <Avatar
              aria-label={profile.name}
              fallback={getInitials(profile.name)}
              className="size-[58px] border-2 border-[var(--color-line-brand)] text-base"
            />
            <div>
              <h2>{profile.name}</h2>
              <p>{profile.subject}</p>
            </div>
          </div>
          <div className="hl-teacher-panel-heading">
            <div>
              <h2>Thông tin liên hệ</h2>
            </div>
            {!editingProfile && (
              <button type="button" onClick={() => setEditingProfile(true)}>
                <Pencil size={14} />
                Chỉnh sửa
              </button>
            )}
          </div>
          {editingProfile ? (
            <div className="hl-teacher-profile-form">
              <label>
                Họ và tên
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  value={draft.phone}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                />
              </label>
              <label>
                Vai trò / chuyên môn
                <input
                  value={draft.subject}
                  onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                />
              </label>
              <label className="is-full">
                Giới thiệu
                <textarea
                  value={draft.bio}
                  onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
                />
              </label>
              <div className="hl-teacher-form-actions">
                <button type="button" onClick={resetProfile}>
                  Hủy
                </button>
                <button type="button" className="hl-teacher-primary" onClick={saveProfile}>
                  <Save size={15} />
                  Lưu thay đổi
                </button>
              </div>
            </div>
          ) : (
            <div className="hl-teacher-contact-list">
              <span>
                <UserRound size={17} />
                <div>
                  <small>Họ và tên</small>
                  <strong>{profile.name}</strong>
                </div>
              </span>
              <span>
                <Mail size={17} />
                <div>
                  <small>Email</small>
                  <strong>{profile.email}</strong>
                </div>
              </span>
              <span>
                <Phone size={17} />
                <div>
                  <small>Số điện thoại</small>
                  <strong>{profile.phone}</strong>
                </div>
              </span>
              <span>
                <Award size={17} />
                <div>
                  <small>Vai trò / chuyên môn</small>
                  <strong>{profile.subject}</strong>
                </div>
              </span>
              <p>{profile.bio}</p>
            </div>
          )}
        </section>
        <section className="hl-teacher-panel hl-teacher-credentials">
          <div className="hl-teacher-panel-heading">
            <div>
              <h2 className="hl-teacher-blue-heading">Chuyên môn & chứng chỉ</h2>
            </div>
          </div>
          <div className="hl-teacher-credential-list">
            {credentials.map((item) => (
              <article key={item.id}>
                <span>
                  <Award size={18} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.organization} · {item.year || 'Chưa cập nhật năm'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Sửa ${item.title}`}
                  onClick={() => editCredential(item)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="is-delete"
                  aria-label={`Xóa ${item.title}`}
                  onClick={() => deleteCredential(item.id)}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
          </div>
          <form className="hl-teacher-credential-form" onSubmit={submitCredential}>
            <strong>
              {editingCredentialId ? 'Chỉnh sửa chuyên môn/chứng chỉ' : 'Thêm chuyên môn/chứng chỉ'}
            </strong>
            <label>
              Tên bằng cấp / chứng chỉ
              <input
                required
                value={credentialForm.title}
                onChange={(event) =>
                  setCredentialForm({ ...credentialForm, title: event.target.value })
                }
                placeholder="Ví dụ: Thạc sĩ Toán học"
              />
            </label>
            <label>
              Đơn vị cấp
              <input
                required
                value={credentialForm.organization}
                onChange={(event) =>
                  setCredentialForm({ ...credentialForm, organization: event.target.value })
                }
                placeholder="Tên đơn vị"
              />
            </label>
            <label>
              Năm cấp
              <input
                value={credentialForm.year}
                onChange={(event) =>
                  setCredentialForm({ ...credentialForm, year: event.target.value })
                }
                placeholder="2026"
              />
            </label>
            <div>
              <button type="submit" className="hl-teacher-primary">
                <Plus size={15} />
                {editingCredentialId ? 'Cập nhật' : 'Thêm mới'}
              </button>
              {editingCredentialId && (
                <button
                  type="button"
                  className="hl-teacher-form-cancel"
                  onClick={() => {
                    setCredentialForm({ title: '', organization: '', year: '' })
                    setEditingCredentialId(null)
                  }}
                >
                  <X size={15} />
                  Hủy
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </section>
  )
}

export default TeacherInformation

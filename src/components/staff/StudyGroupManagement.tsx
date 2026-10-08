import { useMemo, useState } from 'react'
import { AlertCircle, Plus, Users, X } from 'lucide-react'
import DropdownField from '../ui/DropdownField'

const mentors = [
  {
    id: 'mentor-1',
    name: 'Nguyễn Hoài Nam',
    subject: 'Tư duy định lượng',
    initials: 'NH',
    tone: 'blue',
  },
  {
    id: 'mentor-2',
    name: 'Trần Thu Hà',
    subject: 'Đọc hiểu & ngôn ngữ',
    initials: 'TH',
    tone: 'violet',
  },
  {
    id: 'mentor-3',
    name: 'Lê Minh Quân',
    subject: 'Khoa học tự nhiên',
    initials: 'MQ',
    tone: 'gold',
  },
]

interface StudyGroup {
  id: string
  name: string
  mentorId: string
  memberIds: string[]
}

function StudyGroupManagement({ batch, members, onNotify }) {
  const [groups, setGroups] = useState<StudyGroup[]>(() => [
    {
      id: 'group-foundation',
      name: 'Nhóm Nền tảng',
      mentorId: 'mentor-1',
      memberIds: members.slice(0, 2).map((student) => student.id),
    },
    {
      id: 'group-accelerate',
      name: 'Nhóm Tăng tốc',
      mentorId: 'mentor-2',
      memberIds: members.slice(2, 4).map((student) => student.id),
    },
  ])
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', mentorId: mentors[0].id, memberIds: [] })

  const assignedStudents = useMemo(
    () =>
      new Map<string, StudyGroup>(
        groups.flatMap((group) => group.memberIds.map((studentId) => [studentId, group]))
      ),
    [groups]
  )
  const assignedCount = assignedStudents.size
  const getStudent = (id) => members.find((student) => student.id === id)
  const getMentor = (id) => mentors.find((mentor) => mentor.id === id)

  const toggleStudent = (studentId) => {
    const owner = assignedStudents.get(studentId)
    if (owner) {
      setError(
        `${getStudent(studentId)?.name || 'Học viên này'} đã thuộc “${owner.name}”. Mỗi học viên chỉ có thể thuộc một nhóm/mentor trong batch.`
      )
      return
    }
    setError('')
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(studentId)
        ? current.memberIds.filter((id) => id !== studentId)
        : [...current.memberIds, studentId],
    }))
  }

  const closeModal = () => {
    setIsOpen(false)
    setError('')
    setForm({ name: '', mentorId: mentors[0].id, memberIds: [] })
  }
  const submit = (event) => {
    event.preventDefault()
    if (!form.memberIds.length) return setError('Hãy chọn ít nhất một học viên cho nhóm.')
    const conflictedId = form.memberIds.find((id) => assignedStudents.has(id))
    if (conflictedId)
      return setError(`${getStudent(conflictedId)?.name} đã được phân công cho một mentor khác.`)
    setGroups((current) => [...current, { id: `group-${Date.now()}`, ...form }])
    onNotify(`Đã tạo “${form.name}” và phân công mentor.`)
    closeModal()
  }

  return (
    <section className="hl-staff-panel hl-batch-panel hl-study-groups">
      <div className="hl-study-groups-head">
        <div>
          <h2>Quản lý nhóm học</h2>
          <p>
            {groups.length} nhóm · {assignedCount}/{members.length} học viên đã được phân công
            mentor
          </p>
        </div>
        <button type="button" className="hl-staff-primary" onClick={() => setIsOpen(true)}>
          <Plus size={16} />
          Tạo nhóm mới
        </button>
      </div>
      <div className="hl-study-groups-list">
        {groups.map((group) => {
          const mentor = getMentor(group.mentorId)
          const groupStudents = group.memberIds.map(getStudent).filter(Boolean)
          return (
            <article className="hl-study-group-card" key={group.id}>
              <div className="hl-study-group-card-head">
                <div>
                  <span className="hl-staff-eyebrow">{batch.name}</span>
                  <h3>{group.name}</h3>
                </div>
                <span className="hl-study-group-size">
                  <Users size={14} />
                  {groupStudents.length} học viên
                </span>
              </div>
              <div className="hl-study-group-mentor">
                <span className={`hl-study-group-avatar ${mentor.tone}`}>{mentor.initials}</span>
                <div>
                  <small>MENTOR PHỤ TRÁCH</small>
                  <strong>{mentor.name}</strong>
                  <p>{mentor.subject}</p>
                </div>
              </div>
              <div className="hl-study-group-members">
                <small>THÀNH VIÊN</small>
                <div>
                  {groupStudents.map((student) => (
                    <span key={student.id} title={student.name}>
                      {student.initials}
                    </span>
                  ))}
                </div>
                <p>{groupStudents.map((student) => student.name).join(' · ')}</p>
              </div>
            </article>
          )
        })}
      </div>
      {members.length > assignedCount && (
        <p className="hl-study-groups-unassigned">
          <AlertCircle size={16} />
          Còn {members.length - assignedCount} học viên chưa được gán mentor trong batch này.
        </p>
      )}
      {isOpen && (
        <div className="hl-staff-modal-backdrop">
          <form className="hl-staff-modal hl-study-group-modal" onSubmit={submit}>
            <button className="hl-staff-modal-close" type="button" onClick={closeModal}>
              <X size={19} />
            </button>
            <h2>Cấu hình nhóm học tập</h2>
            <p>
              Học viên chỉ được thuộc một nhóm để đảm bảo mỗi em có đúng một mentor trong batch.
            </p>
            <label>
              Tên nhóm
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ví dụ: Nhóm bứt phá tuần 3"
              />
            </label>
            <label>
              Batch
              <DropdownField
                ariaLabel="Batch"
                isDisabled
                options={[{ id: batch.id, label: batch.name }]}
                value={batch.id}
                onChange={() => {}}
              />
            </label>
            <label>
              Mentor phụ trách
              <DropdownField
                ariaLabel="Mentor phụ trách"
                options={mentors.map((mentor) => ({
                  id: mentor.id,
                  label: `${mentor.name} · ${mentor.subject}`,
                }))}
                value={form.mentorId}
                onChange={(value) => {
                  if (value !== null) setForm({ ...form, mentorId: value })
                }}
              />
            </label>
            <fieldset className="hl-study-group-select">
              <legend>Phân công học viên</legend>
              <p>Chọn học viên chưa thuộc một nhóm khác.</p>
              {members.map((student) => {
                const owner = assignedStudents.get(student.id)
                const checked = form.memberIds.includes(student.id)
                return (
                  <label className={owner ? 'is-assigned' : ''} key={student.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(student.id)}
                    />
                    <span className={`hl-study-group-avatar ${student.tone}`}>
                      {student.initials}
                    </span>
                    <span>
                      <b>{student.name}</b>
                      <small>
                        {owner
                          ? `Đã thuộc ${owner.name} · ${getMentor(owner.mentorId).name}`
                          : `${student.id} · Chưa có mentor`}
                      </small>
                    </span>
                  </label>
                )
              })}
            </fieldset>
            {error && (
              <p className="hl-study-group-error">
                <AlertCircle size={16} />
                {error}
              </p>
            )}
            <div className="hl-staff-modal-actions">
              <button type="button" onClick={closeModal}>
                Hủy
              </button>
              <button className="hl-staff-primary" type="submit">
                <Plus size={16} />
                Tạo nhóm
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

export default StudyGroupManagement

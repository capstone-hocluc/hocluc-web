import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useFilteredList } from '../../hooks/useFilteredList'
import PageHeading from '../ui/PageHeading'
import DropdownField from '../ui/DropdownField'

const teachers = ['ThS. Nguyễn Hoài Nam', 'ThS. Trần Thu Hà', 'ThS. Võ Minh Anh']
const mentors = ['Nguyễn Hoài Nam', 'Trần Thu Hà', 'Lê Minh Quân']
const rooms = ['Phòng Live 01', 'Phòng Live 02', 'Phòng A.201', 'Phòng A.305']
const initialSchedules = [
  {
    id: 'SCH-0901',
    date: '2026-09-09',
    start: '09:00',
    end: '10:30',
    batch: 'ĐGNL 12A · K24',
    group: 'Nhóm Nền tảng',
    course: 'Tư duy định lượng',
    teacher: 'ThS. Nguyễn Hoài Nam',
    mentor: 'Nguyễn Hoài Nam',
    room: 'Phòng Live 01',
  },
  {
    id: 'SCH-0902',
    date: '2026-09-09',
    start: '14:30',
    end: '16:00',
    batch: 'ĐGNL 11A · K25',
    group: 'Nhóm Tăng tốc',
    course: 'Chuyên đề Đọc hiểu',
    teacher: 'ThS. Trần Thu Hà',
    mentor: 'Trần Thu Hà',
    room: 'Phòng A.201',
  },
  {
    id: 'SCH-0903',
    date: '2026-09-09',
    start: '19:00',
    end: '20:30',
    batch: 'ĐGNL 12B · K24',
    group: 'Nhóm Nền tảng',
    course: 'Luyện đề tổng hợp',
    teacher: 'ThS. Võ Minh Anh',
    mentor: 'Lê Minh Quân',
    room: 'Phòng Live 02',
  },
  {
    id: 'SCH-0910',
    date: '2026-09-10',
    start: '09:00',
    end: '10:30',
    batch: 'ĐGNL 12A · K24',
    group: 'Nhóm Tăng tốc',
    course: 'Xác suất thống kê',
    teacher: 'ThS. Nguyễn Hoài Nam',
    mentor: 'Nguyễn Hoài Nam',
    room: 'Phòng A.305',
  },
]

const emptyForm = {
  date: '2026-09-10',
  start: '09:00',
  end: '10:30',
  batch: 'ĐGNL 12A · K24',
  group: 'Nhóm Nền tảng',
  course: 'Tư duy định lượng',
  teacher: teachers[0],
  mentor: mentors[0],
  room: rooms[0],
}

function ScheduleManagement({ batches }) {
  const [schedules, setSchedules] = useState(initialSchedules)
  const [editing, setEditing] = useState(undefined)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const {
    query,
    setQuery,
    filter,
    setFilter,
    list: filtered,
  } = useFilteredList(schedules, (item, q, f) => {
    const matchesFilter = f === 'Tất cả' || item.batch === f
    const matchesQuery = `${item.course} ${item.group} ${item.teacher} ${item.room}`
      .toLowerCase()
      .includes(q.toLowerCase())
    return matchesFilter && matchesQuery
  })
  const conflict = useMemo(
    () =>
      schedules.find(
        (item) =>
          item.id !== editing &&
          item.date === form.date &&
          form.start < item.end &&
          form.end > item.start &&
          (item.room === form.room || item.teacher === form.teacher)
      ),
    [schedules, form, editing]
  )
  const conflictText =
    conflict &&
    `${conflict.room === form.room ? `Phòng ${form.room}` : `Giáo viên ${form.teacher}`} đã có lịch ${conflict.start}–${conflict.end} (${conflict.course} · ${conflict.batch}).`
  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setMessage('')
  }
  const closeModal = () => {
    setEditing(undefined)
    setMessage('')
  }
  const openEdit = (item) => {
    setEditing(item.id)
    setForm(item)
    setMessage('')
  }
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (form.end <= form.start) return setMessage('Giờ kết thúc phải sau giờ bắt đầu.')
    if (conflict) return setMessage(conflictText)
    if (editing)
      setSchedules((current) =>
        current.map((item) => (item.id === editing ? { ...form, id: editing } : item))
      )
    else
      setSchedules((current) => [
        { ...form, id: `SCH-${Date.now().toString().slice(-5)}` },
        ...current,
      ])
    closeModal()
  }
  const modalOpen = editing !== undefined

  return (
    <>
      <PageHeading
        title="Lịch học"
        subtitle="Lịch học và phòng học."
        action={
          <>
            <Plus size={16} />
            Tạo lịch học
          </>
        }
        onAction={openCreate}
      />
          <section className="hl-staff-panel hl-schedule-panel">
            <div className="hl-schedule-filters">
              <label>
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm khóa học, nhóm, giáo viên..."
                />
              </label>
              <DropdownField
                ariaLabel="Batch lịch học"
                className="w-auto"
                options={[
                  { id: 'Tất cả', label: 'Tất cả' },
                  ...batches.map((batch) => ({ id: batch.name, label: batch.name })),
                ]}
                value={filter}
                onChange={(value) => {
                  if (value !== null) setFilter(value)
                }}
              />
              <span>{filtered.length} buổi học</span>
            </div>
            <div className="hl-schedule-list">
              {filtered.map((item) => (
                <article className="hl-schedule-row" key={item.id}>
                  <div className="hl-schedule-date">
                    <CalendarDays size={18} />
                    <span>
                      <b>{item.date.split('-').reverse().join('/')}</b>
                      <small>
                        {item.start}–{item.end}
                      </small>
                    </span>
                  </div>
                  <div>
                    <span className="hl-staff-eyebrow">
                      {item.batch} · {item.group}
                    </span>
                    <strong>{item.course}</strong>
                    <small>
                      <Clock3 size={13} />
                      {item.room}
                    </small>
                  </div>
                  <div className="hl-schedule-person">
                    <b>{item.teacher}</b>
                    <small>Giáo viên · Mentor: {item.mentor}</small>
                  </div>
                  <button className="hl-staff-outline" onClick={() => openEdit(item)}>
                    <Pencil size={14} />
                    Sửa
                  </button>
                </article>
              ))}
              {!filtered.length && <div className="hl-staff-empty">Không có lịch học phù hợp.</div>}
            </div>
          </section>
      {modalOpen && (
        <div className="hl-staff-modal-backdrop">
          <form className="hl-staff-modal hl-schedule-modal" onSubmit={submit}>
            <button type="button" className="hl-staff-modal-close" onClick={closeModal}>
              <X size={19} />
            </button>
            <h2>{editing ? 'Chỉnh sửa buổi học' : 'Thiết lập buổi học'}</h2>
            <p>Hệ thống sẽ kiểm tra xung đột phòng học và giáo viên theo khung giờ.</p>
            <div className="hl-schedule-form-grid">
              <label>
                Batch
                <DropdownField
                  ariaLabel="Batch"
                  options={batches.map((batch) => ({ id: batch.name, label: batch.name }))}
                  value={form.batch}
                  onChange={(value) => {
                    if (value !== null) update('batch', value)
                  }}
                />
              </label>
              <label>
                Nhóm học
                <DropdownField
                  ariaLabel="Nhóm học"
                  options={[
                    { id: 'Nhóm Nền tảng', label: 'Nhóm Nền tảng' },
                    { id: 'Nhóm Tăng tốc', label: 'Nhóm Tăng tốc' },
                    { id: 'Nhóm Bứt phá', label: 'Nhóm Bứt phá' },
                  ]}
                  value={form.group}
                  onChange={(value) => {
                    if (value !== null) update('group', value)
                  }}
                />
              </label>
              <label>
                Khóa học
                <input
                  required
                  value={form.course}
                  onChange={(event) => update('course', event.target.value)}
                />
              </label>
              <label>
                Giáo viên
                <DropdownField
                  ariaLabel="Giáo viên"
                  options={teachers.map((teacher) => ({ id: teacher, label: teacher }))}
                  value={form.teacher}
                  onChange={(value) => {
                    if (value !== null) update('teacher', value)
                  }}
                />
              </label>
              <label>
                Mentor
                <DropdownField
                  ariaLabel="Mentor"
                  options={mentors.map((mentor) => ({ id: mentor, label: mentor }))}
                  value={form.mentor}
                  onChange={(value) => {
                    if (value !== null) update('mentor', value)
                  }}
                />
              </label>
              <label>
                Phòng học
                <DropdownField
                  ariaLabel="Phòng học"
                  options={rooms.map((room) => ({ id: room, label: room }))}
                  value={form.room}
                  onChange={(value) => {
                    if (value !== null) update('room', value)
                  }}
                />
              </label>
              <label>
                Ngày học
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => update('date', event.target.value)}
                />
              </label>
              <label>
                Giờ bắt đầu
                <input
                  type="time"
                  value={form.start}
                  onChange={(event) => update('start', event.target.value)}
                />
              </label>
              <label>
                Giờ kết thúc
                <input
                  type="time"
                  value={form.end}
                  onChange={(event) => update('end', event.target.value)}
                />
              </label>
            </div>
            {(message || conflictText) && (
              <p className="hl-schedule-conflict">
                <AlertTriangle size={16} />
                {message || conflictText}
              </p>
            )}
            <div className="hl-staff-modal-actions">
              <button type="button" onClick={closeModal}>
                Hủy
              </button>
              <button className="hl-staff-primary" type="submit">
                <CheckCircle2 size={16} />
                {editing ? 'Lưu thay đổi' : 'Tạo lịch học'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export default ScheduleManagement

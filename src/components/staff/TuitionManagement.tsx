import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, CircleDollarSign, Pencil } from 'lucide-react'
import { useFilteredList } from '../../hooks/useFilteredList'
import { useModal } from '../../hooks/useModal'
import PageHeading from '../ui/PageHeading'
import SearchFilterBar from '../ui/SearchFilterBar'
import DataTable from '../ui/DataTable'
import Modal from '../ui/Modal'
import Status from '../ui/Status'
import StatCard from '../ui/StatCard'
import DropdownField from '../ui/DropdownField'

const initialTuition = [
  {
    id: 'FEE-24091',
    student: 'Nguyễn Minh Anh',
    initials: 'MA',
    tone: 'blue',
    batch: 'ĐGNL 12A · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    total: 2990000,
    paid: 2990000,
    due: '12/08/2026',
    status: 'Đã đóng',
    note: 'Đã thanh toán đủ qua chuyển khoản.',
  },
  {
    id: 'FEE-24126',
    student: 'Trần Hoàng Long',
    initials: 'HL',
    tone: 'gold',
    batch: 'ĐGNL 12B · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    total: 2990000,
    paid: 1500000,
    due: '18/09/2026',
    status: 'Đóng một phần',
    note: 'Đã đóng đợt 1.',
  },
  {
    id: 'FEE-23984',
    student: 'Lê Thị Mai',
    initials: 'TM',
    tone: 'violet',
    batch: 'ĐGNL 11A · K25',
    course: 'Nền tảng ĐGNL lớp 11',
    total: 2490000,
    paid: 0,
    due: '15/09/2026',
    status: 'Đang chờ',
    note: 'Chờ xác nhận học phí.',
  },
  {
    id: 'FEE-24152',
    student: 'Phạm Gia Huy',
    initials: 'GH',
    tone: 'green',
    batch: 'ĐGNL 12A · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    total: 2990000,
    paid: 0,
    due: '01/09/2026',
    status: 'Quá hạn',
    note: 'Đã gửi nhắc thanh toán lần 2.',
  },
  {
    id: 'FEE-24203',
    student: 'Võ Thanh Hà',
    initials: 'TH',
    tone: 'blue',
    batch: 'ĐGNL 12B · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    total: 2990000,
    paid: 2990000,
    due: '01/09/2026',
    status: 'Đã đóng',
    note: '',
  },
]
const statuses = ['Đã đóng', 'Đang chờ', 'Quá hạn', 'Đóng một phần']
const statusTone = {
  'Đã đóng': 'success',
  'Đang chờ': 'warning',
  'Quá hạn': 'danger',
  'Đóng một phần': 'info',
}
const money = (value) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

const tuitionSchema = z.object({
  total: z.coerce.number().min(0, 'Không được âm'),
  paid: z.coerce.number().min(0, 'Không được âm'),
  due: z.string().min(1, 'Bắt buộc'),
  status: z.string(),
  note: z.string().optional(),
})

const columns = [
  {
    id: 'student',
    header: 'Học viên',
    cell: ({ row }) => (
      <span className="hl-tuition-student">
        <i className={`hl-study-group-avatar ${row.original.tone}`}>{row.original.initials}</i>
        <b>
          {row.original.student}
          <small>{row.original.id}</small>
        </b>
      </span>
    ),
  },
  {
    id: 'course',
    header: 'Khóa học / batch',
    cell: ({ row }) => (
      <span>
        <b>{row.original.course}</b>
        <small>{row.original.batch}</small>
      </span>
    ),
  },
  {
    id: 'progress',
    header: 'Đã đóng / phải đóng',
    cell: ({ row }) => (
      <span>
        <b>
          {money(row.original.paid)} <small>/ {money(row.original.total)}</small>
        </b>
        <i>
          <em
            style={{
              width: `${Math.min(100, Math.round((row.original.paid / row.original.total) * 100))}%`,
            }}
          />
        </i>
      </span>
    ),
  },
  {
    id: 'due',
    header: 'Hạn nộp',
    cell: ({ row }) => row.original.due.split('-').reverse().join('/'),
  },
  {
    id: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => (
      <Status tone={statusTone[row.original.status]}>{row.original.status}</Status>
    ),
  },
  {
    id: 'edit',
    header: '',
    cell: ({ row, table }) => (
      <button
        type="button"
        className="hl-staff-outline"
        onClick={(event) => {
          event.stopPropagation()
          table.options.meta.onEdit(row.original)
        }}
      >
        <Pencil size={14} />
        Sửa
      </button>
    ),
  },
]

function TuitionManagement() {
  const [records, setRecords] = useState(initialTuition)
  const [notice, setNotice] = useState('')
  const modal = useModal()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(tuitionSchema) })
  const { query, setQuery, filter, setFilter, list } = useFilteredList(records, (item, q, f) => {
    const matchesFilter = f === 'Tất cả' || item.status === f
    const matchesQuery = `${item.student} ${item.batch} ${item.id}`
      .toLowerCase()
      .includes(q.toLowerCase())
    return matchesFilter && matchesQuery
  })
  const totals = statuses.reduce(
    (result, status) => ({
      ...result,
      [status]: records.filter((item) => item.status === status).length,
    }),
    {}
  )

  const openEdit = (record) => {
    reset(record)
    modal.open(record)
  }
  const save = (values) => {
    const status =
      values.paid >= values.total ? 'Đã đóng' : values.paid > 0 ? 'Đóng một phần' : values.status
    setRecords((current) =>
      current.map((item) => (item.id === modal.data.id ? { ...item, ...values, status } : item))
    )
    modal.close()
    setNotice('Đã cập nhật bản ghi học phí.')
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <>
      <PageHeading title="Học phí" subtitle="Công nợ và hạn nộp." />
      {notice && (
        <div className="hl-staff-toast">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}
      <section className="hl-staff-panel hl-tuition-panel">
        <div className="hl-tuition-summary">
          {statuses.map((status) => (
            <StatCard key={status} value={totals[status]} label={status} />
          ))}
        </div>
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Tìm tên, batch hoặc mã học phí..."
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={['Tất cả', ...statuses]}
          resultCount={list.length}
          resultLabel="bản ghi"
        />
        <DataTable
          columns={columns}
          data={list}
          getRowKey={(row) => row.id}
          meta={{ onEdit: openEdit }}
          emptyMessage="Không tìm thấy bản ghi học phí phù hợp."
        />
      </section>

      <Modal
        open={modal.isOpen}
        onClose={modal.close}
        maxWidth={480}
        className="hl-tuition-modal"
        title="Điều chỉnh bản ghi học phí"
        description={modal.data && `${modal.data.student} · ${modal.data.batch}`}
      >
        {modal.data && (
          <form onSubmit={handleSubmit(save)}>
            <div className="hl-tuition-form-grid">
              <label>
                Tổng học phí
                <input type="number" min="0" {...register('total')} />
                {errors.total && <small className="hl-form-error">{errors.total.message}</small>}
              </label>
              <label>
                Đã đóng
                <input type="number" min="0" {...register('paid')} />
                {errors.paid && <small className="hl-form-error">{errors.paid.message}</small>}
              </label>
              <label>
                Hạn nộp
                <input type="date" {...register('due')} />
              </label>
              <label>
                Trạng thái
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <DropdownField
                      ariaLabel="Trạng thái học phí"
                      options={statuses.map((status) => ({ id: status, label: status }))}
                      value={field.value}
                      onChange={(value) => field.onChange(value ?? '')}
                    />
                  )}
                />
              </label>
            </div>
            <label className="hl-tuition-note">
              Ghi chú
              <textarea {...register('note')} placeholder="Nhập ghi chú nội bộ..." />
            </label>
            <div className="hl-staff-modal-actions">
              <button type="button" onClick={modal.close}>
                Hủy
              </button>
              <button className="hl-staff-primary" type="submit">
                <CircleDollarSign size={16} />
                Lưu thay đổi
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

export default TuitionManagement

import { CalendarDays, Clock3, FileText } from 'lucide-react'
import { useFilteredList } from '../../hooks/useFilteredList'
import { useModal } from '../../hooks/useModal'
import PageHeading from '../ui/PageHeading'
import SearchFilterBar from '../ui/SearchFilterBar'
import DataTable from '../ui/DataTable'
import Modal from '../ui/Modal'
import Status from '../ui/Status'

const invoices = [
  {
    id: 'INV-26091',
    student: 'Nguyễn Minh Anh',
    batch: 'ĐGNL 12A · K24',
    issued: '12/06/2026',
    status: 'Đã thanh toán',
    total: 2990000,
    items: [
      { name: 'Học phí Luyện thi ĐGNL toàn diện', amount: 2900000 },
      { name: 'Tài liệu học tập', amount: 90000 },
    ],
    history: [
      { time: '12/06/2026 · 09:12', text: 'Hóa đơn được phát hành', type: 'created' },
      { time: '12/06/2026 · 09:26', text: 'Thanh toán chuyển khoản thành công', type: 'paid' },
    ],
  },
  {
    id: 'INV-26126',
    student: 'Trần Hoàng Long',
    batch: 'ĐGNL 12B · K24',
    issued: '18/06/2026',
    status: 'Thanh toán một phần',
    total: 2990000,
    items: [
      { name: 'Học phí Luyện thi ĐGNL toàn diện · Đợt 2', amount: 1490000 },
      { name: 'Phí kiểm tra đầu vào', amount: 50000 },
    ],
    history: [
      { time: '18/06/2026 · 14:30', text: 'Hóa đơn được phát hành', type: 'created' },
      { time: '20/06/2026 · 08:40', text: 'Đã nhận 1.500.000đ', type: 'partial' },
      { time: '09/09/2026 · 10:00', text: 'Đã gửi nhắc thanh toán', type: 'notice' },
    ],
  },
  {
    id: 'INV-25984',
    student: 'Lê Thị Mai',
    batch: 'ĐGNL 11A · K25',
    issued: '03/05/2026',
    status: 'Chờ thanh toán',
    total: 2490000,
    items: [
      { name: 'Học phí Nền tảng ĐGNL lớp 11', amount: 2400000 },
      { name: 'Tài liệu học tập', amount: 90000 },
    ],
    history: [
      { time: '03/05/2026 · 11:05', text: 'Hóa đơn được phát hành', type: 'created' },
      { time: '05/05/2026 · 08:00', text: 'Email hóa đơn đã được gửi', type: 'notice' },
    ],
  },
  {
    id: 'INV-26152',
    student: 'Phạm Gia Huy',
    batch: 'ĐGNL 12A · K24',
    issued: '24/06/2026',
    status: 'Quá hạn',
    total: 2990000,
    items: [{ name: 'Học phí Luyện thi ĐGNL toàn diện', amount: 2990000 }],
    history: [
      { time: '24/06/2026 · 16:10', text: 'Hóa đơn được phát hành', type: 'created' },
      {
        time: '01/09/2026 · 00:01',
        text: 'Hóa đơn chuyển sang trạng thái quá hạn',
        type: 'overdue',
      },
      { time: '08/09/2026 · 09:00', text: 'Đã gửi nhắc thanh toán lần 2', type: 'notice' },
    ],
  },
]
const statuses = ['Đã thanh toán', 'Thanh toán một phần', 'Chờ thanh toán', 'Quá hạn']
const statusTone = {
  'Đã thanh toán': 'success',
  'Thanh toán một phần': 'info',
  'Chờ thanh toán': 'warning',
  'Quá hạn': 'danger',
}
const formatMoney = (amount) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`

const columns = [
  {
    id: 'id',
    header: 'Mã hóa đơn',
    cell: ({ row }) => (
      <span className="hl-invoice-id">
        <FileText size={17} />
        <b>{row.original.id}</b>
      </span>
    ),
  },
  {
    id: 'student',
    header: 'Học viên / batch',
    cell: ({ row }) => (
      <span>
        <b>{row.original.student}</b>
        <small>{row.original.batch}</small>
      </span>
    ),
  },
  { id: 'issued', header: 'Ngày phát hành', cell: ({ row }) => row.original.issued },
  {
    id: 'total',
    header: 'Tổng tiền',
    cell: ({ row }) => <strong>{formatMoney(row.original.total)}</strong>,
  },
  {
    id: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => (
      <Status tone={statusTone[row.original.status]}>{row.original.status}</Status>
    ),
  },
  { id: 'view', header: '', cell: () => <span className="hl-invoice-view">Xem chi tiết</span> },
]

function InvoiceManagement() {
  const modal = useModal()
  const { query, setQuery, filter, setFilter, list } = useFilteredList(invoices, (item, q, f) => {
    const matchesFilter = f === 'Tất cả' || item.status === f
    const matchesQuery = `${item.id} ${item.student} ${item.batch}`
      .toLowerCase()
      .includes(q.toLowerCase())
    return matchesFilter && matchesQuery
  })

  return (
    <>
      <PageHeading title="Hóa đơn" subtitle="Hóa đơn và lịch sử thanh toán." />
      <section className="hl-staff-panel hl-invoice-panel">
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Tìm mã hóa đơn, học viên..."
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={['Tất cả', ...statuses]}
          resultCount={list.length}
          resultLabel="hóa đơn"
        />
        <DataTable
          columns={columns}
          data={list}
          getRowKey={(row) => row.id}
          onRowClick={modal.open}
          emptyMessage="Không tìm thấy hóa đơn phù hợp."
        />
      </section>

      <Modal
        open={modal.isOpen}
        onClose={modal.close}
        title={modal.data?.id}
        maxWidth={570}
        className="hl-invoice-modal"
      >
        {modal.data && (
          <>
            <div className="hl-invoice-modal-heading">
              <div>
                <span className="hl-staff-eyebrow">CHI TIẾT HÓA ĐƠN</span>
                <p>
                  {modal.data.student} · {modal.data.batch}
                </p>
              </div>
              <Status tone={statusTone[modal.data.status]}>{modal.data.status}</Status>
            </div>
            <div className="hl-invoice-meta">
              <span>
                <CalendarDays size={15} />
                Phát hành: {modal.data.issued}
              </span>
              <span>
                <FileText size={15} />
                {modal.data.items.length} khoản mục
              </span>
            </div>
            <section className="hl-invoice-items">
              <h3>Khoản mục</h3>
              {modal.data.items.map((item) => (
                <div key={item.name}>
                  <span>{item.name}</span>
                  <strong>{formatMoney(item.amount)}</strong>
                </div>
              ))}
              <div className="total">
                <b>Tổng thanh toán</b>
                <strong>{formatMoney(modal.data.total)}</strong>
              </div>
            </section>
            <section className="hl-invoice-history">
              <h3>
                <Clock3 size={16} />
                Lịch sử hóa đơn
              </h3>
              {modal.data.history.map((entry) => (
                <div key={entry.time}>
                  <i className={entry.type} />
                  <span>
                    <b>{entry.text}</b>
                    <small>{entry.time}</small>
                  </span>
                </div>
              ))}
            </section>
          </>
        )}
      </Modal>
    </>
  )
}

export default InvoiceManagement

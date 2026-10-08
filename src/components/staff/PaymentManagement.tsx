import { CreditCard, Landmark, Smartphone } from 'lucide-react'
import { useFilteredList } from '../../hooks/useFilteredList'
import { useModal } from '../../hooks/useModal'
import PageHeading from '../ui/PageHeading'
import SearchFilterBar from '../ui/SearchFilterBar'
import DataTable from '../ui/DataTable'
import Modal from '../ui/Modal'
import Status from '../ui/Status'
import StatCard from '../ui/StatCard'

const payments = [
  {
    id: 'PAY-260912-001',
    invoice: 'INV-26091',
    student: 'Nguyễn Minh Anh',
    amount: 2990000,
    method: 'Chuyển khoản ngân hàng',
    time: '12/06/2026 · 09:26',
    status: 'Thành công',
    reference: 'MB-124989320',
    note: 'Thanh toán học phí đầy đủ.',
  },
  {
    id: 'PAY-260620-014',
    invoice: 'INV-26126',
    student: 'Trần Hoàng Long',
    amount: 1500000,
    method: 'Ví MoMo',
    time: '20/06/2026 · 08:40',
    status: 'Thành công',
    reference: 'MOMO-7D8K3A2',
    note: 'Thanh toán đợt 1.',
  },
  {
    id: 'PAY-260905-031',
    invoice: 'INV-25984',
    student: 'Lê Thị Mai',
    amount: 2490000,
    method: 'Thẻ quốc tế',
    time: '05/09/2026 · 16:13',
    status: 'Thất bại',
    reference: 'VNP-0G9QW76',
    note: 'Ngân hàng từ chối giao dịch.',
  },
  {
    id: 'PAY-260909-022',
    invoice: 'INV-26152',
    student: 'Phạm Gia Huy',
    amount: 2990000,
    method: 'Chuyển khoản ngân hàng',
    time: '09/09/2026 · 11:05',
    status: 'Đang chờ',
    reference: 'MB-124994701',
    note: 'Đang chờ đối soát giao dịch.',
  },
  {
    id: 'PAY-260824-008',
    invoice: 'INV-25877',
    student: 'Võ Thanh Hà',
    amount: 500000,
    method: 'Ví MoMo',
    time: '24/08/2026 · 14:20',
    status: 'Đã hoàn tiền',
    reference: 'MOMO-4XJ0PL8',
    note: 'Hoàn tiền phần học phí điều chỉnh.',
  },
]
const statuses = ['Thành công', 'Thất bại', 'Đang chờ', 'Đã hoàn tiền']
const statusTone = {
  'Thành công': 'success',
  'Thất bại': 'danger',
  'Đang chờ': 'warning',
  'Đã hoàn tiền': 'info',
}
const money = (amount) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`
const methodIcon = (method) =>
  method.includes('MoMo') ? Smartphone : method.includes('ngân hàng') ? Landmark : CreditCard

const columns = [
  {
    id: 'id',
    header: 'Mã giao dịch',
    cell: ({ row }) => (
      <span>
        <b>{row.original.id}</b>
        <small>{row.original.reference}</small>
      </span>
    ),
  },
  {
    id: 'student',
    header: 'Học viên / hóa đơn',
    cell: ({ row }) => (
      <span>
        <b>{row.original.student}</b>
        <small>{row.original.invoice}</small>
      </span>
    ),
  },
  {
    id: 'method',
    header: 'Phương thức',
    cell: ({ row }) => {
      const Icon = methodIcon(row.original.method)
      return (
        <span className="hl-payment-method">
          <Icon size={16} />
          {row.original.method}
        </span>
      )
    },
  },
  { id: 'time', header: 'Thời gian', cell: ({ row }) => row.original.time },
  {
    id: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => <strong>{money(row.original.amount)}</strong>,
  },
  {
    id: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => (
      <Status tone={statusTone[row.original.status]}>{row.original.status}</Status>
    ),
  },
]

function PaymentManagement() {
  const modal = useModal()
  const { query, setQuery, filter, setFilter, list } = useFilteredList(payments, (item, q, f) => {
    const matchesFilter = f === 'Tất cả' || item.status === f
    const matchesQuery = `${item.id} ${item.student} ${item.invoice}`
      .toLowerCase()
      .includes(q.toLowerCase())
    return matchesFilter && matchesQuery
  })
  const summary = statuses.reduce(
    (result, status) => ({
      ...result,
      [status]: payments.filter((item) => item.status === status).length,
    }),
    {}
  )

  return (
    <>
      <PageHeading title="Thanh toán" subtitle="Giao dịch của học viên." />
      <section className="hl-staff-panel hl-payment-panel">
        <div className="hl-payment-summary">
          {statuses.map((status) => (
            <StatCard key={status} value={summary[status]} label={status} />
          ))}
        </div>
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Tìm mã giao dịch, học viên, hóa đơn..."
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={['Tất cả', ...statuses]}
          resultCount={list.length}
          resultLabel="giao dịch"
        />
        <DataTable
          columns={columns}
          data={list}
          getRowKey={(row) => row.id}
          onRowClick={modal.open}
          emptyMessage="Không có giao dịch phù hợp."
        />
      </section>

      <Modal
        open={modal.isOpen}
        onClose={modal.close}
        title={modal.data?.id}
        maxWidth={530}
        className="hl-payment-modal"
      >
        {modal.data && (
          <>
            <div className="hl-payment-modal-heading">
              <div>
                <span className="hl-staff-eyebrow">CHI TIẾT GIAO DỊCH</span>
                <p>Mã tham chiếu: {modal.data.reference}</p>
              </div>
              <Status tone={statusTone[modal.data.status]}>{modal.data.status}</Status>
            </div>
            <div className="hl-payment-amount">
              <span>TỔNG GIAO DỊCH</span>
              <strong>{money(modal.data.amount)}</strong>
            </div>
            <div className="hl-payment-details">
              <div>
                <small>Học viên</small>
                <b>{modal.data.student}</b>
              </div>
              <div>
                <small>Hóa đơn liên quan</small>
                <b>{modal.data.invoice}</b>
              </div>
              <div>
                <small>Phương thức</small>
                <b>{modal.data.method}</b>
              </div>
              <div>
                <small>Thời gian giao dịch</small>
                <b>{modal.data.time}</b>
              </div>
            </div>
            <div className="hl-payment-note">
              <small>GHI CHÚ</small>
              <p>{modal.data.note}</p>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

export default PaymentManagement

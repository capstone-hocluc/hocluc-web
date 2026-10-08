import { type ReactNode, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CircleDollarSign,
  CreditCard,
  Clock3,
  Filter,
  FileText,
  LayoutDashboard,
  Mail,
  Menu,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  UserPlus,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import UserManagement from '../admin/UserManagement'
import Logo from '../common/Logo'
import Sidebar from '../ui/Sidebar'
import NavItem, { SidebarGroupLabel } from '../ui/NavItem'
import PageHeading from '../ui/PageHeading'
import DropdownField from '../ui/DropdownField'
import AdminOverview from '../admin/AdminOverview'
import StudyGroupManagement from './StudyGroupManagement'
import ScheduleManagement from './ScheduleManagement'
import AttendanceManagement from './AttendanceManagement'
import TuitionManagement from './TuitionManagement'
import InvoiceManagement from './InvoiceManagement'
import PaymentManagement from './PaymentManagement'
import ThemeToggle from '../ui/ThemeToggle'
import RoleSwitcher from '../ui/RoleSwitcher'

const toDropdownOptions = (values) => values.map((value) => ({ id: value, label: value }))

const seedStudents = [
  {
    id: 'HS-24091',
    name: 'Nguyễn Minh Anh',
    initials: 'MA',
    email: 'minhanh.nguyen@email.com',
    phone: '0901 234 567',
    batch: 'ĐGNL 12A · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    fee: 'Đã thanh toán',
    attendance: 92,
    progress: 82,
    activity: 'Hoàn thành đề mô phỏng số 04',
    time: '12 phút trước',
    tone: 'blue',
    joined: '12/06/2026',
    guardian: 'Nguyễn Thị Lan · 0912 345 678',
  },
  {
    id: 'HS-24126',
    name: 'Trần Hoàng Long',
    initials: 'HL',
    email: 'hoanglong.tran@email.com',
    phone: '0987 112 226',
    batch: 'ĐGNL 12B · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    fee: 'Chờ thanh toán',
    attendance: 76,
    progress: 64,
    activity: 'Nộp bài tập Tư duy định lượng',
    time: '28 phút trước',
    tone: 'gold',
    joined: '18/06/2026',
    guardian: 'Trần Văn Hải · 0987 440 112',
  },
  {
    id: 'HS-23984',
    name: 'Lê Thị Mai',
    initials: 'TM',
    email: 'mai.le@email.com',
    phone: '0938 556 891',
    batch: 'ĐGNL 11A · K25',
    course: 'Nền tảng ĐGNL lớp 11',
    fee: 'Đã thanh toán',
    attendance: 96,
    progress: 91,
    activity: 'Đạt chuỗi học 14 ngày',
    time: '45 phút trước',
    tone: 'violet',
    joined: '03/05/2026',
    guardian: 'Lê Quốc Bảo · 0938 215 889',
  },
  {
    id: 'HS-24152',
    name: 'Phạm Gia Huy',
    initials: 'GH',
    email: 'giahuy.pham@email.com',
    phone: '0975 822 430',
    batch: 'ĐGNL 12A · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    fee: 'Quá hạn',
    attendance: 58,
    progress: 38,
    activity: 'Cần hỗ trợ kích hoạt tài khoản',
    time: '1 giờ trước',
    tone: 'green',
    joined: '24/06/2026',
    guardian: 'Phạm Minh Đức · 0975 100 234',
  },
  {
    id: 'HS-24203',
    name: 'Võ Thanh Hà',
    initials: 'TH',
    email: 'thanhha.vo@email.com',
    phone: '0908 301 225',
    batch: 'ĐGNL 12B · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    fee: 'Đã thanh toán',
    attendance: 88,
    progress: 71,
    activity: 'Đăng ký buổi chữa đề',
    time: '2 giờ trước',
    tone: 'blue',
    joined: '01/07/2026',
    guardian: 'Võ Minh Tâm · 0908 676 345',
  },
  {
    id: 'HS-24217',
    name: 'Đỗ Khánh Vy',
    initials: 'KV',
    email: 'khanhvy.do@email.com',
    phone: '0917 789 663',
    batch: 'ĐGNL 11A · K25',
    course: 'Nền tảng ĐGNL lớp 11',
    fee: 'Chờ thanh toán',
    attendance: 81,
    progress: 55,
    activity: 'Xem lại video chuyên đề',
    time: 'Hôm qua',
    tone: 'violet',
    joined: '04/07/2026',
    guardian: 'Đỗ Anh Tuấn · 0917 989 234',
  },
  {
    id: 'HS-24224',
    name: 'Bùi Quốc Khánh',
    initials: 'QK',
    email: 'quockhanh.bui@email.com',
    phone: '0903 441 890',
    batch: 'ĐGNL 12A · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    fee: 'Đã thanh toán',
    attendance: 84,
    progress: 69,
    activity: 'Hoàn thành chuyên đề Đại số',
    time: 'Hôm qua',
    tone: 'gold',
    joined: '06/07/2026',
    guardian: 'Bùi Văn Nam · 0903 707 567',
  },
  {
    id: 'HS-24238',
    name: 'Đặng Bảo Ngọc',
    initials: 'BN',
    email: 'baongoc.dang@email.com',
    phone: '0934 773 220',
    batch: 'ĐGNL 12B · K24',
    course: 'Luyện thi ĐGNL toàn diện',
    fee: 'Quá hạn',
    attendance: 64,
    progress: 42,
    activity: 'Vắng buổi Luyện đề tổng hợp',
    time: 'Hôm qua',
    tone: 'green',
    joined: '09/07/2026',
    guardian: 'Đặng Minh Hòa · 0934 312 667',
  },
]
const kpis = [
  {
    label: 'Tổng học viên',
    value: '2.486',
    detail: '+128 trong tháng này',
    icon: Users,
    theme: 'blue',
  },
  {
    label: 'Lớp đang hoạt động',
    value: '32',
    detail: '03 lớp sắp khai giảng',
    icon: BookOpen,
    theme: 'gold',
  },
  {
    label: 'Lịch học hôm nay',
    value: '18',
    detail: '05 buổi chưa điểm danh',
    icon: CalendarDays,
    theme: 'violet',
  },
  {
    label: 'Cảnh báo cần xử lý',
    value: '07',
    detail: 'Cần kiểm tra trong hôm nay',
    icon: AlertTriangle,
    theme: 'red',
  },
]
const alerts = [
  {
    title: 'Lớp ĐGNL 12B · K24 chưa có giảng viên',
    meta: 'Buổi học lúc 19:00 hôm nay · Phòng Live 02',
    type: 'warning',
    action: 'Phân công',
  },
  {
    title: '05 học viên chưa hoàn tất học phí đợt 2',
    meta: 'Hạn xử lý: 17:00 · Lớp ĐGNL 12A · K24',
    type: 'danger',
    action: 'Xem danh sách',
  },
  {
    title: 'Đề mô phỏng #08 đã sẵn sàng mở lớp',
    meta: 'Đã qua kiểm duyệt · 624 học viên đủ điều kiện',
    type: 'success',
    action: 'Kích hoạt',
  },
]
const schedule = [
  {
    time: '09:00',
    title: 'Tư duy định lượng',
    batch: 'ĐGNL 12A · K24',
    status: 'Đang diễn ra',
    color: 'blue',
  },
  {
    time: '14:30',
    title: 'Chuyên đề Đọc hiểu',
    batch: 'ĐGNL 11A · K25',
    status: 'Sắp bắt đầu',
    color: 'gold',
  },
  {
    time: '19:00',
    title: 'Luyện đề tổng hợp',
    batch: 'ĐGNL 12B · K24',
    status: 'Cần phân công',
    color: 'red',
  },
]
const seedEnrollments = [
  {
    id: 'ENR-26091',
    student: 'Nguyễn Minh Anh',
    course: 'Luyện thi ĐGNL toàn diện',
    batch: 'ĐGNL 12A · K24',
    date: '12/06/2026',
    status: 'Đã duyệt',
    fee: 'Đã thanh toán',
  },
  {
    id: 'ENR-26126',
    student: 'Trần Hoàng Long',
    course: 'Luyện thi ĐGNL toàn diện',
    batch: 'ĐGNL 12B · K24',
    date: '18/06/2026',
    status: 'Đang chờ',
    fee: 'Chờ thanh toán',
  },
  {
    id: 'ENR-25984',
    student: 'Lê Thị Mai',
    course: 'Nền tảng ĐGNL lớp 11',
    batch: 'ĐGNL 11A · K25',
    date: '03/05/2026',
    status: 'Đã duyệt',
    fee: 'Đã thanh toán',
  },
  {
    id: 'ENR-26152',
    student: 'Phạm Gia Huy',
    course: 'Luyện thi ĐGNL toàn diện',
    batch: 'ĐGNL 12A · K24',
    date: '24/06/2026',
    status: 'Đang chờ',
    fee: 'Quá hạn',
  },
  {
    id: 'ENR-26203',
    student: 'Võ Thanh Hà',
    course: 'Luyện thi ĐGNL toàn diện',
    batch: 'ĐGNL 12B · K24',
    date: '01/07/2026',
    status: 'Đã duyệt',
    fee: 'Đã thanh toán',
  },
  {
    id: 'ENR-26217',
    student: 'Đỗ Khánh Vy',
    course: 'Nền tảng ĐGNL lớp 11',
    batch: 'ĐGNL 11A · K25',
    date: '04/07/2026',
    status: 'Đã hủy',
    fee: 'Chờ thanh toán',
  },
]
const seedBatches = [
  {
    id: 'batch-12a-k24',
    name: 'ĐGNL 12A · K24',
    start: '12/06/2026',
    size: 24,
    status: 'Đang hoạt động',
    course: 'Luyện thi ĐGNL toàn diện',
    instructor: 'ThS. Nguyễn Hoài Nam',
  },
  {
    id: 'batch-12b-k24',
    name: 'ĐGNL 12B · K24',
    start: '18/06/2026',
    size: 22,
    status: 'Đang hoạt động',
    course: 'Luyện thi ĐGNL toàn diện',
    instructor: 'ThS. Trần Thu Hà',
  },
  {
    id: 'batch-11a-k25',
    name: 'ĐGNL 11A · K25',
    start: '03/05/2026',
    size: 26,
    status: 'Đang hoạt động',
    course: 'Nền tảng ĐGNL lớp 11',
    instructor: 'ThS. Võ Minh Anh',
  },
  {
    id: 'batch-12c-k24',
    name: 'ĐGNL 12C · K24',
    start: '20/09/2026',
    size: 0,
    status: 'Sắp khai giảng',
    course: 'Luyện thi ĐGNL toàn diện',
    instructor: 'Chưa phân công',
  },
  {
    id: 'batch-11b-k25',
    name: 'ĐGNL 11B · K25',
    start: '10/03/2026',
    size: 21,
    status: 'Đã kết thúc',
    course: 'Nền tảng ĐGNL lớp 11',
    instructor: 'ThS. Phạm Đức Long',
  },
]

type Student = (typeof seedStudents)[number]

function Avatar({ student }: { student: Student }) {
  return <span className={`hl-staff-avatar ${student.tone}`}>{student.initials}</span>
}
// Single shared sidebar for every staff-* page - replaces 5 near-duplicate
// hand-copied <aside className="hl-staff-sidebar"> blocks that had drifted
// out of sync (some missing half the nav items, some routing through stale
// "coming soon" placeholders for screens that already exist).
interface StaffSidebarProps {
  page: string
  onNavigate: (path: string) => void
  action: (message: string) => void
  sidebarOpen: boolean
  onCloseSidebar: () => void
  adminArea?: boolean
}

function StaffSidebar({
  page,
  onNavigate,
  action,
  sidebarOpen,
  onCloseSidebar,
  adminArea = false,
}: StaffSidebarProps) {
  return (
    <Sidebar open={sidebarOpen} onClose={onCloseSidebar} brand={<Logo />}>
      <SidebarGroupLabel>Tổng quan</SidebarGroupLabel>
      <NavItem
        icon={LayoutDashboard}
        label="Tổng quan"
        active={page === 'dashboard'}
        onClick={() => onNavigate('dashboard')}
      />
      {!adminArea && (
        <>
          <SidebarGroupLabel>Vận hành</SidebarGroupLabel>
          <NavItem
            icon={Users}
            label="Học viên"
            active={page === 'students' || page === 'detail'}
            onClick={() => onNavigate('students')}
          />
          <NavItem
            icon={ClipboardList}
            label="Ghi danh"
            active={page === 'enrollments'}
            onClick={() => onNavigate('enrollments')}
          />
          <NavItem
            icon={BookOpen}
            label="Lớp học"
            active={page === 'batches' || page === 'batch-detail'}
            onClick={() => onNavigate('batches')}
          />
          <NavItem
            icon={CalendarDays}
            label="Lịch học"
            active={page === 'schedules'}
            onClick={() => onNavigate('schedules')}
          />
          <NavItem
            icon={CheckCircle2}
            label="Điểm danh"
            active={page === 'attendance'}
            onClick={() => onNavigate('attendance')}
          />
          <NavItem
            icon={CircleDollarSign}
            label="Học phí"
            active={page === 'tuition'}
            onClick={() => onNavigate('tuition')}
          />
          <NavItem
            icon={FileText}
            label="Hóa đơn"
            active={page === 'invoices'}
            onClick={() => onNavigate('invoices')}
          />
          <NavItem
            icon={CreditCard}
            label="Thanh toán"
            active={page === 'payments'}
            onClick={() => onNavigate('payments')}
          />
          <NavItem
            icon={ClipboardList}
            label="Yêu cầu hỗ trợ"
            onClick={() => action('Màn hình yêu cầu hỗ trợ đang được chuẩn bị.')}
          />
          <NavItem
            icon={Settings}
            label="Cài đặt"
            onClick={() => action('Màn hình cài đặt đang được chuẩn bị.')}
          />
        </>
      )}
      {adminArea && (
        <>
          <SidebarGroupLabel>Hệ thống</SidebarGroupLabel>
          <NavItem
            icon={UserCog}
            label="Quản lý người dùng"
            active={page === 'users'}
            onClick={() => onNavigate('users')}
          />
        </>
      )}
    </Sidebar>
  )
}
function FeeStatus({ status }: { status: string }) {
  return (
    <span
      className={`hl-staff-fee ${status === 'Đã thanh toán' ? 'paid' : status === 'Quá hạn' ? 'overdue' : 'pending'}`}
    >
      {status}
    </span>
  )
}
function Heading({
  eyebrow,
  title,
  action,
  onClick,
}: {
  eyebrow: ReactNode
  title: ReactNode
  action?: ReactNode
  onClick?: () => void
}) {
  return (
    <div className="hl-staff-panel-heading">
      <div>
        <span className="hl-staff-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <button onClick={onClick}>
          {action} <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  )
}

interface StaffDashboardProps {
  page?: string
  onNavigate: (path: string) => void
  onBack: () => void
  adminArea?: boolean
}

function StaffDashboard({ page = 'dashboard', onNavigate, onBack, adminArea = false }: StaffDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [students, setStudents] = useState(seedStudents)
  const [enrollments, setEnrollments] = useState(seedEnrollments)
  const [batches, setBatches] = useState(seedBatches)
  const [selectedId, setSelectedId] = useState(seedStudents[0].id)
  const navigate = (target: string, id?: string) => {
    if (id) setSelectedId(id)
    setSidebarOpen(false)
    onNavigate(target)
  }
  const action = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }
  const student = students.find((item) => item.id === selectedId) || students[0]
  const titles = {
    dashboard: ['Tổng quan', 'Tình hình học tập và việc cần xử lý.'],
    students: ['Học viên', 'Hồ sơ và tiến độ học tập.'],
    detail: ['Hồ sơ học viên', 'Thông tin và tiến độ học tập.'],
    enrollments: ['Ghi danh', 'Đăng ký học và học phí.'],
    schedules: ['Lịch học', 'Lịch học và phòng học.'],
    attendance: ['Điểm danh', 'Tình trạng tham gia lớp học.'],
    tuition: ['Học phí', 'Công nợ và hạn nộp.'],
    invoices: ['Hóa đơn', 'Hóa đơn và lịch sử thanh toán.'],
    payments: ['Thanh toán', 'Giao dịch của học viên.'],
    batches: ['Lớp học', 'Lớp học và sĩ số.'],
    'batch-detail': ['Chi tiết lớp', 'Thành viên và chương trình học.'],
    users: ['Người dùng', ''],
  }
  const [title, subtitle] = titles[page]
  return (
    <main className="hl-staff-app">
      <StaffSidebar
        page={page}
        onNavigate={navigate}
        action={action}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        adminArea={adminArea}
      />
      <section className="hl-staff-content">
       <div className="hl-staff-card">
        <header className="hl-staff-header">
          <button type="button" className="hl-staff-menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={21} />
          </button>
          <button
            type="button"
            className="hl-staff-search"
            onClick={() => action('Tìm kiếm toàn hệ thống đang được chuẩn bị.')}
          >
            <Search size={16} />
            <span>Tìm kiếm...</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="hl-staff-header-actions">
            <button
              type="button"
              className="hl-staff-icon-button hl-staff-refresh"
              onClick={() => action('Đã làm mới dữ liệu.')}
            >
              <RefreshCw size={16} />
              <span>Làm mới</span>
            </button>
            <RoleSwitcher />
            <ThemeToggle className="hl-staff-icon-button" />
            <button
              type="button"
              className="hl-staff-icon-button"
              onClick={() => action('Bạn có 3 thông báo mới.')}
              aria-label="Thông báo"
            >
              <Bell size={17} />
              <i />
            </button>
            <button type="button" className="hl-staff-profile" onClick={onBack}>
              <span className="hl-staff-profile-avatar">TL</span>
              <span className="hl-staff-profile-name">Thảo Linh</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <div className="hl-staff-main">
          <div className="hl-staff-breadcrumb">
             <span>{adminArea ? 'Quản trị' : 'Vận hành'}</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          {![
            'enrollments',
            'batches',
            'batch-detail',
            'schedules',
            'attendance',
            'tuition',
            'invoices',
            'payments',
          ].includes(page) && (
            <PageHeading title={title} subtitle={subtitle} />
          )}
          {notice && (
            <div className="hl-staff-toast">
              <CheckCircle2 size={17} />
              {notice}
            </div>
          )}
          {page === 'dashboard' &&
            (adminArea ? <AdminOverview onNavigate={onNavigate} /> : <Dashboard students={students} navigate={navigate} action={action} />)}
          {page === 'students' && (
            <StudentList
              students={students}
              setStudents={setStudents}
              navigate={navigate}
              action={action}
            />
          )}
          {page === 'detail' && (
            <StudentDetail student={student} navigate={navigate} action={action} />
          )}
          {page === 'schedules' && <ScheduleManagement batches={batches} />}
          {page === 'attendance' && (
            <AttendanceManagement batches={batches} students={students} />
          )}
          {page === 'tuition' && <TuitionManagement />}
          {page === 'invoices' && <InvoiceManagement />}
          {page === 'payments' && <PaymentManagement />}
          {page === 'enrollments' && (
            <StaffEnrollmentPage
              students={students}
              enrollments={enrollments}
              setEnrollments={setEnrollments}
              action={action}
              notice={notice}
            />
          )}
          {(page === 'batches' || page === 'batch-detail') && (
            <BatchManagementV2
              page={page}
              students={students}
              batches={batches}
              setBatches={setBatches}
              onNavigate={onNavigate}
              action={action}
            />
          )}
          {page === 'users' && <UserManagement canCreateUsers={adminArea} />}
        </div>
       </div>
      </section>
    </main>
  )
}

function Dashboard({ students, navigate, action }) {
  return (
    <>
      <div className="hl-staff-kpis">
        {kpis.map(({ label, value, detail, icon: Icon, theme }) => (
          <article className="hl-staff-kpi" key={label}>
            <span className={`hl-staff-kpi-icon ${theme}`}>
              <Icon size={21} />
            </span>
            <div>
              <p>{label}</p>
              <strong>{value}</strong>
              <small className={theme === 'red' ? 'is-red' : ''}>{detail}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="hl-staff-grid">
        <section className="hl-staff-panel">
          <Heading
            eyebrow="CẦN ƯU TIÊN"
            title="Cảnh báo vận hành"
            action="Xem tất cả"
            onClick={() => action('Đã mở toàn bộ cảnh báo.')}
          />
          <div className="hl-staff-alerts">
            {alerts.map((alert) => (
              <article className="hl-staff-alert" key={alert.title}>
                <span className={`hl-staff-alert-icon ${alert.type}`}>
                  {alert.type === 'success' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}
                </span>
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.meta}</p>
                </div>
                <button onClick={() => action(`Đã chọn: ${alert.action}`)}>{alert.action}</button>
              </article>
            ))}
          </div>
        </section>
        <section className="hl-staff-panel">
          <Heading
            eyebrow="LỊCH HÔM NAY"
            title="Buổi học sắp diễn ra"
            action="Xem lịch"
            onClick={() => action('Đã mở lịch học.')}
          />
          <div className="hl-staff-timeline">
            {schedule.map((item) => (
              <article className="hl-staff-schedule-item" key={item.time}>
                <time>{item.time}</time>
                <span className={`hl-staff-line ${item.color}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.batch}</p>
                </div>
                <em className={item.color}>{item.status}</em>
              </article>
            ))}
          </div>
        </section>
        <section className="hl-staff-panel">
          <Heading
            eyebrow="HOẠT ĐỘNG MỚI"
            title="Cập nhật từ học viên"
            action="Quản lý học viên"
            onClick={() => navigate('students')}
          />
          <div className="hl-staff-activities">
            {students.slice(0, 4).map((item) => (
              <button
                className="hl-staff-activity-row"
                type="button"
                key={item.id}
                onClick={() => navigate('detail', item.id)}
              >
                <Avatar student={item} />
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.activity}</p>
                </div>
                <time>{item.time}</time>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function StudentList({ students, setStudents, navigate, action }) {
  const [query, setQuery] = useState('')
  const [fee, setFee] = useState('Tất cả')
  const [batch, setBatch] = useState('Tất cả')
  const [current, setCurrent] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', batch: 'ĐGNL 12A · K24' })
  const size = 5
  const filtered = useMemo(
    () =>
      students.filter(
        (item) =>
          `${item.name} ${item.email} ${item.id}`.toLowerCase().includes(query.toLowerCase()) &&
          (fee === 'Tất cả' || item.fee === fee) &&
          (batch === 'Tất cả' || item.batch === batch)
      ),
    [students, query, fee, batch]
  )
  const pages = Math.max(1, Math.ceil(filtered.length / size))
  const rows = filtered.slice((current - 1) * size, current * size)
  const filter = (setter, value) => {
    setter(value)
    setCurrent(1)
  }
  const submit = (event) => {
    event.preventDefault()
    const initials = form.name
      .split(' ')
      .slice(-2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
    setStudents([
      {
        id: `HS-${24240 + students.length}`,
        ...form,
        initials,
        course: form.batch.includes('11') ? 'Nền tảng ĐGNL lớp 11' : 'Luyện thi ĐGNL toàn diện',
        fee: 'Chờ thanh toán',
        attendance: 0,
        progress: 0,
        activity: 'Hồ sơ vừa được tạo',
        time: 'Vừa xong',
        tone: 'blue',
        joined: '09/09/2026',
        guardian: 'Chưa cập nhật',
      },
      ...students,
    ])
    setShowModal(false)
    action('Đã tạo hồ sơ học viên mới.')
  }
  return (
    <>
      <section className="hl-staff-panel hl-staff-students">
        <div className="hl-staff-list-top">
          <div>
            <h2>{filtered.length} học viên phù hợp</h2>
          </div>
          <button className="hl-staff-primary" onClick={() => setShowModal(true)}>
            <UserPlus size={16} />
            Tạo học viên
          </button>
        </div>
        <div className="hl-staff-student-tools">
          <label>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => filter(setQuery, event.target.value)}
              placeholder="Tìm tên, email hoặc mã học viên..."
            />
          </label>
          <span>
            <Filter size={16} />
            <DropdownField
              ariaLabel="Trạng thái học phí"
              className="w-auto"
              options={toDropdownOptions(['Tất cả', 'Đã thanh toán', 'Chờ thanh toán', 'Quá hạn'])}
              value={fee}
              onChange={(value) => {
                if (value !== null) filter(setFee, value)
              }}
            />
          </span>
          <DropdownField
            ariaLabel="Batch học viên"
            className="w-auto"
            options={toDropdownOptions([
              'Tất cả',
              'ĐGNL 12A · K24',
              'ĐGNL 12B · K24',
              'ĐGNL 11A · K25',
            ])}
            value={batch}
            onChange={(value) => {
              if (value !== null) filter(setBatch, value)
            }}
          />
        </div>
        <div className="hl-staff-table">
          <div className="hl-staff-tr hl-staff-list-row head">
            <span>Học viên</span>
            <span>Khóa học / batch</span>
            <span>Học phí</span>
            <span>Điểm danh</span>
            <span />
          </div>
          {rows.map((item) => (
            <article
              className="hl-staff-tr hl-staff-list-row"
              key={item.id}
              onClick={() => navigate('detail', item.id)}
            >
              <span className="hl-staff-student-name">
                <Avatar student={item} />
                <b>
                  {item.name}
                  <small>
                    {item.id} · {item.email}
                  </small>
                </b>
              </span>
              <span>
                {item.course}
                <small>{item.batch}</small>
              </span>
              <span>
                <FeeStatus status={item.fee} />
              </span>
              <span>
                <b>{item.attendance}%</b>
                <i className="hl-staff-mini-progress">
                  <em style={{ width: `${item.attendance}%` }} />
                </i>
              </span>
              <button
                className="hl-staff-view"
                onClick={(event) => {
                  event.stopPropagation()
                  navigate('detail', item.id)
                }}
              >
                Xem <ChevronRight size={15} />
              </button>
            </article>
          ))}
          {!rows.length && <div className="hl-staff-empty">Không tìm thấy học viên phù hợp.</div>}
        </div>
        <div className="hl-staff-pagination">
          <span>
            Hiển thị {rows.length ? (current - 1) * size + 1 : 0}–
            {Math.min(current * size, filtered.length)} / {filtered.length} học viên
          </span>
          <div>
            <button disabled={current === 1} onClick={() => setCurrent(current - 1)}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: pages }, (_, index) => (
              <button
                key={index}
                className={current === index + 1 ? 'is-active' : ''}
                onClick={() => setCurrent(index + 1)}
              >
                {index + 1}
              </button>
            ))}
            <button disabled={current === pages} onClick={() => setCurrent(current + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      {showModal && (
        <StudentModal
          form={form}
          setForm={setForm}
          close={() => setShowModal(false)}
          submit={submit}
        />
      )}
    </>
  )
}
function StudentModal({ form, setForm, close, submit }) {
  const update = (key, value) => setForm({ ...form, [key]: value })
  return (
    <div className="hl-staff-modal-backdrop">
      <form className="hl-staff-modal" onSubmit={submit}>
        <button type="button" className="hl-staff-modal-close" onClick={close}>
          <X size={19} />
        </button>
        <h2>Thêm hồ sơ học viên mới</h2>
        <p>Thông tin có thể cập nhật sau khi tạo hồ sơ.</p>
        <label>
          Họ và tên
          <input
            required
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Nguyễn Văn An"
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="an.nguyen@email.com"
          />
        </label>
        <label>
          Số điện thoại
          <input
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="09xx xxx xxx"
          />
        </label>
        <label>
          Khóa học / batch
          <DropdownField
            ariaLabel="Khóa học / batch"
            options={toDropdownOptions(['ĐGNL 12A · K24', 'ĐGNL 12B · K24', 'ĐGNL 11A · K25'])}
            value={form.batch}
            onChange={(value) => {
              if (value !== null) update('batch', value)
            }}
          />
        </label>
        <div className="hl-staff-modal-actions">
          <button type="button" onClick={close}>
            Hủy
          </button>
          <button className="hl-staff-primary" type="submit">
            <Plus size={16} />
            Tạo học viên
          </button>
        </div>
      </form>
    </div>
  )
}

function StudentDetail({ student, navigate, action }) {
  const [tab, setTab] = useState('overview')
  const attendance = [
    { date: '08/09/2026', lesson: 'Luyện đề tổng hợp', status: 'Có mặt' },
    { date: '06/09/2026', lesson: 'Chuyên đề Xác suất', status: 'Có mặt' },
    { date: '03/09/2026', lesson: 'Tư duy định lượng', status: 'Đi muộn' },
    { date: '01/09/2026', lesson: 'Chuyên đề Đọc hiểu', status: 'Có mặt' },
  ]
  return (
    <div className="hl-staff-detail">
      <button type="button" className="hl-staff-text-back" onClick={() => navigate('students')}>
        ← Quay lại danh sách
      </button>
      <section className="hl-staff-panel hl-staff-profile">
        <Avatar student={student} />
        <div>
          <span className="hl-staff-eyebrow">{student.id}</span>
          <h2>{student.name}</h2>
          <p>{student.batch} · Đang hoạt động</p>
        </div>
        <button
          className="hl-staff-primary"
          onClick={() => action(`Đã tạo yêu cầu hỗ trợ cho ${student.name}.`)}
        >
          Tạo yêu cầu hỗ trợ
        </button>
      </section>
      <nav className="hl-staff-detail-tabs">
        {[
          ['overview', 'Tổng quan'],
          ['enrollment', 'Ghi danh & lớp học'],
          ['finance', 'Học phí'],
          ['attendance', 'Điểm danh'],
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>
      {tab === 'overview' && (
        <div className="hl-staff-detail-grid">
          <section className="hl-staff-panel">
            <Heading eyebrow="HỒ SƠ HÀNH CHÍNH" title="Thông tin liên hệ" />
            <Info icon={Mail} label="Email" value={student.email} />
            <Info icon={Phone} label="Số điện thoại" value={student.phone} />
            <Info icon={Users} label="Phụ huynh" value={student.guardian} />
          </section>
          <section className="hl-staff-panel">
            <Heading eyebrow="TIẾN ĐỘ HỌC TẬP" title={`${student.progress}% hoàn thành lộ trình`} />
            <i className="hl-staff-detail-progress">
              <b style={{ width: `${student.progress}%` }} />
            </i>
            <p className="hl-staff-muted">
              Đã tham gia từ {student.joined}. Hoạt động gần nhất: {student.activity}.
            </p>
            <div className="hl-staff-stat-pair">
              <span>
                <b>{student.attendance}%</b>điểm danh
              </span>
              <span>
                <b>{student.progress}%</b>tiến độ
              </span>
            </div>
          </section>
        </div>
      )}
      {tab === 'enrollment' && (
        <section className="hl-staff-panel hl-staff-info-panel">
          <Heading eyebrow="LỊCH SỬ GHI DANH" title="Lớp học và batch hiện tại" />
          <Enrollment
            icon={BookOpen}
            title={student.course}
            text={`${student.batch} · Ghi danh ngày ${student.joined}`}
            tag="Đang học"
          />
          <Enrollment
            icon={CalendarDays}
            title="Lịch cố định: Thứ 2 · 4 · 6"
            text="19:00–20:30 · Hình thức trực tuyến"
            tag="Đang áp dụng"
          />
        </section>
      )}
      {tab === 'finance' && (
        <section className="hl-staff-panel hl-staff-info-panel">
          <Heading eyebrow="HỌC PHÍ" title="Tình trạng thanh toán" />
          <div className="hl-staff-finance">
            <CircleDollarSign size={24} />
            <div>
              <b>2.990.000đ</b>
              <p>Học phí gói {student.course}</p>
            </div>
            <FeeStatus status={student.fee} />
          </div>
          <div className="hl-staff-payment-line">
            <span>Đợt 1 · 12/06/2026</span>
            <strong>1.500.000đ · Đã thanh toán</strong>
          </div>
          <div className="hl-staff-payment-line">
            <span>Đợt 2 · 12/08/2026</span>
            <strong>1.490.000đ · {student.fee}</strong>
          </div>
          <button
            className="hl-staff-outline"
            onClick={() => action('Đã gửi nhắc nhở học phí qua email.')}
          >
            Gửi nhắc thanh toán
          </button>
        </section>
      )}
      {tab === 'attendance' && (
        <section className="hl-staff-panel hl-staff-info-panel">
          <Heading eyebrow="ĐIỂM DANH" title={`${student.attendance}% tỉ lệ có mặt`} />
          <div className="hl-staff-attendance-meter">
            <b style={{ width: `${student.attendance}%` }} />
          </div>
          <div className="hl-staff-attendance-list">
            {attendance.map((item) => (
              <div key={item.date}>
                <span>
                  <Clock3 size={16} />
                  {item.date}
                </span>
                <span>{item.lesson}</span>
                <em className={item.status === 'Có mặt' ? 'present' : 'late'}>{item.status}</em>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
function Info({ icon: Icon, label, value }) {
  return (
    <div className="hl-staff-info">
      <Icon size={17} />
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  )
}
function Enrollment({ icon: Icon, title, text, tag }) {
  return (
    <div className="hl-staff-enrollment">
      <Icon size={21} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <span>{tag}</span>
    </div>
  )
}

function StaffEnrollmentPage({ students, enrollments, setEnrollments, action, notice }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Tất cả')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ studentId: '', batch: 'ĐGNL 12A · K24' })
  const rows = useMemo(
    () =>
      enrollments.filter(
        (item) =>
          `${item.student} ${item.course} ${item.id}`.toLowerCase().includes(query.toLowerCase()) &&
          (status === 'Tất cả' || item.status === status)
      ),
    [enrollments, query, status]
  )
  const submit = (event) => {
    event.preventDefault()
    const student = students.find((item) => item.id === form.studentId)
    if (!student) return
    const course = form.batch.includes('11') ? 'Nền tảng ĐGNL lớp 11' : 'Luyện thi ĐGNL toàn diện'
    setEnrollments([
      {
        id: `ENR-${26300 + enrollments.length}`,
        student: student.name,
        course,
        batch: form.batch,
        date: '09/09/2026',
        status: 'Đang chờ',
        fee: 'Chờ thanh toán',
      },
      ...enrollments,
    ])
    setOpen(false)
    setForm({ studentId: '', batch: 'ĐGNL 12A · K24' })
    action(`Ghi danh thành công cho ${student.name}. Đã tạo bản ghi học phí chờ thanh toán.`)
  }
  return (
    <>
      <PageHeading
        title="Ghi danh"
        subtitle="Đăng ký học và học phí."
        action={
          <>
            <Plus size={16} />
            Thêm ghi danh mới
          </>
        }
        onAction={() => setOpen(true)}
      />
      {notice && (
        <div className="hl-staff-toast">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}
      <section className="hl-staff-panel hl-staff-enrollments">
        <div className="hl-staff-enrollment-filters">
          <label>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm học viên, khóa học hoặc mã ghi danh..."
            />
          </label>
          <DropdownField
            ariaLabel="Trạng thái ghi danh"
            className="w-auto"
            options={toDropdownOptions(['Tất cả', 'Đang chờ', 'Đã duyệt', 'Đã hủy'])}
            value={status}
            onChange={(value) => {
              if (value !== null) setStatus(value)
            }}
          />
          <span>{rows.length} lượt ghi danh</span>
        </div>
        <div className="hl-staff-table">
          <div className="hl-enroll-row head">
            <span>Mã ghi danh</span>
            <span>Học viên</span>
            <span>Khóa học / batch</span>
            <span>Ngày ghi danh</span>
            <span>Trạng thái</span>
            <span>Học phí</span>
          </div>
          {rows.map((item) => (
            <div className="hl-enroll-row" key={item.id}>
              <strong>{item.id}</strong>
              <span>{item.student}</span>
              <span>
                <b>{item.course}</b>
                <small>{item.batch}</small>
              </span>
              <span>{item.date}</span>
              <EnrollmentStatus status={item.status} />
              <FeeStatus status={item.fee} />
            </div>
          ))}
          {!rows.length && <div className="hl-staff-empty">Không tìm thấy lượt ghi danh phù hợp.</div>}
        </div>
      </section>
      {open && (
        <EnrollmentModal
          students={students}
          form={form}
          setForm={setForm}
          onClose={() => setOpen(false)}
          onSubmit={submit}
        />
      )}
    </>
  )
}
function EnrollmentStatus({ status }) {
  return (
    <span
      className={`hl-enrollment-status ${status === 'Đã duyệt' ? 'approved' : status === 'Đã hủy' ? 'cancelled' : 'waiting'}`}
    >
      {status}
    </span>
  )
}
function EnrollmentModal({ students, form, setForm, onClose, onSubmit }) {
  return (
    <div className="hl-staff-modal-backdrop">
      <form className="hl-staff-modal" onSubmit={onSubmit}>
        <button className="hl-staff-modal-close" type="button" onClick={onClose}>
          <X size={19} />
        </button>
        <h2>Thêm lượt ghi danh mới</h2>
        <p>Hệ thống sẽ tự tạo một bản ghi học phí ở trạng thái chờ thanh toán.</p>
        <label>
          Học viên
          <DropdownField
            ariaLabel="Học viên"
            options={[
              { id: '', label: 'Chọn học viên' },
              ...students.map((student) => ({
                id: student.id,
                label: `${student.name} · ${student.id}`,
              })),
            ]}
            value={form.studentId}
            isRequired
            onChange={(value) => setForm({ ...form, studentId: value ?? '' })}
          />
        </label>
        <label>
          Khóa học / batch
          <DropdownField
            ariaLabel="Khóa học / batch"
            options={toDropdownOptions(['ĐGNL 12A · K24', 'ĐGNL 12B · K24', 'ĐGNL 11A · K25'])}
            value={form.batch}
            onChange={(value) => {
              if (value !== null) setForm({ ...form, batch: value })
            }}
          />
        </label>
        <div className="hl-staff-modal-actions">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="hl-staff-primary" type="submit">
            <CheckCircle2 size={16} />
            Xác nhận ghi danh
          </button>
        </div>
      </form>
    </div>
  )
}

function BatchManagementV2({ page, students, batches, setBatches, onNavigate, action }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tất cả')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    start: '',
    course: 'Luyện thi ĐGNL toàn diện',
    instructor: '',
    status: 'Sắp khai giảng',
  })
  const [tab, setTab] = useState('students')
  const [members, setMembers] = useState(students.slice(0, 6))
  const batch = batches[0]
  const list = batches.filter(
    (item) =>
      `${item.name} ${item.course} ${item.instructor}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === 'Tất cả' || item.status === filter)
  )
  const createBatch = (event) => {
    event.preventDefault()
    if (!form.name || !form.start || !form.instructor) return
    setBatches([{ id: `batch-${Date.now()}`, ...form, size: 0 }, ...batches])
    setCreating(false)
    setForm({
      name: '',
      start: '',
      course: 'Luyện thi ĐGNL toàn diện',
      instructor: '',
      status: 'Sắp khai giảng',
    })
    action('Đã tạo batch mới. Bạn có thể mở batch để phân công và thêm học viên.')
  }
  const removeMember = (id) => {
    setMembers(members.filter((item) => item.id !== id))
    action('Đã xóa học viên khỏi batch.')
  }
  const addMember = () => {
    const item = students.find((student) => !members.some((member) => member.id === student.id))
    if (!item) return action('Không còn học viên mẫu để thêm.')
    setMembers([...members, item])
    action(`Đã thêm ${item.name} vào batch.`)
  }
  const statusClass = (status) =>
    status === 'Đang hoạt động' ? 'active' : status === 'Sắp khai giảng' ? 'upcoming' : 'ended'
  return (
    <>
      {page === 'batches' ? (
            <>
              <PageHeading
                title="Lớp học"
                subtitle="Lớp học và sĩ số."
                action={
                  <>
                    <Plus size={16} />
                    Thêm lớp
                  </>
                }
                onAction={() => setCreating(true)}
              />
              <section className="hl-batch-toolbar">
                <label>
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm lớp học, khóa học, giảng viên..."
                  />
                </label>
                <DropdownField
                  ariaLabel="Trạng thái lớp học"
                  className="w-auto"
                  options={toDropdownOptions([
                    'Tất cả',
                    'Đang hoạt động',
                    'Sắp khai giảng',
                    'Đã kết thúc',
                  ])}
                  value={filter}
                  onChange={(value) => {
                    if (value !== null) setFilter(value)
                  }}
                />
              </section>
              <div className="hl-batch-grid">
                {list.map((item) => (
                  <button
                    className="hl-batch-card"
                    key={item.id}
                    onClick={() => onNavigate('batch-detail')}
                  >
                    <div>
                      <span className="hl-staff-eyebrow">{item.course}</span>
                      <h2>{item.name}</h2>
                      <em className={statusClass(item.status)}>{item.status}</em>
                    </div>
                    <span className="hl-batch-card-meta">
                      <CalendarDays size={16} />
                      Khai giảng {item.start}
                    </span>
                    <span className="hl-batch-card-meta">
                      <Users size={16} />
                      {item.size} học viên
                    </span>
                    <span className="hl-batch-card-instructor">
                      {item.instructor}
                      <ChevronRight size={17} />
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button className="hl-staff-text-back" onClick={() => onNavigate('batches')}>
                ← Quay lại danh sách lớp học
              </button>
              <section className="hl-staff-panel hl-batch-hero">
                <div>
                  <span className="hl-staff-eyebrow">CHI TIẾT LỚP HỌC</span>
                  <h1>{batch.name}</h1>
                  <p>
                    {batch.course} · {members.length} học viên · {batch.instructor}
                  </p>
                </div>
                <em className="active">{batch.status}</em>
              </section>
              <nav className="hl-staff-detail-tabs">
                {[
                  ['students', 'Học viên'],
                  ['courses', 'Khóa học'],
                  ['instructors', 'Giảng viên'],
                  ['groups', 'Nhóm học'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={tab === key ? 'is-active' : ''}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              {tab === 'students' && (
                <section className="hl-staff-panel hl-batch-panel">
                  <div className="hl-staff-panel-heading">
                    <div>
                      <span className="hl-staff-eyebrow">HỌC VIÊN TRONG LỚP</span>
                      <h2>Danh sách học viên</h2>
                    </div>
                    <button className="hl-staff-primary" onClick={addMember}>
                      <UserPlus size={15} />
                      Thêm học viên
                    </button>
                  </div>
                  <div className="hl-batch-roster">
                    {members.map((student) => (
                      <div key={student.id}>
                        <Avatar student={student} />
                        <span>
                          <b>{student.name}</b>
                          <small>
                            {student.id} · {student.email}
                          </small>
                        </span>
                        <em>{student.attendance}% điểm danh</em>
                        <button onClick={() => removeMember(student.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {tab === 'courses' && (
                <section className="hl-staff-panel hl-batch-panel">
                  <Heading eyebrow="KHÓA HỌC TRONG LỚP" title="Chương trình áp dụng" />
                  <div className="hl-batch-course">
                    <BookOpen size={22} />
                    <div>
                      <b>{batch.course}</b>
                      <p>28 chuyên đề · 64 bài học</p>
                    </div>
                    <span>Đang áp dụng</span>
                  </div>
                </section>
              )}
              {tab === 'instructors' && (
                <section className="hl-staff-panel hl-batch-panel">
                  <Heading eyebrow="GIẢNG VIÊN" title="Giảng viên phụ trách" />
                  <div className="hl-batch-course">
                    <span className="hl-staff-avatar gold">NH</span>
                    <div>
                      <b>{batch.instructor}</b>
                      <p>Giảng viên chính</p>
                    </div>
                    <button
                      className="hl-staff-outline"
                      onClick={() => action('Đã mở phân công giảng viên.')}
                    >
                      Phân công lại
                    </button>
                  </div>
                </section>
              )}
              {tab === 'groups' && (
                <StudyGroupManagement batch={batch} members={members} onNotify={action} />
              )}
            </>
          )}
      {creating && (
        <BatchModal
          form={form}
          setForm={setForm}
          close={() => setCreating(false)}
          submit={createBatch}
        />
      )}
    </>
  )
}
function BatchModal({ form, setForm, close, submit }) {
  const update = (key, value) => setForm({ ...form, [key]: value })
  return (
    <div className="hl-staff-modal-backdrop">
      <form className="hl-staff-modal" onSubmit={submit}>
        <button className="hl-staff-modal-close" type="button" onClick={close}>
          <X size={19} />
        </button>
        <h2>Tạo lớp học mới</h2>
        <p>Thiết lập thông tin cơ bản trước khi thêm học viên và phân công giảng viên.</p>
        <label>
          Tên lớp học
          <input
            required
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Ví dụ: ĐGNL 12D · K24"
          />
        </label>
        <label>
          Ngày khai giảng
          <input
            required
            type="date"
            value={form.start}
            onChange={(event) => update('start', event.target.value)}
          />
        </label>
        <label>
          Khóa học
          <DropdownField
            ariaLabel="Khóa học"
            options={toDropdownOptions(['Luyện thi ĐGNL toàn diện', 'Nền tảng ĐGNL lớp 11'])}
            value={form.course}
            onChange={(value) => {
              if (value !== null) update('course', value)
            }}
          />
        </label>
        <label>
          Giảng viên phụ trách
          <input
            required
            value={form.instructor}
            onChange={(event) => update('instructor', event.target.value)}
            placeholder="ThS. Nguyễn Hoài Nam"
          />
        </label>
        <label>
          Trạng thái
          <DropdownField
            ariaLabel="Trạng thái lớp học"
            options={toDropdownOptions(['Sắp khai giảng', 'Đang hoạt động'])}
            value={form.status}
            onChange={(value) => {
              if (value !== null) update('status', value)
            }}
          />
        </label>
        <div className="hl-staff-modal-actions">
          <button type="button" onClick={close}>
            Hủy
          </button>
          <button className="hl-staff-primary" type="submit">
            <Plus size={16} />
            Tạo lớp học
          </button>
        </div>
      </form>
    </div>
  )
}

export default StaffDashboard

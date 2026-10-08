import { lazy, Suspense } from 'react'
import { BookOpen, CalendarDays, ClipboardCheck, LayoutDashboard, Users } from 'lucide-react'
import AdminOverview from '../admin/AdminOverview'
import UserManagement from '../admin/UserManagement'
import ManagementCourseList from './ManagementCourseList'
import ManagerOverview from './ManagerOverview'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'
import Notice from '../ui/Notice'
import PageHeading from '../ui/PageHeading'
import type { ManagementRole } from './ManagementRouteGuard'
import RoleShell, { type RoleShellNavItem } from './role-shell'

const SchedulingPage = lazy(() => import('../../pages/management/SchedulingPage'))
const AttendanceManagementPage = lazy(() => import('../../pages/management/AttendanceManagementPage'))

interface ManagementDashboardProps {
  role: ManagementRole
  page: string
  onNavigate: (page: string) => void
  onLogout: () => void
  logoutLoading: boolean
}

const ROLE_LABELS: Record<ManagementRole, string> = {
  ADMINISTRATOR: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên',
  TEACHER: 'Giáo viên',
  MENTOR: 'Mentor',
}

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Tổng quan',
    subtitle: 'Theo dõi tài khoản và quyền truy cập.',
  },
  users: {
    title: 'Người dùng',
    subtitle: 'Tài khoản và quyền truy cập.',
  },
  courses: {
    title: 'Khóa học',
    subtitle: 'Danh sách khóa học đang mở.',
  },
  students: {
    title: 'Học viên',
    subtitle: 'Hồ sơ và tiến độ học tập.',
  },
  enrollments: {
    title: 'Ghi danh',
    subtitle: 'Đăng ký học và học phí.',
  },
  batches: {
    title: 'Lớp học',
    subtitle: 'Lớp học và sĩ số.',
  },
  schedules: {
    title: 'Lịch học',
    subtitle: 'Lịch học và phòng học.',
  },
  attendance: {
    title: 'Điểm danh',
    subtitle: 'Tình trạng tham gia lớp học.',
  },
  tuition: {
    title: 'Học phí',
    subtitle: 'Công nợ và hạn nộp.',
  },
  invoices: {
    title: 'Hóa đơn',
    subtitle: 'Hóa đơn và lịch sử thanh toán.',
  },
  payments: {
    title: 'Thanh toán',
    subtitle: 'Giao dịch của học viên.',
  },
  'mentor-dashboard': {
    title: 'Tổng quan mentor',
    subtitle: 'Khu vực dành cho mentor.',
  },
}

const NAV_ITEMS: RoleShellNavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'users', label: 'Người dùng', icon: Users },
]

const STAFF_NAV_ITEMS: RoleShellNavItem[] = [
  ...NAV_ITEMS,
  { key: 'schedules', label: 'Lịch học', icon: CalendarDays },
  { key: 'attendance', label: 'Điểm danh', icon: ClipboardCheck },
]

const MANAGER_NAV_ITEMS: RoleShellNavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'courses', label: 'Khóa học', icon: BookOpen },
  { key: 'schedules', label: 'Lịch học', icon: CalendarDays },
]

function UnavailablePage({ page }: { page: string }) {
  const meta = PAGE_META[page] ?? {
    title: 'Màn hình quản lý',
    subtitle: 'Quản lý dữ liệu vận hành.',
  }

  return (
    <section className="space-y-5">
      <PageHeading title={meta.title} subtitle={meta.subtitle} />
      <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-10 text-center">
        <h2 className="text-lg font-semibold text-text-heading">Chưa sẵn sàng</h2>
        <p className="mx-auto mt-2 max-w-[520px] text-sm leading-6 text-text-muted">
          Backend chưa có API vận hành cho màn này. Màn hình sẽ được mở sau khi có contract và phân quyền
          tương ứng; hệ thống không hiển thị dữ liệu mẫu.
        </p>
      </div>
    </section>
  )
}

function RestrictedAttendancePage() {
  return (
    <section className="space-y-5">
      <PageHeading title="Điểm danh" subtitle="Tình trạng tham gia lớp học." />
      <Notice tone="warning">
        PR #13 không cấp quyền xem hoặc sửa điểm danh cho Manager. Tài khoản Staff hoặc giáo viên được phân công có thể thao tác theo đúng quyền backend.
      </Notice>
    </section>
  )
}

function ManagementDashboard({
  role,
  page,
  onNavigate,
  onLogout,
  logoutLoading,
}: ManagementDashboardProps) {
  const effectivePage = role === 'MENTOR' && page === 'dashboard' ? 'mentor-dashboard' : page
  const meta = PAGE_META[effectivePage] ?? PAGE_META.dashboard
  const roleLabel = ROLE_LABELS[role]
  const areaLabel =
    role === 'ADMINISTRATOR' ? 'Quản trị' : role === 'MENTOR' ? 'Mentor' : 'Vận hành'
  const navigationItems =
    role === 'MENTOR'
      ? NAV_ITEMS.filter((item) => item.key === 'dashboard')
      : role === 'MANAGER'
        ? MANAGER_NAV_ITEMS
        : role === 'STAFF'
          ? STAFF_NAV_ITEMS
          : NAV_ITEMS

  return (
    <RoleShell
      roleLabel={roleLabel}
      areaLabel={areaLabel}
      pageTitle={meta.title}
      navGroups={[{ label: areaLabel, items: navigationItems }]}
      activeKey={effectivePage}
      onNavigate={onNavigate}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      {effectivePage === 'courses' && role === 'MANAGER' ? (
        <>
          <PageHeading title={meta.title} subtitle={meta.subtitle} />
          <ManagementCourseList />
        </>
      ) : effectivePage === 'users' && (role === 'STAFF' || role === 'ADMINISTRATOR') ? (
        <>
          <PageHeading title={meta.title} subtitle={meta.subtitle} />
          <UserManagement readOnly={role === 'STAFF'} canCreateUsers={role === 'ADMINISTRATOR'} />
        </>
      ) : effectivePage === 'schedules' && (role === 'STAFF' || role === 'MANAGER') ? (
        <Suspense fallback={<SchedulingPageFallback title="Lịch học" />}>
          <SchedulingPage role={role} />
        </Suspense>
      ) : effectivePage === 'attendance' && role === 'STAFF' ? (
        <Suspense fallback={<SchedulingPageFallback title="Điểm danh" />}>
          <AttendanceManagementPage />
        </Suspense>
      ) : effectivePage === 'attendance' && role === 'MANAGER' ? (
        <RestrictedAttendancePage />
      ) : effectivePage === 'dashboard' && role === 'MANAGER' ? (
        <>
          <PageHeading title={meta.title} subtitle={meta.subtitle} />
          <ManagerOverview onNavigate={onNavigate} />
        </>
      ) : effectivePage === 'dashboard' && role !== 'MENTOR' ? (
        <>
          <PageHeading title={meta.title} subtitle={meta.subtitle} />
          <AdminOverview onNavigate={onNavigate} areaLabel={areaLabel.toLocaleLowerCase('vi-VN')} />
        </>
      ) : (
        <UnavailablePage page={effectivePage} />
      )}
    </RoleShell>
  )
}

export default ManagementDashboard

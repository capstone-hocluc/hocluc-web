import { lazy, Suspense, useState } from 'react'
import { BookOpen, CalendarDays, ChevronRight, ClipboardCheck, LayoutDashboard, LogOut, Menu, Users } from 'lucide-react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import Logo from '../common/Logo'
import AdminOverview from '../admin/AdminOverview'
import UserManagement from '../admin/UserManagement'
import ManagementCourseList from './ManagementCourseList'
import ManagerOverview from './ManagerOverview'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'
import Button from '../ui/Button'
import NavItem, { SidebarGroupLabel } from '../ui/NavItem'
import PageHeading from '../ui/PageHeading'
import Sidebar from '../ui/Sidebar'
import type { ManagementRole } from './ManagementRouteGuard'
import Notice from '../ui/Notice'
import RoleSwitcher from '../ui/RoleSwitcher'

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

const NAV_ITEMS = [
  { page: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { page: 'users', label: 'Người dùng', icon: Users },
]

const STAFF_NAV_ITEMS = [
  ...NAV_ITEMS,
  { page: 'schedules', label: 'Lịch học', icon: CalendarDays },
  { page: 'attendance', label: 'Điểm danh', icon: ClipboardCheck },
]

const MANAGER_NAV_ITEMS = [
  { page: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { page: 'courses', label: 'Khóa học', icon: BookOpen },
  { page: 'schedules', label: 'Lịch học', icon: CalendarDays },
]

function getInitials(profile: { firstName?: string; lastName?: string; email: string }) {
  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.trim()
  return initials || profile.email.slice(0, 2).toUpperCase()
}

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
  const { profile } = useCurrentUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const effectivePage = role === 'MENTOR' && page === 'dashboard' ? 'mentor-dashboard' : page
  const meta = PAGE_META[effectivePage] ?? PAGE_META.dashboard
  const roleLabel = ROLE_LABELS[role]
  const areaLabel =
    role === 'ADMINISTRATOR' ? 'Quản trị' : role === 'MENTOR' ? 'Mentor' : 'Vận hành'
  const navigationItems =
    role === 'MENTOR'
      ? NAV_ITEMS.filter((item) => item.page === 'dashboard')
      : role === 'MANAGER'
        ? MANAGER_NAV_ITEMS
        : role === 'STAFF'
          ? STAFF_NAV_ITEMS
          : NAV_ITEMS
  const displayName = profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')

  return (
    <main className="flex min-h-screen bg-surface-soft text-text-heading">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        brand={<Logo />}
        roleLabel={roleLabel}
        user={
          profile
            ? {
                initials: getInitials(profile),
                name: displayName || profile.email,
                role: roleLabel,
              }
            : undefined
        }
        onUserClick={onLogout}
        footer={
          <Button
            variant="primary"
            appearance="ghost"
            size="sm"
            className="w-full justify-start px-3 text-text-muted"
            onClick={onLogout}
            disabled={logoutLoading}
          >
            <LogOut size={16} />
            {logoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </Button>
        }
      >
        <SidebarGroupLabel>{areaLabel}</SidebarGroupLabel>
        {navigationItems.map(({ page: itemPage, label, icon }) => (
          <NavItem
            key={itemPage}
            icon={icon}
            label={label}
            active={effectivePage === itemPage}
            onClick={() => {
              setSidebarOpen(false)
              onNavigate(itemPage)
            }}
          />
        ))}
      </Sidebar>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border-subtle bg-surface px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-hover lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden items-center gap-2 text-sm text-text-muted sm:flex">
            <span>{areaLabel}</span>
            <ChevronRight size={15} />
            <strong className="font-semibold text-text-heading">{meta.title}</strong>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <RoleSwitcher />
            <span className="hidden text-right sm:block">
              <strong className="block text-sm font-semibold text-text-heading">
                {displayName || profile?.email || roleLabel}
              </strong>
              <small className="block text-xs text-text-muted">{roleLabel}</small>
            </span>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full bg-badge-info-bg text-sm font-semibold text-badge-info-text"
              onClick={onLogout}
              aria-label="Mở tài khoản"
            >
              {profile ? getInitials(profile) : roleLabel.slice(0, 2)}
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
          {effectivePage === 'courses' && role === 'MANAGER' ? (
            <>
              <PageHeading title={meta.title} subtitle={meta.subtitle} />
              <ManagementCourseList />
            </>
          ) : effectivePage === 'users' && role === 'STAFF' ? (
            <>
              <PageHeading title={meta.title} subtitle={meta.subtitle} />
              <UserManagement readOnly />
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
        </div>
      </section>
    </main>
  )
}

export default ManagementDashboard

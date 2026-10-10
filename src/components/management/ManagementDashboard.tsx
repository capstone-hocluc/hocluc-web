import { lazy, Suspense, type ReactNode } from 'react'
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  ShoppingCart,
  Sparkles,
  Users,
} from '../console/icons'
import ConsoleShell from '../console/console-shell'
import ProfilePage from '../console/profile-page'
import AdminOverview from '../admin/AdminOverview'
import UserManagement from '../admin/UserManagement'
import ManagementCourseList from './ManagementCourseList'
import CategoryManagement from './crud/category-management'
import ManagerOverview from './ManagerOverview'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'
import PageHeading from '../console/page-heading'
import type { ManagementRole } from './ManagementRouteGuard'
import Notice from '../console/notice'
import {
  AdminAuditLog,
  AdminBlueprints,
  AdminTaxonomy,
  MentorGroups,
  MentorOverview,
  MentorSolutionQueue,
  MentorStudents,
  StaffEnrollments,
  StaffGroups,
  StaffOrders,
} from './role-screens'
import { QuestionReview } from './quiz-review-screens'

const SchedulingPage = lazy(() => import('../../pages/management/SchedulingPage'))
const AttendanceManagementPage = lazy(() => import('../../pages/management/AttendanceManagementPage'))

interface ManagementDashboardProps {
  role: ManagementRole
  page: string
  onNavigate: (page: string) => void
  onLogout: () => void
  logoutLoading: boolean
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
    subtitle: 'Khóa trọn bộ và khóa nhỏ.',
  },
  categories: {
    title: 'Danh mục',
    subtitle: 'Phân loại khóa học và nội dung.',
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

const ADMIN_NAV_ITEMS = [
  ...NAV_ITEMS,
  { page: 'courses', label: 'Khóa học', icon: BookOpen },
  { page: 'categories', label: 'Danh mục', icon: Layers3 },
  { page: 'blueprints', label: 'Blueprint đề thi', icon: FileText },
  { page: 'taxonomy', label: 'Phân loại kiến thức', icon: Layers3 },
  { page: 'audit-log', label: 'Nhật ký hoạt động', icon: ClipboardList },
]

const STAFF_NAV_ITEMS = [
  ...NAV_ITEMS,
  { page: 'courses', label: 'Khóa học', icon: BookOpen },
  { page: 'categories', label: 'Danh mục', icon: Layers3 },
  { page: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
  { page: 'enrollments', label: 'Ghi danh', icon: GraduationCap },
  { page: 'groups', label: 'Nhóm học', icon: Users },
  { page: 'question-review', label: 'Duyệt câu hỏi', icon: ListChecks },
  { page: 'schedules', label: 'Lịch học', icon: CalendarDays },
  { page: 'attendance', label: 'Điểm danh', icon: ClipboardCheck },
]

const MENTOR_NAV_ITEMS = [
  { page: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { page: 'groups', label: 'Nhóm của tôi', icon: Users },
  { page: 'students', label: 'Học viên', icon: GraduationCap },
  { page: 'solution-queue', label: 'Duyệt lời giải AI', icon: Sparkles },
]

const MANAGER_NAV_ITEMS = [
  { page: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { page: 'courses', label: 'Khóa học', icon: BookOpen },
  { page: 'categories', label: 'Danh mục', icon: Layers3 },
  { page: 'schedules', label: 'Lịch học', icon: CalendarDays },
]

// Màn hình theo vai trò chạy bằng dữ liệu mẫu (xem role-screens.tsx).
const ROLE_SCREENS: Partial<Record<ManagementRole, Record<string, (props: { onNavigate: (page: string) => void }) => ReactNode>>> = {
  ADMINISTRATOR: {
    blueprints: () => <AdminBlueprints />,
    taxonomy: () => <AdminTaxonomy />,
    'audit-log': () => <AdminAuditLog />,
  },
  STAFF: {
    orders: () => <StaffOrders />,
    enrollments: () => <StaffEnrollments />,
    groups: () => <StaffGroups />,
    'question-review': () => <QuestionReview />,
  },
  MENTOR: {
    'mentor-dashboard': ({ onNavigate }) => <MentorOverview onNavigate={onNavigate} />,
    groups: () => <MentorGroups />,
    students: () => <MentorStudents />,
    'solution-queue': () => <MentorSolutionQueue />,
  },
}

function UnavailablePage({ page }: { page: string }) {
  const meta = PAGE_META[page] ?? {
    title: 'Màn hình quản lý',
    subtitle: 'Quản lý dữ liệu vận hành.',
  }

  return (
    <section className="space-y-5">
      <PageHeading title={meta.title} />
      <div className="rounded-xl border border-card-border bg-card-background px-5 py-10 text-center">
        <h2 className="text-lg font-medium text-text-primary">Chưa sẵn sàng</h2>
        <p className="mt-2 text-sm text-text-tertiary">Chưa có API cho màn này.</p>
      </div>
    </section>
  )
}

function RestrictedAttendancePage() {
  return (
    <section className="space-y-5">
      <PageHeading title="Điểm danh" subtitle="Tình trạng tham gia lớp học." />
      <Notice tone="warning">
        Tài khoản Quản lý không có quyền xem điểm danh.
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
  const areaLabel =
    role === 'ADMINISTRATOR' ? 'Quản trị' : role === 'MENTOR' ? 'Mentor' : 'Vận hành'
  const navigationItems =
    role === 'MENTOR'
      ? MENTOR_NAV_ITEMS
      : role === 'MANAGER'
        ? MANAGER_NAV_ITEMS
        : role === 'STAFF'
          ? STAFF_NAV_ITEMS
          : ADMIN_NAV_ITEMS

  const sections = [
    {
      label: areaLabel,
      items: navigationItems.map(({ page: key, label: title, icon }) => ({ key, title, icon })),
    },
  ]
  const showProfile = effectivePage === 'profile'

  return (
    <ConsoleShell
      sections={sections}
      activeKey={effectivePage}
      onNavigate={onNavigate}
      onOpenProfile={() => onNavigate('profile')}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      {showProfile ? (
        <ProfilePage />
      ) : ROLE_SCREENS[role]?.[effectivePage] ? (
        ROLE_SCREENS[role][effectivePage]({ onNavigate })
      ) : effectivePage === 'courses' && (role === 'MANAGER' || role === 'STAFF' || role === 'ADMINISTRATOR') ? (
        <>
          <PageHeading title={meta.title} />
          <ManagementCourseList readOnly={role === 'MANAGER'} />
        </>
      ) : effectivePage === 'categories' && (role === 'MANAGER' || role === 'STAFF' || role === 'ADMINISTRATOR') ? (
        <>
          <PageHeading title={meta.title} />
          <CategoryManagement readOnly={role === 'MANAGER'} />
        </>
      ) : effectivePage === 'users' && role === 'ADMINISTRATOR' ? (
        <>
          <PageHeading title={meta.title} />
          <UserManagement canCreateUsers />
        </>
      ) : effectivePage === 'users' && role === 'STAFF' ? (
        <>
          <PageHeading title={meta.title} />
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
          <PageHeading title={meta.title} />
          <ManagerOverview onNavigate={onNavigate} />
        </>
      ) : effectivePage === 'dashboard' && role !== 'MENTOR' ? (
        <>
          <PageHeading title={meta.title} />
          <AdminOverview onNavigate={onNavigate} areaLabel={areaLabel.toLocaleLowerCase('vi-VN')} />
        </>
      ) : (
        <UnavailablePage page={effectivePage} />
      )}
    </ConsoleShell>
  )
}
export default ManagementDashboard

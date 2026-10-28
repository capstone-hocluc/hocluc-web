import { lazy, Suspense } from 'react'
import { DashboardActions, RoleDashboardWelcome } from '../common/DashboardWelcome'
import MentorChatScreen from './screens/MentorChatScreen'
import ChatAssignmentScreen from './screens/ChatAssignmentScreen'
import ChatFeatureGate from '../chat-feature-gate'
import ConsoleShell from '../console/console-shell'
import ProfilePage from '../console/profile-page'
import { ComingSoonPage, ForbiddenPage, NotFoundPage } from '../console/access-states'
import AdminOverview from '../admin/AdminOverview'
import UserManagement from '../admin/UserManagement'
import ManagementCourseList from './ManagementCourseList'
import CategoryManagement from './crud/category-management'
import MasterDataManagement from './master-data/master-data-management'
import ExamYearManagement from './crud/exam-year-management'
import OrderManagement from './crud/order-management'
import EnrollmentManagement from './crud/enrollment-management'
import ManagerOverview from './ManagerOverview'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'
import PageHeading from '../console/page-heading'
import type { ManagementRole } from './ManagementRouteGuard'
import {
  AdminAuditLog,
  AdminBlueprints,
  MentorOverview,
  MentorSolutionQueue,
  MentorStudents,
} from './role-screens'
import QuizConsoleScreen from './quiz/QuizConsoleScreen'
import QuestionBankWorkspace from './question-bank/QuestionBankWorkspace'
import { isQuizPage, quizMenuPage, quizSidebarPage } from '../../lib/console-routes'
import { buildNavSections, canWrite, findNavItem, isKnownPage, navLabel } from '../../lib/console-nav'

const SchedulingPage = lazy(() => import('../../pages/management/SchedulingPage'))
const AttendanceManagementPage = lazy(
  () => import('../../pages/management/AttendanceManagementPage')
)

interface ManagementScreenProps {
  role: ManagementRole
  page: string
  onNavigate: (page: string) => void
  conversationId?: string
  onSelectConversation?: (id?: string) => void
}

/**
 * The screen for one console page. Pages the role has no menu entry for render the
 * shared 403 page, or the 404 page when no role has one; entries without a screen yet render "Đang phát triển".
 * TeacherDashboard renders the pages it shares with other roles through this too.
 */
export function ManagementScreen({
  role,
  page,
  onNavigate,
  conversationId,
  onSelectConversation = () => undefined,
}: ManagementScreenProps) {
  const item = findNavItem(role, quizMenuPage(page))
  if (!item) return isKnownPage(quizMenuPage(page)) ? <ForbiddenPage /> : <NotFoundPage />
  const title = navLabel(role, item)
  if (item.soon) return <ComingSoonPage title={title} />
  const readOnly = !canWrite(role, page)

  if (isQuizPage(page)) return <QuizConsoleScreen role={role} page={page} onNavigate={onNavigate} />

  switch (page) {
    case 'dashboard':
      return (
        <>
          <RoleDashboardWelcome role={role} />
          {role === 'MENTOR' ? (
            <MentorOverview onNavigate={onNavigate} />
          ) : role === 'MANAGER' ? (
            <ManagerOverview onNavigate={onNavigate} />
          ) : (
            <AdminOverview
              onNavigate={onNavigate}
              areaLabel={role === 'ADMINISTRATOR' ? 'quản trị' : 'vận hành'}
            />
          )}
          <DashboardActions role={role} onNavigate={onNavigate} />
        </>
      )
    case 'users':
      return (
        <>
          <PageHeading title={title} readOnly={readOnly} />
          <UserManagement audience="staff" readOnly={readOnly} canCreateUsers={role === 'ADMINISTRATOR'} />
        </>
      )
    case 'learners':
      return (
        <>
          <PageHeading title={title} readOnly={readOnly} />
          <UserManagement audience="students" readOnly={readOnly} canCreateUsers={role === 'ADMINISTRATOR'} />
        </>
      )
    case 'audit-log':
      return <AdminAuditLog />
    case 'question-bank':
      return <QuestionBankWorkspace title={title} readOnly={readOnly} onBack={() => onNavigate('dashboard')} />
    case 'taxonomy':
      return <MasterDataManagement title={title} reader={readOnly} />
    case 'blueprints':
      return <AdminBlueprints />
    case 'categories':
      return <CategoryManagement readOnly={readOnly} />
    case 'exam-years':
      return <ExamYearManagement readOnly={readOnly} title={title} />
    case 'courses':
      return <ManagementCourseList readOnly={readOnly} title={title} />
    case 'schedules':
      return (
        <Suspense fallback={<SchedulingPageFallback title={title} />}>
          <SchedulingPage role={role === 'MANAGER' ? 'MANAGER' : 'STAFF'} />
        </Suspense>
      )
    case 'attendance':
      return (
        <Suspense fallback={<SchedulingPageFallback title={title} />}>
          <AttendanceManagementPage />
        </Suspense>
      )
    case 'students':
      return <MentorStudents />
    case 'enrollments':
      return (
        <>
          <PageHeading title={title} readOnly={readOnly} />
          <EnrollmentManagement readOnly={readOnly} />
        </>
      )
    case 'orders':
      return (
        <>
          <PageHeading title={title} readOnly={readOnly} />
          {/* Confirming a payment by hand stays administrator-only, as on the backend. */}
          <OrderManagement readOnly={readOnly} canConfirm={role === 'ADMINISTRATOR'} />
        </>
      )
    case 'solution-queue':
      return <MentorSolutionQueue />
    case 'chat':
      return (
        <ChatFeatureGate console>
          <MentorChatScreen
            conversationId={conversationId}
            onSelectConversation={onSelectConversation}
          />
        </ChatFeatureGate>
      )
    case 'chat-queue':
    case 'chat-monitoring':
      return (
        <ChatFeatureGate console>
          <ChatAssignmentScreen
            role={role}
            conversationId={conversationId}
            onSelectConversation={onSelectConversation}
          />
        </ChatFeatureGate>
      )
    default:
      return <ComingSoonPage title={title} />
  }
}

interface ManagementDashboardProps {
  role: ManagementRole
  page: string
  onNavigate: (page: string) => void
  onLogout: () => void
  logoutLoading: boolean
  conversationId?: string
  onSelectConversation: (id?: string) => void
}

function ManagementDashboard({
  role,
  page,
  onNavigate,
  onLogout,
  logoutLoading,
  conversationId,
  onSelectConversation,
}: ManagementDashboardProps) {
  return (
    <ConsoleShell
      sections={buildNavSections(role)}
      activeKey={quizSidebarPage(page)}
      onNavigate={onNavigate}
      onOpenProfile={() => onNavigate('profile')}
      onLogout={onLogout}
      logoutLoading={logoutLoading}
    >
      {page === 'profile' ? (
        <ProfilePage />
      ) : (
        <ManagementScreen
          role={role}
          page={page}
          onNavigate={onNavigate}
          conversationId={conversationId}
          onSelectConversation={onSelectConversation}
        />
      )}
    </ConsoleShell>
  )
}
export default ManagementDashboard

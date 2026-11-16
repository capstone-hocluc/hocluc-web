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
import MasterDataManagement from './master-data/master-data-management'
import ExamYearManagement from './crud/exam-year-management'
import OrderManagement from './crud/order-management'
import CreditManagement from './crud/credit-management'
import EnrollmentManagement from './crud/enrollment-management'
import ManagerOverview from './ManagerOverview'
import SchedulingPageFallback from '../scheduling/SchedulingPageFallback'
import type { ManagementRole } from './ManagementRouteGuard'
import {
  AdminAuditLog,
  MentorSolutionQueue,
  MentorStudents,
} from './role-screens'
import QuizConsoleScreen from './quiz/QuizConsoleScreen'
import QuestionBankScreen from './question-bank/QuestionBankScreen'
import AiAssistantWorkspace from './ai-assistant/AiAssistantWorkspace'
import { isQuizPage, quizMenuPage } from '../../lib/console-routes'
import {
  buildNavSections,
  canAccessPage,
  canWrite,
  findNavItem,
  isKnownPage,
  navLabel,
  pageTabs,
  sidebarPage,
} from '../../lib/console-nav'
import { PageTabs, PageTabsList } from '../console/page-tabs'
import { roleHome } from '../../lib/role-home'

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
  if (item.soon) return <ComingSoonPage title={navLabel(role, item)} />
  const readOnly = !canWrite(role, page)

  if (isQuizPage(page)) return <QuizConsoleScreen role={role} page={page} onNavigate={onNavigate} />

  // Pages that share a sidebar entry carry its name and show a tab row under the heading.
  const tabs = pageTabs(role, page)
  const title = navLabel(role, (tabs.length > 0 && findNavItem(role, tabs[0].page)) || item)
  const navigation = tabs.length > 0 ? <PageTabsList tabs={tabs} label={title} /> : undefined
  const screen = renderScreen()
  if (!tabs.length) return screen
  return (
    <PageTabs value={tabs.some((tab) => tab.page === page) ? page : tabs[0].page} onNavigate={onNavigate}>
      {screen}
    </PageTabs>
  )

  function renderScreen() {
    switch (page) {
      case 'dashboard':
        return (
          <>
            <RoleDashboardWelcome role={role} />
            {role === 'MANAGER' ? (
              <ManagerOverview onNavigate={onNavigate} />
            ) : role !== 'MENTOR' ? (
              <AdminOverview
                onNavigate={onNavigate}
                areaLabel={role === 'ADMINISTRATOR' ? 'quản trị' : 'vận hành'}
              />
            ) : null}
            <DashboardActions role={role} onNavigate={onNavigate} />
          </>
        )
      case 'users':
        return <UserManagement audience="staff" title={title} readOnly={readOnly} canCreateUsers={role === 'ADMINISTRATOR'} />
      case 'learners':
        return <UserManagement audience="students" title={title} navigation={navigation} readOnly={readOnly} canCreateUsers={role === 'ADMINISTRATOR'} />
      case 'audit-log':
        return <AdminAuditLog />
      case 'question-bank':
        return <QuestionBankScreen title={title} readOnly={readOnly} onNavigate={onNavigate} />
      case 'taxonomy':
        return (
          <MasterDataManagement
            title={title}
            reader={readOnly}
            role={role}
            onBack={canAccessPage(role, 'question-bank') ? () => onNavigate('question-bank') : undefined}
          />
        )
      case 'exam-years':
        return <ExamYearManagement readOnly={readOnly} title={title} navigation={navigation} />
      // The old subject page is the same merged screen; its URL keeps working.
      case 'categories':
      case 'courses':
        return (
          <ManagementCourseList readOnly={readOnly} title={title} navigation={navigation} />
        )
      case 'schedules':
        return (
          <Suspense fallback={<SchedulingPageFallback title={title} />}>
            <SchedulingPage role={role === 'MANAGER' ? 'MANAGER' : 'STAFF'} navigation={navigation} />
          </Suspense>
        )
      case 'attendance':
        return (
          <Suspense fallback={<SchedulingPageFallback title={title} />}>
            <AttendanceManagementPage title={title} navigation={navigation} />
          </Suspense>
        )
      case 'students':
        return <MentorStudents />
      case 'enrollments':
        return <EnrollmentManagement readOnly={readOnly} title={title} navigation={navigation} />
      case 'orders':
        return (
          // Confirming a payment by hand stays administrator-only, as on the backend.
          <OrderManagement readOnly={readOnly} canConfirm={role === 'ADMINISTRATOR'} title={title} navigation={navigation} />
        )
      case 'credits':
        return (
          // Packs: administrator and manager; balance corrections and the grant: administrator only.
          <CreditManagement
            title={title}
            navigation={navigation}
            canEditPacks={role === 'ADMINISTRATOR' || role === 'MANAGER'}
            canAdjust={role === 'ADMINISTRATOR'}
          />
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
  // The assistant is its own full-screen workspace, outside the console chrome.
  if (page === 'ai-assistant' && canAccessPage(role, page)) {
    return (
      <AiAssistantWorkspace
        onBack={() => onNavigate('question-bank')}
        // The backend lets staff and above load a paper (it costs tokens); a teacher only opens loaded ones.
        canImport={role === 'STAFF' || role === 'MANAGER' || role === 'ADMINISTRATOR'}
        backHref={roleHome(role).replace('/dashboard', '/question-bank')}
      />
    )
  }

  return (
    <ConsoleShell
      sections={buildNavSections(role)}
      activeKey={sidebarPage(role, page)}
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

import { type ReactNode, useState } from 'react'
import StudentSidebar from './StudentSidebar'
import StudentTopbar from './StudentTopbar'
import { useCurrentUser, useHydrateCurrentUser } from '../../../hooks/useCurrentUser'
import { useTransientMessage } from '../../../hooks/useTransientMessage'
import StudentToast from '../common/StudentToast'
import { dashboardSummary } from '../../../data/studentDashboard'
import { getAccessToken } from '../../../lib/api'
import { getStudentNavKeyForPath } from '../../../lib/studentNav'
import { studentRoutes } from '../../../lib/studentRoutes'
import { cn } from '../../../lib/cn'

interface StudentLayoutProps {
  currentPath: string
  onNavigate: (path: string) => void
  onLogout?: () => void
  logoutLoading?: boolean
  children: ReactNode
}

// The one shell every /student/... screen renders inside (learning, courses,
// lessons, quizzes, results, review...): sticky topbar, icon-rail sidebar and
// the page area (`children` is the routed page). Pages never render their own
// header/sidebar; the sidebar highlight is derived from the current URL.
function StudentLayout({
  currentPath,
  onNavigate,
  onLogout,
  logoutLoading = false,
  children,
}: StudentLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const { message, show: notify } = useTransientMessage()
  // The one place that restores the signed-in user after F5; the topbar only reads it.
  useHydrateCurrentUser()
  const { profile, status } = useCurrentUser()

  return (
    <div
      className={cn(
        'grid min-h-screen grid-rows-[86px_minmax(0,1fr)] bg-app-bg text-text-heading transition-[grid-template-columns] duration-250',
        sidebarCollapsed ? 'grid-cols-[92px_minmax(0,1fr)]' : 'grid-cols-[260px_minmax(0,1fr)]',
        'max-[1180px]:grid-cols-[92px_minmax(0,1fr)] max-[760px]:block'
      )}
    >
      <StudentTopbar
        profile={profile}
        // MOCK: backend has no streak / notification endpoint yet.
        streak={dashboardSummary.currentStreak}
        notificationCount={dashboardSummary.notificationCount}
        profileLoading={status === 'loading' || (status === 'idle' && Boolean(getAccessToken()))}
        onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
        onNavigateHome={() => onNavigate(studentRoutes.dashboard())}
        onNavigateLearningProfile={() => onNavigate(studentRoutes.learningProfile())}
        onNavigateProfile={() => onNavigate(studentRoutes.profile())}
        onLogout={onLogout}
        logoutLoading={logoutLoading}
        onNotify={notify}
      />
      <StudentSidebar
        activeKey={getStudentNavKeyForPath(currentPath)}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
      />
      <main className="col-start-2 row-start-2 min-w-0 p-[35px] max-[760px]:px-3.5 max-[760px]:pt-5 max-[760px]:pb-7">
        {children}
      </main>
      <StudentToast message={message} />
    </div>
  )
}

export default StudentLayout

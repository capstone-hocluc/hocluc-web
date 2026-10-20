import { type ReactNode, useEffect, useState } from 'react'
import StudentSidebar from './StudentSidebar'
import StudentTopbar from './StudentTopbar'
import { useCurrentUser, useHydrateCurrentUser } from '../../../hooks/useCurrentUser'
import { useLearnerTheme } from '../../../hooks/useLearnerTheme'
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
// While mounted it opts into the learner token set (student-theme.css), which
// also reaches portals such as menus and dialogs.
function StudentLayout({
  currentPath,
  onNavigate,
  onLogout,
  logoutLoading = false,
  children,
}: StudentLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)')
    const onChange = () => {
      if (!query.matches) setMobileNavigationOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  const { message, show: notify } = useTransientMessage()
  // The one place that restores the signed-in user after F5; the topbar only reads it.
  useHydrateCurrentUser()
  const { profile, status } = useCurrentUser()

  useLearnerTheme()

  return (
    <div
      className={cn(
        'dashboard-layout student-layout grid min-h-screen grid-rows-[72px_minmax(0,1fr)] bg-app-bg text-text-heading transition-[grid-template-columns] duration-250',
        sidebarCollapsed ? 'grid-cols-[80px_minmax(0,1fr)]' : 'grid-cols-[248px_minmax(0,1fr)]',
        'max-[1180px]:grid-cols-[80px_minmax(0,1fr)] max-[760px]:block'
      )}
    >
      <a
        href="#student-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-90 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:text-white"
      >
        Đến nội dung học tập
      </a>
      <StudentTopbar
        profile={profile}
        // Streak remains a mock until the backend provides it.
        streak={dashboardSummary.currentStreak}
        profileLoading={status === 'loading' || (status === 'idle' && Boolean(getAccessToken()))}
        onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
        sidebarCollapsed={sidebarCollapsed}
        onOpenNavigation={() => setMobileNavigationOpen(true)}
        mobileNavigationOpen={mobileNavigationOpen}
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
        mobileOpen={mobileNavigationOpen}
        onCloseMobile={() => setMobileNavigationOpen(false)}
      />
      <main
        id="student-content"
        tabIndex={-1}
        className="col-start-2 row-start-2 min-w-0 px-8 pt-8 pb-12 max-[760px]:px-4 max-[760px]:pt-6 max-[760px]:pb-8"
      >
        {children}
      </main>
      <StudentToast message={message} />
    </div>
  )
}

export default StudentLayout

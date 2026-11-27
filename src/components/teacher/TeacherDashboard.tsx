import { lazy, Suspense, useEffect, useState } from 'react'
import ConsoleShell from '../console/console-shell'
import ProfilePage from '../console/profile-page'
import SchedulingPageFallback from '../console/schedule/scheduling-page-fallback'
import { buildNavSections, canAccessPage, sidebarPage } from '../../lib/console-nav'
import type { CourseAdmin } from '../../services/courseAdminService'
import { DashboardActions, RoleDashboardWelcome } from '../common/DashboardWelcome'
import TeacherCourses from './TeacherCourses'
import TeacherDashboardOverview from './TeacherDashboardOverview'

const TeacherSchedulePage = lazy(() => import('../../pages/teacher/TeacherSchedulePage'))
const TeacherAvailabilityPage = lazy(() => import('../../pages/teacher/TeacherAvailabilityPage'))

interface TeacherDashboardProps {
  page?: string
  onNavigate?: (page: string) => void
  onRedirectHome?: () => void
  onLogout?: () => void
  logoutLoading?: boolean
}

function TeacherDashboard({
  page = 'dashboard',
  onNavigate,
  onRedirectHome,
  onLogout,
  logoutLoading = false,
}: TeacherDashboardProps) {
  const linkedCourseId = page === 'courses' ? new URLSearchParams(window.location.search).get('courseId') : null
  const [view, setView] = useState(page)
  const [selectedCourse, setSelectedCourse] = useState<Pick<CourseAdmin, 'id' | 'title'> | null>(() =>
    linkedCourseId ? { id: linkedCourseId, title: 'Khóa học' } : null
  )

  const activePage = onNavigate ? page : view
  const allowed = activePage === 'profile' || canAccessPage('TEACHER', activePage)

  useEffect(() => {
    if (!allowed) onRedirectHome?.()
  }, [allowed, onRedirectHome])

  if (!allowed) return null

  const openCourses = () => {
    setSelectedCourse(null)
    if (onNavigate) onNavigate('courses')
    else setView('courses')
  }

  const openCourse = (course: CourseAdmin) => {
    setSelectedCourse(course)
    setView('courses')
  }

  const navigate = (key: string) => {
    if (onNavigate) {
      onNavigate(key)
    } else {
      setView(key)
      if (key === 'dashboard') setSelectedCourse(null)
    }
  }

  const sections = buildNavSections('TEACHER')

  return (
    <ConsoleShell
      sections={sections}
      activeKey={sidebarPage('TEACHER', activePage)}
      onNavigate={navigate}
      onOpenProfile={() => navigate('profile')}
      onLogout={() => onLogout?.()}
      logoutLoading={logoutLoading}
    >
      <div className="flex flex-col gap-5">
        {activePage === 'schedule' ? (
          <Suspense fallback={<SchedulingPageFallback title="Lịch dạy" />}>
            <TeacherSchedulePage />
          </Suspense>
        ) : activePage === 'availability' ? (
          <Suspense fallback={<SchedulingPageFallback title="Giờ rảnh" />}>
            <TeacherAvailabilityPage />
          </Suspense>
        ) : activePage === 'profile' ? (
          <ProfilePage />
        ) : activePage === 'dashboard' ? (
          <>
            <RoleDashboardWelcome role="TEACHER" />
            <TeacherDashboardOverview onNavigate={navigate} />
            <DashboardActions role="TEACHER" onNavigate={navigate} />
          </>
        ) : (
          <TeacherCourses
            selectedCourse={selectedCourse}
            onOpenCourse={openCourse}
            onBack={openCourses}
          />
        )}
      </div>
    </ConsoleShell>
  )
}

export default TeacherDashboard

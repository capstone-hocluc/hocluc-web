import { useCallback, useEffect, useRef, useState } from 'react'
import LandingPage from './pages/LandingPage'
import CourseCatalogPage from './pages/CourseCatalogPage'
import CourseDetailPage from './pages/course/CourseDetailPage'
import CartPage from './pages/cart/CartPage'
import CheckoutPage from './pages/checkout/CheckoutPage'
import MyOrdersPage from './pages/orders/MyOrdersPage'
import OrderDetailPage from './pages/orders/OrderDetailPage'
import PaymentResultPage from './pages/payment/PaymentResultPage'
import PaymentInstructionsPage from './pages/payment/PaymentInstructionsPage'
import AuthPage from './components/auth/AuthPage'
import StudentOnboarding from './components/student/StudentOnboarding'
import StudentRouteGuard from './components/student/StudentRouteGuard'
import StudentRoutes from './pages/student/StudentRoutes'
import AdminLoginPage from './pages/AdminLoginPage'
import { registerRoleNavigator } from './hooks/useActiveRole'
import ManagementDashboard from './components/management/ManagementDashboard'
import ManagementRouteGuard, {
  type ManagementRole,
} from './components/management/ManagementRouteGuard'
import TeacherDashboard from './components/teacher/TeacherDashboard'
import { useCurrentUser } from './hooks/useCurrentUser'
import { logout } from './services/authService.ts'
import type { UserProfile } from './services/userService'
import { parseStudentRoute, studentRoutes, toStudentPath } from './lib/studentRoutes'
import ThemeProvider from './components/common/ThemeProvider'
import { runWithUnsavedActionGuard } from './hooks/useUnsavedActionGuard'

const APP_HISTORY_INDEX = '__hoclucNavigationIndex'

function getAppHistoryIndex(state: unknown): number | null {
  if (!state || typeof state !== 'object') return null
  const value = (state as Record<string, unknown>)[APP_HISTORY_INDEX]
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

function withAppHistoryIndex(state: unknown, index: number): Record<string, unknown> {
  const currentState =
    state && typeof state === 'object' ? (state as Record<string, unknown>) : {}
  return { ...currentState, [APP_HISTORY_INDEX]: index }
}

function replaceHistoryEntry(path: string) {
  const index = getAppHistoryIndex(window.history.state) ?? 0
  window.history.replaceState(withAppHistoryIndex(window.history.state, index), '', path)
}

function App() {
  const { clearCurrentUser } = useCurrentUser()
  const getAuthMode = useCallback(() => {
    const path = window.location.pathname.replace(/\/$/, '')
    if (path === '/staff/dashboard') return 'staff-dashboard'
    if (path === '/admin/login') {
      replaceHistoryEntry('/management/login')
      return 'management-login'
    }
    if (path === '/management/login') return 'management-login'
    if (path === '/admin/users') return 'admin-users'
    if (path === '/admin/dashboard') return 'admin-dashboard'
    if (path === '/manager/dashboard') return 'manager-dashboard'
    if (path === '/manager/courses') return 'manager-courses'
    if (path === '/manager/users') return 'manager-courses'
    if (path === '/manager/students') return 'manager-students'
    if (path === '/manager/enrollments') return 'manager-enrollments'
    if (path === '/manager/schedules') return 'manager-schedules'
    if (path === '/manager/attendance') return 'manager-attendance'
    if (path === '/manager/tuition') return 'manager-tuition'
    if (path === '/manager/invoices') return 'manager-invoices'
    if (path === '/manager/payments') return 'manager-payments'
    if (path === '/manager/batches') return 'manager-batches'
    if (path === '/mentor/dashboard') return 'mentor-dashboard'
  if (path === '/teacher/dashboard') return 'teacher-dashboard'
    if (path === '/teacher/schedule') return 'teacher-schedule'
    if (path === '/teacher/availability') return 'teacher-availability'
    if (path === '/teacher/my-courses') return 'teacher-courses'
    if (path === '/teacher/mock-exams') return 'teacher-mock-exams'
    if (/^\/teacher\/my-courses\/[^/]+\/quiz$/.test(path)) {
      return `teacher-quiz-${path.split('/')[3]}`
    }
    if (/^\/teacher\/my-courses\/[^/]+\/quiz\/new$/.test(path)) {
      return `teacher-quiz-new-${path.split('/')[3]}`
    }
    if (/^\/teacher\/my-courses\/[^/]+\/assignments$/.test(path)) {
      return `teacher-assignments-${path.split('/')[3]}`
    }
    if (path === '/teacher/information') return 'teacher-information'
    if (path === '/staff/students') return 'staff-students'
    if (path === '/staff/students/hs-24091') return 'staff-detail'
    if (path === '/staff/enrollments') return 'staff-enrollments'
    if (path === '/staff/schedules') return 'staff-schedules'
    if (path === '/staff/attendance') return 'staff-attendance'
    if (path === '/staff/tuition') return 'staff-tuition'
    if (path === '/staff/invoices') return 'staff-invoices'
    if (path === '/staff/payments') return 'staff-payments'
    if (path === '/staff/batches') return 'staff-batches'
    if (path === '/staff/batches/batch-12a-k24') return 'staff-batch-detail'
    if (path === '/staff/users') return 'staff-users'
    if (path === '/onboarding') return 'onboarding'
    if (path === '/verify-email') return 'verify-email'
    if (path === '/forgot-password') return 'forgot-password'
    if (path === '/reset-password') return 'reset-password'
    if (path === '/courses') return 'courses'
    if (path === '/cart') return 'cart'
    if (path === '/checkout') return 'checkout'
    if (path === '/orders') return 'orders'
    if (path === '/payment/result') return 'payment-result'
    return path === '/signup' ? 'signup' : path === '/login' ? 'login' : null
  }, [])

  const [authMode, setAuthMode] = useState(getAuthMode)
  const [currentPath, setCurrentPath] = useState(() => {
    const path = window.location.pathname.replace(/\/$/, '') || '/'
    const existingIndex = getAppHistoryIndex(window.history.state)
    const index = existingIndex ?? 0
    if (existingIndex === null) {
      window.history.replaceState(
        withAppHistoryIndex(window.history.state, index),
        '',
        window.location.href
      )
    }
    const target = toStudentPath(path)
    if (target !== path) {
      window.history.replaceState(withAppHistoryIndex(window.history.state, index), '', target)
    }
    return target
  })
  const historyIndexRef = useRef(getAppHistoryIndex(window.history.state) ?? 0)
  const historyRestoreInProgressRef = useRef(false)
  const ignoreNextHistoryGuardRef = useRef(false)
  const afterHistoryRestoreRef = useRef<(() => void) | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [logoutLoading, setLogoutLoading] = useState(false)
  const logoutInFlight = useRef(false)
  const pushHistoryEntry = useCallback((state: unknown, path: string) => {
    const index = historyIndexRef.current + 1
    window.history.pushState(withAppHistoryIndex(state, index), '', path)
    historyIndexRef.current = index
  }, [])
  const replaceCurrentHistoryEntry = useCallback((state: unknown, path: string) => {
    window.history.replaceState(
      withAppHistoryIndex(state, historyIndexRef.current),
      '',
      path
    )
  }, [])

  const navigateAuth = (mode) => {
    runWithUnsavedActionGuard(() => {
      pushHistoryEntry({}, `/${mode}`)
      setAuthMode(mode)
      setCurrentPath(`/${mode}`)
    })
  }

  // Generic route push used by components with no prop path back to App
  // (e.g. Navbar, nested deep inside LandingPage) via the `hl-navigate` event.
  // `state` is optional history state - used to hand data (e.g. SePay payment
  // instructions) to the next page without a prop path, since it's not
  // returned by GET endpoints and would otherwise be lost on navigation.
  const navigateTo = useCallback((rawPath, state = {}) => {
    const path = toStudentPath(rawPath)
    runWithUnsavedActionGuard(() => {
      pushHistoryEntry(state, path)
      setAuthMode(getAuthMode())
      setCurrentPath(path.replace(/\/$/, '') || '/')
    })
  }, [getAuthMode, pushHistoryEntry])

  // Lets the role switcher (any dashboard header) move to another role's home.
  useEffect(() => {
    registerRoleNavigator((path) => navigateTo(path))
    return () => registerRoleNavigator(null)
  }, [navigateTo])

  const backToLanding = () => {
    runWithUnsavedActionGuard(() => {
      pushHistoryEntry({}, '/')
      setAuthMode(null)
      setCurrentPath('/')
    })
  }

  const goToEmailVerification = (email = '') => {
    runWithUnsavedActionGuard(() => {
      setPendingVerificationEmail(email)
      pushHistoryEntry({}, '/verify-email')
      setAuthMode('verify-email')
      setCurrentPath('/verify-email')
    })
  }
  const navigateManagement = (scope: 'admin' | 'staff' | 'manager' | 'mentor', page: string) => {
    const paths = {
      admin: {
        dashboard: '/admin/dashboard',
        users: '/admin/users',
      },
      staff: {
        dashboard: '/staff/dashboard',
        users: '/staff/users',
        students: '/staff/students',
        detail: '/staff/students/hs-24091',
        enrollments: '/staff/enrollments',
        schedules: '/staff/schedules',
        attendance: '/staff/attendance',
        tuition: '/staff/tuition',
        invoices: '/staff/invoices',
        payments: '/staff/payments',
        batches: '/staff/batches',
        'batch-detail': '/staff/batches/batch-12a-k24',
      },
      manager: {
        dashboard: '/manager/dashboard',
        courses: '/manager/courses',
        students: '/manager/students',
        enrollments: '/manager/enrollments',
        schedules: '/manager/schedules',
        attendance: '/manager/attendance',
        tuition: '/manager/tuition',
        invoices: '/manager/invoices',
        payments: '/manager/payments',
        batches: '/manager/batches',
      },
      mentor: {
        dashboard: '/mentor/dashboard',
      },
    } as const
    const path = paths[scope][page as keyof (typeof paths)[typeof scope]] ?? paths[scope].dashboard
    runWithUnsavedActionGuard(() => {
      pushHistoryEntry({}, path)
      setAuthMode(`${scope}-${page}`)
      setCurrentPath(path)
    })
  }

  const navigateTeacher = (page) => {
    const paths = {
      dashboard: '/teacher/dashboard',
      courses: '/teacher/my-courses',
      schedule: '/teacher/schedule',
      availability: '/teacher/availability',
      'mock-exams': '/teacher/mock-exams',
      information: '/teacher/information',
    }
    const path = page.startsWith('quiz-new-') ? `/teacher/my-courses/${page.replace('quiz-new-', '')}/quiz/new` : page.startsWith('quiz-') ? `/teacher/my-courses/${page.replace('quiz-', '')}/quiz` : page.startsWith('assignments-') ? `/teacher/my-courses/${page.replace('assignments-', '')}/assignments` : paths[page]
    runWithUnsavedActionGuard(() => {
      pushHistoryEntry({}, path)
      setAuthMode(`teacher-${page}`)
      setCurrentPath(path)
    })
  }
  const goAfterLogin = (profile: UserProfile) => {
    setPendingVerificationEmail('')
    navigateTo(profile.role === 'MENTOR' ? '/mentor/dashboard' : '/student/dashboard')
  }

  const goAfterManagementLogin = (profile: UserProfile) => {
    const path =
      profile.role === 'TEACHER'
        ? '/teacher/dashboard'
        : profile.role === 'MANAGER'
          ? '/manager/dashboard'
          : profile.role === 'STAFF'
            ? '/staff/dashboard'
            : '/admin/dashboard'
    navigateTo(path)
  }

  const performLogout = useCallback(async () => {
    if (logoutInFlight.current) return
    logoutInFlight.current = true
    setLogoutLoading(true)
    try {
      await logout()
    } finally {
      clearCurrentUser()
      setPendingVerificationEmail('')
      replaceCurrentHistoryEntry({}, '/login')
      setAuthMode('login')
      setCurrentPath('/login')
      logoutInFlight.current = false
      setLogoutLoading(false)
    }
  }, [clearCurrentUser, replaceCurrentHistoryEntry])
  const handleLogout = useCallback(() => {
    runWithUnsavedActionGuard(() => {
      void performLogout()
    })
  }, [performLogout])

  useEffect(() => {
    const openAuth = (event) => {
      const mode = event.detail?.mode || 'login'
      runWithUnsavedActionGuard(() => {
        pushHistoryEntry({}, `/${mode}`)
        setAuthMode(mode)
        setCurrentPath(`/${mode}`)
      })
    }
    const syncPath = () => {
      setAuthMode(getAuthMode())
      setCurrentPath(window.location.pathname.replace(/\/$/, '') || '/')
    }
    const onPopState = (event: PopStateEvent) => {
      if (historyRestoreInProgressRef.current) {
        historyRestoreInProgressRef.current = false
        const afterRestore = afterHistoryRestoreRef.current
        afterHistoryRestoreRef.current = null
        afterRestore?.()
        return
      }
      if (ignoreNextHistoryGuardRef.current) {
        ignoreNextHistoryGuardRef.current = false
        historyIndexRef.current =
          getAppHistoryIndex(event.state) ?? historyIndexRef.current
        syncPath()
        return
      }

      const targetIndex = getAppHistoryIndex(event.state)
      const currentIndex = historyIndexRef.current
      if (targetIndex === null || targetIndex === currentIndex) {
        historyIndexRef.current = targetIndex ?? currentIndex
        syncPath()
        return
      }

      const delta = targetIndex - currentIndex
      let guardCallReturned = false
      let restoreCompleted = false
      let actionConfirmed = false
      const continueToTarget = () => {
        ignoreNextHistoryGuardRef.current = true
        window.history.go(delta)
      }
      const navigateToHistoryEntry = () => {
        if (!guardCallReturned) {
          historyIndexRef.current = targetIndex
          syncPath()
          return
        }
        actionConfirmed = true
        if (restoreCompleted) continueToTarget()
      }

      const disposition = runWithUnsavedActionGuard(navigateToHistoryEntry)
      guardCallReturned = true
      if (disposition === 'deferred') {
        afterHistoryRestoreRef.current = () => {
          restoreCompleted = true
          if (actionConfirmed) continueToTarget()
        }
        historyRestoreInProgressRef.current = true
        window.history.go(-delta)
      } else if (disposition === 'blocked') {
        afterHistoryRestoreRef.current = null
        historyRestoreInProgressRef.current = true
        window.history.go(-delta)
      }
    }
    const onNavigate = (event) => {
      const path = event.detail?.path
      if (path) navigateTo(path)
    }
    const onLogoutRequested = () => {
      handleLogout()
    }
    window.addEventListener('open-auth', openAuth)
    window.addEventListener('popstate', onPopState)
    window.addEventListener('hl-navigate', onNavigate)
    window.addEventListener('hl-logout', onLogoutRequested)
    return () => {
      window.removeEventListener('open-auth', openAuth)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('hl-navigate', onNavigate)
      window.removeEventListener('hl-logout', onLogoutRequested)
    }
  }, [getAuthMode, handleLogout, navigateTo, pushHistoryEntry])

  // Segments for any '/courses/...' path: ['courses', courseId]. Only the
  // course detail is public; studying lives under /student/courses/:id/study.
  const courseRouteSegments = currentPath.startsWith('/courses/')
    ? currentPath.split('/').filter(Boolean)
    : []
  const isPublicCourseDetailPath = courseRouteSegments.length === 2

  const publicCourseId = isPublicCourseDetailPath
    ? decodeURIComponent(courseRouteSegments[1] || '')
    : null

  // Segments for any '/orders/...' path: ['orders', orderId, 'payment'?]
  const orderRouteSegments = currentPath.startsWith('/orders/')
    ? currentPath.split('/').filter(Boolean)
    : []
  const isOrderPaymentPath =
    orderRouteSegments.length === 3 && orderRouteSegments[2] === 'payment'
  const isOrderDetailPath = orderRouteSegments.length === 2

  const orderPaymentOrderId = isOrderPaymentPath
    ? decodeURIComponent(orderRouteSegments[1] || '')
    : null
  const orderDetailId = isOrderDetailPath
    ? decodeURIComponent(orderRouteSegments[1] || '')
    : null

  const renderManagement = (
    role: ManagementRole,
    page: string,
    scope: 'admin' | 'staff' | 'manager' | 'mentor'
  ) => (
    <ThemeProvider>
      <ManagementRouteGuard
        allowedRoles={[role]}
        onLogin={() => navigateTo(scope === 'mentor' ? '/login' : '/management/login')}
        onExit={handleLogout}
      >
        <ManagementDashboard
          role={role}
          page={page}
          onNavigate={(nextPage) => navigateManagement(scope, nextPage)}
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
        />
      </ManagementRouteGuard>
    </ThemeProvider>
  )

  if (authMode?.startsWith('staff-'))
    return renderManagement('STAFF', authMode.replace('staff-', ''), 'staff')
  if (authMode?.startsWith('manager-'))
    return renderManagement('MANAGER', authMode.replace('manager-', ''), 'manager')
  if (authMode?.startsWith('mentor-'))
    return renderManagement('MENTOR', authMode.replace('mentor-', ''), 'mentor')
  if (authMode === 'admin-dashboard' || authMode === 'admin-users')
    return renderManagement('ADMINISTRATOR', authMode.replace('admin-', ''), 'admin')
  if (authMode === 'management-login')
    return (
      <ThemeProvider>
        <AdminLoginPage
          onBack={backToLanding}
          onSuccess={goAfterManagementLogin}
          allowedRoles={['ADMINISTRATOR', 'MANAGER', 'STAFF', 'TEACHER']}
          title="Đăng nhập quản lý"
          rejectedRoleMessage="Tài khoản này không có quyền truy cập khu vực quản lý."
        />
      </ThemeProvider>
    )
  if (authMode?.startsWith('teacher-'))
    return (
      <ThemeProvider>
        <ManagementRouteGuard
          allowedRoles={['TEACHER']}
          onLogin={() => navigateTo('/management/login')}
          onExit={handleLogout}
        >
          <TeacherDashboard
            key={authMode}
            page={authMode.replace('teacher-', '')}
            onNavigate={navigateTeacher}
            onLogout={handleLogout}
            logoutLoading={logoutLoading}
          />
        </ManagementRouteGuard>
      </ThemeProvider>
    )
  if (authMode === 'onboarding') return <StudentOnboarding onBack={backToLanding} />
  // Every authenticated learning screen (dashboard, courses, study, lessons,
  // video, quizzes, attempts, results, review, learning profile) renders inside
  // the single StudentLayout owned by StudentRoutes.
  const studentRoute = parseStudentRoute(currentPath)
  if (studentRoute)
    return (
      <StudentRouteGuard onLogin={() => navigateTo('/login')} onGoToRole={navigateTo}>
        <StudentRoutes
          route={studentRoute}
          currentPath={currentPath}
          navigate={navigateTo}
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
        />
      </StudentRouteGuard>
    )
  if (publicCourseId)
    return (
      <CourseDetailPage
        key={publicCourseId}
        courseId={publicCourseId}
        onBackToHome={backToLanding}
        onBackToCatalog={() => navigateTo('/courses')}
        onStartLearning={(id) => navigateTo(studentRoutes.courseStudy(id))}
        onGoToCart={() => navigateTo('/cart')}
      />
    )
  if (orderPaymentOrderId)
    return (
      <PaymentInstructionsPage
        key={orderPaymentOrderId}
        orderId={orderPaymentOrderId}
        onGoToOrderDetail={() => navigateTo(`/orders/${orderPaymentOrderId}`)}
        onGoToMyCourses={() => navigateTo(studentRoutes.courses())}
      />
    )
  if (orderDetailId)
    return (
      <OrderDetailPage
        key={orderDetailId}
        orderId={orderDetailId}
        onBackToOrders={() => navigateTo('/orders')}
        onGoToMyCourses={() => navigateTo(studentRoutes.courses())}
        onPaymentReady={(paymentData) =>
          navigateTo(`/orders/${paymentData.order.id}/payment`, paymentData)
        }
        onOpenCourse={(courseId) => navigateTo(`/courses/${courseId}`)}
      />
    )
  if (authMode === 'courses')
    return <CourseCatalogPage onOpenCourse={(course) => navigateTo(`/courses/${course.id}`)} />
  if (authMode === 'cart')
    return (
      <CartPage
        onBrowseCourses={() => navigateTo('/courses')}
        onGoToCheckout={() => navigateTo('/checkout')}
      />
    )
  if (authMode === 'checkout')
    return (
      <CheckoutPage
        onOrderCreated={(paymentData) =>
          navigateTo(`/orders/${paymentData.order.id}/payment`, paymentData)
        }
        onBackToCart={() => navigateTo('/cart')}
      />
    )
  if (authMode === 'orders')
    return (
      <MyOrdersPage
        onOpenOrder={(orderId) => navigateTo(`/orders/${orderId}`)}
        onBrowseCourses={() => navigateTo('/courses')}
      />
    )
  if (authMode === 'payment-result')
    return (
      <PaymentResultPage
        onGoToMyCourses={() => navigateTo(studentRoutes.courses())}
        onOpenOrder={(orderId) => navigateTo(`/orders/${orderId}`)}
        onGoToOrders={() => navigateTo('/orders')}
      />
    )
  return authMode ? (
    <AuthPage
      mode={authMode}
      onModeChange={navigateAuth}
      onContinue={authMode === 'signup' ? goToEmailVerification : goAfterLogin}
      verificationEmail={pendingVerificationEmail}
      onBack={backToLanding}
    />
  ) : (
    <LandingPage />
  )
}

export default App

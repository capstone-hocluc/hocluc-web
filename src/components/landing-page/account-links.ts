import { ROLE_LABELS, roleHome } from '../../lib/role-home'
import type { UserProfile } from '../../services/userService'

export function profileName(profile: UserProfile) {
  return (
    profile.displayName ||
    [profile.lastName, profile.firstName].filter(Boolean).join(' ') ||
    profile.email ||
    'Học viên'
  )
}

export function profileInitials(profile: UserProfile) {
  return (
    `${profile.lastName?.[0] ?? ''}${profile.firstName?.[0] ?? ''}`.trim() ||
    profile.email?.slice(0, 2).toUpperCase() ||
    'HV'
  )
}

// Destinations of the account menu in the public header, desktop and mobile alike.
export function accountLinks(profile: UserProfile) {
  const isStudent = profile.role === 'STUDENT'
  return [
    {
      href: roleHome(profile.role),
      label: isStudent ? 'Vào khu học tập' : `Khu vực ${ROLE_LABELS[profile.role]}`,
      icon: 'sparkles' as const,
    },
    {
      href: isStudent ? '/student/profile' : roleHome(profile.role).replace('/dashboard', '/profile'),
      label: 'Hồ sơ',
      icon: 'user-round' as const,
    },
    { href: '/orders', label: 'Đơn hàng của tôi', icon: 'package' as const },
  ]
}

export function requestLogout() {
  window.dispatchEvent(new CustomEvent('hl-logout'))
}

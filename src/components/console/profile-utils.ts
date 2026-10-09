import type { UserProfile } from '../../services/userService'

export function getDisplayName(profile: UserProfile) {
  return (
    profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
  )
}

export function getInitials(profile: UserProfile) {
  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.trim()
  return (initials || profile.email.slice(0, 2)).toUpperCase()
}

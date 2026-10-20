import NotificationBell from '../../notifications/NotificationBell'

/** Keep the existing console entry point and reuse the shared notification feed/UI. */
export function NotificationsButton() {
  return <NotificationBell />
}

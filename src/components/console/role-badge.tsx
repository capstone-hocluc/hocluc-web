import type { UserRole } from '../../services/userService'
import { ROLE_LABELS } from '../../lib/role-home'
import { Badge } from '../tailgrids/core/badge'

// One soft colour per role so roles are told apart at a glance, shared by every place that shows a role.
const ROLE_COLOR = {
  ADMINISTRATOR: 'rose',
  MANAGER: 'violet',
  STAFF: 'blue',
  TEACHER: 'success',
  MENTOR: 'orange',
  STUDENT: 'gray',
} as const satisfies Record<UserRole, string>

export default function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge color={ROLE_COLOR[role]} size="md" className="whitespace-nowrap">
      {ROLE_LABELS[role]}
    </Badge>
  )
}

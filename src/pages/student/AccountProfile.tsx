import { useState } from 'react'
import { BarChart3, KeyRound, User } from '../../components/console/icons'
import MascotState from '../../components/common/MascotState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { cn } from '../../lib/cn'
import PersonalInfoTab from './account-profile/PersonalInfoTab'
import StudentInfoTab from './account-profile/StudentInfoTab'
import SecurityTab from './account-profile/SecurityTab'

const navGroups = [
  {
    label: 'Tài khoản',
    items: [
      { key: 'personal', label: 'Hồ sơ', icon: User },
      { key: 'security', label: 'Đổi mật khẩu', icon: KeyRound },
    ],
  },
  {
    label: 'Học tập',
    items: [{ key: 'student', label: 'Hồ sơ học tập', icon: BarChart3 }],
  },
]

// Account settings for the signed-in student. The profile itself is loaded
// once by StudentLayout (useHydrateCurrentUser) and read here from context.
function AccountProfile() {
  const { profile, status, loadCurrentUser } = useCurrentUser()
  const [activeSection, setActiveSection] = useState(() => {
    const requestedSection = new URLSearchParams(window.location.search).get('section')
    return requestedSection === 'student' ? 'student' : 'personal'
  })

  if (!profile) {
    return (
      <StudentPageContainer>
        {status === 'error' ? (
          <MascotState
            title="Không thể tải thông tin hồ sơ"
            actionLabel="Thử lại"
            onAction={() => void loadCurrentUser().catch(() => {})}
          />
        ) : (
          <Skeleton className="h-[420px] rounded-[22px]" />
        )}
      </StudentPageContainer>
    )
  }

  return (
    <StudentPageContainer>
      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-6 max-[900px]:grid-cols-1">
        <Card
          as="nav"
          padding="none"
          radius="xl"
          className="flex flex-col gap-4 p-3.5 max-[900px]:flex-row max-[900px]:flex-wrap"
          aria-label="Cài đặt tài khoản"
        >
          {navGroups.map((group) => (
            <div className="flex flex-col gap-1" key={group.label}>
              <span className="px-2.5 text-[11px] font-extrabold tracking-[0.06em] text-text-muted uppercase">
                {group.label}
              </span>
              {group.items.map((item) => {
                const Icon = item.icon
                const active = activeSection === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setActiveSection(item.key)}
                    className={cn(
                      'flex h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-[13.5px] font-bold transition-colors',
                      active
                        ? 'bg-primary-soft text-primary'
                        : 'text-text-body hover:bg-surface-soft hover:text-primary'
                    )}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </Card>

        <div className="min-w-0">
          {activeSection === 'personal' && <PersonalInfoTab key={profile.id} />}
          {activeSection === 'student' && <StudentInfoTab key={profile.id} />}
          {activeSection === 'security' && <SecurityTab />}
        </div>
      </div>
    </StudentPageContainer>
  )
}

export default AccountProfile

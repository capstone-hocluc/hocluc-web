import { BarChart3, KeyRound, ShoppingBag, User, Wallet } from '../../components/console/icons'
import MascotState from '../../components/common/MascotState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { cn } from '../../lib/cn'
import PersonalInfoTab from './account-profile/PersonalInfoTab'
import StudentInfoTab from './account-profile/StudentInfoTab'
import SecurityTab from './account-profile/SecurityTab'
import { StudentWalletContent } from './StudentWalletPage'
import { MyOrdersContent } from '../orders/MyOrdersPage'
import SectionHeader from '../../components/student/common/SectionHeader'

const navGroups = [
  {
    label: 'Tài khoản',
    items: [
      { key: 'personal', label: 'Hồ sơ', icon: User },
      { key: 'security', label: 'Đổi mật khẩu', icon: KeyRound },
      { key: 'wallet', label: 'Ví Sao', icon: Wallet },
      { key: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
    ],
  },
  {
    label: 'Học tập',
    items: [{ key: 'student', label: 'Hồ sơ học tập', icon: BarChart3 }],
  },
]

// Account settings for the signed-in student. The profile itself is loaded
// once by StudentLayout (useHydrateCurrentUser) and read here from context.
export type AccountSection = 'personal' | 'student' | 'security' | 'wallet' | 'orders'

interface AccountProfileProps {
  section: AccountSection
  onChangeSection: (section: AccountSection) => void
  onOpenPayment: (orderId: string) => void
  onOpenOrder: (orderId: string) => void
  onBrowseCourses: () => void
}

function AccountProfile({ section: activeSection, onChangeSection, onOpenPayment, onOpenOrder, onBrowseCourses }: AccountProfileProps) {
  const { profile, status, loadCurrentUser } = useCurrentUser()

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
          <Skeleton className="h-[420px] rounded-2xl" />
        )}
      </StudentPageContainer>
    )
  }

  return (
    <StudentPageContainer>
      <StudentPageHeader
        title="Tài khoản của tôi"
        description="Quản lý hồ sơ, bảo mật, Ví Sao và đơn hàng của bạn."
      />
      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-6 max-[900px]:grid-cols-1">
        <Card
          as="nav"
          variant="elevated"
          padding="none"
          radius="xl"
          className="flex flex-col gap-4 p-4 max-[900px]:flex-row max-[900px]:flex-wrap"
          aria-label="Cài đặt tài khoản"
        >
          {navGroups.map((group) => (
            <div className="flex flex-col gap-1" key={group.label}>
              <span className="px-3 text-xs font-semibold tracking-[0.08em] text-text-muted uppercase">
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
                    onClick={() => onChangeSection(item.key as AccountSection)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-[15px] font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                      active
                        ? 'border-transparent bg-surface-brand text-primary-text'
                        : 'border-transparent text-text-body hover:bg-surface-brand hover:text-primary-text'
                    )}
                  >
                    <Icon size={19} />
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
          {activeSection === 'wallet' && <div className="space-y-5"><SectionHeader title="Ví Sao" /><StudentWalletContent onOpenPayment={onOpenPayment} /></div>}
          {activeSection === 'orders' && <div className="space-y-5"><SectionHeader title="Đơn hàng của tôi" /><MyOrdersContent student onOpenOrder={onOpenOrder} onBrowseCourses={onBrowseCourses} /></div>}
        </div>
      </div>
    </StudentPageContainer>
  )
}

export default AccountProfile

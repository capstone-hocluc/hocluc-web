import { KeyRound, ShoppingBag, User, Wallet } from '../../components/console/icons'
import MascotState from '../../components/common/MascotState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { cn } from '../../lib/cn'
import PersonalInfoTab from './account-profile/PersonalInfoTab'
import SecurityTab from './account-profile/SecurityTab'
import { StudentWalletContent } from './StudentWalletPage'
import { MyOrdersContent } from '../orders/MyOrdersPage'
import SectionHeader from '../../components/student/common/SectionHeader'
import styles from './AccountProfile.module.css'

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
]

// Account settings for the signed-in student. The profile itself is loaded
// once by StudentLayout (useHydrateCurrentUser) and read here from context.
export type AccountSection = 'personal' | 'security' | 'wallet' | 'orders'

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
      <StudentPageContainer width="fluid" className={styles.page}>
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
    <StudentPageContainer width="fluid" className={styles.page}>
      <StudentPageHeader
        title="Tài khoản của tôi"
        description="Quản lý hồ sơ, bảo mật, Ví Sao và đơn hàng của bạn."
        className={styles.heading}
      />
      <div className={styles.workspace}>
        <Card
          as="nav"
          variant="elevated"
          padding="none"
          radius="xl"
          className={styles.navigation}
          aria-label="Cài đặt tài khoản"
        >
          {navGroups.map((group) => (
            <div className={styles.navGroup} key={group.label}>
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

        <div key={activeSection} className={styles.content} role="region" aria-label="Nội dung tài khoản" tabIndex={0}>
          {activeSection === 'personal' && <PersonalInfoTab key={profile.id} />}
          {activeSection === 'security' && <div className={styles.security}><SecurityTab /></div>}
          {activeSection === 'wallet' && <div className="space-y-4"><SectionHeader title="Ví Sao" titleClassName="text-lg max-[760px]:text-lg" /><StudentWalletContent onOpenPayment={onOpenPayment} /></div>}
          {activeSection === 'orders' && <div className="space-y-4"><SectionHeader title="Đơn hàng của tôi" titleClassName="text-lg max-[760px]:text-lg" /><MyOrdersContent student onOpenOrder={onOpenOrder} onBrowseCourses={onBrowseCourses} /></div>}
        </div>
      </div>
    </StudentPageContainer>
  )
}

export default AccountProfile

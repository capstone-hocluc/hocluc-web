import { AlertCircle, ArrowRight, Ban, Clock3, MailQuestion, RefreshCw, UserCheck, Users } from '../console/icons'
import { useEffect, useState } from 'react'
import {
  getUsers,
  USER_STATUSES,
  type UserStatus,
  type UserSummary,
} from '../../services/userService'
import Button from '../console/button'
import StatCard from '../ui/StatCard'
import Status from '../console/status'

interface AdminOverviewProps {
  onNavigate: (page: string) => void
  areaLabel?: string
}

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  SUSPENDED: 'Tạm khóa',
  PENDING: 'Chờ xác minh',
}

const ROLE_LABELS: Record<UserSummary['role'], string> = {
  STUDENT: 'Học viên',
  MENTOR: 'Mentor',
  TEACHER: 'Giáo viên',
  STAFF: 'Nhân viên',
  MANAGER: 'Quản lý',
  ADMINISTRATOR: 'Quản trị viên',
}

function getStatusTone(status: UserStatus) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'SUSPENDED') return 'danger' as const
  if (status === 'PENDING') return 'warning' as const
  return 'neutral' as const
}

function getUserName(user: Pick<UserSummary, 'displayName' | 'firstName' | 'lastName' | 'email'>) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return user.displayName || fullName || user.email
}

function getInitials(user: Pick<UserSummary, 'firstName' | 'lastName' | 'email'>) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim()
  return initials || user.email.slice(0, 2).toUpperCase()
}

function formatDate(value?: string) {
  if (!value) return 'Chưa đăng nhập'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Không xác định'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

interface OverviewData {
  total: number
  counts: Record<UserStatus, number>
  recent: UserSummary[]
}

const EMPTY_DATA: OverviewData = {
  total: 0,
  counts: {
    ACTIVE: 0,
    INACTIVE: 0,
    SUSPENDED: 0,
    PENDING: 0,
  },
  recent: [],
}

function AdminOverview({ onNavigate, areaLabel = 'quản trị' }: AdminOverviewProps) {
  const [data, setData] = useState<OverviewData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false

    // The request lifecycle starts when the admin explicitly opens or refreshes the overview.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')

    Promise.all([
      getUsers({ page: 0, size: 8, sort: 'createdAt,desc' }),
      ...USER_STATUSES.map((status) => getUsers({ page: 0, size: 1, status })),
    ])
      .then(([recentPage, ...statusPages]) => {
        if (ignore) return

        const counts = USER_STATUSES.reduce(
          (result, status, index) => ({
            ...result,
            [status]: statusPages[index]?.totalElements ?? 0,
          }),
          { ...EMPTY_DATA.counts }
        ) as Record<UserStatus, number>

        setData({
          total: recentPage.totalElements,
          counts,
          recent: recentPage.content,
        })
      })
      .catch((requestError: unknown) => {
        if (!ignore) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : `Không thể tải tổng quan ${areaLabel}.`
          )
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [areaLabel, reloadKey])

  const stats = [
    { label: 'Tổng tài khoản', value: data.total, icon: Users, tone: 'info' as const },
    { label: 'Đang hoạt động', value: data.counts.ACTIVE, icon: UserCheck, tone: 'success' as const },
    { label: 'Chờ xác minh', value: data.counts.PENDING, icon: MailQuestion, tone: 'warning' as const },
    { label: 'Tạm khóa', value: data.counts.SUSPENDED, icon: Ban, tone: 'danger' as const },
  ]

  return (
    <section className="space-y-5" aria-busy={loading}>
      <div className="flex justify-end">
        <Button variant="primary" appearance="outline" size="sm" onClick={() => setReloadKey((current) => current + 1)} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : undefined} />
          Làm mới
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={loading ? '—' : stat.value}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>

      {error && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-badge-danger-bg px-3 py-2 text-sm text-badge-danger-text"
          role="alert"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </span>
          <Button
            variant="danger"
            appearance="ghost"
            size="sm"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Thử lại
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Tài khoản gần đây</h2>
          </div>
          <Button
            variant="primary"
            appearance="ghost"
            size="sm"
            onClick={() => onNavigate('users')}
          >
            Xem tất cả
            <ArrowRight size={15} />
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3 px-5 py-4" aria-label="Đang tải tài khoản">
            {[1, 2, 3].map((item) => (
              <div className="h-12 animate-pulse rounded-lg bg-background-gray-secondary" key={item} />
            ))}
          </div>
        ) : data.recent.length ? (
          <div className="divide-y divide-border-subtle">
            {data.recent.map((user) => (
              <button
                key={user.id}
                type="button"
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-background-gray-secondary"
                onClick={() => onNavigate('users')}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-badge-info-bg text-sm font-semibold text-badge-info-text">
                  {getInitials(user)}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold text-text-primary">
                    {getUserName(user)}
                  </strong>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-tertiary">
                    <span className="truncate">{user.email}</span>
                    <span>·</span>
                    <span>{ROLE_LABELS[user.role]}</span>
                  </span>
                </span>
                <span className="hidden items-center gap-3 sm:flex">
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                    <Clock3 size={13} />
                    {formatDate(user.lastLoginAt)}
                  </span>
                  <Status tone={getStatusTone(user.status)}>{STATUS_LABELS[user.status]}</Status>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-text-tertiary">Chưa có tài khoản.</div>
        )}
      </div>
    </section>
  )
}

export default AdminOverview

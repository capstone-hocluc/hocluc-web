import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Filter,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from '../console/icons'
import {
  deleteUser,
  getUserById,
  getUsers,
  updateUserRoles,
  updateUserStatus,
  USER_ROLES,
  USER_STATUSES,
  type UserListPage,
  type UserProfile,
  type UserRole,
  type UserStatus,
  type UserSummary,
} from '../../services/userService'
import { grantedRoles } from '../../lib/role-home'
import Button from '../console/button'
import DataTable from '../console/data-table'
import SelectField from '../console/select-field'
import Status from '../console/status'
import ConfirmDialog from '../console/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../tailgrids/core/dropdown'
import { Input } from '../tailgrids/core/input'
import { Pagination } from '../tailgrids/core/pagination'
import UserCreateDialog from './user-create-dialog'
import UserDetailDialog from './user-detail-dialog'
import {
  ROLE_LABELS,
  STATUS_LABELS,
  formatDate,
  getErrorMessage,
  getStatusTone,
  getUserName,
} from './user-labels'

const PAGE_SIZE = 10

const ROLE_OPTIONS = USER_ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role] }))
const STATUS_OPTIONS = USER_STATUSES.map((status) => ({ id: status, label: STATUS_LABELS[status] }))
const ROLE_FILTER_OPTIONS = [{ id: 'ALL', label: 'Tất cả vai trò' }, ...ROLE_OPTIONS]
const STATUS_FILTER_OPTIONS = [{ id: 'ALL', label: 'Tất cả trạng thái' }, ...STATUS_OPTIONS]

function emptyPage(): UserListPage {
  return { content: [], pageNumber: 0, pageSize: PAGE_SIZE, totalElements: 0, totalPages: 0, last: true }
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .trim()

interface UserManagementProps {
  readOnly?: boolean
  canCreateUsers?: boolean
}

function UserManagement({ readOnly = false, canCreateUsers = false }: UserManagementProps) {
  const [page, setPage] = useState(0)
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL')
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pageData, setPageData] = useState<UserListPage>(emptyPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [grantingRoles, setGrantingRoles] = useState(false)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserSummary | null>(null)
  const [deleteUserLoading, setDeleteUserLoading] = useState(false)

  useEffect(() => {
    let ignore = false

    // The request lifecycle starts when the server-side filters or page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')

    getUsers({
      page,
      size: PAGE_SIZE,
      role: roleFilter === 'ALL' ? undefined : roleFilter,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      sort: 'createdAt,desc',
    })
      .then((nextPage) => {
        if (!ignore) setPageData(nextPage)
      })
      .catch((requestError: unknown) => {
        if (!ignore) setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [page, reloadKey, roleFilter, statusFilter])

  const visibleUsers = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return pageData.content
    return pageData.content.filter((user) =>
      normalize(
        [user.email, user.displayName, user.firstName, user.lastName, ...grantedRoles(user).map((role) => ROLE_LABELS[role])]
          .filter(Boolean)
          .join(' ')
      ).includes(needle)
    )
  }, [pageData.content, query])

  const updateUserInPage = useCallback((userId: string, updated: UserProfile) => {
    setPageData((current) => ({
      ...current,
      content: current.content.map((user) =>
        user.id === userId
          ? {
              ...user,
              displayName: updated.displayName ?? user.displayName,
              firstName: updated.firstName ?? user.firstName,
              lastName: updated.lastName ?? user.lastName,
              avatarUrl: updated.avatarUrl ?? user.avatarUrl,
              status: updated.status ?? user.status,
              role: updated.role ?? user.role,
              roles: updated.roles ?? user.roles,
              emailVerified: updated.emailVerified ?? user.emailVerified,
              lastLoginAt: updated.lastLoginAt ?? user.lastLoginAt,
              createdAt: updated.createdAt ?? user.createdAt,
            }
          : user
      ),
    }))
    setSelectedUser((current) => (current?.id === userId ? { ...current, ...updated } : current))
  }, [])

  const runUserUpdate = useCallback(
    async (userId: string, request: () => Promise<UserProfile>, message: string) => {
      setUpdatingUserId(userId)
      setError('')
      setFeedback('')
      try {
        updateUserInPage(userId, await request())
        setFeedback(message)
      } catch (requestError: unknown) {
        setError(getErrorMessage(requestError))
      } finally {
        setUpdatingUserId(null)
      }
    },
    [updateUserInPage]
  )

  const handleGrantedRolesChange = useCallback(async (user: UserProfile, roles: UserRole[]) => {
    setGrantingRoles(true)
    setError('')
    try {
      const updated = await updateUserRoles(user.id, roles)
      updateUserInPage(user.id, updated)
      setReloadKey((key) => key + 1)
      setFeedback('Đã cập nhật vai trò được cấp.')
    } finally {
      setGrantingRoles(false)
    }
  }, [updateUserInPage])

  const openUserDetail = useCallback(async (user: UserSummary) => {
    setSelectedUser({ ...user, phone: undefined, bio: undefined, timezone: undefined, language: undefined })
    setDetailLoading(true)
    try {
      setSelectedUser(await getUserById(user.id))
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleDeleteUser = useCallback(async () => {
    if (!deletingUser) return

    setDeleteUserLoading(true)
    setError('')
    try {
      await deleteUser(deletingUser.id)
      setPageData((current) => ({
        ...current,
        content: current.content.filter((user) => user.id !== deletingUser.id),
        totalElements: Math.max(0, current.totalElements - 1),
      }))
      setSelectedUser((current) => (current?.id === deletingUser.id ? null : current))
      setDeletingUser(null)
      setFeedback('Đã xóa tài khoản.')
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setDeleteUserLoading(false)
    }
  }, [deletingUser])

  const columns = useMemo<ColumnDef<UserSummary>[]>(
    () => [
      {
        id: 'name',
        header: 'Tên',
        accessorFn: (user) => getUserName(user),
        cell: ({ row }) => <span className="font-medium whitespace-nowrap">{getUserName(row.original)}</span>,
      },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
        cell: ({ row }) => <span className="text-text-secondary">{row.original.email}</span>,
      },
      {
        id: 'role',
        header: 'Vai trò',
        accessorFn: (user) => ROLE_LABELS[user.role],
        cell: ({ row }) => {
          const roles = grantedRoles(row.original)
          return (
            <span className="whitespace-nowrap text-text-secondary">
              {ROLE_LABELS[row.original.role]}
              {roles.length > 1 && <span className="ml-1.5 text-xs text-text-tertiary">+{roles.length - 1}</span>}
            </span>
          )
        },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        accessorFn: (user) => STATUS_LABELS[user.status],
        cell: ({ row }) => <Status tone={getStatusTone(row.original.status)}>{STATUS_LABELS[row.original.status]}</Status>,
      },
      {
        id: 'createdAt',
        header: 'Ngày tạo',
        accessorFn: (user) => user.createdAt ?? undefined,
        cell: ({ row }) => <span className="whitespace-nowrap text-text-secondary">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="block text-right">Thao tác</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Thao tác với ${row.original.email}`}
                isDisabled={updatingUserId === row.original.id}
                className="grid size-8 place-items-center rounded-md text-icon-tertiary outline-none hover:bg-background-gray-secondary data-disabled:opacity-50"
              >
                <MoreHorizontal size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onAction={() => void openUserDetail(row.original)}>
                  <Eye size={16} />
                  Xem chi tiết
                </DropdownMenuItem>
                {!readOnly &&
                  USER_STATUSES.filter((status) => status !== row.original.status).map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onAction={() =>
                        void runUserUpdate(row.original.id, () => updateUserStatus(row.original.id, status), 'Đã cập nhật trạng thái.')
                      }
                    >
                      Chuyển sang {STATUS_LABELS[status].toLocaleLowerCase('vi-VN')}
                    </DropdownMenuItem>
                  ))}
                {!readOnly && (
                  <DropdownMenuItem
                    isDisabled={deleteUserLoading}
                    className="text-badge-danger-text"
                    onAction={() => setDeletingUser(row.original)}
                  >
                    <Trash2 size={16} />
                    Xóa tài khoản
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [deleteUserLoading, openUserDetail, readOnly, runUserUpdate, updatingUserId]
  )

  return (
    <section
      className="overflow-hidden rounded-xl border border-card-border bg-card-background"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-icon-tertiary" />
          <Input
            aria-label="Tìm theo tên hoặc email"
            placeholder="Tìm theo tên hoặc email..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 w-full py-0 pl-10 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" appearance="outline" aria-expanded={showFilters} onClick={() => setShowFilters((open) => !open)}>
            <Filter size={16} />
            Lọc
          </Button>
          {canCreateUsers && !readOnly && (
            <Button size="sm" onClick={() => setCreateUserOpen(true)}>
              <Plus size={16} />
              Thêm tài khoản
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
          <SelectField
            ariaLabel="Lọc theo vai trò"
            options={ROLE_FILTER_OPTIONS}
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value as UserRole | 'ALL')
              setPage(0)
            }}
          />
          <SelectField
            ariaLabel="Lọc theo trạng thái"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as UserStatus | 'ALL')
              setPage(0)
            }}
          />
        </div>
      )}

      {feedback && (
        <div
          className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-badge-success-bg px-3 py-2 text-sm text-badge-success-text"
          role="status"
        >
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {error && (
        <div
          className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-badge-danger-bg px-3 py-2 text-sm text-badge-danger-text"
          role="alert"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </span>
          <Button variant="danger" appearance="ghost" size="sm" onClick={() => setReloadKey((current) => current + 1)}>
            Thử lại
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={visibleUsers}
        getRowKey={(user) => user.id}
        onRowClick={(user) => void openUserDetail(user)}
        emptyMessage={
          loading ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle size={16} className="animate-spin" />
              Đang tải...
            </span>
          ) : (
            'Không có tài khoản phù hợp.'
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border px-5 py-3">
        <span className="text-sm text-text-tertiary">{pageData.totalElements} tài khoản</span>
        {pageData.totalPages > 1 && (
          <div className="ml-auto w-auto">
            <Pagination
              currentPage={page + 1}
              totalPages={pageData.totalPages}
              onPageChange={(next) => setPage(next - 1)}
              sideLayout="icon"
              variant="compact"
            />
          </div>
        )}
      </div>

      <UserCreateDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onCreated={() => {
          setCreateUserOpen(false)
          setFeedback('Đã tạo tài khoản.')
          setReloadKey((current) => current + 1)
        }}
      />

      <UserDetailDialog
        user={selectedUser}
        loading={detailLoading}
        canGrantRoles={canCreateUsers && !readOnly}
        grantingRoles={grantingRoles}
        onClose={() => { if (!grantingRoles) setSelectedUser(null) }}
        onSaveRoles={handleGrantedRolesChange}
      />

      {deletingUser && (
        <ConfirmDialog
          title="Xóa tài khoản?"
          description={
            <>
              Tài khoản <strong>{deletingUser.email}</strong> sẽ ngừng hoạt động và bị thu hồi phiên đăng nhập.
            </>
          }
          cancelLabel="Hủy"
          confirmLabel="Xóa"
          busy={deleteUserLoading}
          busyLabel="Đang xóa..."
          variant="danger"
          onCancel={() => {
            if (!deleteUserLoading) setDeletingUser(null)
          }}
          onConfirm={() => void handleDeleteUser()}
        />
      )}
    </section>
  )
}

export default UserManagement

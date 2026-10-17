import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Trash2,
} from '../console/icons'
import {
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
  updateUserRoles,
  updateUserStatus,
  USER_ROLES,
  USER_STATUSES,
  type UpdateUserRequest,
  type UserListPage,
  type UserProfile,
  type UserRole,
  type UserStatus,
  type UserSummary,
} from '../../services/userService'
import { grantedRoles } from '../../lib/role-home'
import Button from '../console/button'
import DataTable from '../console/data-table'
import { FilterGroup, FilterSelect, FilterToolbar, SearchInput } from '../console/filter-toolbar'
import Status from '../console/status'
import RoleBadge from '../console/role-badge'
import ConfirmDialog from '../console/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../tailgrids/core/dropdown'
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

const ROLE_OPTIONS = USER_ROLES.filter((role) => role !== 'STUDENT').map((role) => ({ id: role, label: ROLE_LABELS[role] }))
const STATUS_OPTIONS = USER_STATUSES.map((status) => ({ id: status, label: STATUS_LABELS[status] }))
const ROLE_FILTER_OPTIONS = [{ id: 'ALL', label: 'Tất cả vai trò' }, ...ROLE_OPTIONS]
const STATUS_FILTER_OPTIONS = [{ id: 'ALL', label: 'Tất cả trạng thái' }, ...STATUS_OPTIONS]

function emptyPage(): UserListPage {
  return { content: [], pageNumber: 0, pageSize: PAGE_SIZE, totalElements: 0, totalPages: 0, last: true }
}

interface UserManagementProps {
  /** Students are the platform's customers and personnel run it, so each has its own list. */
  audience: 'staff' | 'students'
  readOnly?: boolean
  canCreateUsers?: boolean
}

function UserManagement({ audience, readOnly = false, canCreateUsers = false }: UserManagementProps) {
  const students = audience === 'students'
  const noun = students ? 'học viên' : 'tài khoản'
  const [page, setPage] = useState(0)
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL')
  const [query, setQuery] = useState('')
  const [pageData, setPageData] = useState<UserListPage>(emptyPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [grantingRoles, setGrantingRoles] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserSummary | null>(null)
  const [deleteUserLoading, setDeleteUserLoading] = useState(false)

  useEffect(() => {
    let ignore = false

    // The request lifecycle starts when the server-side filters, search, or page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')

    const timer = window.setTimeout(() => {
      getUsers({
        page,
        size: PAGE_SIZE,
        role: students ? 'STUDENT' : roleFilter === 'ALL' ? undefined : roleFilter,
        excludeRole: students ? undefined : 'STUDENT',
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        query: query.trim() || undefined,
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
    }, query.trim() ? 250 : 0)

    return () => {
      ignore = true
      window.clearTimeout(timer)
    }
  }, [page, query, reloadKey, roleFilter, statusFilter, students])

  const visibleUsers = pageData.content

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

  const handleProfileChange = useCallback(async (user: UserProfile, payload: UpdateUserRequest) => {
    setSavingProfile(true)
    setError('')
    try {
      const updated = await updateUser(user.id, payload)
      updateUserInPage(user.id, updated)
      setReloadKey((key) => key + 1)
      setFeedback('Đã lưu thông tin tài khoản.')
    } finally {
      setSavingProfile(false)
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
    () =>
      ([
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
      !students && {
        id: 'role',
        header: 'Vai trò',
        accessorFn: (user) => ROLE_LABELS[user.role],
        cell: ({ row }) => {
          const roles = grantedRoles(row.original)
          return (
            <span className="inline-flex items-center whitespace-nowrap">
              <RoleBadge role={row.original.role} />
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
      students && {
        id: 'lastLoginAt',
        header: 'Đăng nhập gần nhất',
        accessorFn: (user) => user.lastLoginAt ?? undefined,
        cell: ({ row }) => <span className="whitespace-nowrap text-text-secondary">{formatDate(row.original.lastLoginAt)}</span>,
      },
      {
        id: 'createdAt',
        header: students ? 'Ngày tham gia' : 'Ngày tạo',
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
    ] as (ColumnDef<UserSummary> | false)[]).filter((column): column is ColumnDef<UserSummary> => Boolean(column)),
    [deleteUserLoading, openUserDetail, readOnly, runUserUpdate, students, updatingUserId]
  )

  return (
    <section
      className="overflow-hidden rounded-xl border border-card-border bg-card-background"
      aria-busy={loading}
    >
      <FilterToolbar>
        <SearchInput
          ariaLabel="Tìm theo tên hoặc email"
          placeholder="Tìm theo tên hoặc email..."
          value={query}
          onChange={(value) => {
            setQuery(value)
            setPage(0)
          }}
        />
        <FilterGroup>
          {!students && (
            <FilterSelect
              ariaLabel="Lọc theo vai trò"
              options={ROLE_FILTER_OPTIONS}
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value as UserRole | 'ALL')
                setPage(0)
              }}
            />
          )}
          <FilterSelect
            ariaLabel="Lọc theo trạng thái"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as UserStatus | 'ALL')
              setPage(0)
            }}
          />
          {canCreateUsers && !readOnly && (
            <Button size="sm" onClick={() => setCreateUserOpen(true)}>
              <Plus size={16} />
              {students ? 'Thêm học viên' : 'Thêm nhân sự'}
            </Button>
          )}
        </FilterGroup>
      </FilterToolbar>

      {(feedback || error) && (
        <div className="flex flex-col gap-2 px-5 py-4">
          {feedback && (
            <div
              className="flex items-center gap-2 rounded-lg bg-badge-success-bg px-3 py-2 text-sm text-badge-success-text"
              role="status"
            >
              <CheckCircle2 size={16} />
              {feedback}
            </div>
          )}

          {error && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-badge-danger-bg px-3 py-2 text-sm text-badge-danger-text"
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
            `Không có ${noun} phù hợp.`
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border px-5 py-3">
        <span className="text-sm text-text-tertiary">{pageData.totalElements} {noun}</span>
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
        accountType={students ? 'STUDENT' : 'PERSONNEL'}
        onClose={() => setCreateUserOpen(false)}
        onCreated={() => {
          setCreateUserOpen(false)
          setFeedback(students ? 'Đã tạo tài khoản học viên.' : 'Đã tạo tài khoản nhân sự.')
          setReloadKey((current) => current + 1)
        }}
      />

      <UserDetailDialog
        user={selectedUser}
        loading={detailLoading}
        canGrantRoles={canCreateUsers && !readOnly}
        grantingRoles={grantingRoles}
        canEditProfile={canCreateUsers && !readOnly}
        savingProfile={savingProfile}
        onClose={() => { if (!grantingRoles && !savingProfile) setSelectedUser(null) }}
        onSaveRoles={handleGrantedRolesChange}
        onSaveProfile={handleProfileChange}
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

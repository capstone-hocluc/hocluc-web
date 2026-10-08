import { request } from '../lib/api'

export interface StudentProfile {
  id: string
  dateOfBirth?: string
  gender?: string
  province?: string
  address?: string
  schoolName?: string
  grade?: number
  graduationYear?: number
  academicTrack?: string
  targetUniversity?: string
  targetMajor?: string
  targetExam?: string
  targetExamYear?: number
  targetScore?: number
  level?: string
  selfReportedWeakCategoryId?: string
  selfReportedWeakCategoryName?: string
  selfReportedStrongCategoryId?: string
  selfReportedStrongCategoryName?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
  avatarUrl?: string
  bio?: string
  timezone?: string
  language?: string
  status?: UserStatus
  role: UserRole
  // Not sent by the backend yet; when it is, the role switcher lists these.
  roles?: UserRole[]
  emailVerified?: boolean
  lastLoginAt?: string
  createdAt?: string
  updatedAt?: string
  studentProfile?: StudentProfile
}

export const USER_ROLES = [
  'STUDENT',
  'MENTOR',
  'TEACHER',
  'STAFF',
  'MANAGER',
  'ADMINISTRATOR',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'] as const

export type UserStatus = (typeof USER_STATUSES)[number]

export interface UserSummary {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName?: string
  avatarUrl?: string
  status: UserStatus
  role: UserRole
  emailVerified: boolean
  lastLoginAt?: string
  createdAt?: string
}

export interface UserListPage {
  content: UserSummary[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface CreateUserRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  displayName?: string
  phone?: string
  role: UserRole
}

export async function getCurrentProfile() {
  return request<UserProfile>('/api/v1/users/profiles', { auth: true })
}

export interface UpdateProfileRequest {
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
  bio?: string
  timezone?: string
  language?: string
}

export async function updateProfile(payload: UpdateProfileRequest) {
  return request<UserProfile>('/api/v1/users/profiles', {
    method: 'PUT',
    auth: true,
    body: payload,
  })
}

export interface UpdateStudentProfileRequest {
  // General-profile fields the backend contract requires on this endpoint too -
  // callers must fill these from the current profile so they aren't wiped out.
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
  avatarUrl?: string
  bio?: string
  // Student-specific fields.
  dateOfBirth?: string
  gender?: string
  province?: string
  address?: string
  schoolName?: string
  grade?: number
  graduationYear?: number
  academicTrack?: string
  targetUniversity?: string
  targetMajor?: string
  targetExam?: string
  targetExamYear?: number
  targetScore?: number
  selfReportedWeakCategoryId?: string
  selfReportedStrongCategoryId?: string
}

export async function updateStudentProfile(payload: UpdateStudentProfileRequest) {
  return request<UserProfile>('/api/v1/users/student-profiles', {
    method: 'PUT',
    auth: true,
    body: payload,
  })
}

export async function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<UserProfile>('/api/v1/users/avatars', {
    method: 'POST',
    auth: true,
    body: formData,
  })
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export async function changePassword(payload: ChangePasswordRequest) {
  return request<string>('/api/v1/users/passwords', {
    method: 'PUT',
    auth: true,
    body: payload,
  })
}

export interface UserListQuery {
  role?: UserRole
  status?: UserStatus
  page?: number
  size?: number
  sort?: string
}

function requireResponseData<T>(response: { data?: T }, message: string): T {
  if (!response.data) throw new Error(message)
  return response.data
}

export async function getUsers(query: UserListQuery = {}): Promise<UserListPage> {
  const params = new URLSearchParams()
  if (query.role) params.set('role', query.role)
  if (query.status) params.set('status', query.status)
  params.set('page', (query.page ?? 0).toString())
  params.set('size', (query.size ?? 10).toString())
  params.set('sort', query.sort ?? 'createdAt,desc')

  const response = await request<UserListPage>(`/api/v1/users?${params.toString()}`, { auth: true })
  return requireResponseData(response, 'Không thể tải danh sách người dùng.')
}

export async function createUser(payload: CreateUserRequest): Promise<UserProfile> {
  const response = await request<UserProfile>('/api/v1/users', {
    method: 'POST',
    auth: true,
    body: payload,
  })
  return requireResponseData(response, 'Không thể tạo tài khoản người dùng.')
}

export async function getUserById(id: string): Promise<UserProfile> {
  const response = await request<UserProfile>(`/api/v1/users/${id}`, { auth: true })
  return requireResponseData(response, 'Không thể tải thông tin người dùng.')
}

export async function deleteUser(id: string): Promise<void> {
  await request<void>(`/api/v1/users/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function updateUserStatus(id: string, status: UserStatus): Promise<UserProfile> {
  const response = await request<UserProfile>(`/api/v1/users/${id}/status`, {
    method: 'PATCH',
    auth: true,
    body: { status },
  })
  return requireResponseData(response, 'Không thể cập nhật trạng thái người dùng.')
}

export async function updateUserRole(id: string, role: UserRole): Promise<UserProfile> {
  const response = await request<UserProfile>(`/api/v1/users/${id}/role`, {
    method: 'PATCH',
    auth: true,
    body: { role },
  })
  return requireResponseData(response, 'Không thể cập nhật vai trò người dùng.')
}

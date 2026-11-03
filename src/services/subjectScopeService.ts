import { request } from '../lib/api'
import type { UserRole } from './userService'

/** What a person may do in a subject: label it, lead it, teach it or mentor in it. */
export type SubjectCapability = 'AUTHOR' | 'REVIEWER' | 'TEACH' | 'MENTOR'

/** The roles that do each kind of work; a capability is only granted to an account holding one of them. */
export const CAPABILITY_ROLES: Record<SubjectCapability, UserRole[]> = {
  AUTHOR: ['STAFF', 'TEACHER', 'MANAGER'],
  REVIEWER: ['STAFF', 'MANAGER'],
  TEACH: ['TEACHER'],
  MENTOR: ['MENTOR'],
}

export const CAPABILITY_LABELS: Record<SubjectCapability, string> = {
  AUTHOR: 'Soạn nhãn',
  REVIEWER: 'Trưởng môn',
  TEACH: 'Giảng dạy',
  MENTOR: 'Mentor',
}

export interface SubjectScope {
  id: string
  categoryId: string
  categoryName: string
  capability: SubjectCapability
  /** The subject and every sub-subject under it: where the permission applies. */
  coveredCategoryNames: string[]
}

export interface UserSubjectScopes {
  userId: string
  scopes: SubjectScope[]
}

export async function getUserSubjectScopes(userId: string): Promise<UserSubjectScopes> {
  const response = await request<UserSubjectScopes>(`/api/v1/admin/users/${encodeURIComponent(userId)}/scopes`, { auth: true })
  if (!response.data) throw new Error('Không thể tải quyền theo môn.')
  return response.data
}

/** Replaces the whole set: a scope left out is taken away. */
export async function replaceUserSubjectScopes(
  userId: string,
  scopes: { categoryId: string; capability: SubjectCapability }[]
): Promise<UserSubjectScopes> {
  const response = await request<UserSubjectScopes>(`/api/v1/admin/users/${encodeURIComponent(userId)}/scopes`, {
    auth: true,
    method: 'PUT',
    body: { scopes },
  })
  if (!response.data) throw new Error('Không thể lưu quyền theo môn.')
  return response.data
}

import { request } from '../lib/api'

/** Whether the center is working with a mentor now; only ACTIVE mentors are given new questions. */
export type MentorCollaborationStatus = 'ACTIVE' | 'PAUSED' | 'ENDED'

export const COLLABORATION_LABELS: Record<MentorCollaborationStatus, string> = {
  ACTIVE: 'Đang hợp tác',
  PAUSED: 'Tạm ngưng',
  ENDED: 'Đã kết thúc',
}

export const MENTOR_DOCUMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const
export const MENTOR_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

export interface MentorDocument {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
  /** Short-lived signed link. */
  downloadUrl: string
}

export interface MentorStats {
  assigned: number
  inProgress: number
  answered: number
  resolved: number
  /** From when the student asked to the first mentor reply, so it includes the wait for an assignment. */
  averageFirstReplyMinutes: number | null
  assignedToday: number
}

/** The whole profile, for the back office. Documents are listed for administrators only. */
export interface MentorProfileAdmin {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
  dateOfBirth?: string
  studentCode?: string
  collaborationStatus: MentorCollaborationStatus
  startedOn?: string
  internalNote?: string
  dailyQuestionLimit?: number
  university?: string
  major?: string
  enrollmentYear?: number
  yearOfStudy?: number
  achievements?: string
  experience?: string
  subjects: string[]
  documents: MentorDocument[]
  stats: MentorStats
}

/** What an administrator sets; a field sent empty is cleared. */
export interface MentorProfileUpdate {
  dateOfBirth?: string | null
  studentCode?: string | null
  collaborationStatus: MentorCollaborationStatus
  startedOn?: string | null
  internalNote?: string | null
  dailyQuestionLimit?: number | null
  university?: string | null
  major?: string | null
  enrollmentYear?: number | null
  achievements?: string | null
  experience?: string | null
}

/** The public card a student sees for the mentor answering their question. */
export interface MentorCard {
  id: string
  displayName: string
  avatarUrl?: string
  bio?: string
  university?: string
  major?: string
  yearOfStudy?: number
  subjects: string[]
  achievements?: string
  experience?: string
  supportHours: { dayOfWeek: number; startLocal: string; endLocal: string }[]
}

const part = encodeURIComponent

function required<T>(data: T | undefined, message: string): T {
  if (!data) throw new Error(message)
  return data
}

export async function getMentorProfile(userId: string): Promise<MentorProfileAdmin> {
  const response = await request<MentorProfileAdmin>(`/api/v1/admin/mentors/${part(userId)}/profile`, { auth: true })
  return required(response.data, 'Không thể tải hồ sơ mentor.')
}

export async function updateMentorProfile(userId: string, body: MentorProfileUpdate): Promise<MentorProfileAdmin> {
  const response = await request<MentorProfileAdmin>(`/api/v1/admin/mentors/${part(userId)}/profile`, {
    auth: true,
    method: 'PUT',
    body,
  })
  return required(response.data, 'Không thể lưu hồ sơ mentor.')
}

/** The problem with a picked proof document, or null when it can be uploaded. */
export function mentorDocumentProblem(file: File): string | null {
  if (!(MENTOR_DOCUMENT_TYPES as readonly string[]).includes(file.type)) return 'Chỉ nhận PDF, PNG, JPG hoặc WebP.'
  if (file.size <= 0) return 'Tệp trống.'
  if (file.size > MENTOR_DOCUMENT_MAX_BYTES) return 'Tệp lớn hơn 10MB.'
  return null
}

export async function uploadMentorDocument(userId: string, file: File): Promise<MentorDocument> {
  const problem = mentorDocumentProblem(file)
  if (problem) throw new Error(problem)
  const form = new FormData()
  form.append('file', file)
  const response = await request<MentorDocument>(`/api/v1/admin/mentors/${part(userId)}/documents`, {
    auth: true,
    method: 'POST',
    body: form,
  })
  return required(response.data, 'Không thể tải minh chứng lên.')
}

export async function deleteMentorDocument(fileId: string): Promise<void> {
  await request(`/api/v1/files/${part(fileId)}`, { auth: true, method: 'DELETE' })
}

export async function getMyMentorProfile(): Promise<MentorCard> {
  const response = await request<MentorCard>('/api/v1/mentors/me/profile', { auth: true })
  return required(response.data, 'Không thể tải hồ sơ mentor.')
}

export async function updateMyMentorProfile(body: { achievements: string; experience: string }): Promise<MentorCard> {
  const response = await request<MentorCard>('/api/v1/mentors/me/profile', { auth: true, method: 'PUT', body })
  return required(response.data, 'Không thể lưu hồ sơ mentor.')
}

export async function getMentorCard(mentorId: string): Promise<MentorCard> {
  const response = await request<MentorCard>(`/api/v1/mentors/${part(mentorId)}/card`, { auth: true })
  return required(response.data, 'Không thể tải hồ sơ mentor.')
}

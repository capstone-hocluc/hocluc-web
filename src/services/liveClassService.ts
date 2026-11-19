import { request } from '../lib/api'
import type { DayOfWeek } from '../types/scheduling'

/** A live class as its teacher or staff see it (GET /live-classes, PATCH .../details). */
export interface ConsoleLiveClass {
  id: string
  title: string
  description?: string | null
  startTime: string
  endTime: string
  status: string
  courseTitle?: string | null
  capacity?: number | null
  bookedCount?: number
  /** The teacher has filled in the title and description. */
  detailsFilled?: boolean
  needsAttention?: boolean
  attentionReason?: string | null
}

export interface LiveTimetableSlot {
  dayOfWeek: DayOfWeek
  /** HH:mm */
  startTime: string
  endTime: string
}

export interface CreateLiveTimetableRequest {
  teacherId: string
  subjectId: string
  title: string
  startDate: string
  endDate: string
  slots: LiveTimetableSlot[]
  phaseSessions?: { phaseId: string; sessionCount: number }[]
  capacity?: number
}

export interface LiveTimetableResponse {
  sessions: { liveClassId: string; title: string; startTime: string; needsAttention: boolean; attentionReason?: string | null }[]
  requestedSessions: number
  missingSessions: number
  warnings: string[]
}

export async function createLiveTimetable(courseId: string, body: CreateLiveTimetableRequest): Promise<LiveTimetableResponse> {
  const response = await request<LiveTimetableResponse>(
    `/api/v1/courses/${encodeURIComponent(courseId)}/live-timetables`,
    { method: 'POST', auth: true, body }
  )
  if (!response.data) throw new Error('Không tạo được thời khóa biểu trực tuyến.')
  return response.data
}

/** The signed-in teacher's live classes still to come. */
export async function getMyLiveClasses(): Promise<ConsoleLiveClass[]> {
  const response = await request<ConsoleLiveClass[]>('/api/v1/live-classes', { auth: true })
  return response.data ?? []
}

/** The licensed Zoom user the center gives a teacher; their live classes are hosted there. */
export interface TeacherZoomAccount {
  zoomEmail: string | null
  /** Real Zoom meetings are made: a teacher without an account cannot be given a live class. */
  zoomEnabled: boolean
}

export async function getTeacherZoomAccount(userId: string): Promise<TeacherZoomAccount> {
  const response = await request<TeacherZoomAccount>(`/api/v1/users/${encodeURIComponent(userId)}/zoom-account`, { auth: true })
  return response.data ?? { zoomEmail: null, zoomEnabled: false }
}

export async function assignTeacherZoomAccount(userId: string, zoomEmail: string): Promise<TeacherZoomAccount> {
  const response = await request<TeacherZoomAccount>(`/api/v1/users/${encodeURIComponent(userId)}/zoom-account`, {
    method: 'PUT',
    auth: true,
    body: { zoomEmail: zoomEmail.trim() },
  })
  if (!response.data) throw new Error('Không lưu được tài khoản Zoom.')
  return response.data
}

export const MISSING_ZOOM_ACCOUNT = 'Giáo viên này chưa được cấp tài khoản Zoom. Vui lòng liên hệ quản trị viên để được cấp.'

const ZOOM_ERRORS: Record<string, string> = {
  TEACHER_ZOOM_ACCOUNT_MISSING: MISSING_ZOOM_ACCOUNT,
  ZOOM_ACCOUNT_TAKEN: 'Tài khoản Zoom này đã được cấp cho giáo viên khác.',
  ZOOM_ACCOUNT_IN_USE: 'Tài khoản Zoom này còn lớp trực tuyến sắp tới nên chưa đổi được. Đổi sau khi các lớp đó kết thúc hoặc được hủy.',
  ZOOM_HOST_UNAVAILABLE: 'Tài khoản Zoom của giáo viên đang có lớp khác vào giờ này. Hãy chọn giờ khác.',
}

/** The Vietnamese message for a Zoom account error, or the server's own message for any other error. */
export function zoomErrorMessage(error: unknown, fallback: string) {
  const code = (error as { code?: string } | null)?.code
  if (code && ZOOM_ERRORS[code]) return ZOOM_ERRORS[code]
  return error instanceof Error && error.message ? error.message : fallback
}

export async function updateLiveClassDetails(
  liveClassId: string,
  body: { title: string; description?: string }
): Promise<ConsoleLiveClass> {
  const response = await request<ConsoleLiveClass>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/details`,
    { method: 'PATCH', auth: true, body }
  )
  if (!response.data) throw new Error('Không lưu được thông tin buổi học.')
  return response.data
}

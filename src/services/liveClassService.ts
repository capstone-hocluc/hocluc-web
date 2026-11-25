import { request } from '../lib/api'
import type { AttendanceResponse, BatchAttendanceRequest, DayOfWeek } from '../types/scheduling'

/** Live class returned by GET /api/v1/live-classes and detail/mutation endpoints. */
export interface ConsoleLiveClass {
  id: string
  title: string
  description?: string | null
  startTime: string
  endTime: string
  timezone?: string | null
  status: string
  type?: string | null
  courseId?: string | null
  courseTitle?: string | null
  subjectId?: string | null
  subjectName?: string | null
  phaseId?: string | null
  phaseName?: string | null
  teacherId?: string | null
  teacherName?: string | null
  instructorName?: string | null
  meetingUrl?: string | null
  startUrl?: string | null
  recordingUrl?: string | null
  joinable?: boolean
  capacity?: number | null
  bookedCount?: number
  seatsLeft?: number | null
  booked?: boolean
  detailsFilled?: boolean
  attendanceTaken?: boolean
  needsAttention?: boolean
  attentionReason?: string | null
}

export interface LiveTimetableSlot {
  dayOfWeek: DayOfWeek
  /** HH:mm */
  startTime: string
  endTime: string
}

export interface SelectedLiveSessionInput {
  /** yyyy-MM-dd */
  date: string
  /** HH:mm */
  start: string
  /** HH:mm */
  end: string
  phaseId?: string | null
  title?: string
}

export interface CreateLiveTimetableRequest {
  courseId?: string
  teacherId: string
  subjectId: string
  title: string
  startDate?: string
  endDate?: string
  slots?: LiveTimetableSlot[]
  phaseSessions?: { phaseId: string; sessionCount: number }[]
  capacity?: number
  sessions?: SelectedLiveSessionInput[]
}

export interface LiveTimetableResponse {
  recurringClassIds: string[]
  sessions: {
    liveClassId: string
    title: string
    startTime: string
    endTime?: string
    phaseId?: string | null
    phaseName?: string | null
    needsAttention: boolean
    attentionReason?: string | null
    meetingUrl?: string | null
  }[]
  requestedSessions: number
  missingSessions: number
  warnings: string[]
}

export interface LiveTimetablePreviewSession {
  index: number
  date: string
  start: string
  end: string
  startTime: string
  endTime: string
  title: string
  subjectId: string
  subject: string
  phaseId?: string | null
  phase?: string | null
  attention?: string | null
  blockingErrors: string[]
}

export interface LiveTimetablePreviewResponse {
  sessions: LiveTimetablePreviewSession[]
  blockingErrors: string[]
  warnings: string[]
  requestedSessions: number
  missingSessions: number
  canCreate: boolean
}

export interface TeachableSubject {
  id: string
  name: string
  slug: string
  parentId?: string | null
}

export interface LiveClassBookingItem {
  id: string
  liveClassId: string
  studentId: string
  studentName: string
  studentEmail?: string | null
  status: string
  bookedAt?: string | null
}

export interface StudentLiveAttendanceSummary {
  totalClasses: number
  presentCount: number
  lateCount: number
  absentCount: number
  excusedCount: number
  attendanceRate: number
}

export async function previewLiveTimetable(
  body: CreateLiveTimetableRequest & { courseId: string }
): Promise<LiveTimetablePreviewResponse> {
  const response = await request<LiveTimetablePreviewResponse>('/api/v1/live-timetables/preview', {
    method: 'POST',
    auth: true,
    body,
  })
  if (!response.data) throw new Error('Không xem trước được lịch dạy.')
  return response.data
}

export async function createLiveTimetable(
  courseId: string,
  body: CreateLiveTimetableRequest
): Promise<LiveTimetableResponse> {
  const response = await request<LiveTimetableResponse>(
    `/api/v1/courses/${encodeURIComponent(courseId)}/live-timetables`,
    { method: 'POST', auth: true, body }
  )
  if (!response.data) throw new Error('Không tạo được thời khóa biểu trực tuyến.')
  return response.data
}

export async function getTeachableSubjects(
  courseId: string,
  teacherId: string
): Promise<TeachableSubject[]> {
  const response = await request<TeachableSubject[]>(
    `/api/v1/courses/${encodeURIComponent(courseId)}/teachers/${encodeURIComponent(teacherId)}/teachable-subjects`,
    { auth: true }
  )
  return response.data ?? []
}

export async function getLiveClassesInRange(params: {
  from?: string
  to?: string
  courseId?: string
  teacherId?: string
  includeCancelled?: boolean
} = {}): Promise<ConsoleLiveClass[]> {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.courseId) search.set('courseId', params.courseId)
  if (params.teacherId) search.set('teacherId', params.teacherId)
  if (params.includeCancelled !== undefined) search.set('includeCancelled', String(params.includeCancelled))
  const query = search.toString()
  const response = await request<ConsoleLiveClass[]>(
    query ? `/api/v1/live-classes?${query}` : '/api/v1/live-classes',
    { auth: true }
  )
  return response.data ?? []
}

/** The signed-in teacher's live classes still to come. */
export async function getMyLiveClasses(): Promise<ConsoleLiveClass[]> {
  const response = await request<ConsoleLiveClass[]>('/api/v1/live-classes', { auth: true })
  return response.data ?? []
}

export async function updateLiveClass(
  liveClassId: string,
  body: { startTime?: string; endTime?: string; teacherId?: string; title?: string }
): Promise<ConsoleLiveClass> {
  const response = await request<ConsoleLiveClass>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}`,
    { method: 'PATCH', auth: true, body }
  )
  if (!response.data) throw new Error('Không cập nhật được buổi học.')
  return response.data
}

export async function cancelLiveClass(liveClassId: string): Promise<ConsoleLiveClass> {
  const response = await request<ConsoleLiveClass>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/cancel`,
    { method: 'POST', auth: true }
  )
  if (!response.data) throw new Error('Không hủy được buổi học.')
  return response.data
}

export async function startLiveClass(liveClassId: string): Promise<ConsoleLiveClass> {
  const response = await request<ConsoleLiveClass>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/start`,
    { method: 'POST', auth: true }
  )
  if (!response.data) throw new Error('Không mở được lớp học.')
  return response.data
}

export async function endLiveClass(liveClassId: string): Promise<ConsoleLiveClass> {
  const response = await request<ConsoleLiveClass>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/end`,
    { method: 'POST', auth: true }
  )
  if (!response.data) throw new Error('Không kết thúc được buổi học.')
  return response.data
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

export async function getLiveClassBookings(liveClassId: string): Promise<LiveClassBookingItem[]> {
  const response = await request<LiveClassBookingItem[]>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/bookings`,
    { auth: true }
  )
  return response.data ?? []
}

export async function getLiveClassAttendances(liveClassId: string): Promise<AttendanceResponse[]> {
  const response = await request<AttendanceResponse[]>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/attendances`,
    { auth: true }
  )
  return response.data ?? []
}

export async function saveLiveClassAttendances(
  liveClassId: string,
  body: BatchAttendanceRequest
): Promise<AttendanceResponse[]> {
  const response = await request<AttendanceResponse[]>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/attendances`,
    { method: 'PUT', auth: true, body }
  )
  if (!response.data) throw new Error('Không lưu được điểm danh.')
  return response.data
}

export async function getMyLiveAttendanceSummary(): Promise<StudentLiveAttendanceSummary> {
  const response = await request<StudentLiveAttendanceSummary>(
    '/api/v1/live-classes/my-attendance-summary',
    { auth: true }
  )
  return response.data ?? {
    totalClasses: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    excusedCount: 0,
    attendanceRate: 0,
  }
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

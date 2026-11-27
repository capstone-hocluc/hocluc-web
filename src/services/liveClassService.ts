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
  joinPrice?: number
  admitted?: boolean
  admittedCount?: number
  refunded?: boolean
  detailsFilled?: boolean
  needsAttention?: boolean
  hostZoomReconnectRequired?: boolean
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

export interface LiveClassJoinResponse {
  liveClassId: string
  paidAmount: number
  paidAt: string
  alreadyAdmitted: boolean
  balance: number
}

export interface LiveClassAdmissionItem {
  studentId: string
  studentName: string
  paidAmount: number
  paidAt: string
  refundedAt: string | null
  joinedAt: string | null
  attendanceMinutes: number
}

export interface LiveClassRefundResponse {
  refundedCount: number
  refundedAmount: number
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

export interface LiveRoom {
  liveClassId: string
  title: string
  startTime: string
  endTime: string
  embedded: boolean
  sdkKey: string | null
  signature: string | null
  meetingNumber: string | null
  passcode: string | null
  userName: string | null
  userEmail: string | null
  role: 0 | 1 | null
  zak: string | null
  registrantToken: string | null
  fallbackUrl: string | null
}

export async function getLiveRoom(liveClassId: string, signal?: AbortSignal): Promise<LiveRoom> {
  const response = await request<LiveRoom>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/room`,
    { method: 'POST', auth: true, guardIdentity: true, signal }
  )
  if (!response.data) throw new Error('Không mở được phòng học.')
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

export async function joinLiveClass(liveClassId: string): Promise<LiveClassJoinResponse> {
  const response = await request<LiveClassJoinResponse>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/join`,
    { method: 'POST', auth: true }
  )
  if (!response.data) throw new Error('Không thể tham gia buổi học.')
  return response.data
}

export async function getLiveClassAdmissions(liveClassId: string): Promise<LiveClassAdmissionItem[]> {
  const response = await request<LiveClassAdmissionItem[]>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/admissions`,
    { auth: true }
  )
  return response.data ?? []
}

export async function refundLiveClass(
  liveClassId: string,
  body: { reason: string }
): Promise<LiveClassRefundResponse> {
  const response = await request<LiveClassRefundResponse>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/refund`,
    { method: 'POST', auth: true, body }
  )
  if (!response.data) throw new Error('Không thể hoàn Sao cho buổi học.')
  return response.data
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

/** A teacher's personal Zoom OAuth account or mock Zoom status. */
export interface TeacherZoomAccount {
  connected: boolean
  zoomEmail: string | null
  planType: 'BASIC' | 'LICENSED' | null
  /** Real Zoom meetings are made: a teacher without a connected account cannot be given a live class. */
  zoomEnabled: boolean
  status: 'CONNECTED' | 'REVOKED' | 'ERROR' | null
  lastError: string | null
}

const EMPTY_TEACHER_ZOOM: TeacherZoomAccount = {
  connected: false,
  zoomEmail: null,
  planType: null,
  zoomEnabled: false,
  status: null,
  lastError: null,
}

export async function getTeacherZoomAccount(userId: string): Promise<TeacherZoomAccount> {
  const response = await request<TeacherZoomAccount>(
    `/api/v1/users/${encodeURIComponent(userId)}/zoom-account`,
    { auth: true }
  )
  return response.data ?? EMPTY_TEACHER_ZOOM
}

export async function getMyTeacherZoom(): Promise<TeacherZoomAccount> {
  const response = await request<TeacherZoomAccount>('/api/v1/teacher/zoom', { auth: true })
  return response.data ?? EMPTY_TEACHER_ZOOM
}

export async function connectMyTeacherZoom(): Promise<{ authorizeUrl: string }> {
  const response = await request<{ authorizeUrl: string }>('/api/v1/teacher/zoom/connect', {
    method: 'POST',
    auth: true,
  })
  if (!response.data?.authorizeUrl) throw new Error('Không khởi tạo được liên kết kết nối Zoom.')
  return response.data
}

export async function disconnectMyTeacherZoom(): Promise<TeacherZoomAccount> {
  const response = await request<TeacherZoomAccount>('/api/v1/teacher/zoom', {
    method: 'DELETE',
    auth: true,
  })
  return response.data ?? EMPTY_TEACHER_ZOOM
}

export const MISSING_ZOOM_ACCOUNT = 'Giảng viên chưa kết nối Zoom.'

const ZOOM_ERRORS: Record<string, string> = {
  TEACHER_ZOOM_ACCOUNT_MISSING: MISSING_ZOOM_ACCOUNT,
  ZOOM_ACCOUNT_TAKEN: 'Tài khoản Zoom này đã được kết nối với giảng viên khác.',
  ZOOM_ACCOUNT_IN_USE:
    'Tài khoản Zoom này đang có lớp trực tuyến sắp tới nên chưa ngắt kết nối hoặc đổi được.',
  ZOOM_HOST_UNAVAILABLE:
    'Tài khoản Zoom của giảng viên đang có lớp khác vào giờ này. Hãy chọn giờ khác.',
  ZOOM_RECONNECT_REQUIRED:
    'Kết nối Zoom đã hết hạn hoặc bị thu hồi. Giảng viên cần kết nối lại tài khoản Zoom.',
  ZOOM_OAUTH_NOT_CONFIGURED: 'Hệ thống chưa cấu hình kết nối Zoom OAuth.',
  ZOOM_OAUTH_STATE_INVALID: 'Phiên kết nối Zoom đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.',
  ZOOM_OAUTH_ORIGIN_INVALID: 'Địa chỉ chuyển hướng không hợp lệ.',
  ZOOM_API_ERROR: 'Không kết nối được với Zoom lúc này. Vui lòng thử lại sau.',
}

const ZOOM_CALLBACK_REASONS: Record<string, string> = {
  invalid_state: ZOOM_ERRORS.ZOOM_OAUTH_STATE_INVALID,
  invalid_origin: ZOOM_ERRORS.ZOOM_OAUTH_ORIGIN_INVALID,
  denied: 'Bạn đã hủy cấp quyền kết nối tài khoản Zoom.',
  missing_code: 'Không nhận được mã xác thực từ Zoom. Vui lòng thử lại.',
  invalid_teacher: 'Chỉ tài khoản giảng viên mới được kết nối Zoom.',
  not_configured: ZOOM_ERRORS.ZOOM_OAUTH_NOT_CONFIGURED,
  oauth_failed: 'Không hoàn tất được kết nối Zoom. Vui lòng thử lại.',
  account_taken: ZOOM_ERRORS.ZOOM_ACCOUNT_TAKEN,
}

export function zoomCallbackErrorMessage(reason?: string | null): string {
  if (reason && ZOOM_CALLBACK_REASONS[reason]) return ZOOM_CALLBACK_REASONS[reason]
  if (reason && ZOOM_ERRORS[reason]) return ZOOM_ERRORS[reason]
  return 'Không kết nối được tài khoản Zoom. Vui lòng thử lại.'
}

/** The Vietnamese message for a Zoom account error, or the server's own message for any other error. */
export function zoomErrorMessage(error: unknown, fallback: string) {
  const code = (error as { code?: string } | null)?.code
  if (code && ZOOM_ERRORS[code]) return ZOOM_ERRORS[code]
  return error instanceof Error && error.message ? error.message : fallback
}

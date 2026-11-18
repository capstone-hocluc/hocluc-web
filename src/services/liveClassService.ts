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

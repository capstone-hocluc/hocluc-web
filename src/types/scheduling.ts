/** Types for the hocluc-api PR #13 scheduling contract. Keep API resources and IDs distinct. */

export type DeliveryMode = 'ONLINE' | 'OFFLINE' | 'PHYSICAL' | 'HYBRID'
export type ScheduleStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
export type MeetingProvider = 'ZOOM' | 'GOOGLE_MEET' | 'MICROSOFT_TEAMS' | 'OTHER'
export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

/** Schedule times are Instants serialized as ISO-8601 strings. */
export interface ScheduleResponse {
  id: string
  courseId: string
  courseName: string
  instructorId: string
  instructorName: string
  title: string
  description?: string | null
  startTime: string
  endTime: string
  timezone: string
  deliveryMode: DeliveryMode
  location?: string | null
  recurrenceRule?: string | null
  status: ScheduleStatus
  liveClassId?: string | null
  meetingId?: string | null
  meetingUrl?: string | null
  startUrl?: string | null
  enrolledStudentsCount?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateScheduleRequest {
  instructorId: string
  title: string
  description?: string
  startTime: string
  endTime: string
  timezone?: string
  deliveryMode: DeliveryMode
  location?: string
  recurrenceRule?: string
  lessonId?: string
}

export interface UpdateScheduleRequest {
  instructorId?: string
  title?: string
  description?: string
  startTime?: string
  endTime?: string
  timezone?: string
  deliveryMode?: DeliveryMode
  location?: string
  recurrenceRule?: string
  status?: ScheduleStatus
}

/** LocalDate and LocalTime fields remain strings; do not parse them as UTC instants. */
export interface RecurringClassResponse {
  id: string
  courseId: string
  sectionId?: string | null
  sectionTitle?: string | null
  teacherId: string
  teacherName: string
  title: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  durationMinutes: number
  defaultMode: DeliveryMode
  defaultLocation?: string | null
  defaultMeetingProvider?: MeetingProvider | null
  defaultMeetingLink?: string | null
  startDate: string
  endDate: string
  status: ScheduleStatus
  sessions: ClassSessionResponse[]
}

export interface CreateRecurringClassRequest {
  teacherId: string
  sectionId?: string
  title: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime?: string
  durationMinutes: number
  defaultMode: DeliveryMode
  defaultLocation?: string
  defaultMeetingProvider?: MeetingProvider
  defaultMeetingLink?: string
  startDate: string
  endDate: string
  timezone?: string
}

/** ClassSession has its own ID and has no scheduleId in PR #13. */
export interface ClassSessionResponse {
  id: string
  recurringClassId?: string | null
  courseId: string
  sectionId?: string | null
  sectionTitle?: string | null
  teacherId: string
  teacherName: string
  title: string
  sessionDate: string
  startTime: string
  endTime: string
  mode: DeliveryMode
  classroom?: string | null
  meetingProvider?: MeetingProvider | null
  meetingLink?: string | null
  status: ScheduleStatus
  /** JSON property name in the live API OpenAPI schema. */
  overridden: boolean
}

export interface UpdateClassSessionRequest {
  teacherId?: string
  title?: string
  sessionDate?: string
  startTime?: string
  endTime?: string
  mode?: DeliveryMode
  classroom?: string
  meetingProvider?: MeetingProvider
  meetingLink?: string
  status?: ScheduleStatus
}

export interface AvailabilitySlot {
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
}

export interface BatchTeacherAvailabilityRequest {
  slots: AvailabilitySlot[]
}

export interface AvailabilityExceptionResponse {
  id: string
  exceptionDate: string
  startTime?: string | null
  endTime?: string | null
  isAvailable: boolean
  reason?: string | null
}

export interface CreateAvailabilityExceptionRequest {
  exceptionDate: string
  startTime?: string
  endTime?: string
  isAvailable?: boolean
  reason?: string
}

export interface TeacherAvailabilityResponse {
  teacherId: string
  teacherName: string
  recurringSlots: AvailabilitySlot[]
  exceptions: AvailabilityExceptionResponse[]
}

export interface SectionRequirement {
  sectionId: string
  sectionTitle?: string
  candidateTeacherIds?: string[]
  sessionsPerWeek?: number
  durationMinutes?: number
  preferredMode?: DeliveryMode
  preferredDays?: DayOfWeek[]
}

export interface GenerateTimetableProposalRequest {
  startDate: string
  endDate: string
  sectionRequirements: SectionRequirement[]
  roomPool?: string[]
}

export interface ProposedRecurringSchedule {
  sectionId: string
  sectionTitle: string
  teacherId: string
  teacherName: string
  title: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  durationMinutes: number
  mode: DeliveryMode
  room?: string | null
  meetingProvider?: MeetingProvider | null
  meetingLink?: string | null
  projectedSessionDates: string[]
}

export interface UnassignedSection {
  sectionId: string
  sectionTitle: string
  reason?: string | null
}

export interface TimetableProposalResponse {
  proposalId: string
  courseId: string
  status: string
  proposedSchedules: ProposedRecurringSchedule[]
  unassignedSections: UnassignedSection[]
}

/** PR #13 confirm body contains schedules and does not accept proposalId/idempotency keys. */
export interface ConfirmTimetableProposalRequest {
  schedules: CreateRecurringClassRequest[]
}

export interface AttendanceResponse {
  id: string
  scheduleId: string
  studentId: string
  studentName: string
  studentEmail: string
  status: AttendanceStatus
  joinedAt?: string | null
  leftAt?: string | null
  attendanceMinutes?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface StudentAttendanceItem {
  studentId: string
  status: AttendanceStatus
  attendanceMinutes?: number
}

export interface BatchAttendanceRequest {
  attendances: StudentAttendanceItem[]
}

export interface CourseAttendanceSummaryResponse {
  courseId: string
  courseName: string
  studentId: string
  totalSchedules: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendanceRate: number
}

export interface AttachSessionRecordingRequest {
  fileId?: string
  title: string
  videoUrl?: string
  provider?: MeetingProvider
  durationSeconds?: number
  fileSizeBytes?: number
}

export interface ClassSessionRecordingResponse {
  id: string
  classSessionId: string
  sessionTitle: string
  sectionId?: string | null
  sectionTitle?: string | null
  fileId?: string | null
  title: string
  videoUrl?: string | null
  streamUrl?: string | null
  provider?: MeetingProvider | null
  durationSeconds?: number | null
  fileSizeBytes?: number | null
  createdAt: string
}

export type ScheduleCalendarItem =
  | { kind: 'schedule'; sourceId: string; item: ScheduleResponse }
  | { kind: 'classSession'; sourceId: string; item: ClassSessionResponse }
  | { kind: 'liveClass'; sourceId: string; item: import('../services/courseService').CourseStudyLiveClass }

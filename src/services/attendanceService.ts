import type {
  AttendanceResponse,
  AttendanceStatus,
  BatchAttendanceRequest,
  CourseAttendanceSummaryResponse,
} from '../types/scheduling'
import { requestSchedulingData, schedulingQuery } from './schedulingApi'

const API = '/api/v1'

export function getScheduleAttendances(scheduleId: string): Promise<AttendanceResponse[]> {
  return requestSchedulingData<AttendanceResponse[]>(
    API + '/schedules/' + encodeURIComponent(scheduleId) + '/attendances',
    { auth: true },
    'Không thể tải danh sách điểm danh.'
  )
}

export function saveScheduleAttendances(
  scheduleId: string,
  payload: BatchAttendanceRequest
): Promise<AttendanceResponse[]> {
  return requestSchedulingData<AttendanceResponse[]>(
    API + '/schedules/' + encodeURIComponent(scheduleId) + '/attendances',
    { method: 'PUT', auth: true, body: payload },
    'Máy chủ không trả về danh sách điểm danh đã lưu.'
  )
}

export function updateAttendance(
  scheduleId: string,
  studentId: string,
  status: AttendanceStatus,
  attendanceMinutes?: number
): Promise<AttendanceResponse> {
  return requestSchedulingData<AttendanceResponse>(
    API + '/schedules/' + encodeURIComponent(scheduleId) + '/attendances/' + encodeURIComponent(studentId) + schedulingQuery({
      status,
      attendanceMinutes: attendanceMinutes === undefined ? undefined : String(attendanceMinutes),
    }),
    { method: 'PATCH', auth: true },
    'Máy chủ không trả về trạng thái điểm danh đã cập nhật.'
  )
}

export function getMyAttendanceForSchedule(scheduleId: string): Promise<AttendanceResponse> {
  return requestSchedulingData<AttendanceResponse>(
    API + '/schedules/' + encodeURIComponent(scheduleId) + '/my-attendance',
    { auth: true },
    'Không thể tải điểm danh của buổi học.'
  )
}

export function getMyCourseAttendance(
  courseId: string
): Promise<CourseAttendanceSummaryResponse> {
  return requestSchedulingData<CourseAttendanceSummaryResponse>(
    API + '/courses/' + encodeURIComponent(courseId) + '/attendances/student',
    { auth: true },
    'Không thể tải tổng hợp chuyên cần.'
  )
}

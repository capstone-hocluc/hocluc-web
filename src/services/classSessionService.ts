import type { ClassSessionResponse, UpdateClassSessionRequest } from '../types/scheduling'
import { requestSchedulingData, schedulingQuery } from './schedulingApi'

const API = '/api/v1'

export function getCourseClassSessions(
  courseId: string,
  range: { startDate: string; endDate: string }
): Promise<ClassSessionResponse[]> {
  return requestSchedulingData<ClassSessionResponse[]>(
    API + '/courses/' + encodeURIComponent(courseId) + '/class-sessions' + schedulingQuery(range),
    { auth: true },
    'Không thể tải các buổi học của khóa học.'
  )
}

export function getTeacherClassSessions(
  teacherId: string,
  range: { startDate: string; endDate: string }
): Promise<ClassSessionResponse[]> {
  return requestSchedulingData<ClassSessionResponse[]>(
    API + '/teachers/' + encodeURIComponent(teacherId) + '/class-sessions' + schedulingQuery(range),
    { auth: true },
    'Không thể tải lịch dạy.'
  )
}

export function updateClassSession(
  classSessionId: string,
  payload: UpdateClassSessionRequest
): Promise<ClassSessionResponse> {
  return requestSchedulingData<ClassSessionResponse>(
    API + '/class-sessions/' + encodeURIComponent(classSessionId),
    { method: 'PATCH', auth: true, body: payload },
    'Máy chủ không trả về buổi học đã cập nhật.'
  )
}

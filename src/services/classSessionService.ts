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

export function getSectionClassSessions(
  courseId: string,
  sectionId: string
): Promise<ClassSessionResponse[]> {
  return requestSchedulingData<ClassSessionResponse[]>(
    API + '/courses/' + encodeURIComponent(courseId) + '/sections/' + encodeURIComponent(sectionId) + '/class-sessions',
    { auth: true },
    'Không thể tải các buổi học của lớp.'
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

export function getClassSession(classSessionId: string): Promise<ClassSessionResponse> {
  return requestSchedulingData<ClassSessionResponse>(
    API + '/class-sessions/' + encodeURIComponent(classSessionId),
    { auth: true },
    'Không thể tải thông tin buổi học.'
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

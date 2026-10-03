import { request } from '../lib/api'
import type {
  AvailabilityExceptionResponse,
  BatchTeacherAvailabilityRequest,
  CreateAvailabilityExceptionRequest,
  TeacherAvailabilityResponse,
} from '../types/scheduling'
import { requestSchedulingData } from './schedulingApi'

const API = '/api/v1/teachers/availabilities'

export function getMyAvailability(): Promise<TeacherAvailabilityResponse> {
  return requestSchedulingData<TeacherAvailabilityResponse>(API, { auth: true }, 'Không thể tải giờ rảnh của bạn.')
}

export function replaceMyAvailability(
  payload: BatchTeacherAvailabilityRequest
): Promise<TeacherAvailabilityResponse> {
  return requestSchedulingData<TeacherAvailabilityResponse>(
    API,
    { method: 'PUT', auth: true, body: payload },
    'Máy chủ không trả về giờ rảnh đã cập nhật.'
  )
}

export function createAvailabilityException(
  payload: CreateAvailabilityExceptionRequest
): Promise<AvailabilityExceptionResponse> {
  return requestSchedulingData<AvailabilityExceptionResponse>(
    API + '/exceptions',
    { method: 'POST', auth: true, body: payload },
    'Máy chủ không trả về ngoại lệ vừa tạo.'
  )
}

export async function deleteAvailabilityException(exceptionId: string): Promise<void> {
  await request<void>(API + '/exceptions/' + encodeURIComponent(exceptionId), {
    method: 'DELETE',
    auth: true,
  })
}

export function getTeacherAvailability(teacherId: string): Promise<TeacherAvailabilityResponse> {
  return requestSchedulingData<TeacherAvailabilityResponse>(
    API + '/' + encodeURIComponent(teacherId),
    { auth: true },
    'Không thể tải giờ rảnh của giáo viên.'
  )
}

import { request } from '../lib/api'
import type { CreateRecurringClassRequest, RecurringClassResponse } from '../types/scheduling'
import { requestSchedulingData } from './schedulingApi'

const API = '/api/v1'

export function getCourseRecurringClasses(courseId: string): Promise<RecurringClassResponse[]> {
  return requestSchedulingData<RecurringClassResponse[]>(
    API + '/courses/' + encodeURIComponent(courseId) + '/recurring-classes',
    { auth: true },
    'Không thể tải lịch lặp của khóa học.'
  )
}

export function getRecurringClass(recurringClassId: string): Promise<RecurringClassResponse> {
  return requestSchedulingData<RecurringClassResponse>(
    API + '/recurring-classes/' + encodeURIComponent(recurringClassId),
    { auth: true },
    'Không thể tải thông tin lịch lặp.'
  )
}

export function createRecurringClass(
  courseId: string,
  payload: CreateRecurringClassRequest
): Promise<RecurringClassResponse> {
  return requestSchedulingData<RecurringClassResponse>(
    API + '/courses/' + encodeURIComponent(courseId) + '/recurring-classes',
    { method: 'POST', auth: true, body: payload },
    'Máy chủ không trả về lịch lặp vừa tạo.'
  )
}

/** PR #13 DELETE cancels the full recurring series and its sessions. */
export async function cancelRecurringClass(recurringClassId: string): Promise<void> {
  await request<void>(API + '/recurring-classes/' + encodeURIComponent(recurringClassId), {
    method: 'DELETE',
    auth: true,
  })
}

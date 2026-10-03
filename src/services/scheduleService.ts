import { request } from '../lib/api'
import type { CreateScheduleRequest, ScheduleResponse, UpdateScheduleRequest } from '../types/scheduling'
import { requestSchedulingData, schedulingQuery } from './schedulingApi'

const API = '/api/v1'

export function getCourseSchedules(courseId: string): Promise<ScheduleResponse[]> {
  return requestSchedulingData<ScheduleResponse[]>(
    API + '/courses/' + encodeURIComponent(courseId) + '/schedules',
    { auth: true },
    'Không thể tải lịch học của khóa học.'
  )
}

export function getSchedule(scheduleId: string): Promise<ScheduleResponse> {
  return requestSchedulingData<ScheduleResponse>(
    API + '/schedules/' + encodeURIComponent(scheduleId),
    { auth: true },
    'Không thể tải thông tin lịch học.'
  )
}

export function createSchedule(courseId: string, payload: CreateScheduleRequest): Promise<ScheduleResponse> {
  return requestSchedulingData<ScheduleResponse>(
    API + '/courses/' + encodeURIComponent(courseId) + '/schedules',
    { method: 'POST', auth: true, body: payload },
    'Máy chủ không trả về lịch học vừa tạo.'
  )
}

export function updateSchedule(
  scheduleId: string,
  payload: UpdateScheduleRequest
): Promise<ScheduleResponse> {
  return requestSchedulingData<ScheduleResponse>(
    API + '/schedules/' + encodeURIComponent(scheduleId),
    { method: 'PUT', auth: true, body: payload },
    'Máy chủ không trả về lịch học đã cập nhật.'
  )
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  await request<void>(API + '/schedules/' + encodeURIComponent(scheduleId), {
    method: 'DELETE',
    auth: true,
  })
}

export function getTeachingSchedules(range: { startDate: string; endDate: string }) {
  return requestSchedulingData<ScheduleResponse[]>(
    API + '/schedules/teaching' + schedulingQuery(range),
    { auth: true },
    'Không thể tải lịch giảng dạy.'
  )
}

export function getStudentSchedules(range: { startDate: string; endDate: string }) {
  return requestSchedulingData<ScheduleResponse[]>(
    API + '/schedules/student' + schedulingQuery(range),
    { auth: true },
    'Không thể tải lịch học.'
  )
}

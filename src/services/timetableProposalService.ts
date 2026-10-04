import type {
  ConfirmTimetableProposalRequest,
  CreateRecurringClassRequest,
  GenerateTimetableProposalRequest,
  RecurringClassResponse,
  TimetableProposalResponse,
} from '../types/scheduling'
import { requestSchedulingData } from './schedulingApi'

const API = '/api/v1/courses'

export function generateTimetableProposal(
  courseId: string,
  payload: GenerateTimetableProposalRequest
): Promise<TimetableProposalResponse> {
  return requestSchedulingData<TimetableProposalResponse>(
    API + '/' + encodeURIComponent(courseId) + '/timetable-proposals',
    { method: 'POST', auth: true, body: payload },
    'Máy chủ không trả về đề xuất thời khóa biểu.'
  )
}

/** Confirmation is payload-based; PR #13 does not accept proposalId or an idempotency key. */
export function confirmTimetableProposal(
  courseId: string,
  payload: ConfirmTimetableProposalRequest
): Promise<RecurringClassResponse[]> {
  return requestSchedulingData<RecurringClassResponse[]>(
    API + '/' + encodeURIComponent(courseId) + '/timetable-proposals/confirm',
    { method: 'POST', auth: true, body: payload },
    'Máy chủ không trả về các lịch lặp đã xác nhận.'
  )
}

export function proposalSchedulesAsRecurring(
  proposal: TimetableProposalResponse,
  period: { startDate: string; endDate: string },
  timezone = 'Asia/Ho_Chi_Minh'
): CreateRecurringClassRequest[] {
  return proposal.proposedSchedules.map((item) => ({
    teacherId: item.teacherId,
    sectionId: item.sectionId,
    title: item.title,
    dayOfWeek: item.dayOfWeek,
    startTime: item.startTime,
    endTime: item.endTime,
    durationMinutes: item.durationMinutes,
    defaultMode: item.mode,
    ...(item.room ? { defaultLocation: item.room } : {}),
    ...(item.meetingProvider && (item.mode === 'ONLINE' || item.mode === 'HYBRID')
      ? { defaultMeetingProvider: item.meetingProvider }
      : {}),
    // The current proposal response can contain an unprovisioned URL for physical sessions.
    // Do not persist a meeting link until a real meeting has been provisioned.
    startDate: period.startDate,
    endDate: period.endDate,
    timezone,
  }))
}

import { request } from '../lib/api'
import { requestSchedulingData } from './schedulingApi'
import type {
  AttachSessionRecordingRequest,
  ClassSessionRecordingResponse,
  UpdateSessionRecordingRequest,
} from '../types/scheduling'

const API = '/api/v1'

/**
 * Caller must enforce the documented release gates:
 * - do not expose section recordings to students until enrollment and course/section
 *   authorization is enforced by BE;
 * - do not allow Teacher attach until teacher assignment is checked by BE;
 * - never attach fileId until BE verifies its ownership and scope.
 */
export function getClassSessionRecordings(
  classSessionId: string
): Promise<ClassSessionRecordingResponse[]> {
  return requestSchedulingData<ClassSessionRecordingResponse[]>(
    API + '/class-sessions/' + encodeURIComponent(classSessionId) + '/recordings',
    { auth: true },
    'Không thể tải bản ghi của buổi học.'
  )
}

export function getSectionRecordings(
  courseId: string,
  sectionId: string
): Promise<ClassSessionRecordingResponse[]> {
  return requestSchedulingData<ClassSessionRecordingResponse[]>(
    API + '/courses/' + encodeURIComponent(courseId) + '/sections/' + encodeURIComponent(sectionId) + '/recordings',
    { auth: true },
    'Không thể tải bản ghi của lớp.'
  )
}

export function attachClassSessionRecording(
  classSessionId: string,
  payload: AttachSessionRecordingRequest
): Promise<ClassSessionRecordingResponse> {
  return requestSchedulingData<ClassSessionRecordingResponse>(
    API + '/class-sessions/' + encodeURIComponent(classSessionId) + '/recordings',
    { method: 'POST', auth: true, body: payload },
    'Máy chủ không trả về bản ghi vừa gắn.'
  )
}

export function updateClassSessionRecording(
  classSessionId: string,
  recordingId: string,
  payload: UpdateSessionRecordingRequest
): Promise<ClassSessionRecordingResponse> {
  return requestSchedulingData<ClassSessionRecordingResponse>(
    API +
      '/class-sessions/' + encodeURIComponent(classSessionId) +
      '/recordings/' + encodeURIComponent(recordingId),
    { method: 'PATCH', auth: true, body: payload },
    'Máy chủ không trả về bản ghi đã cập nhật.'
  )
}

/** Removes the recording row; the stored file itself stays on the server. */
export async function deleteClassSessionRecording(
  classSessionId: string,
  recordingId: string
): Promise<void> {
  await request<void>(
    API +
      '/class-sessions/' + encodeURIComponent(classSessionId) +
      '/recordings/' + encodeURIComponent(recordingId),
    { method: 'DELETE', auth: true }
  )
}

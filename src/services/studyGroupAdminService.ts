import { request } from '../lib/api'
import type {
  StudyGroupHouseType,
  StudyGroupLevel,
  StudyGroupMemberStatus,
  StudyGroupMentor,
} from './studyGroupService'

/** A mentor group as the console sees it. Reuses the student-flow house/level/mentor shapes. */
export interface StudyGroupAdmin {
  id: string
  courseId: string
  courseTitle: string
  name: string
  houseType: StudyGroupHouseType
  houseLabel: string
  level: StudyGroupLevel | null
  capacity: number | null
  activeStudentCount: number
  /** Null when the group has no capacity limit. */
  remainingCapacity: number | null
  mentors: StudyGroupMentor[]
}

export interface GroupMember {
  groupStudentId: string
  studentId: string
  studentEmail: string
  studentName: string
  status: StudyGroupMemberStatus
  joinedAt: string | null
}

export interface StudyGroupAdminDetail extends StudyGroupAdmin {
  members: GroupMember[]
}

export interface StudyGroupRequest {
  name: string
  houseType: StudyGroupHouseType
  /** Null puts the group in every level band. */
  level: StudyGroupLevel | null
  /** Null means unlimited. */
  capacity: number | null
}

export interface MentorStrength {
  mentorId: string
  fullName: string
  categoryIds: string[]
  subjectNames: string[]
}

function coursePath(courseId: string) {
  return `/api/v1/admin/courses/${encodeURIComponent(courseId)}`
}

async function requireData<T>(
  path: string,
  fallbackMessage: string,
  options?: Parameters<typeof request<T>>[1]
): Promise<T> {
  const response = await request<T>(path, { auth: true, ...options })
  if (!response.data) throw new Error(fallbackMessage)
  return response.data
}

export function getAdminStudyGroups(courseId: string): Promise<StudyGroupAdmin[]> {
  return requireData(`${coursePath(courseId)}/study-groups`, 'Không thể tải danh sách nhóm học.')
}

export function getAdminStudyGroup(courseId: string, groupId: string): Promise<StudyGroupAdminDetail> {
  return requireData(
    `${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}`,
    'Không thể tải thông tin nhóm học.'
  )
}

export function createAdminStudyGroup(
  courseId: string,
  payload: StudyGroupRequest
): Promise<StudyGroupAdmin> {
  return requireData(`${coursePath(courseId)}/study-groups`, 'Không thể tạo nhóm học.', {
    method: 'POST',
    body: payload,
  })
}

export function updateAdminStudyGroup(
  courseId: string,
  groupId: string,
  payload: StudyGroupRequest
): Promise<StudyGroupAdmin> {
  return requireData(
    `${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}`,
    'Không thể lưu nhóm học.',
    { method: 'PUT', body: payload }
  )
}

export function deleteAdminStudyGroup(courseId: string, groupId: string): Promise<void> {
  return request<void>(`${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}`, {
    auth: true,
    method: 'DELETE',
  }).then(() => undefined)
}

/** The first mentor of a group is always primary; ask for it only when adding a second. */
export function assignGroupMentor(
  courseId: string,
  groupId: string,
  mentorId: string,
  primary: boolean
): Promise<StudyGroupAdmin> {
  return requireData(
    `${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}/mentors/${encodeURIComponent(mentorId)}`,
    'Không thể gán mentor.',
    { method: 'PUT', body: { primary } }
  )
}

export function removeGroupMentor(
  courseId: string,
  groupId: string,
  mentorId: string
): Promise<StudyGroupAdmin> {
  return requireData(
    `${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}/mentors/${encodeURIComponent(mentorId)}`,
    'Không thể gỡ mentor.',
    { method: 'DELETE' }
  )
}

/** Adds the student to the group, vacating their other active group of the same course. */
export function addGroupMember(
  courseId: string,
  groupId: string,
  studentId: string
): Promise<StudyGroupAdminDetail> {
  return requireData(
    `${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
    'Không thể thêm học viên vào nhóm.',
    { method: 'PUT' }
  )
}

export function removeGroupMember(
  courseId: string,
  groupId: string,
  studentId: string
): Promise<StudyGroupAdminDetail> {
  return requireData(
    `${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(studentId)}`,
    'Không thể gỡ học viên khỏi nhóm.',
    { method: 'DELETE' }
  )
}

export function getMentorStrengths(courseId: string, mentorId: string): Promise<MentorStrength> {
  return requireData(
    `${coursePath(courseId)}/mentors/${encodeURIComponent(mentorId)}/strengths`,
    'Không thể tải môn mạnh của mentor.'
  )
}

export function replaceMentorStrengths(
  courseId: string,
  mentorId: string,
  categoryIds: string[]
): Promise<MentorStrength> {
  return requireData(
    `${coursePath(courseId)}/mentors/${encodeURIComponent(mentorId)}/strengths`,
    'Không thể lưu môn mạnh của mentor.',
    { method: 'PUT', body: { categoryIds } }
  )
}

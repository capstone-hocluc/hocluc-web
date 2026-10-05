import { request } from '../lib/api'

export type StudyGroupHouseType = 'NEN_MONG' | 'VUNG_VANG' | 'BUT_PHA'
export type StudyGroupLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type StudyGroupMemberStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'SUSPENDED'

export interface StudyGroupHouseSuggestion {
  houseType: StudyGroupHouseType
  label: string
  description: string
  minScore: number
  maxScore: number
  groupCount: number
  recommended: boolean
}

export interface StudyGroupMentor {
  id: string
  fullName: string
  primaryMentor: boolean
  strongSubjects: string[]
}

export interface StudyGroupSuggestion {
  id: string
  courseId: string
  name: string
  houseType: StudyGroupHouseType
  level: StudyGroupLevel | null
  capacity: number | null
  activeStudentCount: number
  mentors: StudyGroupMentor[]
  matchesWeakSubject: boolean
  matchesLevel: boolean
  recommended: boolean
  joined: boolean
}

export interface StudyGroupDetail extends Omit<StudyGroupSuggestion, 'matchesWeakSubject' | 'matchesLevel' | 'recommended'> {
  courseTitle: string
  houseLabel: string
  joined: boolean
  joinedAt: string | null
  membershipStatus: StudyGroupMemberStatus | null
}

export interface StudyGroupMembership {
  groupStudentId: string
  studyGroupId: string
  studyGroupName: string
  status: StudyGroupMemberStatus
  joinedAt: string
}

function coursePath(courseId: string) {
  return `/api/v1/courses/${encodeURIComponent(courseId)}`
}

async function requireData<T>(path: string, fallbackMessage: string, options?: Parameters<typeof request<T>>[1]) {
  const response = await request<T>(path, { auth: true, ...options })
  if (!response.data) throw new Error(fallbackMessage)
  return response.data
}

export function getSuggestedHouses(courseId: string): Promise<StudyGroupHouseSuggestion[]> {
  return requireData(
    `${coursePath(courseId)}/houses/suggested`,
    'Không thể tải các nhóm học gợi ý.'
  )
}

export function getSuggestedStudyGroups(
  courseId: string,
  house: StudyGroupHouseType
): Promise<StudyGroupSuggestion[]> {
  return requireData(
    `${coursePath(courseId)}/study-groups/suggested?house=${encodeURIComponent(house)}`,
    'Không thể tải danh sách nhóm học.'
  )
}

export function getMyStudyGroup(courseId: string): Promise<StudyGroupDetail> {
  return requireData(
    `${coursePath(courseId)}/study-groups/me`,
    'Không thể tải nhóm học hiện tại.'
  )
}

export function getStudyGroup(courseId: string, groupId: string): Promise<StudyGroupDetail> {
  return requireData(
    `${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}`,
    'Không thể tải thông tin nhóm học.'
  )
}

export function joinStudyGroup(courseId: string, groupId: string): Promise<StudyGroupMembership> {
  return requireData(
    `${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}/join`,
    'Không thể tham gia nhóm học.',
    { method: 'POST' }
  )
}

export function leaveStudyGroup(courseId: string, groupId: string): Promise<StudyGroupMembership> {
  return requireData(
    `${coursePath(courseId)}/study-groups/${encodeURIComponent(groupId)}/leave`,
    'Không thể rời nhóm học.',
    { method: 'POST' }
  )
}

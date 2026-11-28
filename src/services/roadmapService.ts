import { request } from '../lib/api'

export type SkillMasteryStatus =
  | 'UNASSESSED'
  | 'INSUFFICIENT'
  | 'WEAK'
  | 'DEVELOPING'
  | 'MASTERED'

export type WeaknessSource = 'EVIDENCE' | 'SELF_ASSESSMENT'

export type RoadmapLessonState =
  | 'COMPLETED'
  | 'SKIPPED_MASTERED'
  | 'PRIORITY_WEAK'
  | 'PENDING'

export type RoadmapNextActionType =
  | 'REVIEW_SKILL'
  | 'STUDY_LESSON'
  | 'TAKE_PLACEMENT'
  | 'CHOOSE_COURSE'
  | 'COMPLETE'

export interface StudentMasterySkillItem {
  skillCode: string
  skillNameVi: string
  categoryId: string | null
  categoryName: string | null
  prerequisiteSkillCode: string | null
  status: SkillMasteryStatus
  rawScore: number
  cappedMastery: number
  totalAttempts: number
  correctAttempts: number
  recentSampleSize: number
  lastAnsweredAt: string | null
  forgettingRisk: number
  daysSinceLast: number
  latestWrong: boolean
  lapseCount: number
  dueForReview: boolean
  reviewReason: string | null
}

export interface StudentWeakSkill {
  skillCode: string
  skillNameVi: string
  categoryId: string | null
  categoryName: string | null
  source: WeaknessSource
  rawScore: number
  cappedMastery: number
  totalAttempts: number
  correctAttempts: number
  lastAnsweredAt: string | null
  rootCause: boolean
  blocksSkillCodes: string[]
  weakPrerequisiteCodes: string[]
  unassessedPrerequisiteCodes: string[]
  reason: string | null
}

export interface StudentSubjectSummary {
  categoryId: string | null
  categoryName: string
  categorySlug: string | null
  totalSkills: number
  assessedSkills: number
  masteredCount: number
  developingCount: number
  weakCount: number
  insufficientCount: number
  dueReviewCount: number
  averageMastery: number
}

export interface StudentMasteryResponse {
  studentId: string
  computedAt: string
  totalAssessedSkills: number
  masteredCount: number
  developingCount: number
  weakCount: number
  insufficientCount: number
  dueReviewCount: number
  subjects: StudentSubjectSummary[]
  weakSkills: StudentWeakSkill[]
  skills: StudentMasterySkillItem[]
}

export interface RoadmapCourseOption {
  courseId: string
  title: string
  courseType: string | null
  selected: boolean
}

export interface RoadmapCoverage {
  labelledLessons: number
  totalLessons: number
  coverageRatio: number
}

export interface RoadmapNextAction {
  type: RoadmapNextActionType
  reason: string | null
  courseId: string | null
  lessonId: string | null
  lessonTitle: string | null
  quizId: string | null
  quizTitle: string | null
  skillCode: string | null
  skillNameVi: string | null
}

export interface RoadmapLessonItem {
  lessonId: string
  title: string
  chapterId: string
  chapterTitle: string
  courseId: string
  courseTitle: string
  contentSectionId: string | null
  contentSectionTitle: string | null
  fromGift: boolean
  state: RoadmapLessonState
  unlabelled: boolean
  priorityBucket: number
  skillCodes: string[]
  skillNames: string[]
  weakSkillCodes: string[]
  quizId: string | null
  quizTitle: string | null
  reason: string | null
}

export interface RoadmapPhase {
  phaseId: string | null
  name: string
  description: string | null
  sequence: number | null
  totalLessons: number
  completedLessons: number
  skippedMasteredLessons: number
  remainingLessons: number
  lessons: RoadmapLessonItem[]
}

export interface RoadmapReviewItem {
  skillCode: string
  skillNameVi: string
  categoryId: string | null
  categoryName: string | null
  forgettingRisk: number
  daysSinceLast: number
  latestWrong: boolean
  lapseCount: number
  due: boolean
  reason: string | null
  courseId: string | null
  courseTitle: string | null
  lessonId: string | null
  lessonTitle: string | null
  quizId: string | null
  quizTitle: string | null
}

export interface PersonalRoadmapResponse {
  studentId: string
  computedAt: string
  hasEnrolledCourse: boolean
  selectedCourseId: string | null
  selectedCourseTitle: string | null
  selectedCourseType: string | null
  enrolledCourses: RoadmapCourseOption[]
  coverage: RoadmapCoverage
  nextAction: RoadmapNextAction
  nextLesson: RoadmapLessonItem | null
  phases: RoadmapPhase[]
  weakSkills: StudentWeakSkill[]
  reviewQueue: RoadmapReviewItem[]
}

export interface MentorAssignedStudent {
  studentId: string
  displayName: string
  email: string
  weakSkillCount: number
  topWeakSkillName: string | null
  dueReviewCount: number
  lastConversationAt: string | null
}

function roadmapQuery(courseId?: string | null) {
  if (!courseId) return ''
  return `?courseId=${encodeURIComponent(courseId)}`
}

export async function getMyMastery(): Promise<StudentMasteryResponse> {
  const response = await request<StudentMasteryResponse>('/api/v1/learning/mastery/me', { auth: true })
  if (!response.data) throw new Error('Không thể tải mức độ nắm vững kỹ năng.')
  return response.data
}

export async function getStudentMastery(studentId: string): Promise<StudentMasteryResponse> {
  const response = await request<StudentMasteryResponse>(
    `/api/v1/learning/mastery/students/${encodeURIComponent(studentId)}`,
    { auth: true, guardIdentity: true }
  )
  if (!response.data) throw new Error('Không thể tải mức độ nắm vững kỹ năng của học viên.')
  return response.data
}

export async function getMyRoadmap(courseId?: string | null): Promise<PersonalRoadmapResponse> {
  const response = await request<PersonalRoadmapResponse>(
    `/api/v1/learning/roadmap/me${roadmapQuery(courseId)}`,
    { auth: true }
  )
  if (!response.data) throw new Error('Không thể tải lộ trình học.')
  return response.data
}

export async function getStudentRoadmap(
  studentId: string,
  courseId?: string | null
): Promise<PersonalRoadmapResponse> {
  const response = await request<PersonalRoadmapResponse>(
    `/api/v1/learning/roadmap/students/${encodeURIComponent(studentId)}${roadmapQuery(courseId)}`,
    { auth: true, guardIdentity: true }
  )
  if (!response.data) throw new Error('Không thể tải lộ trình học của học viên.')
  return response.data
}

export async function getMentorAssignedStudents(): Promise<MentorAssignedStudent[]> {
  const response = await request<MentorAssignedStudent[]>('/api/v1/learning/mentor/students', {
    auth: true,
    guardIdentity: true,
  })
  if (!response.data) throw new Error('Không thể tải danh sách học viên phụ trách.')
  return response.data
}

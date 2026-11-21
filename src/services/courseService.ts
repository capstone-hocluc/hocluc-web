import { request } from '../lib/api'
import type { ExamSessionSummary } from './examYearService'

export interface Course {
  id: string
  title: string
  description?: string
  track?: string
  /** MAIN for a whole roadmap, SECTION for one part of it bought on its own. */
  courseType?: string
  startDate?: string
  endDate?: string
  examSessionDate?: string
  /** The exam sitting (Đợt 1/2 of an exam year) it prepares for; absent on SECTION courses. */
  examSession?: ExamSessionSummary | null
  imageUrl?: string
  price?: number
  targetExam?: string
  // Percentage of the course's own schedule that has elapsed - NOT the
  // student's learning progress. Use MyCourseEnrollment.progressPercentage
  // for that instead.
  elapsedPercentage?: number
  recommended?: boolean
  purchased?: boolean
  /** Average stars over visible reviews (one decimal); null while the course has none. */
  averageRating?: number | null
  reviewCount?: number
}

export interface MyCourseEnrollment {
  course: Course
  enrolledAt?: string
  enrollmentType?: string
  progressPercentage?: number
}

export async function getMyCourses() {
  return request<MyCourseEnrollment[]>('/api/v1/courses/my', { auth: true })
}

// Public course catalog. `optionalAuth` attaches a token when one already
// exists (see createHeaders) so a logged-in student's request also comes
// back with their purchased/recommended flags filled in - but unlike
// `auth`, a 401 here (guest, or the backend not yet treating this route as
// public) must never clear tokens or force-redirect to /login.
export async function getMainCourses() {
  return request<Course[]>('/api/v1/courses/main', { optionalAuth: true })
}

// Same Course shape as /courses/main - backend decides what's suggested
// (e.g. after a placement result); no recommendation logic lives here.
export async function getSuggestedCourses() {
  return request<Course[]>('/api/v1/courses/main/suggested', { auth: true })
}

export interface CourseLesson {
  id: string
  title: string
  description?: string | null
  contentType?: string
  durationSeconds?: number | null
  sequence?: number
  preview?: boolean
  videoUrl?: string | null
  quizCount?: number
  assignmentCount?: number
}

export interface CourseChapter {
  id: string
  title: string
  description?: string
  sequence?: number
  quizCount?: number
  lessons: CourseLesson[]
}

export interface CourseSection {
  sectionCourseId: string
  title: string
  description?: string
  categoryId?: string
  categoryName?: string
  sequence?: number
  chapters: CourseChapter[]
}

export interface CoursePhase {
  id: string | null
  name: string | null
  description?: string | null
  sequence?: number | null
  gifts: GiftCourse[]
  sections: CourseSection[]
}

/** A SECTION course given with a MAIN course; it is studied as a course of its own. */
export interface GiftCourse {
  courseId: string
  phaseId: string | null
  title: string
  description?: string
  categoryId?: string
  categoryName?: string
  chapterCount: number
  lessonCount: number
  completedLessonCount: number
  progressPercentage?: number | null
}

/** A course learning outcome (CLO), as the public course page shows it. */
export interface CourseOutcomeView {
  id: string
  code: string
  description: string
  sequence: number
  skills: { code: string; name: string | null }[]
}

export interface CourseDetail {
  id: string
  title: string
  slug?: string
  description?: string
  shortIntroduction?: string
  imageUrl?: string
  videoUrl?: string
  track?: string
  startDate?: string
  endDate?: string
  examSessionDate?: string
  /** The exam sitting (Đợt 1/2 of an exam year) it prepares for; absent on SECTION courses. */
  examSession?: ExamSessionSummary | null
  targetExam?: string
  paid?: boolean
  price?: number
  /** Study time the author states, in minutes. */
  estimatedDurationMinutes?: number | null
  /** FIXED_END_DATE: study until endDate (open-ended without one); DAYS_FROM_PURCHASE: accessDays from paying. */
  accessMode?: 'FIXED_END_DATE' | 'DAYS_FROM_PURCHASE' | null
  accessDays?: number | null
  purchased?: boolean
  inCart?: boolean
  phaseCount?: number
  sectionCount?: number
  chapterCount?: number
  lessonCount?: number
  quizCount?: number
  totalDurationSeconds?: number
  phases?: CoursePhase[]
  giftCount: number
  /** What a student can do once the course is done (absent on older backends). */
  outcomes?: CourseOutcomeView[]
}

// Public course detail. Same opportunistic-auth rationale as getMainCourses -
// guests can view it, a logged-in student's request also resolves
// purchased/inCart for them.
export async function getCourseDetail(courseId: string) {
  return request<CourseDetail>(`/api/v1/courses/${encodeURIComponent(courseId)}`, {
    optionalAuth: true,
  })
}

export interface CourseStudyQuiz {
  id: string
  type: string
  title: string
  questionCount: number
  durationMinutes: number | null
  maxAttempts: number
  passingPercentage: number | null
  showAnswers: boolean
  attemptsUsed: number
  bestPercentage: number | null
  passed: boolean
  locked: boolean
  lockReason: string | null
  inProgressAttemptId: string | null
}

// Summary returned by GET /courses/{courseId}/exams and used by the existing
// QuizDetail route for the authoritative attempt/availability state.
export interface CourseExamSummary {
  id: string
  type: string
  title: string
  questionCount: number
  durationMinutes: number | null
  maxAttempts: number
  passingPercentage: number | null
  showAnswers: boolean
  availableFrom: string | null
  availableUntil: string | null
  practiceAllowed: boolean
  attemptsUsed: number
  bestPercentage: number | null
  passed: boolean
  locked: boolean
  lockReason: string | null
  inProgressAttemptId: string | null
}

export async function getCourseExams(courseId: string): Promise<CourseExamSummary[]> {
  const response = await request<CourseExamSummary[]>(
    `/api/v1/courses/${encodeURIComponent(courseId)}/exams`,
    { auth: true }
  )
  if (!response.data) throw new Error('Không thể tải danh sách bài thi của khóa học.')
  return response.data
}

export interface CourseStudyLesson {
  id: string
  title: string
  contentType: string
  durationSeconds: number | null
  sequence: number
  preview: boolean
  status: string
  progressPercentage: number
  completedAt: string | null
  quizzes: CourseStudyQuiz[]
}

export interface CourseStudyChapter {
  id: string
  title: string
  sequence: number
  lessonCount: number
  completedLessonCount: number
  completed: boolean
  lessons: CourseStudyLesson[]
  quizzes: CourseStudyQuiz[]
}

export interface CourseStudySection {
  contentSectionId: string | null
  sectionCourseId: string
  title: string
  categoryId?: string | null
  categoryName?: string | null
  sequence: number
  lessonCount: number
  completedLessonCount: number
  progressPercentage: number
  chapters: CourseStudyChapter[]
}

export interface CourseStudyPhase {
  id: string | null
  name: string | null
  description?: string | null
  sequence: number | null
  lessonCount: number
  completedLessonCount: number
  progressPercentage: number
  gifts: GiftCourse[]
  sections: CourseStudySection[]
}

export interface CourseStudyLiveClass {
  id: string
  title: string
  description?: string | null
  startTime: string
  endTime: string
  timezone?: string | null
  status: string
  provider?: string | null
  instructorName?: string | null
  teacherName?: string | null
  type?: 'COURSE' | 'OVERALL_PRACTICE' | string | null
  seriesName?: string | null
  dayNumber?: number | null
  lessonId?: string | null
  lessonTitle?: string | null
  meetingUrl?: string | null
  recordingUrl?: string | null
  recordings?: { id: string; recordingUrl: string; recordingType?: string | null; fileType?: string | null }[]
  joinable: boolean
  /** The student holds a seat: only then do they get a join link and the replay. */
  booked?: boolean
  /** Null when the class has no seat limit. */
  seatsLeft?: number | null
}

export interface CourseStudy {
  courseId: string
  title: string
  /** MAIN for a roadmap study page, SECTION for one part bought on its own. */
  courseType?: string | null
  track?: string | null
  startDate?: string | null
  endDate?: string | null
  totalLessons: number
  completedLessons: number
  progressPercentage: number
  continueLessonId: string | null
  continueLessonTitle: string | null
  continueSectionCourseId: string | null
  nextLiveClass: CourseStudyLiveClass | null
  /** Included by the current BE; optional for older deployments. */
  exams?: CourseExamSummary[]
  placementExams?: CourseExamSummary[]
  showPlacementReminder?: boolean
  phases: CourseStudyPhase[]
}

// Authoritative source for a student's learning state in a course - progress,
// lesson/quiz status, live class and study group. Course Detail's data must
// never be reused as a substitute for this.
export async function getCourseStudy(courseId: string): Promise<CourseStudy> {
  const response = await request<CourseStudy>(
    `/api/v1/courses/${encodeURIComponent(courseId)}/study`,
    { auth: true }
  )
  if (!response.data) throw new Error('Không thể tải nội dung học tập của khóa học.')
  return response.data
}

// Same item shape as CourseStudy.nextLiveClass (CourseStudyLiveClass) -
// reused as-is for next/upcoming/past here instead of a duplicate type.
export interface CourseLiveClasses {
  courseId: string
  courseTitle: string
  next: CourseStudyLiveClass | null
  upcoming: CourseStudyLiveClass[]
  past: CourseStudyLiveClass[]
}

export async function getCourseLiveClasses(courseId: string): Promise<CourseLiveClasses> {
  const response = await request<CourseLiveClasses>(
    `/api/v1/courses/${encodeURIComponent(courseId)}/live-classes`,
    { auth: true }
  )
  if (!response.data) throw new Error('Không thể tải lịch học trực tuyến.')
  return response.data
}

export interface LiveClassBooking {
  liveClassId: string
  status: 'BOOKED' | 'CANCELLED'
  seatsLeft?: number | null
}

export async function bookLiveClass(liveClassId: string): Promise<LiveClassBooking> {
  const response = await request<LiveClassBooking>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/bookings`,
    { method: 'POST', auth: true }
  )
  if (!response.data) throw new Error('Không giữ được chỗ.')
  return response.data
}

export async function cancelLiveClassBooking(liveClassId: string): Promise<LiveClassBooking> {
  const response = await request<LiveClassBooking>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/bookings/me`,
    { method: 'DELETE', auth: true }
  )
  if (!response.data) throw new Error('Không hủy được chỗ.')
  return response.data
}

/** The student's own Zoom link; the API opens it 15 minutes before the class starts. */
export async function getLiveClassJoinLink(liveClassId: string): Promise<string | null> {
  const response = await request<{ joinUrl?: string | null }>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/join-link`,
    { auth: true }
  )
  return response.data?.joinUrl ?? null
}

export interface LiveClassRecording {
  id: string
  status?: string | null
  recordingUrl?: string | null
}

export async function getLiveClassRecordings(liveClassId: string): Promise<LiveClassRecording[]> {
  const response = await request<LiveClassRecording[]>(
    `/api/v1/live-classes/${encodeURIComponent(liveClassId)}/recordings`,
    { auth: true }
  )
  return response.data ?? []
}

export interface CatchUpRecording {
  liveClassId: string
  title: string
  startTime: string
  recordingUrl: string | null
}

export interface SectionOrderItem {
  contentSectionId: string
  title: string
  phaseName: string | null
  sequence: number
}

export interface EnrollmentPlan {
  // Known example: NEW_COURSE_FULL_ROADMAP. Not assumed to be the only value.
  branch: string
  message: string | null
  // Course-timeline-elapsed, NOT student lesson/learning progress.
  elapsedPercentage: number | null
  // Same Course shape as /courses/main - reused as-is.
  recommendedCourse: Course | null
  catchUpRecordings: CatchUpRecording[]
  sectionOrder: SectionOrderItem[]
}

export async function getCourseEnrollmentPlan(courseId: string): Promise<EnrollmentPlan> {
  const response = await request<EnrollmentPlan>(
    `/api/v1/courses/${encodeURIComponent(courseId)}/enrollment-plan`,
    { auth: true }
  )
  if (!response.data) throw new Error('Không thể tải lộ trình học.')
  return response.data
}

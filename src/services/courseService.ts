import { request } from '../lib/api'

export interface Course {
  id: string
  title: string
  description?: string
  track?: string
  startDate?: string
  endDate?: string
  examSessionDate?: string
  imageUrl?: string
  price?: number
  targetExam?: string
  // Percentage of the course's own schedule that has elapsed - NOT the
  // student's learning progress. Use MyCourseEnrollment.progressPercentage
  // for that instead.
  elapsedPercentage?: number
  recommended?: boolean
  purchased?: boolean
}

export interface MyCourseEnrollment {
  course: Course
  enrolledAt?: string
  enrollmentType?: string
  progressPercentage?: number
  activeStudyGroupId?: string
  activeStudyGroupName?: string
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
  description?: string
  contentType?: string
  durationSeconds?: number
  sequence?: number
  preview?: boolean
  videoUrl?: string
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
  id: string
  name: string
  description?: string
  sequence?: number
  sections: CourseSection[]
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
  targetExam?: string
  paid?: boolean
  price?: number
  purchased?: boolean
  inCart?: boolean
  phaseCount?: number
  sectionCount?: number
  chapterCount?: number
  lessonCount?: number
  quizCount?: number
  totalDurationSeconds?: number
  phases?: CoursePhase[]
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
  durationMinutes: number
  maxAttempts: number
  passingPercentage: number
  showAnswers: boolean
  attemptsUsed: number
  bestPercentage: number
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
  passingPercentage: number
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
  durationSeconds: number
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
  id: string
  name: string
  description?: string | null
  sequence: number
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
  meetingUrl?: string | null
  recordingUrl?: string | null
  joinable: boolean
}

export interface CourseStudy {
  courseId: string
  title: string
  track?: string | null
  startDate?: string | null
  endDate?: string | null
  totalLessons: number
  completedLessons: number
  progressPercentage: number
  continueLessonId: string | null
  continueLessonTitle: string | null
  continueSectionCourseId: string | null
  activeStudyGroupId: string | null
  activeStudyGroupName: string | null
  nextLiveClass: CourseStudyLiveClass | null
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

export interface CatchUpRecording {
  liveClassId: string
  title: string
  startTime: string
  recordingUrl: string | null
}

export interface SectionOrderItem {
  sectionCourseId: string
  sectionCourseTitle: string
  phaseName: string
  sequence: number
  categoryId: string | null
  categoryName: string | null
  priority: boolean
}

export interface EnrollmentPlan {
  // Known example: NEW_COURSE_FULL_ROADMAP. Not assumed to be the only value.
  branch: string
  message: string | null
  // Course-timeline-elapsed, NOT student lesson/learning progress.
  elapsedPercentage: number
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

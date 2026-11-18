import { request } from '../lib/api'
import { getMainCourses } from './courseService'
import type { PlacementCategoryResult } from './assessmentService'

export interface FreeExam {
  id: string
  title: string
  description: string | null
  durationMinutes: number | null
  questionCount: number
  maxAttempts: number
  practiceAllowed: boolean
  availableFrom: string | null
  availableUntil: string | null
  courseId: string | null
  courseTitle: string | null
  publishedAt: string | null
  attemptsUsed: number | null
  bestPercentage: number | null
  locked: boolean | null
  lockReason: string | null
  inProgressAttemptId: string | null
}

export interface CourseCompetency {
  courseId: string
  courseTitle: string
  studentId: string
  examCount: number
  totalQuestions: number
  correctCount: number
  wrongCount: number
  score: number | null
  maxScore: number | null
  overallPercentage: number | null
  timeSpentSeconds: number
  level: string | null
  weakCategoryId: string | null
  weakCategoryName: string | null
  strongCategoryId: string | null
  strongCategoryName: string | null
  categories: PlacementCategoryResult[]
  exams: { quizId: string; quizTitle: string; attemptId: string; submittedAt: string | null; score: number; maxScore: number; percentage: number }[]
  pendingExams: { quizId: string; quizTitle: string; durationMinutes: number | null }[]
}

export async function getFreeExams(courseId?: string): Promise<FreeExam[]> {
  const response = await request<FreeExam[]>(`/api/v1/free-exams${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`, { optionalAuth: true })
  if (!Array.isArray(response.data)) throw new Error('Không thể tải danh sách đề thi miễn phí.')
  // Preserve the backend's publication/creation ordering, including older papers without publishedAt.
  return response.data
}

export async function getCourseCompetency(courseId: string): Promise<CourseCompetency> {
  const response = await request<CourseCompetency>(`/api/v1/courses/${encodeURIComponent(courseId)}/competency`, { auth: true })
  if (!response.data) throw new Error('Không thể tải đánh giá năng lực.')
  return response.data
}

export async function getCompetencyCourses() {
  const [catalog, exams] = await Promise.all([getMainCourses(), getFreeExams()])
  const courses = new Map((catalog.data ?? []).map(course => [course.id, { id: course.id, title: course.title }]))
  exams.forEach(exam => {
    if (exam.courseId && exam.courseTitle) courses.set(exam.courseId, { id: exam.courseId, title: exam.courseTitle })
  })
  return [...courses.values()]
}

export const freeExamsPath = (courseId?: string) => `/free-exams${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`
export const competencyPath = (courseId: string) => `/student/learning-profile?tab=learning&courseId=${encodeURIComponent(courseId)}`

import { safePurchaseReturnTo } from './purchaseSession'
import { isStudentAssessmentsPath, studentRoutes } from './studentRoutes'

/** Only local purchase, free-exam and competency destinations can survive authentication. */
export function safeAuthReturnTo(value: string | null): string | null {
  if (!value || value.includes('\\') || value.startsWith('//')) return null
  if (isStudentAssessmentsPath(value)) return value
  if (value === studentRoutes.placement() || value === '/student/assessments/placement') return value
  if (/^\/student\/assessments\/quizzes\/[a-zA-Z0-9-]+(?:\/attempts\/[a-zA-Z0-9-]+)?(?:\?from=free-exams)?$/.test(value)) return value
  if (/^\/student\/assessments\/attempts\/[a-zA-Z0-9-]+\/review$/.test(value)) return value
  if (value === '/student/learning-profile') return value
  if (/^\/free-exams(?:\?courseId=[a-zA-Z0-9-]+)?$/.test(value)) return value
  if (/^\/student\/learning-profile\?tab=learning&courseId=[a-zA-Z0-9-]+$/.test(value)) return value
  return safePurchaseReturnTo(value)
}

export function loginPathFor(returnTo: string | null): string {
  const target = safeAuthReturnTo(returnTo)
  return `/login${target ? `?returnTo=${encodeURIComponent(target)}` : ''}`
}

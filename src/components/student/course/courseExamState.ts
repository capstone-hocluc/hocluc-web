import type { CourseExamSummary } from '../../../services/courseService'

// The list API's bestPercentage / passed only describe graded official attempts.
// attemptsUsed also includes an unfinished attempt, so it cannot mean "completed".
export function hasCompletedExam(exam: CourseExamSummary) {
  return exam.bestPercentage != null || exam.passed
}

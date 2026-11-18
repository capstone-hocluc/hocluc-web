// The list API's bestPercentage / passed only describe graded official attempts.
// attemptsUsed also includes an unfinished attempt, so it cannot mean "completed".
export function hasCompletedExam(exam: { bestPercentage: number | null; passed?: boolean | null }) {
  return exam.bestPercentage != null || Boolean(exam.passed)
}

// Centralized quiz-attempt status presentation. Backend status is always
// authoritative - unknown values render safely (raw value) instead of
// crashing or inventing a state transition.

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp bài',
  GRADED: 'Đã chấm',
  ABANDONED: 'Đã bỏ dở',
  COMPLETED: 'Đã hoàn thành',
}

export function getAttemptStatusLabel(status: string) {
  return STATUS_LABELS[status] || status
}

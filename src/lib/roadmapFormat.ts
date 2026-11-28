import type {
  RoadmapCoverage,
  RoadmapLessonState,
  RoadmapNextActionType,
  SkillMasteryStatus,
  WeaknessSource,
} from '../services/roadmapService'

export const SKILL_MASTERY_LABELS: Record<SkillMasteryStatus, string> = {
  UNASSESSED: 'Chưa đánh giá',
  INSUFFICIENT: 'Chưa đủ dữ liệu',
  WEAK: 'Cần củng cố',
  DEVELOPING: 'Đang cải thiện',
  MASTERED: 'Đã vững',
}

export const SKILL_MASTERY_TONES: Record<
  SkillMasteryStatus,
  'neutral' | 'info' | 'danger' | 'warning' | 'success'
> = {
  UNASSESSED: 'neutral',
  INSUFFICIENT: 'info',
  WEAK: 'danger',
  DEVELOPING: 'warning',
  MASTERED: 'success',
}

export const LESSON_STATE_LABELS: Record<RoadmapLessonState, string> = {
  COMPLETED: 'Hoàn thành',
  SKIPPED_MASTERED: 'Đã vững',
  PRIORITY_WEAK: 'Cần củng cố',
  PENDING: 'Chưa học',
}

export const LESSON_STATE_TONES: Record<
  RoadmapLessonState,
  'success' | 'info' | 'danger' | 'neutral'
> = {
  COMPLETED: 'success',
  SKIPPED_MASTERED: 'info',
  PRIORITY_WEAK: 'danger',
  PENDING: 'neutral',
}

export const NEXT_ACTION_LABELS: Record<RoadmapNextActionType, { title: string; cta: string }> = {
  STUDY_LESSON: { title: 'Bài học tiếp theo', cta: 'Học ngay' },
  REVIEW_SKILL: { title: 'Kỹ năng cần ôn tập', cta: 'Ôn ngay' },
  TAKE_PLACEMENT: { title: 'Đánh giá năng lực đầu vào', cta: 'Làm đề đánh giá' },
  CHOOSE_COURSE: { title: 'Chọn khóa học phù hợp', cta: 'Khám phá khóa học' },
  COMPLETE: { title: 'Hoàn thành lộ trình', cta: 'Luyện đề thêm' },
}

export function toPercentValue(ratio: number | null | undefined): number {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return 0
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100)
}

export function formatPercent(ratio: number | null | undefined): string {
  return `${toPercentValue(ratio)}%`
}

export function formatCoverageNotice(coverage: RoadmapCoverage): string | null {
  if (!coverage || coverage.totalLessons <= 0 || coverage.labelledLessons >= coverage.totalLessons) {
    return null
  }
  return `Đã gắn nhãn kỹ năng cho ${coverage.labelledLessons}/${coverage.totalLessons} bài học; các bài chưa gắn nhãn giữ nguyên thứ tự khóa học.`
}

export function formatWeaknessSource(source: WeaknessSource): string {
  return source === 'SELF_ASSESSMENT' ? 'Tự đánh giá' : 'Từ bài làm'
}

export function formatForgettingRisk(risk: number | null | undefined): string {
  return `Nguy cơ quên ${formatPercent(risk)}`
}

export function formatDaysSince(days: number | null | undefined): string {
  if (typeof days !== 'number' || !Number.isFinite(days) || days < 0) return '—'
  if (days === 0) return 'Hôm nay'
  return `${days} ngày trước`
}

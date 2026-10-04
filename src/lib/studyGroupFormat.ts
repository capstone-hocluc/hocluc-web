import type { StudyGroupLevel } from '../services/studyGroupService'

const LEVEL_LABELS: Record<StudyGroupLevel, string> = {
  BEGINNER: 'Nền tảng',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
}

export function formatStudyGroupLevel(level: StudyGroupLevel | null) {
  return level ? LEVEL_LABELS[level] : 'Mở cho mọi trình độ'
}

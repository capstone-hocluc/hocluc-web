import {
  Activity,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  Languages,
  ListChecks,
  Target,
  Trophy,
} from '../../../components/console/icons'

export const componentIcons = {
  vietnamese: Languages,
  english: BookOpen,
  math: Calculator,
  science: FlaskConical,
}

export const componentColors = {
  vietnamese: 'var(--color-primary)',
  english: 'var(--color-warning)',
  math: 'var(--color-success)',
  science: 'var(--color-violet)',
}

export const learningMetricIcons = {
  lessons: BookOpen,
  time: Clock3,
  questions: ClipboardCheck,
  topics: Brain,
}

export const practiceOverviewIcons = {
  completed: ClipboardCheck,
  latest: Activity,
  best: Trophy,
  average: BarChart3,
}

export const practiceStatIcons = {
  accuracy: Target,
  time: Clock3,
  questions: ListChecks,
  completed: BadgeCheck,
}

export const tabs = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'learning', label: 'Học tập' },
  { key: 'practice', label: 'Luyện đề' },
]

export const practiceFilters = ['Tất cả', 'Thi thử', 'Mini Test']

// How a piece of learning content is classified for display (icon colour,
// caption, badge tone). One place instead of each screen re-deriving
// "video = blue, quiz = purple...".

// Known BE types; retain the legacy fallback for older display values.
export type QuizKind = 'practice' | 'assessment'

export function getQuizKind(type?: string | null): QuizKind {
  if (type === 'QUICK') return 'practice'
  if (['LESSON', 'CHAPTER', 'EXAM', 'PLACEMENT'].includes(type ?? '')) return 'assessment'
  return /MINI|MOCK|TEST|EXAM|FINAL|ASSESS/i.test(type || '') ? 'assessment' : 'practice'
}

export function quizKindLabel(kind: QuizKind) {
  return kind === 'assessment' ? 'Mini Test' : 'Bài tập'
}

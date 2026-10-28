export type QuestionActivity = 'writing' | 'checking'

/** The frame and the word that say which AI is on a question: blue while it is written, yellow while it is checked. */
export const ACTIVITY_FRAME: Record<QuestionActivity, string> = {
  writing: 'ring-2 ring-sky-400 bg-sky-50/70',
  checking: 'ring-2 ring-amber-400 bg-amber-50/80',
}
export const ACTIVITY_LABEL: Record<QuestionActivity, string> = {
  writing: 'Luna đang viết',
  checking: 'Gemini đang soát',
}

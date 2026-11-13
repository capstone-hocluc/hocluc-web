import { useState } from 'react'

const STORAGE_KEY = 'hocluc.aiAssistant.examList'

/** The list's groups: exams being written, exams that went out, papers loaded into the bank. */
export const EXAM_GROUPS = ['draft', 'published', 'papers'] as const
export type ExamGroup = (typeof EXAM_GROUPS)[number]
export type ExamSort = 'recent' | 'name'

export interface ExamListPrefs {
  hidden: ExamGroup[]
  folded: ExamGroup[]
  sort: ExamSort
}

const DEFAULTS: ExamListPrefs = { hidden: [], folded: [], sort: 'recent' }

const groups = (value: unknown): ExamGroup[] =>
  Array.isArray(value) ? EXAM_GROUPS.filter((group) => value.includes(group)) : []

function remembered(): ExamListPrefs {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!stored || typeof stored !== 'object') return DEFAULTS
    const hidden = groups(stored.hidden)
    return {
      // One group always shows, so the list never hides every exam.
      hidden: hidden.length < EXAM_GROUPS.length ? hidden : [],
      folded: groups(stored.folded),
      sort: stored.sort === 'name' ? 'name' : 'recent',
    }
  } catch {
    // Storage unavailable or invalid: the defaults apply.
    return DEFAULTS
  }
}

/** How the viewer likes the list of exams (groups shown and folded, the order), kept in this browser. */
export function useExamListPrefs() {
  const [prefs, setPrefs] = useState(remembered)

  function save(next: ExamListPrefs) {
    setPrefs(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // The choice still holds for this visit.
    }
  }

  const toggled = (list: ExamGroup[], group: ExamGroup) =>
    list.includes(group) ? list.filter((item) => item !== group) : [...list, group]

  return {
    prefs,
    toggleHidden: (group: ExamGroup) => save({ ...prefs, hidden: toggled(prefs.hidden, group) }),
    toggleFolded: (group: ExamGroup) => save({ ...prefs, folded: toggled(prefs.folded, group) }),
    setSort: (sort: ExamSort) => save({ ...prefs, sort }),
  }
}

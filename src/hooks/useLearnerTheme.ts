import { useEffect } from 'react'

// Screens that share the learner look (landing, public course pages, student
// area) can be mounted at the same time during a route change, so the
// attribute is reference counted instead of toggled.
let mountedCount = 0

// Marks <html data-learner> while mounted so the learner token set
// (student-theme.css) also reaches portals such as menus and dialogs.
export function useLearnerTheme() {
  useEffect(() => {
    mountedCount += 1
    document.documentElement.dataset.learner = ''
    return () => {
      mountedCount -= 1
      if (mountedCount === 0) delete document.documentElement.dataset.learner
    }
  }, [])
}

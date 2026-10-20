// Staff area URLs. Every admin / manager / staff / teacher page lives under
// /console so one prefix separates it from the learner site (landing, /login,
// /student/*). Old un-prefixed URLs are rewritten to the new form on load.
//
//   /console/login
//   /console/{admin|manager|staff|teacher|mentor}/<page>

export const CONSOLE_LOGIN_PATH = '/console/login'

export function quizMenuPage(page: string): string {
  if (/^placements(?:-|$)/.test(page)) return 'placements'
  if (/^(quizzes(?:-|$)|quiz-)/.test(page)) return 'quizzes'
  if (/^mock-exams(?:-|$)/.test(page)) return 'mock-exams'
  return page
}

export function isQuizPage(page: string): boolean {
  return ['quizzes', 'mock-exams', 'placements', 'question-review', 'attempts'].includes(quizMenuPage(page))
}

/** Sidebar grouping only. quizMenuPage retains each tab's route and permission. */
export function quizSidebarPage(page: string): string {
  const menu = quizMenuPage(page)
  return ['placements', 'mock-exams'].includes(menu) ? 'quizzes' : menu
}

const LEGACY_AREA = /^\/(admin|manager|staff|teacher|mentor)(?=\/|$)/
const LEGACY_LOGIN = /^\/(admin|management)\/login\/?$/

export function isConsolePath(pathname: string) {
  return /^\/console(\/|$)/.test(pathname) || LEGACY_AREA.test(pathname) || /^\/management(\/|$)/.test(pathname)
}

/** True for the staff sign-in page, under its current or either legacy URL. */
export function isConsoleLoginPath(pathname: string) {
  const path = pathname.replace(/\/$/, '')
  return path === CONSOLE_LOGIN_PATH || path === '/console' || LEGACY_LOGIN.test(path)
}

/** Maps a legacy staff URL to its /console form; any other path is returned unchanged. */
export function toConsolePath(path: string) {
  const [pathname, ...rest] = path.split('?')
  const query = rest.length ? `?${rest.join('?')}` : ''
  if (LEGACY_LOGIN.test(pathname)) return `${CONSOLE_LOGIN_PATH}${query}`
  if (LEGACY_AREA.test(pathname)) return `/console${pathname}${query}`
  return path
}

/** Drops the /console prefix so existing area/page matching keeps working. */
export function stripConsolePrefix(pathname: string) {
  return pathname.replace(/^\/console(?=\/)/, '')
}

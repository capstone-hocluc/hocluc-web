// Which course screen the course page shows, kept in the query string so reload and Back land on the same
// screen: `?courseId=<id>` (detail, `&tab=content` for the content editor) or `?edit=new|<id>` (course form).
export type CourseView =
  | { kind: 'list' }
  | { kind: 'detail'; id: string; content: boolean }
  | { kind: 'edit'; id: string | null }

export function readCourseView(search = window.location.search): CourseView {
  const params = new URLSearchParams(search)
  const edit = params.get('edit')
  if (edit) return { kind: 'edit', id: edit === 'new' ? null : edit }
  const id = params.get('courseId')
  if (id) return { kind: 'detail', id, content: params.get('tab') === 'content' }
  return { kind: 'list' }
}

function courseViewSearch(view: CourseView): string {
  const params = new URLSearchParams()
  if (view.kind === 'detail') {
    params.set('courseId', view.id)
    if (view.content) params.set('tab', 'content')
  } else if (view.kind === 'edit') {
    params.set('edit', view.id ?? 'new')
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

const DEPTH = 'courseViewDepth'

const currentState = (): Record<string, unknown> =>
  window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
const depth = () => Number(currentState()[DEPTH] ?? 0)
const viewUrl = (view: CourseView) => `${window.location.pathname}${courseViewSearch(view)}`

/**
 * Records the view as a new history entry on the same page. The app's own history index in
 * `history.state` is kept, so Back only changes the query string and the app stays on this page.
 */
export function pushCourseView(view: CourseView) {
  if (viewUrl(view) === `${window.location.pathname}${window.location.search}`) return
  window.history.pushState({ ...currentState(), [DEPTH]: depth() + 1 }, '', viewUrl(view))
}

/** Shows the view in place of the current entry, so Back skips the screen being left. */
export function replaceCourseView(view: CourseView) {
  window.history.replaceState(currentState(), '', viewUrl(view))
}

/**
 * Leaves the current screen for the one it was opened from. Goes Back when this page pushed the
 * entry (returns true: the popstate listener shows the screen); otherwise, e.g. after a reload on a
 * detail link, replaces the entry with `fallback` and returns false.
 */
export function leaveCourseView(fallback: CourseView): boolean {
  if (depth() > 0) {
    window.history.back()
    return true
  }
  replaceCourseView(fallback)
  return false
}

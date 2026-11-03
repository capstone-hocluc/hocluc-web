/** Builds a link to another page in the current console area. */
export function consoleTracePath(page: string, params: Record<string, string>): string {
  const area = window.location.pathname.match(/^\/console\/([^/]+)/)?.[1] ?? 'staff'
  return `/console/${area}/${page}?${new URLSearchParams(params)}`
}

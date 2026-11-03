// A loaded paper another screen asks the workspace to open (the bank's list of papers), handed over across the
// navigation; the workspace also keeps the open paper in its address (?paper=<id>) so a reload or a shared link
// opens it again.
let requested: string | null = null

export function requestPaper(id: string) {
  requested = id
}

/** The paper to open when the workspace mounts: one just requested, else the one in the address. */
export function requestedPaper(): string | null {
  return requested ?? new URLSearchParams(window.location.search).get('paper')
}

/** Forgets the request once the workspace has read it. */
export function clearRequestedPaper() {
  requested = null
}

/** Writes the open paper into the address without a new history entry. */
export function showPaperInAddress(id: string | null) {
  const url = new URL(window.location.href)
  if ((url.searchParams.get('paper') ?? null) === id) return
  if (id) url.searchParams.set('paper', id)
  else url.searchParams.delete('paper')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

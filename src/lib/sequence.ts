// Backend lists (phases, chapters, lessons, questions, options) carry a
// `sequence`; every screen renders them in that order.
export function bySequence<T extends { sequence?: number | null }>(items: T[]) {
  return [...items].sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER))
}

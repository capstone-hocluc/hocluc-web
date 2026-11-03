/**
 * The items no longer in use (stopped, archived, locked) moved after the others; each group keeps the order it came
 * in. For lists the screen holds whole - a paged list is ordered by the server.
 */
export function stoppedLast<T>(items: readonly T[], stopped: (item: T) => boolean): T[] {
  return [...items.filter((item) => !stopped(item)), ...items.filter(stopped)]
}

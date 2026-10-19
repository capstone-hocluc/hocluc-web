/** Normalize text for consistent Vietnamese and case-insensitive search. */
export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Every word in the query must appear in at least one of the searchable fields. */
export function matchesSearch(
  query: string | null | undefined,
  ...fields: (string | null | undefined)[]
): boolean {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean)
  if (!terms.length) return true

  const searchableText = normalizeSearchText(fields.filter(Boolean).join(' '))
  return terms.every((term) => searchableText.includes(term))
}

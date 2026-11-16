import type { Category } from '../services/categoryService'

/** Active subjects, parents first, each followed by its sub-subjects, so a grant on a parent reads as covering the rows under it. */
export function subjectRows(categories: Category[]) {
  const active = categories.filter((category) => category.active)
  const byOrder = (a: Category, b: Category) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi')
  const roots = active.filter((category) => !category.parentId || !active.some((item) => item.id === category.parentId)).sort(byOrder)
  return roots.flatMap((root) => [
    { category: root, child: false },
    ...active.filter((item) => item.parentId === root.id).sort(byOrder).map((category) => ({ category, child: true })),
  ])
}

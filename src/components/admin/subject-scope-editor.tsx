import { useState } from 'react'
import Button from '../console/button'
import Notice from '../console/notice'
import { Checkbox } from '../tailgrids/core/checkbox'
import { Skeleton } from '../tailgrids/core/skeleton'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getErrorMessage } from '../../lib/errors'
import { subjectRows } from '../../lib/subject-rows'
import { getCategories } from '../../services/categoryService'
import {
  CAPABILITY_LABELS,
  CAPABILITY_ROLES,
  getUserSubjectScopes,
  replaceUserSubjectScopes,
  type SubjectCapability,
} from '../../services/subjectScopeService'
import type { UserRole } from '../../services/userService'

const CAPABILITIES = Object.keys(CAPABILITY_ROLES) as SubjectCapability[]
const key = (categoryId: string, capability: SubjectCapability) => `${categoryId}:${capability}`

export default function SubjectScopeEditor({ userId, roles }: { userId: string; roles: UserRole[] }) {
  const capabilities = CAPABILITIES.filter((capability) => CAPABILITY_ROLES[capability].some((role) => roles.includes(role)))
  const resource = useScheduleResource(`subject-scopes:${userId}`, async () => {
    const [scopes, categories] = await Promise.all([getUserSubjectScopes(userId), getCategories()])
    return { granted: scopes.scopes.map((scope) => key(scope.categoryId, scope.capability)), rows: subjectRows(categories) }
  })
  const [draft, setDraft] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (roles.includes('ADMINISTRATOR') && capabilities.length === 0) {
    return <p className="text-sm text-text-tertiary">Quản trị viên có mọi quyền ở mọi môn.</p>
  }
  if (capabilities.length === 0) {
    return <p className="text-sm text-text-tertiary">Vai trò của tài khoản này không nhận quyền theo môn.</p>
  }
  if (resource.status === 'loading') {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-9 w-full" />)}
      </div>
    )
  }
  if (resource.status !== 'ready' || !resource.data) {
    return <Notice tone="danger">{resource.errorMessage || 'Không thể tải quyền theo môn.'}</Notice>
  }

  const original = resource.data.granted
  const current = draft ?? original
  const dirty = current.length !== original.length || current.some((item) => !original.includes(item))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await replaceUserSubjectScopes(userId, current.map((item) => {
        const [categoryId, capability] = item.split(':')
        return { categoryId, capability: capability as SubjectCapability }
      }))
      resource.reload()
      setDraft(null)
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3">
      <legend className="sr-only">Quyền theo môn</legend>
      <div className="overflow-x-auto rounded-lg border border-card-border">
        <table className="w-full text-sm">
          <thead className="bg-background-gray-secondary text-left text-xs text-text-tertiary">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Môn học</th>
              {capabilities.map((capability) => (
                <th key={capability} scope="col" className="px-3 py-2 text-center font-medium whitespace-nowrap">
                  {CAPABILITY_LABELS[capability]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {resource.data.rows.map(({ category, child }) => (
              <tr key={category.id}>
                <th scope="row" className={`px-3 py-2 text-left font-medium text-text-primary ${child ? 'pl-8' : ''}`}>
                  {category.name}
                </th>
                {capabilities.map((capability) => {
                  const id = key(category.id, capability)
                  return (
                    <td key={capability} className="px-3 py-2">
                      <div className="flex justify-center">
                        <Checkbox
                          aria-label={`${CAPABILITY_LABELS[capability]} · ${category.name}`}
                          isSelected={current.includes(id)}
                          isDisabled={saving}
                          onChange={(checked) =>
                            setDraft(checked ? [...current, id] : current.filter((item) => item !== id))
                          }
                        />
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="text-sm text-badge-danger-text">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button appearance="outline" disabled={!dirty || saving} onClick={() => { setDraft(null); setError('') }}>
          Hủy thay đổi
        </Button>
        <Button disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Đang lưu...' : 'Lưu quyền'}</Button>
      </div>
    </fieldset>
  )
}

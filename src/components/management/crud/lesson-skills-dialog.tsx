import { useState } from 'react'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'
import { Skeleton } from '../../tailgrids/core/skeleton'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getActiveCategories, getActiveContent, type MdSkill } from '../../../services/masterDataService'
import { getLessonLabels, replaceLessonSkills } from '../../../services/lessonLabelService'
import type { LessonLabelsResponse } from '../../../types/lessonLabels'
import { crudError } from './crud-errors'

interface Props {
  lessonId: string
  categoryId: string | null
  onClose: () => void
  onSaved: () => void
}

function SkillsForm({ labels, skills, onClose, onSaved }: {
  labels: LessonLabelsResponse
  skills: MdSkill[]
  onClose: () => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState(labels.skills.map((skill) => skill.code))
  const [primary, setPrimary] = useState(labels.skills.find((skill) => skill.primary)?.code ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const domains = labels.chapterDomainCodes
  const inChapter = (skill: MdSkill) => domains.length === 0 || skill.domainCodes.some((code) => domains.includes(code))
  // The server only accepts skills of the chapter's domains; a skill already on the lesson stays listed so it can be removed.
  const visible = skills.filter((skill) => inChapter(skill) || selected.includes(skill.code))

  function toggle(code: string, checked: boolean) {
    if (checked) {
      setSelected((old) => [...old, code])
      if (!primary) setPrimary(code)
      return
    }
    const remaining = selected.filter((item) => item !== code)
    setSelected(remaining)
    if (primary === code) setPrimary(remaining[0] ?? '')
  }

  async function save() {
    setBusy(true)
    setError('')
    try {
      await replaceLessonSkills(labels.lessonId, {
        skills: selected.map((code) => ({ code, primary: code === primary })),
      })
      onSaved()
    } catch (reason) {
      setError(crudError(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {error && <Notice tone="danger">{error}</Notice>}
        {skills.length === 0 ? (
          <p className="text-sm text-text-tertiary">Môn này chưa có master data đang dùng.</p>
        ) : domains.length === 0 ? (
          <p className="text-sm text-text-tertiary">Chương chưa gắn domain nên mọi kỹ năng của môn đều chọn được.</p>
        ) : null}
        <ul className="flex max-h-96 flex-col divide-y divide-card-border overflow-y-auto rounded-lg border border-card-border">
          {visible.map((skill) => {
            const checked = selected.includes(skill.code)
            return (
              <li key={skill.code} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 py-2.5">
                <Checkbox
                  className="min-w-0 flex-1 items-start text-sm text-text-primary"
                  isSelected={checked}
                  isDisabled={busy}
                  onChange={(value) => toggle(skill.code, value)}
                >
                  <span className="min-w-0 break-words">
                    <span className="mr-1.5 font-mono text-xs text-text-tertiary">{skill.code}</span>
                    {skill.nameVi}
                    {!inChapter(skill) && <span className="ml-1.5 text-xs text-badge-danger-text">Ngoài domain của chương</span>}
                  </span>
                </Checkbox>
                {checked && (
                  <label className="flex shrink-0 items-center gap-1.5 text-xs text-text-secondary">
                    <input
                      type="radio"
                      name="primarySkill"
                      checked={primary === skill.code}
                      disabled={busy}
                      onChange={() => setPrimary(skill.code)}
                    />
                    Kỹ năng chính
                  </label>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button appearance="outline" onClick={onClose} disabled={busy}>Hủy</Button>
        <Button onClick={() => void save()} disabled={busy || (selected.length > 0 && !primary)}>
          {busy ? 'Đang lưu...' : 'Lưu nhãn'}
        </Button>
      </div>
    </>
  )
}

export default function LessonSkillsDialog({ lessonId, categoryId, onClose, onSaved }: Props) {
  const resource = useScheduleResource(`lesson-skills:${lessonId}:${categoryId ?? ''}`, async () => {
    const labels = await getLessonLabels(lessonId)
    const subject = labels.subjectCategoryId ?? categoryId
    const categories = subject ? await getActiveCategories() : []
    const content = subject && categories.some((item) => item.categoryId === subject)
      ? await getActiveContent(subject) : null
    return { labels, skills: content?.skills ?? [] }
  })
  return (
    <ConsoleDialog open title="Nhãn bài học" onClose={onClose}>
      {resource.status === 'loading' && <div className="flex flex-col gap-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>}
      {resource.status !== 'ready' && resource.status !== 'loading' && <Notice tone="danger">{resource.errorMessage || 'Không thể tải nhãn bài học.'}</Notice>}
      {resource.data && <SkillsForm {...resource.data} onClose={onClose} onSaved={onSaved} />}
    </ConsoleDialog>
  )
}

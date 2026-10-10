import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import SelectField from '../../console/select-field'
import Notice from '../../console/notice'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { saveCategory, type Category } from '../../../services/categoryService'
import { getFieldErrors } from '../../../lib/errors'
import { crudError, unknownMutation } from './crud-errors'

interface Props {
  category: Category | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export default function CategoryEditorDialog({ category, categories, onClose, onSaved }: Props) {
  const [parentId, setParentId] = useState(category?.parentId ?? 'NONE')
  const [active, setActive] = useState(category?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)
  const excluded = new Set(category ? [category.id] : [])
  // Exclude descendants, not just the current category. BE still owns cycle enforcement.
  for (let i = 0; i < categories.length; i++) {
    for (const item of categories)
      if (item.parentId && excluded.has(item.parentId)) excluded.add(item.id)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (busy || uncertain) return
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await saveCategory(category?.id ?? null, {
        name: String(data.get('name') ?? '').trim(),
        slug: String(data.get('slug') ?? '').trim() || undefined,
        description: String(data.get('description') ?? '').trim() || null,
        imageUrl: String(data.get('imageUrl') ?? '').trim() || null,
        parentId: parentId === 'NONE' ? null : parentId,
        active,
        sortOrder: Number(data.get('sortOrder')),
        expectedUpdatedAt: category?.updatedAt,
      })
      onSaved()
    } catch (err) {
      setError(crudError(err))
      setFieldErrors(getFieldErrors(err))
      setUncertain(unknownMutation(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <ConsoleDialog
      open
      title={category ? 'Sửa danh mục' : 'Tạo danh mục'}
      onClose={onClose}
      onSubmit={(e) => void submit(e)}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            {uncertain ? 'Đóng và kiểm tra' : 'Hủy'}
          </Button>
          <Button type="submit" disabled={busy || uncertain}>
            {busy ? 'Đang lưu...' : 'Lưu danh mục'}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
        {uncertain && (
          <Notice tone="warning">
            Chưa rõ kết quả lưu. Đóng form và tải lại danh sách trước khi thử tiếp.
          </Notice>
        )}
        <Field label="Tên danh mục">
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={category?.name}
            className={fieldControlClass}
            aria-invalid={!!fieldErrors.name}
          />
        </Field>
        <Field label="Slug" hint="Để trống để tạo tự động.">
          <input
            name="slug"
            maxLength={200}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={category?.slug}
            className={fieldControlClass}
            aria-invalid={!!fieldErrors.slug}
          />
        </Field>
        <Field label="Danh mục cha">
          <SelectField
            ariaLabel="Danh mục cha"
            value={parentId}
            onChange={setParentId}
            options={[
              { id: 'NONE', label: 'Không có' },
              ...categories
                .filter((c) => !excluded.has(c.id))
                .map((c) => ({ id: c.id, label: c.name })),
            ]}
          />
        </Field>
        <Field label="Thứ tự">
          <input
            name="sortOrder"
            type="number"
            min={0}
            max={100000}
            step={1}
            required
            defaultValue={category?.sortOrder ?? 0}
            className={fieldControlClass}
          />
        </Field>
        <Field label="Ảnh danh mục">
          <input
            name="imageUrl"
            maxLength={2000}
            defaultValue={category?.imageUrl ?? ''}
            placeholder="https://…"
            className={fieldControlClass}
          />
        </Field>
        <Field label="Mô tả">
          <textarea
            name="description"
            maxLength={10000}
            defaultValue={category?.description ?? ''}
            className={textareaControlClass}
          />
        </Field>
        <Checkbox isSelected={active} onChange={setActive} isDisabled={busy}>
          Đang sử dụng
        </Checkbox>
        {Object.entries(fieldErrors).map(([field, message]) => (
          <p key={field} role="alert" className="text-sm text-danger">
            {field}: {message}
          </p>
        ))}
      </fieldset>
    </ConsoleDialog>
  )
}

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import Button from '../../../console/button'
import ConsoleDialog from '../../../console/dialog'
import Field, { fieldControlClass } from '../../../console/form-field'
import Notice from '../../../console/notice'
import { linkSelection } from '../link-url'

interface LinkDialogProps {
  editor: Editor
  onClose: () => void
}

/** Adds, edits or removes the link at the selection. Mounted only while open. */
export default function LinkDialog({ editor, onClose }: LinkDialogProps) {
  const existing = editor.isActive('link')
  const [href, setHref] = useState(
    () => (editor.getAttributes('link').href as string | undefined) ?? ''
  )
  const [invalid, setInvalid] = useState(false)

  function cancel() {
    onClose()
    editor.commands.focus()
  }

  function apply() {
    if (!linkSelection(editor, href)) {
      setInvalid(true)
      return
    }
    onClose()
  }

  function remove() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    onClose()
  }

  return (
    <ConsoleDialog
      open
      onClose={cancel}
      title={existing ? 'Sửa liên kết' : 'Chèn liên kết'}
      maxWidth={440}
      onSubmit={apply}
      footer={
        <>
          {existing && (
            <Button
              type="button"
              variant="danger"
              appearance="outline"
              onClick={remove}
              aria-label="Gỡ liên kết"
              title="Gỡ liên kết"
              className="sm:mr-auto"
            >
              Gỡ liên kết
            </Button>
          )}
          <Button type="button" appearance="outline" onClick={cancel} aria-label="Huỷ" title="Huỷ">
            Huỷ
          </Button>
          <Button type="submit" aria-label="Áp dụng" title="Áp dụng">
            Áp dụng
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Địa chỉ liên kết">
          <input
            // The dialog has just opened from a menu, so the field is where the user types next.
            autoFocus
            name="href"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={href}
            onChange={(event) => {
              setHref(event.currentTarget.value)
              setInvalid(false)
            }}
            placeholder="https://"
            aria-invalid={invalid || undefined}
            className={fieldControlClass}
          />
        </Field>
        {invalid && <Notice tone="danger">Liên kết không hợp lệ</Notice>}
      </div>
    </ConsoleDialog>
  )
}

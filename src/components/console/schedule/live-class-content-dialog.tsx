import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../dialog'
import Notice from '../notice'
import Button from '../button'
import Field, { fieldControlClass, textareaControlClass } from '../form-field'
import { updateLiveClassDetails, type ConsoleLiveClass } from '../../../services/liveClassService'
import { getErrorMessage } from '../../../lib/errors'

interface Props {
  liveClass: ConsoleLiveClass
  onClose: () => void
  onSaved: () => void
}

export default function LiveClassContentDialog({ liveClass, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(liveClass.detailsFilled ? liveClass.title : '')
  const [description, setDescription] = useState(liveClass.description ?? '')
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề buổi học.')
      return
    }
    setBusy(true)
    setErrorMessage('')
    try {
      await updateLiveClassDetails(liveClass.id, {
        title: title.trim(),
        description: description.trim(),
      })
      onSaved()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title="Nội dung buổi học"
      maxWidth={520}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button type="button" appearance="outline" disabled={busy} onClick={onClose}>
            Đóng
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu nội dung'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
        <Field label="Tiêu đề buổi học">
          <input
            name="title"
            autoComplete="off"
            required
            maxLength={500}
            disabled={busy}
            value={title}
            placeholder={liveClass.title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldControlClass}
          />
        </Field>
        <Field label="Mô tả nội dung">
          <textarea
            name="description"
            rows={4}
            maxLength={5000}
            disabled={busy}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaControlClass}
          />
        </Field>
      </div>
    </ConsoleDialog>
  )
}

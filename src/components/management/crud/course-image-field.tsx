import { useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import Button from '../../console/button'
import { fieldControlClass } from '../../console/form-field'
import { imageFileProblem, uploadPublicImage } from '../../../services/fileService'

interface Props {
  /** Form field the chosen address is submitted under. */
  name: string
  defaultValue: string
  disabled?: boolean
  /** Tells the form to hold its save button while a file is on its way. */
  onUploadingChange?: (uploading: boolean) => void
}

// Image picker with two ways in on one row: paste an address, or upload a file from the computer.
// Either way the form submits one address through a hidden input.
export default function CourseImageField({
  name,
  defaultValue,
  disabled,
  onUploadingChange,
}: Props) {
  const [value, setValue] = useState(defaultValue)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const picker = useRef<HTMLInputElement>(null)

  function change(next: string) {
    setValue(next)
    setPreviewFailed(false)
    setError('')
  }

  async function pick(file?: File) {
    if (!file) return
    const problem = imageFileProblem(file)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setUploading(true)
    onUploadingChange?.(true)
    try {
      change(await uploadPublicImage(file, 'course-image'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được ảnh lên.')
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
      if (picker.current) picker.current.value = ''
    }
  }

  const previewable = /^https?:\/\//i.test(value.trim())

  return (
    <div
      role="group"
      aria-label="Ảnh khóa học"
      className="flex flex-col gap-2 text-sm font-medium text-text-primary"
    >
      <span>Ảnh khóa học</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-2">
        <input
          aria-label="Địa chỉ ảnh"
          maxLength={2000}
          value={value}
          onChange={(event) => change(event.target.value)}
          placeholder="Dán link ảnh https://… hoặc tải ảnh lên"
          disabled={disabled || uploading}
          className={cn(fieldControlClass, 'min-w-0 flex-1')}
        />
        <Button
          appearance="outline"
          disabled={disabled || uploading}
          onClick={() => picker.current?.click()}
        >
          {uploading ? 'Đang tải lên...' : 'Tải ảnh lên'}
        </Button>
        {value && !uploading && (
          <Button appearance="ghost" disabled={disabled} onClick={() => change('')}>
            Bỏ ảnh
          </Button>
        )}
        <input
          ref={picker}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          tabIndex={-1}
          onChange={(event) => void pick(event.target.files?.[0])}
        />
      </div>
      <p className="text-xs font-normal text-text-tertiary">
        Tải ảnh PNG, JPG hoặc WebP, tối đa 5MB.
      </p>
      {error && (
        <p role="alert" className="text-xs font-normal text-badge-error-text">
          {error}
        </p>
      )}
      {previewable &&
        (previewFailed ? (
          <p className="text-xs font-normal text-text-tertiary">
            Chưa xem trước được ảnh này. Kiểm tra lại địa chỉ.
          </p>
        ) : (
          <img
            src={value.trim()}
            alt="Ảnh khóa học đã chọn"
            onError={() => setPreviewFailed(true)}
            className="aspect-video w-full max-w-64 rounded-lg border border-card-border object-cover"
          />
        ))}
    </div>
  )
}

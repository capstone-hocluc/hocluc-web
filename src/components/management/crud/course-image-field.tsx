import { useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import Button from '../../console/button'
import { fieldControlClass } from '../../console/form-field'
import { imageFileProblem, uploadPublicImage } from '../../../services/fileService'

type Source = 'link' | 'upload'

interface Props {
  /** Form field the chosen address is submitted under. */
  name: string
  defaultValue: string
  disabled?: boolean
  /** Tells the form to hold its save button while a file is on its way. */
  onUploadingChange?: (uploading: boolean) => void
}

// Image picker with two ways in: paste an address, or upload a file from the computer.
// Either way the form submits one address through a hidden input.
export default function CourseImageField({
  name,
  defaultValue,
  disabled,
  onUploadingChange,
}: Props) {
  const [value, setValue] = useState(defaultValue)
  const [source, setSource] = useState<Source>('link')
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
  const tab = (id: Source, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={source === id}
      disabled={disabled || uploading}
      onClick={() => {
        setSource(id)
        setError('')
      }}
      className={cn(
        'h-7 cursor-pointer rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed',
        source === id
          ? 'bg-card-background text-text-primary shadow-xs'
          : 'text-text-tertiary hover:text-text-primary'
      )}
    >
      {label}
    </button>
  )

  return (
    <div
      role="group"
      aria-label="Ảnh khóa học"
      className="flex flex-col gap-2 text-sm font-medium text-text-primary"
    >
      <div className="flex items-center justify-between gap-2">
        <span>Ảnh khóa học</span>
        <div
          role="radiogroup"
          aria-label="Cách thêm ảnh"
          className="inline-flex gap-0.5 rounded-lg bg-background-gray-secondary p-0.5"
        >
          {tab('link', 'Dán link')}
          {tab('upload', 'Tải lên')}
        </div>
      </div>
      <input type="hidden" name={name} value={value} />
      {source === 'link' ? (
        <input
          aria-label="Địa chỉ ảnh"
          maxLength={2000}
          value={value}
          onChange={(event) => change(event.target.value)}
          placeholder="https://…"
          disabled={disabled}
          className={fieldControlClass}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <Button
              appearance="outline"
              disabled={disabled || uploading}
              onClick={() => picker.current?.click()}
            >
              {uploading ? 'Đang tải lên...' : value ? 'Chọn ảnh khác' : 'Chọn ảnh từ máy'}
            </Button>
            {value && !uploading && (
              <Button appearance="ghost" disabled={disabled} onClick={() => change('')}>
                Bỏ ảnh
              </Button>
            )}
          </div>
          <input
            ref={picker}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            tabIndex={-1}
            onChange={(event) => void pick(event.target.files?.[0])}
          />
          <p className="text-xs font-normal text-text-tertiary">PNG, JPG hoặc WebP, tối đa 5MB.</p>
        </div>
      )}
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

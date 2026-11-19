import { useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import { introVideoSource } from '../../../lib/introVideo'
import Button from '../../console/button'
import { fieldControlClass } from '../../console/form-field'
import IntroVideo from '../../course/IntroVideo'
import { uploadCoursePreviewVideo, videoFileProblem } from '../../../services/fileService'

interface Props {
  /** Form field the chosen address is submitted under. */
  name: string
  defaultValue: string
  disabled?: boolean
  /** Tells the form to hold its save button while a file is on its way. */
  onUploadingChange?: (uploading: boolean) => void
}

// Intro video picker, same shape as the cover picker: paste a YouTube or video link, or upload a file.
// Either way the form submits one address through a hidden input.
export default function CourseVideoField({ name, defaultValue, disabled, onUploadingChange }: Props) {
  const [value, setValue] = useState(defaultValue)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  const uploading = progress !== null

  function change(next: string) {
    setValue(next)
    setError('')
  }

  async function pick(file?: File) {
    if (!file) return
    const problem = videoFileProblem(file)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setProgress(0)
    onUploadingChange?.(true)
    try {
      change(await uploadCoursePreviewVideo(file, setProgress))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được video lên.')
    } finally {
      setProgress(null)
      onUploadingChange?.(false)
      if (picker.current) picker.current.value = ''
    }
  }

  const playable = introVideoSource(value) !== null

  return (
    <div
      role="group"
      aria-label="Video giới thiệu"
      className="flex flex-col gap-2 text-sm font-medium text-text-primary"
    >
      <span>Video giới thiệu</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-2">
        <input
          aria-label="Địa chỉ video"
          maxLength={2000}
          value={value}
          onChange={(event) => change(event.target.value)}
          placeholder="Dán link YouTube hoặc tải video lên"
          disabled={disabled || uploading}
          className={cn(fieldControlClass, 'min-w-0 flex-1')}
        />
        <Button appearance="outline" disabled={disabled || uploading} onClick={() => picker.current?.click()}>
          {uploading ? `Đang tải ${Math.round((progress ?? 0) * 100)}%` : 'Tải video lên'}
        </Button>
        {value && !uploading && (
          <Button appearance="ghost" disabled={disabled} onClick={() => change('')}>
            Bỏ video
          </Button>
        )}
        <input
          ref={picker}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          tabIndex={-1}
          onChange={(event) => void pick(event.target.files?.[0])}
        />
      </div>
      {uploading && (
        <div
          role="progressbar"
          aria-label="Tiến độ tải video"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((progress ?? 0) * 100)}
          className="h-1.5 overflow-hidden rounded-full bg-background-gray-secondary"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${(progress ?? 0) * 100}%` }} />
        </div>
      )}
      <p className="text-xs font-normal text-text-tertiary">
        Video MP4 hoặc WebM, tối đa 500MB. Hiện trên trang giới thiệu khóa học.
      </p>
      {error && (
        <p role="alert" className="text-xs font-normal text-badge-error-text">
          {error}
        </p>
      )}
      {value && !uploading &&
        (playable ? (
          <IntroVideo
            url={value}
            title="Video đã chọn"
            className="aspect-video w-full max-w-80 rounded-lg border border-card-border bg-black"
          />
        ) : (
          <p className="text-xs font-normal text-text-tertiary">
            Chưa phát được địa chỉ này. Dùng link YouTube hoặc link tệp video https://….
          </p>
        ))}
    </div>
  )
}

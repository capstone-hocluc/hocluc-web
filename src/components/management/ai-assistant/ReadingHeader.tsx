import { cn } from '../../../lib/cn'
import Button from '../../console/button'
import { FileText, RefreshCw, X } from '../../console/icons'
import Notice from '../../console/notice'
import AiOrb from './AiOrb'

interface ReadingHeaderProps {
  title: string
  running: boolean
  status: string
  progress: string | null
  error: string | null
  labellingBlocker: string | null
  polling: boolean
  /** Given for a failed paper the viewer may load again. */
  onLoadAgain?: () => void
  /** Back to the exam being written. */
  onClose?: () => void
}

/** The paper being read and where its reading is, with what can be done about it. */
export default function ReadingHeader({
  title,
  running,
  status,
  progress,
  error,
  labellingBlocker,
  polling,
  onLoadAgain,
  onClose,
}: ReadingHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        {running ? <AiOrb active /> : <FileText size={16} className="mt-0.5 shrink-0 text-primary-text" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-sm font-semibold text-text-primary" title={title}>{title}</p>
          <p role="status" aria-live="polite" className={cn('m-0 text-xs text-text-tertiary', running && 'animate-pulse motion-reduce:animate-none')}>
            {status}
          </p>
          {progress && <p className="m-0 truncate text-xs text-text-secondary" title={progress}>{progress}</p>}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Về đề đang soạn"
            title="Về đề đang soạn"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
          >
            <X size={15} />
          </button>
        )}
      </div>
      {error && (
        <Notice tone="danger">
          <span className="min-w-0 flex-1 break-words">{error}</span>
          {onLoadAgain && (
            <Button size="sm" appearance="outline" onClick={onLoadAgain}>
              <RefreshCw size={15} />
              Nạp lại
            </Button>
          )}
        </Notice>
      )}
      {labellingBlocker && <Notice tone="warning">{labellingBlocker}</Notice>}
      {polling && <p className="m-0 text-xs text-text-tertiary">Không mở được luồng trực tiếp, đang cập nhật 4 giây một lần.</p>}
    </div>
  )
}

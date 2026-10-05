import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { RefreshCw } from 'lucide-react'
import MascotState from '../common/MascotState'
import type { LessonDetail } from '../../services/lessonService'
import { getLessonVideoStreamUrl } from '../../services/lessonService'
import { getErrorMessage } from '../../lib/errors'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import Skeleton from '../ui/Skeleton'

interface LessonContentProps {
  lesson: LessonDetail
  videoRef: RefObject<HTMLVideoElement | null>
  onTimeUpdate: () => void
  onPause: () => void
}

type StreamState =
  | { streamKey: string; status: 'loading' }
  | { streamKey: string; status: 'ready'; streamUrl: string }
  | { streamKey: string; status: 'error'; message: string }

const surface = 'overflow-hidden rounded-[14px] border border-line bg-surface'
const MAX_STREAM_RETRIES = 2

function EmptyContent({ title, message }: { title: string; message: string }) {
  return (
    <div className={`${surface} flex min-h-[220px] items-center justify-center p-[30px]`}>
      <MascotState title={title} message={message} />
    </div>
  )
}

function LessonContent({ lesson, videoRef, onTimeUpdate, onPause }: LessonContentProps) {
  const hasAccess = lesson.owned || lesson.preview
  const videos = lesson.videos ?? []
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [requestKey, setRequestKey] = useState(0)
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({})
  const [streamState, setStreamState] = useState<StreamState>({ streamKey: '', status: 'loading' })
  const refreshedAfterPlayerError = useRef(new Set<string>())
  const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? videos[0]
  const selectedVideoIdForStream = selectedVideo?.id ?? ''
  const selectedStreamKey = selectedVideo ? `${lesson.id}:${selectedVideo.id}` : ''
  const retryCount = retryCounts[selectedStreamKey] ?? 0

  const retryStream = () => {
    if (retryCount >= MAX_STREAM_RETRIES) return
    setRetryCounts((current) => ({ ...current, [selectedStreamKey]: (current[selectedStreamKey] ?? 0) + 1 }))
    setStreamState({ streamKey: selectedStreamKey, status: 'loading' })
    setRequestKey((current) => current + 1)
  }

  useEffect(() => {
    if (!hasAccess || lesson.contentType !== 'VIDEO' || !selectedVideoIdForStream) return

    let cancelled = false
    const videoId = selectedVideoIdForStream

    getLessonVideoStreamUrl(lesson.id, videoId)
      .then(({ streamUrl }) => {
        if (!cancelled) setStreamState({ streamKey: `${lesson.id}:${videoId}`, status: 'ready', streamUrl })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStreamState({ streamKey: `${lesson.id}:${videoId}`, status: 'error', message: getErrorMessage(error) })
        }
      })

    return () => {
      cancelled = true
    }
  }, [hasAccess, lesson.contentType, lesson.id, requestKey, selectedVideoIdForStream])

  const handlePlayerError = () => {
    if (!selectedVideo) return

    const retryKey = selectedStreamKey
    if (!refreshedAfterPlayerError.current.has(retryKey) && retryCount < MAX_STREAM_RETRIES) {
      refreshedAfterPlayerError.current.add(retryKey)
      setRetryCounts((current) => ({ ...current, [retryKey]: (current[retryKey] ?? 0) + 1 }))
      setStreamState({ streamKey: selectedStreamKey, status: 'loading' })
      setRequestKey((current) => current + 1)
      return
    }

    setStreamState({
      streamKey: selectedStreamKey,
      status: 'error',
      message: 'Không thể phát video. Liên kết có thể đã hết hạn hoặc bạn chưa có quyền xem.',
    })
  }

  if (!hasAccess) {
    return (
      <EmptyContent
        title="Chưa thể xem bài học"
        message="Bạn chưa có quyền truy cập bài học này."
      />
    )
  }

  if (lesson.contentType === 'VIDEO') {
    if (!selectedVideo) {
      const hasLegacyVideoUrl = Boolean(lesson.videoUrl?.trim())
      return (
        <EmptyContent
          title={hasLegacyVideoUrl ? 'Video cũ cần được cập nhật' : 'Video chưa sẵn sàng'}
          message={
            hasLegacyVideoUrl
              ? 'Bài học đang dùng liên kết video cũ, chưa có mã video để lấy stream theo quyền. Video sẽ phát lại khi dữ liệu được chuyển sang định dạng mới.'
              : 'Video của bài học này hiện chưa sẵn sàng.'
          }
        />
      )
    }

    const currentStream = streamState.streamKey === selectedStreamKey ? streamState : null
    const isReady = currentStream?.status === 'ready'
    const isError = currentStream?.status === 'error'

    return (
      <section className="flex flex-col gap-3" aria-label="Video bài học">
        {videos.length > 1 && (
          <div className="flex flex-wrap gap-2" aria-label="Chọn video bài học">
            {videos.map((video, index) => {
              const isSelected = video.id === selectedVideo.id
              return (
                <Button
                  key={video.id}
                  size="sm"
                  variant="primary"
                  appearance={isSelected ? 'fill' : 'outline'}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedVideoId(video.id)}
                >
                  {video.title || `Video ${index + 1}`}
                </Button>
              )
            })}
          </div>
        )}

        <div className="grid min-h-[220px] place-items-center overflow-hidden rounded-[14px] bg-[#0d1326]">
          {isReady && currentStream.status === 'ready' ? (
            <video
              key={`${selectedVideo.id}:${currentStream.streamUrl}`}
              ref={videoRef}
              src={currentStream.streamUrl}
              controls
              onError={handlePlayerError}
              onTimeUpdate={onTimeUpdate}
              onPause={onPause}
              className="block max-h-[480px] w-full bg-black max-[640px]:max-h-[260px]"
            />
          ) : isError && currentStream.status === 'error' ? (
            <div className="flex w-full flex-col items-center gap-3 p-5">
              <Notice tone="warning" className="max-w-[680px] justify-center text-center">
                {currentStream.message}
              </Notice>
              {retryCount < MAX_STREAM_RETRIES ? (
                <Button size="sm" variant="primary" appearance="outline" onClick={retryStream}>
                  <RefreshCw aria-hidden="true" />
                  Thử lấy liên kết mới ({retryCount + 1}/{MAX_STREAM_RETRIES})
                </Button>
              ) : (
                <p className="m-0 text-center text-sm text-text-secondary" role="status">
                  Đã hết số lần thử lại cho video này. Hãy quay lại sau hoặc chọn video khác.
                </p>
              )}
            </div>
          ) : (
            <div className="relative w-full max-w-[854px]">
              <Skeleton className="aspect-video w-full rounded-none" />
              <p className="absolute inset-x-3 bottom-3 text-center text-sm font-medium text-white">
                Đang lấy liên kết phát video…
              </p>
            </div>
          )}
        </div>
      </section>
    )
  }

  if (lesson.contentType === 'TEXT') {
    if (!lesson.content) {
      return (
        <EmptyContent
          title="Nội dung chưa sẵn sàng"
          message="Nội dung của bài học này hiện chưa sẵn sàng."
        />
      )
    }
    return (
      <div className={`${surface} flex flex-col gap-3.5 p-6 text-[14.5px] leading-[1.75] text-text-body`}>
        {lesson.content
          .split('\n')
          .map((paragraph, index) => (paragraph.trim() ? <p key={index}>{paragraph}</p> : null))}
      </div>
    )
  }

  return (
    <EmptyContent
      title="Chưa hỗ trợ loại nội dung này"
      message="Nội dung bài học này chưa được hỗ trợ."
    />
  )
}

export default LessonContent

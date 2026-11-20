import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { RefreshCw } from '../console/icons'
import MascotState from '../common/MascotState'
import type { LessonDetail } from '../../services/lessonService'
import { getLessonVideoStreamUrl } from '../../services/lessonService'
import { getErrorMessage } from '../../lib/errors'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import Skeleton from '../ui/Skeleton'
import { bySequence } from '../../lib/sequence'
import { safeExternalUrl } from '../../lib/scheduling'

interface LessonContentProps {
  lesson: LessonDetail
  videoRef: RefObject<HTMLVideoElement | null>
  onTimeUpdate: () => void
  onPause: () => void
  activeVideoId?: string
  onSelectVideo?: (videoId: string) => void
  hideVideoChooser?: boolean
  textFooter?: ReactNode
}

type StreamState =
  | { streamKey: string; status: 'loading' }
  | { streamKey: string; status: 'ready'; streamUrl: string }
  | { streamKey: string; status: 'error'; message: string }

const surface = 'overflow-hidden rounded-2xl border border-line-card bg-surface shadow-card'
const MAX_STREAM_RETRIES = 2

function EmptyContent({ title, message, footer, heading }: { title: string; message: string; footer?: ReactNode; heading?: ReactNode }) {
  return (
    <div className={`${surface} flex min-h-[220px] flex-col justify-center gap-4 p-[30px]`}>
      {heading}
      <MascotState title={title} message={message} />
      {footer}
    </div>
  )
}

function LessonContent({ lesson, videoRef, onTimeUpdate, onPause, activeVideoId, onSelectVideo, hideVideoChooser = false, textFooter }: LessonContentProps) {
  const hasAccess = lesson.owned || lesson.preview
  const videos = bySequence(lesson.videos ?? [])
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [requestKey, setRequestKey] = useState(0)
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({})
  const [streamState, setStreamState] = useState<StreamState>({ streamKey: '', status: 'loading' })
  const refreshedAfterPlayerError = useRef(new Set<string>())
  const selectedVideo = videos.find((video) => video.id === (activeVideoId ?? selectedVideoId)) ?? videos[0]
  const selectedVideoIdForStream = selectedVideo?.id ?? ''
  const selectedStreamKey = selectedVideo ? `${lesson.id}:${selectedVideo.id}` : ''
  const retryCount = retryCounts[selectedStreamKey] ?? 0

  const retryStream = () => {
    if (retryCount >= MAX_STREAM_RETRIES) return
    setRetryCounts((current) => ({
      ...current,
      [selectedStreamKey]: (current[selectedStreamKey] ?? 0) + 1,
    }))
    setStreamState({ streamKey: selectedStreamKey, status: 'loading' })
    setRequestKey((current) => current + 1)
  }

  useEffect(() => {
    if (!hasAccess || lesson.contentType !== 'VIDEO' || !selectedVideoIdForStream) return

    let cancelled = false
    const videoId = selectedVideoIdForStream

    getLessonVideoStreamUrl(lesson.id, videoId)
      .then(({ streamUrl }) => {
        if (!cancelled)
          setStreamState({ streamKey: `${lesson.id}:${videoId}`, status: 'ready', streamUrl })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStreamState({
            streamKey: `${lesson.id}:${videoId}`,
            status: 'error',
            message: getErrorMessage(error),
          })
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
        {videos.length > 1 && !hideVideoChooser && (
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
                  onClick={() => onSelectVideo ? onSelectVideo(video.id) : setSelectedVideoId(video.id)}
                >
                  {video.title || `Video ${index + 1}`}
                </Button>
              )
            })}
          </div>
        )}

        <div className="grid min-h-[220px] place-items-center overflow-hidden rounded-2xl border border-line-card bg-[#0d1326] shadow-card">
          {isReady && currentStream.status === 'ready' ? (
            <video
              key={`${selectedVideo.id}:${currentStream.streamUrl}`}
              ref={videoRef}
              src={currentStream.streamUrl}
              controls
              onLoadedMetadata={() => {
                const position = lesson.progress?.videos?.find(item => item.videoId === selectedVideo.id)?.watchedSeconds ?? 0
                if (videoRef.current && position > 0 && Number.isFinite(videoRef.current.duration)) {
                  videoRef.current.currentTime = Math.min(position, videoRef.current.duration)
                }
              }}
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
                <p
                  className="m-0 text-center text-sm font-semibold text-text-secondary"
                  role="status"
                >
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

  if (lesson.contentType === 'TEXT' || lesson.contentType === 'ARTICLE') {
    const heading = <h1 className="text-xl font-bold leading-snug text-text-heading">{lesson.title}</h1>
    if (!lesson.content) {
      return (
        <EmptyContent
          title="Nội dung chưa sẵn sàng"
          message="Nội dung của bài học này hiện chưa sẵn sàng."
          footer={textFooter}
          heading={heading}
        />
      )
    }
    const documentUrl = safeExternalUrl(lesson.content.trim())
    if (documentUrl && /\.pdf$/i.test(new URL(documentUrl).pathname)) {
      return <section className={surface} aria-label="Tài liệu bài học">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-6 py-4 max-[640px]:px-4">
          {heading}
          <Button asChild size="sm" appearance="outline"><a href={documentUrl} target="_blank" rel="noopener noreferrer">Mở tài liệu</a></Button>
        </div>
        <iframe src={documentUrl} title={`Tài liệu: ${lesson.title}`} className="h-[65dvh] min-h-80 w-full border-0" />
        {textFooter && <div className="px-6 pb-5 max-[640px]:px-4">{textFooter}</div>}
      </section>
    }
    return (
      <div
        className={`${surface} flex flex-col gap-3.5 p-6 text-base leading-[1.75] text-text-body max-[640px]:p-4`}
      >
        <header className="border-b border-line-soft pb-4">{heading}</header>
        {lesson.content
          .split('\n')
          .map((paragraph, index) => (paragraph.trim() ? <p key={index}>{paragraph}</p> : null))}
        {textFooter}
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

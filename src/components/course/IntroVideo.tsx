import { introVideoSource } from '../../lib/introVideo'

interface Props {
  url: string | null | undefined
  title: string
  /** Still image shown before a video file starts. */
  poster?: string | null
  className?: string
}

/** A course's intro video: YouTube links play embedded, uploaded files in the browser's own player. */
export default function IntroVideo({ url, title, poster, className }: Props) {
  const source = introVideoSource(url)
  if (!source) return null
  if (source.kind === 'youtube') {
    return (
      <iframe
        src={source.embedUrl}
        title={`Video giới thiệu: ${title}`}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
        className={className}
        style={{ border: 0 }}
      />
    )
  }
  return (
    <video
      src={source.src}
      poster={poster ?? undefined}
      controls
      preload="metadata"
      playsInline
      aria-label={`Video giới thiệu: ${title}`}
      className={className}
    />
  )
}

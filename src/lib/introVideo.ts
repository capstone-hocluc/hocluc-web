/** How a course intro video address plays: a YouTube embed, a video file, or not at all. */
export type IntroVideoSource =
  | { kind: 'youtube'; embedUrl: string }
  | { kind: 'file'; src: string }

const YOUTUBE_ID = /^[\w-]{11}$/

// youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID and /shorts/ID all name the same video.
function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^(www\.|m\.)/, '')
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null
  if (url.pathname === '/watch') return url.searchParams.get('v')
  const [, kind, id] = url.pathname.split('/')
  return kind === 'embed' || kind === 'shorts' || kind === 'live' ? (id ?? null) : null
}

/** The playable form of an intro video address, or null for an empty or unplayable one. */
export function introVideoSource(value: string | null | undefined): IntroVideoSource | null {
  const text = value?.trim() ?? ''
  if (!text) return null
  if (text.startsWith('/') && !text.startsWith('//')) return { kind: 'file', src: text }
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const id = youtubeId(url)
  if (id !== null) {
    return YOUTUBE_ID.test(id) ? { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }
  return { kind: 'file', src: url.toString() }
}

import { useRef, useState } from 'react'
import { Expand, Pause, Play, Volume2 } from 'lucide-react'
import { cn } from '../../../lib/cn'
import Progress from '../../ui/Progress'
import type { VideoActivity } from './types'

function formatDuration(duration = '18 phút') {
  const minutes = Number.parseInt(String(duration).match(/\d+/)?.[0] || '', 10) || 18
  return `${String(minutes).padStart(2, '0')}:00`
}

const glassButton = 'grid cursor-pointer place-items-center text-surface'

// 16:9 player. Real lessons render the browser's <video> (their own controls);
// prototype lessons show the fake play / control bar.
function VideoPlayer({ activity }: { activity: VideoActivity }) {
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    if (playerRef.current?.requestFullscreen) {
      playerRef.current.requestFullscreen()
      return
    }
    setExpanded((current) => !current)
  }

  return (
    <div
      ref={playerRef}
      className={cn(
        'relative grid aspect-video place-items-center overflow-hidden rounded-[18px] border border-white/14 bg-[#0b1020] bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_28px_70px_rgba(0,0,0,0.38)]',
        expanded
          ? 'fixed inset-5 z-90 h-auto w-auto max-w-none'
          : 'w-[min(100%,calc((100vh_-_264px)*16/9))] max-w-[1280px] max-[760px]:max-h-[calc(100dvh_-_260px)] max-[760px]:w-full'
      )}
    >
      {activity.videoUrl && (
        <video
          src={activity.videoUrl}
          controls
          className="absolute inset-0 z-2 size-full bg-black object-contain"
        />
      )}
      <div className="absolute top-4 left-4 grid gap-[3px] text-surface">
        <span className="text-[13px] font-medium">
          {activity.type === 'Buổi giải đề' ? 'Buổi giải đề' : 'Video'} · {activity.title}
        </span>
      </div>
      <button
        type="button"
        className={cn(
          glassButton,
          'size-[84px] rounded-full border border-white/26 bg-white/12 backdrop-blur-[12px]'
        )}
        aria-label={playing ? 'Tạm dừng video' : 'Phát video'}
        onClick={() => setPlaying((current) => !current)}
      >
        {playing ? <Pause size={42} /> : <Play size={46} />}
      </button>
      <div className="absolute inset-x-[18px] bottom-[18px] grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-2.5 rounded-[14px] border border-white/16 bg-[rgba(6,10,20,0.72)] px-3 py-2.5 text-[#d9eff9] opacity-[0.92] backdrop-blur-[14px] max-[760px]:inset-x-2.5 max-[760px]:bottom-2.5 max-[760px]:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
        <button
          type="button"
          className={glassButton}
          aria-label={playing ? 'Tạm dừng' : 'Phát'}
          onClick={() => setPlaying((current) => !current)}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <span className="text-xs">
          {playing ? '03:24' : '00:00'} / {formatDuration(activity.duration)}
        </span>
        <Progress
          value={playing ? 22 : 0}
          className="h-[5px] bg-white/22 [&>div]:bg-sky [&>div]:bg-none"
          aria-label="Tiến trình video"
        />
        <Volume2 size={17} className="max-[760px]:hidden" />
        <button
          type="button"
          className={glassButton}
          aria-label="Phóng to video"
          onClick={toggleFullscreen}
        >
          <Expand size={17} />
        </button>
      </div>
    </div>
  )
}

export default VideoPlayer

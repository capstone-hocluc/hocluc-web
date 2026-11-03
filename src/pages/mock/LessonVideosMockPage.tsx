import { useState } from 'react'
import { cn } from '../../lib/cn'
import { studentRoutes } from '../../lib/studentRoutes'
import { ArrowLeft, CheckCircle2, ChevronRight, Circle, Play } from '../../components/console/icons'
import StudentLayout from '../../components/student/layout/StudentLayout'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Progress from '../../components/ui/Progress'

// Mockup only: one lesson with several videos, all data is local.
interface MockVideo {
  id: string
  title: string
  durationSeconds: number
  watchedSeconds: number
}

const MOCK_VIDEOS: MockVideo[] = [
  { id: 'v1', title: 'Giới thiệu bài học', durationSeconds: 372, watchedSeconds: 372 },
  { id: 'v2', title: 'Thiết kế bảng dữ liệu', durationSeconds: 765, watchedSeconds: 390 },
  { id: 'v3', title: 'Quan hệ giữa các bảng', durationSeconds: 618, watchedSeconds: 0 },
  { id: 'v4', title: 'Tổng kết và bài tập', durationSeconds: 284, watchedSeconds: 0 },
]

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const isDone = (video: MockVideo) => video.watchedSeconds >= video.durationSeconds

function LessonVideosMockPage() {
  const [videos, setVideos] = useState(MOCK_VIDEOS)
  const [selectedId, setSelectedId] = useState('v2')
  const selectedIndex = videos.findIndex((video) => video.id === selectedId)
  const selected = videos[selectedIndex]
  const next = videos[selectedIndex + 1]
  const doneCount = videos.filter(isDone).length
  const totalSeconds = videos.reduce((sum, video) => sum + video.durationSeconds, 0)
  const watchedSeconds = videos.reduce(
    (sum, video) => sum + Math.min(video.watchedSeconds, video.durationSeconds),
    0
  )
  const lessonPercent = Math.round((watchedSeconds / totalSeconds) * 100)
  const selectedPercent = Math.round((selected.watchedSeconds / selected.durationSeconds) * 100)

  const seek = (percent: number) =>
    setVideos((current) =>
      current.map((video) =>
        video.id === selected.id
          ? { ...video, watchedSeconds: Math.round((video.durationSeconds * percent) / 100) }
          : video
      )
    )

  return (
    <StudentLayout currentPath={studentRoutes.courses()} onNavigate={() => {}}>
      <StudentPageContainer width="wide" className="flex flex-col gap-4 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Chương 2
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-text-heading">
              {doneCount}/{videos.length} video · {lessonPercent}%
            </span>
            <Progress
              value={lessonPercent}
              size="sm"
              className="w-32"
              aria-label="Tiến độ bài học"
            />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-4 max-[1000px]:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-4">
            <h1 className="text-2xl leading-tight font-extrabold text-text-heading">
              Bài 3: Thiết kế cơ sở dữ liệu
            </h1>
            <div className="grid aspect-video place-items-center overflow-hidden rounded-2xl border border-line-card bg-[#0d1326] shadow-card">
              <div className="flex flex-col items-center gap-2 text-white">
                <span className="grid size-14 place-items-center rounded-full bg-primary">
                  <Play className="size-6" aria-hidden="true" />
                </span>
                <p className="text-base font-semibold">{selected.title}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-text-secondary">
                {formatTime(selected.watchedSeconds)} / {formatTime(selected.durationSeconds)}
              </p>
              <input
                type="range"
                min={0}
                max={100}
                value={selectedPercent}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label="Vị trí phát video"
                className="w-full accent-primary"
              />
            </div>
            <Card variant="panel" padding="lg" radius="xl">
              <h2 className="mb-1 text-base font-bold text-text-heading">Nội dung bài học</h2>
              <p className="text-sm leading-relaxed text-text-body">
                Cách thiết kế bảng, khóa chính, khóa ngoại và quan hệ giữa các bảng.
              </p>
            </Card>
          </div>

          <Card variant="panel" padding="lg" radius="xl" className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-text-heading">Video trong bài</h2>
            <ul className="flex flex-col gap-2">
              {videos.map((video, index) => {
                const done = isDone(video)
                const active = video.id === selectedId
                const percent = Math.round((video.watchedSeconds / video.durationSeconds) * 100)
                const Status = done ? CheckCircle2 : active ? Play : Circle
                return (
                  <li key={video.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(video.id)}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex w-full flex-col gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                        active
                          ? 'border-line-brand bg-primary-soft'
                          : 'border-line bg-surface hover:bg-surface-hover'
                      )}
                    >
                      <span className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2.5 text-sm font-bold text-text-heading">
                        <Status
                          className={cn(
                            'size-5',
                            done ? 'text-success' : active ? 'text-primary-text' : 'text-lock'
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {index + 1}. {video.title}
                        </span>
                        <span className="font-semibold text-text-secondary">
                          {formatTime(video.durationSeconds)}
                        </span>
                      </span>
                      <Progress value={percent} size="sm" tone={done ? 'success' : 'primary'} />
                    </button>
                  </li>
                )
              })}
            </ul>
            <Button disabled={!next} onClick={() => next && setSelectedId(next.id)}>
              Video tiếp theo
              <ChevronRight aria-hidden="true" />
            </Button>
          </Card>
        </div>
      </StudentPageContainer>
    </StudentLayout>
  )
}

export default LessonVideosMockPage

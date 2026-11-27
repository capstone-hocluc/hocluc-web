import { useEffect, useRef, useState } from 'react'
import LessonContent from '../../components/lesson/LessonContent'
import LessonInfoCard from '../../components/lesson/LessonInfoCard'
import LessonNavFooter from '../../components/lesson/LessonNavFooter'
import LessonWorkspaceNav from '../../components/lesson/LessonWorkspaceNav'
import CourseTutorMascot from '../../components/student/course/CourseTutorMascot'
import LessonQuizzes from '../../components/lesson/LessonQuizzes'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Skeleton from '../../components/ui/Skeleton'
import Button from '../../components/ui/Button'
import { ArrowLeft, BookOpen, X } from '../../components/console/icons'
import { usePageResource } from '../../hooks/usePageResource'
import { getLesson, updateLessonProgress, type LessonProgress } from '../../services/lessonService'
import { refreshCredits } from '../../lib/credits'
import { getErrorMessage } from '../../lib/errors'
import { showErrorToast, showSuccessToast } from '../../lib/toastBus'
import { bySequence } from '../../lib/sequence'
import styles from '../../components/lesson/LessonWorkspace.module.css'

interface LessonPageProps {
  courseId: string | null
  lessonId: string
  onBackToStudy: () => void
  onNavigateLesson: (lessonId: string, courseId?: string) => void
  onOpenQuiz: (quizId: string) => void
  onOpenTutor: () => void
}

function LessonPage({ courseId, lessonId, onBackToStudy, onNavigateLesson, onOpenQuiz, onOpenTutor }: LessonPageProps) {
  const [completing, setCompleting] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(() => window.innerWidth > 760)
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [switchingVideo, setSwitchingVideo] = useState(false)
  const activeVideoRef = useRef('')
  const watchedByVideoRef = useRef<Record<string, number>>({})

  const watchSecondsRef = useRef(0)
  const {
    data: lesson,
    setData: setLesson,
    status,
    errorMessage,
    reload,
  } = usePageResource(() => getLesson(lessonId), [lessonId], {
    onLoaded: (data) => {
      const videos = bySequence(data.videos ?? [])
      const initialVideo = videos.find(video => video.id === data.progress?.lastVideoId) ?? videos[0]
      activeVideoRef.current = data.contentType === 'VIDEO' ? initialVideo?.id ?? '' : ''
      setSelectedVideoId(activeVideoRef.current)
      watchedByVideoRef.current = Object.fromEntries((data.progress?.videos ?? []).map(video => [video.videoId, Math.max(0, video.watchedSeconds)]))
      watchSecondsRef.current = watchedByVideoRef.current[activeVideoRef.current] ?? (data.progress?.videos ? 0 : Math.max(0, data.progress?.watchDurationSeconds ?? 0))
    },
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const savingRef = useRef<Promise<LessonProgress | null> | null>(null)
  const leavingRef = useRef(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const clampWatchSeconds = () => {
    let seconds = Math.max(0, Math.floor(watchSecondsRef.current))
    const duration = lesson?.videos?.find(video => video.id === activeVideoRef.current)?.durationSeconds ?? lesson?.durationSeconds
    if (duration && duration > 0) {
      seconds = Math.min(seconds, duration)
    }
    return seconds
  }

  // A completion waits for any pending video checkpoint instead of being dropped.
  const saveProgress = async (completed: boolean) => {
    if (!lesson?.owned) return null
    const pending = savingRef.current
    const videoId = activeVideoRef.current
    const seconds = clampWatchSeconds()

    const saving = (async () => {
      const previous = await pending
      try {
        const updated = await updateLessonProgress(lesson.id, {
          completed,
          watchDurationSeconds: seconds,
          ...(videoId ? { videoId } : {}),
        })
        setLesson((prev) => (prev ? { ...prev, progress: updated } : prev))
        if (updated.status === 'COMPLETED' && (previous ?? lesson.progress)?.status !== 'COMPLETED') {
          void refreshCredits()
          if (lesson.quizzes.some((quiz) => quiz.locked)) {
            void getLesson(lesson.id)
              .then(({ quizzes }) => setLesson((prev) => (prev ? { ...prev, quizzes } : prev)))
              .catch(() => showErrorToast('Tiến độ đã lưu. Hãy tải lại trang để cập nhật trạng thái bài kiểm tra.'))
          }
        }
        return updated
      } catch (error) {
        showErrorToast(getErrorMessage(error))
        return null
      }
    })()
    savingRef.current = saving
    try {
      return await saving
    } finally {
      if (savingRef.current === saving) savingRef.current = null
    }
  }

  const handleTimeUpdate = () => {
    const current = videoRef.current?.currentTime ?? 0
    watchSecondsRef.current = Math.max(watchSecondsRef.current, Math.floor(current))
    if (activeVideoRef.current) watchedByVideoRef.current[activeVideoRef.current] = watchSecondsRef.current
  }

  const handlePause = () => {
    void saveProgress(false)
  }

  const handleMarkComplete = async () => {
    if (completing) return
    setCompleting(true)
    const updated = await saveProgress(true)
    setCompleting(false)
    if (updated) showSuccessToast('Đã đánh dấu hoàn thành bài học.')
  }

  const leaveLesson = async (navigate: () => void) => {
    if (leavingRef.current) return
    leavingRef.current = true
    await saveProgress(false)
    leavingRef.current = false
    if (mountedRef.current) navigate()
  }

  const selectVideo = async (id: string) => {
    if (id === activeVideoRef.current || leavingRef.current || completing || !lesson?.videos?.some(video => video.id === id)) return
    leavingRef.current = true
    setSwitchingVideo(true)
    videoRef.current?.pause()
    await saveProgress(false)
    if (mountedRef.current) {
      activeVideoRef.current = id
      watchSecondsRef.current = watchedByVideoRef.current[id] ?? 0
      setSelectedVideoId(id)
      setSwitchingVideo(false)
    }
    leavingRef.current = false
  }
  const navigateLesson = (id: string) => {
    if (id !== lesson?.id) void leaveLesson(() => onNavigateLesson(id, lesson?.sectionCourseId ?? courseId ?? undefined))
  }
  const isTextLesson = lesson?.contentType === 'TEXT' || lesson?.contentType === 'ARTICLE'

  return (
    <StudentPageContainer width="fluid" className={styles.page}>
      <ResourceState
        imageSrc="/mascot/03.png"
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-[260px] max-w-full" />
            <Skeleton className="h-[360px]" />
            <Skeleton className="h-[120px]" />
          </div>
        }
        forbidden={{
          title: 'Chưa thể truy cập bài học',
          message: 'Bạn chưa có quyền truy cập bài học này.',
          actionLabel: 'Quay lại khóa học',
          onAction: onBackToStudy,
        }}
        notFound={{
          title: 'Không tìm thấy bài học',
          message: 'Bài học này không tồn tại hoặc đã bị gỡ.',
          actionLabel: 'Quay lại khóa học',
          onAction: onBackToStudy,
        }}
        error={{ title: 'Không thể tải bài học' }}
      />

      {status === 'ready' && lesson && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.toolbarActions}>
            <Button size="sm" appearance="outline" onClick={() => void leaveLesson(onBackToStudy)}>
              <ArrowLeft size={16} />Khóa học
            </Button>
            <Button size="sm" appearance="outline" aria-expanded={navigationOpen} aria-controls="lesson-workspace-menu" onClick={() => setNavigationOpen(open => !open)}>
              {navigationOpen ? <X size={16} /> : <BookOpen size={16} />}{navigationOpen ? 'Ẩn danh sách bài học' : 'Hiện danh sách bài học'}
            </Button>
            </div>
            <LessonNavFooter previousLessonId={lesson.previousLessonId} nextLessonId={lesson.nextLessonId} onNavigate={navigateLesson} compact />
          </div>
          <div className={styles.workspace} data-collapsed={!navigationOpen || undefined}>
          {navigationOpen && <aside id="lesson-workspace-menu" className={styles.sidebar}>
            <LessonWorkspaceNav courseId={lesson.sectionCourseId ?? courseId ?? ''} lesson={lesson} activeVideoId={selectedVideoId}
              onSelectVideo={id => { void selectVideo(id) }} onNavigateLesson={navigateLesson} />
          </aside>}
          <div className={styles.viewer} data-reading={isTextLesson || undefined} data-tutor={lesson.owned || undefined} aria-busy={switchingVideo} role="region" aria-label="Nội dung bài học" tabIndex={0}>
          {!isTextLesson && <h1 className="text-xl font-bold text-text-heading">{lesson.title}</h1>}
          {switchingVideo && <p role="status" className="text-sm text-text-secondary">Đang lưu và chuyển video…</p>}
          <LessonContent
            lesson={lesson}
            videoRef={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onPause={handlePause}
            activeVideoId={selectedVideoId}
            onSelectVideo={id => { void selectVideo(id) }}
            hideVideoChooser={navigationOpen}
            textFooter={isTextLesson ? <LessonInfoCard lesson={lesson} completing={completing} onMarkComplete={handleMarkComplete} embedded /> : undefined}
          />
          {!isTextLesson && <LessonInfoCard
            compact
            lesson={lesson}
            completing={completing}
            onMarkComplete={handleMarkComplete}
          />}
          <LessonQuizzes quizzes={lesson.quizzes} onOpenQuiz={id => void leaveLesson(() => onOpenQuiz(id))} />
          </div>
          </div>
          {lesson.owned && <CourseTutorMascot onOpenTutor={() => void leaveLesson(onOpenTutor)} />}
        </>
      )}
    </StudentPageContainer>
  )
}

export default LessonPage

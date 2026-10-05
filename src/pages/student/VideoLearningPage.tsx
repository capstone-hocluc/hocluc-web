import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  findCourseActivity,
  getActivityRouteType,
  getAdjacentUnlockedActivities,
  getCourseActivityContexts,
} from '../../data/courseLookup'
import { usePageResource } from '../../hooks/usePageResource'
import { useTransientMessage } from '../../hooks/useTransientMessage'
import { cn } from '../../lib/cn'
import { getErrorMessage } from '../../lib/errors'
import { buildRealVideoSource } from '../../lib/studentViewModel'
import { getCourseStudy } from '../../services/courseService'
import { getLesson, updateLessonProgress } from '../../services/lessonService'
import MascotState from '../../components/common/MascotState'
import LessonContent from '../../components/lesson/LessonContent'
import StudentToast from '../../components/student/common/StudentToast'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import LessonDrawer from '../../components/student/video/LessonDrawer'
import LessonNavBar from '../../components/student/video/LessonNavBar'
import { TeacherAiButton, TeacherAiPanel } from '../../components/student/video/TeacherAi'
import { getMockAiResponse, type AiMessage } from '../../components/student/video/teacherAiMock'
import type { VideoActivity, VideoContext } from '../../components/student/video/types'
import VideoPlayer from '../../components/student/video/VideoPlayer'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { showErrorToast, showSuccessToast } from '../../lib/toastBus'

interface VideoLearningPageProps {
  courseId: string
  activityId: string
  onBackCourse: () => void
  onCourses: () => void
  onNavigateActivity: (courseId: string, routeType: string, activityId: string) => void
}

// Video lesson screen inside the Student shell: lesson nav bar, 16:9 player, Teacher AI
// chat (prototype) and the course lesson drawer. Prototype ids resolve from the mock
// course data; any other id is a real lesson, loaded from GET /lessons/{id}
// (+ /courses/{id}/study for the drawer and previous / next lesson).
function VideoLearningPage({
  courseId,
  activityId,
  onBackCourse,
  onCourses,
  onNavigateActivity,
}: VideoLearningPageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const { message, show: showMessage } = useTransientMessage(2400)
  const [input, setInput] = useState('')
  const [chat, setChat] = useState<{ activityId: string | null; messages: AiMessage[] }>({
    activityId: null,
    messages: [],
  })
  const watchSecondsRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const savingProgressRef = useRef(false)
  const [completing, setCompleting] = useState(false)

  const mockContext = findCourseActivity(courseId, activityId)
  const real = usePageResource(
    async () => {
      if (mockContext) return null
      const [lesson, study] = await Promise.all([getLesson(activityId), getCourseStudy(courseId)])
      return buildRealVideoSource(lesson, study)
    },
    [courseId, activityId],
    { forbidden: false, notFound: false }
  )
  const source = mockContext
    ? {
        context: mockContext,
        lessons: getCourseActivityContexts(courseId),
        adjacent: getAdjacentUnlockedActivities(courseId, activityId),
      }
    : real.data
  const context: VideoContext | null = source?.context ?? null
  const lessons = source?.lessons ?? []
  const adjacent = source?.adjacent ?? { previous: null, next: null }
  const realLesson = !mockContext && real.data?.lesson?.id === activityId ? real.data.lesson : null

  useEffect(() => {
    watchSecondsRef.current = Math.max(0, realLesson?.progress?.watchDurationSeconds ?? 0)
  }, [activityId, realLesson?.id, realLesson?.progress?.watchDurationSeconds])

  const saveRealLessonProgress = async (completed: boolean) => {
    if (!realLesson?.owned || savingProgressRef.current) return null
    savingProgressRef.current = true
    let watchDurationSeconds = Math.max(0, Math.floor(watchSecondsRef.current))
    if (realLesson.durationSeconds && realLesson.durationSeconds > 0) {
      watchDurationSeconds = Math.min(watchDurationSeconds, realLesson.durationSeconds)
    }
    try {
      const updated = await updateLessonProgress(realLesson.id, { completed, watchDurationSeconds })
      real.setData((current) =>
        current ? { ...current, lesson: { ...current.lesson, progress: updated } } : current
      )
      return updated
    } catch (error) {
      showErrorToast(getErrorMessage(error))
      return null
    } finally {
      savingProgressRef.current = false
    }
  }

  const handleTimeUpdate = () => {
    const current = videoRef.current?.currentTime ?? 0
    watchSecondsRef.current = Math.max(watchSecondsRef.current, Math.floor(current))
  }

  const completeLesson = async () => {
    if (mockContext) {
      showMessage('Tiến độ bài học đã được cập nhật mô phỏng.')
      return
    }
    if (!realLesson?.owned) {
      showMessage('Tiến độ của bài học xem trước không được lưu.')
      return
    }
    if (completing || savingProgressRef.current) return
    setCompleting(true)
    try {
      const updated = await saveRealLessonProgress(true)
      if (updated) showSuccessToast('Đã đánh dấu hoàn thành bài học.')
    } finally {
      setCompleting(false)
    }
  }

  useEffect(() => {
    const closeFloating = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false)
        setAiOpen(false)
      }
    }
    window.addEventListener('keydown', closeFloating)
    return () => window.removeEventListener('keydown', closeFloating)
  }, [])

  // The conversation belongs to one activity; opening another starts from the greeting again.
  const activityKey = context?.activity.id ?? null
  const messages: AiMessage[] =
    chat.activityId === activityKey
      ? chat.messages
      : context
        ? [
            {
              id: 'ai-initial',
              role: 'ai',
              text: `Chào bạn! Mình đang hỗ trợ bài "${context.activity.title}". Bạn muốn mình giải thích phần nào?`,
            },
          ]
        : []

  const navigateActivity = (activity: VideoActivity) => {
    const routeType = getActivityRouteType(activity)
    if (!routeType) {
      showMessage('Nội dung này đang được phát triển.')
      return false
    }
    if (realLesson) void saveRealLessonProgress(false)
    onNavigateActivity(courseId, routeType, activity.id)
    return true
  }

  const sendMessage = (event: FormEvent | null, forcedText?: string) => {
    event?.preventDefault()
    const text = (forcedText || input).trim()
    if (!text || !context) return

    setChat({
      activityId: activityKey,
      messages: [
        ...messages,
        { id: `user-${Date.now()}`, role: 'user', text },
        { id: `ai-${Date.now()}`, role: 'ai', text: getMockAiResponse(text, context.activity.title) },
      ],
    })
    setInput('')
  }

  if (!mockContext && real.status === 'loading') {
    return <Skeleton className="h-[520px] rounded-[18px]" />
  }

  if (!context || !['Video', 'Buổi giải đề'].includes(context.activity.type)) {
    return (
      <StudentPageContainer>
        <Card padding="lg" radius="xl">
          <MascotState
            title="Không tìm thấy video bài học"
            message="Nội dung này không tồn tại hoặc chưa được thêm vào."
            actionLabel="Quay lại khóa học"
            onAction={onBackCourse}
          />
        </Card>
      </StudentPageContainer>
    )
  }

  return (
    <section className="flex h-[calc(100vh-156px)] min-h-[520px] flex-col overflow-hidden rounded-[18px] border border-line-card bg-surface-brand text-text-heading max-[760px]:h-auto max-[760px]:min-h-[calc(100dvh-130px)]">
      <LessonNavBar
        context={context}
        previous={adjacent.previous}
        next={adjacent.next}
        onOpenDrawer={() => setDrawerOpen(true)}
        onCourses={() => {
          if (realLesson) void saveRealLessonProgress(false)
          onCourses()
        }}
        onNavigateActivity={navigateActivity}
        onComplete={() => void completeLesson()}
      />
      <div
        className={cn(
          'relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-surface-brand bg-[linear-gradient(rgba(190,216,255,0.34)_1px,transparent_1px),linear-gradient(90deg,rgba(190,216,255,0.34)_1px,transparent_1px),radial-gradient(circle_at_80%_10%,rgba(251,195,79,0.18),transparent_30%)] bg-[length:42px_42px,42px_42px,auto] p-[22px] max-[760px]:p-3',
          aiOpen &&
            'grid-cols-[minmax(0,1fr)_minmax(340px,390px)] gap-[18px] [place-items:center_stretch] max-[760px]:grid-cols-1'
        )}
      >
        {mockContext ? (
          <VideoPlayer activity={context.activity} />
        ) : realLesson ? (
          <div className="w-full max-w-[1280px]">
            <LessonContent
              lesson={realLesson}
              videoRef={videoRef}
              onTimeUpdate={handleTimeUpdate}
              onPause={() => void saveRealLessonProgress(false)}
            />
          </div>
        ) : null}
        {aiOpen ? (
          <TeacherAiPanel
            lessonTitle={context.activity.title}
            messages={messages}
            input={input}
            onInput={setInput}
            onClose={() => setAiOpen(false)}
            onSend={sendMessage}
            onQuickAction={(action) => sendMessage(null, action)}
          />
        ) : (
          <TeacherAiButton onOpen={() => setAiOpen(true)} />
        )}
      </div>
      <LessonDrawer
        open={drawerOpen}
        context={context}
        lessons={lessons}
        onClose={() => setDrawerOpen(false)}
        onLockedClick={showMessage}
        onNavigateActivity={navigateActivity}
      />
      <StudentToast message={message} />
    </section>
  )
}

export default VideoLearningPage

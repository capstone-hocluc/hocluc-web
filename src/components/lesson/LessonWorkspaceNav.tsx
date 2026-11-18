import { FileText, Play, RefreshCw } from '../console/icons'
import Button from '../ui/Button'
import Skeleton from '../ui/Skeleton'
import type { LessonDetail } from '../../services/lessonService'
import { getCourseStudy } from '../../services/courseService'
import { usePageResource } from '../../hooks/usePageResource'
import { bySequence } from '../../lib/sequence'
import { formatDuration } from '../../lib/courseFormat'
import styles from './LessonWorkspace.module.css'

function CurrentLessonIcon() {
  return <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor" /><path d="M8 7v6m4-6v6" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

function CompletedLessonIcon() {
  return <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true" className={styles.completedIcon}><circle cx="10" cy="10" r="9" fill="currentColor" /><path d="m6 10 2.5 2.5L14 7" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

interface LessonWorkspaceNavProps {
  courseId: string
  lesson: LessonDetail
  activeVideoId: string
  onSelectVideo: (videoId: string) => void
  onNavigateLesson: (lessonId: string) => void
}

function LessonWorkspaceNav({ courseId, lesson, activeVideoId, onSelectVideo, onNavigateLesson }: LessonWorkspaceNavProps) {
  const { data: study, status, reload } = usePageResource(() => getCourseStudy(courseId), [courseId])
  const seen = new Set<string>()
  const chapters = study ? bySequence(study.phases).flatMap(phase => bySequence(phase.sections))
    .flatMap(section => bySequence(section.chapters)).filter(chapter => {
      if (seen.has(chapter.id)) return false
      seen.add(chapter.id)
      return true
    }) : []
  const videos = bySequence(lesson.videos ?? [])
  const renderVideos = () => videos.length > 1 && (
    <div className={styles.videos} role="group" aria-label="Các video trong bài">
      {videos.map((video, index) => {
        const done = lesson.progress?.videos?.find(progress => progress.videoId === video.id)?.completed
        return <button key={video.id} type="button" aria-current={activeVideoId === video.id ? 'true' : undefined}
          onClick={() => onSelectVideo(video.id)} className={styles.videoItem}>
          {activeVideoId === video.id ? <CurrentLessonIcon /> : done ? <CompletedLessonIcon /> : <Play size={15} />}
          <span>{video.title || `Video ${index + 1}`}{video.durationSeconds != null && <small>{formatDuration(video.durationSeconds)}</small>}</span>
        </button>
      })}
    </div>
  )

  return <nav aria-label="Danh sách nội dung học" className={styles.navigation}>
    <div className={styles.navHeading}><strong>{lesson.sectionCourseTitle || 'Nội dung học'}</strong></div>
    {status === 'loading' && <div className="space-y-2 p-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}
    {status !== 'ready' && status !== 'loading' && <div className={styles.navNotice}>
      <p>{status === 'forbidden' ? 'Chưa có quyền xem danh sách bài học.' : 'Chưa tải được danh sách bài học. Bạn vẫn có thể xem nội dung đang mở.'}</p>
      <Button size="sm" appearance="outline" onClick={reload}><RefreshCw size={14} />Thử lại danh sách</Button>
    </div>}
    {status === 'ready' && chapters.map(chapter => <section key={chapter.id} className={styles.chapter}>
      <h2>{chapter.title}<span>{Math.min(chapter.lessonCount, chapter.completedLessonCount + (
        lesson.progress?.status === 'COMPLETED' && chapter.lessons.some(item => item.id === lesson.id && item.status !== 'COMPLETED') ? 1 : 0
      ))}/{chapter.lessonCount}</span></h2>
      <ul>{bySequence(chapter.lessons).map(item => {
        const current = item.id === lesson.id
        const done = current ? lesson.progress?.status === 'COMPLETED' : item.status === 'COMPLETED'
        return <li key={item.id}>
          <button type="button" className={styles.lessonItem} aria-current={current ? 'page' : undefined} data-completed={done || undefined}
            onClick={() => { if (!current) onNavigateLesson(item.id) }}>
            {current ? <CurrentLessonIcon /> : done ? <CompletedLessonIcon /> : item.contentType === 'VIDEO' ? <Play size={17} /> : <FileText size={17} />}
            <span>{item.title}<small>{done ? 'Đã hoàn thành' : current ? 'Đang xem' : item.status === 'IN_PROGRESS' ? 'Đang học' : 'Chưa học'}</small></span>
          </button>
          {current && renderVideos()}
        </li>
      })}</ul>
    </section>)}
    {(!chapters.some(chapter => chapter.lessons.some(item => item.id === lesson.id))) && <div className={styles.chapter}>
      <button type="button" className={styles.lessonItem} aria-current="page"><CurrentLessonIcon /><span>{lesson.title}<small>Đang xem</small></span></button>
      {renderVideos()}
    </div>}
  </nav>
}

export default LessonWorkspaceNav

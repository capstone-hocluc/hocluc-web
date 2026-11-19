import { useState, type FormEvent } from 'react'
import { usePageResource } from '../../../hooks/usePageResource'
import { getErrorMessage } from '../../../lib/errors'
import { COURSE_QUIZ_TYPES, quizTypeLabel } from '../../../lib/quiz-types'
import { roleHome } from '../../../lib/role-home'
import {
  exportAiDraftToQuiz,
  type AiExportedQuiz,
  type AiQuizTarget,
} from '../../../services/aiAssistantService'
import { getQuizChapterLessons, getQuizCourseChapters, getQuizCourses } from '../../../services/quizCourseService'
import type { UserRole } from '../../../services/userService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import DropdownField from '../../console/dropdown-field'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import SelectField from '../../console/select-field'
import Status from '../../console/status'
import { Skeleton } from '../../tailgrids/core/skeleton'

const TARGETS: { id: AiQuizTarget; label: string }[] = [
  { id: 'EXAM', label: quizTypeLabel('EXAM') },
  ...COURSE_QUIZ_TYPES,
]

const isTarget = (value: string): value is AiQuizTarget => TARGETS.some((target) => target.id === value)

interface ExportQuizDialogProps {
  conversationId: string
  /** The exam's name, the quiz's title unless changed. */
  title: string
  /** The written questions the exam keeps: what the quiz takes. */
  questionCount: number
  /** How many of those the check could not confirm; the quiz keeps them flagged. */
  reviewCount?: number
  numberOf: Map<string, number>
  role: UserRole | null
  onClose: () => void
  /** The quiz was made: a mock exam or a course quiz. */
  onExported?: (as: 'EXAM' | 'QUIZ') => void
}

function loadError(status: string, message: string, what: string) {
  if (status === 'forbidden') return `Bạn không có quyền xem ${what}.`
  if (status === 'not-found') return `Không tìm thấy ${what}.`
  return message || `Không thể tải ${what}.`
}

const failed = (status: string) => status === 'error' || status === 'forbidden' || status === 'not-found'

/**
 * "Xuất thành quiz": the exam's written questions become a draft quiz of a course (a mock exam) or of a chapter or
 * lesson, opened in the quiz editor to check and publish.
 */
export default function ExportQuizDialog({
  conversationId,
  title,
  questionCount,
  reviewCount = 0,
  numberOf,
  role,
  onClose,
  onExported,
}: ExportQuizDialogProps) {
  const [type, setType] = useState<AiQuizTarget>('EXAM')
  const [courseId, setCourseId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [name, setName] = useState(title)
  const [minutes, setMinutes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AiExportedQuiz | null>(null)

  const exam = type === 'EXAM'
  const needsLesson = type === 'LESSON' || type === 'QUICK'
  // A mock exam hangs on a main course; a chapter or lesson quiz on any course the viewer manages.
  const courses = usePageResource(() => getQuizCourses(exam ? 'MAIN' : undefined), [exam])
  const course = usePageResource(
    () => (courseId && !exam ? getQuizCourseChapters(courseId) : Promise.resolve(null)),
    [courseId, exam]
  )
  const chapters = course.status === 'ready' && course.data?.id === courseId ? course.data.chapters : []
  const lessons = usePageResource(
    () => (chapterId && needsLesson ? getQuizChapterLessons(chapterId) : Promise.resolve(null)),
    [chapterId, needsLesson]
  )
  const lessonOptions = lessons.status === 'ready' && lessons.data?.chapterId === chapterId ? lessons.data.lessons : []

  const minutesValue = minutes.trim() ? Number(minutes) : undefined
  const minutesInvalid =
    minutesValue !== undefined && (!Number.isInteger(minutesValue) || minutesValue < 1 || minutesValue > 600)
  const targetChosen = exam ? Boolean(courseId) : needsLesson ? Boolean(lessonId) : Boolean(chapterId)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!targetChosen || minutesInvalid || busy) return
    setBusy(true)
    setError('')
    try {
      setResult(
        await exportAiDraftToQuiz(conversationId, {
          type,
          ...(exam ? { courseId } : needsLesson ? { lessonId } : { chapterId }),
          title: name.trim() || undefined,
          durationMinutes: minutesValue,
        })
      )
      onExported?.(exam ? 'EXAM' : 'QUIZ')
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    const editor = role
      ? roleHome(role).replace('/dashboard', `/${result.type === 'EXAM' ? 'mock-exams' : 'quizzes'}/${result.quizId}/edit`)
      : null
    return (
      <ConsoleDialog
        open
        onClose={onClose}
        title="Đã xuất thành quiz"
        maxWidth={560}
        footer={
          <>
            <Button appearance="outline" onClick={onClose}>
              Đóng
            </Button>
            {editor && (
              <Button asChild>
                <a href={editor} target="_blank" rel="noreferrer">
                  Mở quiz
                </a>
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-text-primary">
          <p className="m-0">
            {quizTypeLabel(result.type)} “{result.title}” đã được tạo ở dạng nháp với {result.questionCount} câu.
          </p>
          {result.skipped.length > 0 && (
            <>
              <Status tone="warning">{result.skipped.length} câu không đưa vào</Status>
              <ul className="m-0 flex flex-col gap-1 p-0 text-text-secondary">
                {result.skipped.map((skipped) => (
                  <li key={skipped.itemId} className="list-none">
                    <strong className="text-text-primary">Câu {numberOf.get(skipped.itemId) ?? '?'}:</strong>{' '}
                    {skipped.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </ConsoleDialog>
    )
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title="Xuất thành quiz"
      maxWidth={600}
      dismissable={!busy}
      onSubmit={(event) => void submit(event)}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button type="submit" disabled={!targetChosen || minutesInvalid || busy}>
            {busy ? 'Đang xuất…' : `Xuất ${questionCount} câu`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Notice tone="danger">{error}</Notice>}
        {reviewCount > 0 && (
          <Notice tone="warning">{reviewCount} câu cần kiểm tra lại; quiz được tạo ở dạng nháp.</Notice>
        )}
        <Field label="Loại bài kiểm tra">
          <SelectField
            ariaLabel="Loại bài kiểm tra"
            options={TARGETS}
            value={type}
            disabled={busy}
            onChange={(value) => {
              if (!isTarget(value)) return
              setType(value)
              setCourseId('')
              setChapterId('')
              setLessonId('')
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Khóa học">
            {courses.status === 'loading' ? (
              <FieldSkeleton what="khóa học" />
            ) : (
              <DropdownField
                ariaLabel="Khóa học"
                placeholder="Chọn khóa học"
                options={(courses.data ?? []).map((item) => ({ id: item.id, label: item.title }))}
                value={courseId || null}
                isSearchable
                isError={failed(courses.status)}
                errorMessage={loadError(courses.status, courses.errorMessage, 'danh sách khóa học')}
                emptyMessage="Không có khóa học khả dụng."
                isDisabled={busy}
                onChange={(value) => {
                  setCourseId(value ?? '')
                  setChapterId('')
                  setLessonId('')
                }}
              />
            )}
          </Field>
          {!exam && (
            <Field label="Chương">
              {courseId && course.status === 'loading' ? (
                <FieldSkeleton what="chương" />
              ) : (
                <DropdownField
                  ariaLabel="Chương"
                  placeholder="Chọn chương"
                  options={chapters.map((chapter) => ({ id: chapter.id, label: chapter.title }))}
                  value={chapterId || null}
                  isSearchable
                  isError={Boolean(courseId) && failed(course.status)}
                  errorMessage={loadError(course.status, course.errorMessage, 'chương')}
                  emptyMessage="Khóa học chưa có chương."
                  isDisabled={!courseId || busy}
                  onChange={(value) => {
                    setChapterId(value ?? '')
                    setLessonId('')
                  }}
                />
              )}
            </Field>
          )}
          {needsLesson && (
            <Field label="Bài học">
              {chapterId && lessons.status === 'loading' ? (
                <FieldSkeleton what="bài học" />
              ) : (
                <DropdownField
                  ariaLabel="Bài học"
                  placeholder="Chọn bài học"
                  options={lessonOptions.map((lesson) => ({ id: lesson.id, label: lesson.title }))}
                  value={lessonId || null}
                  isSearchable
                  isError={Boolean(chapterId) && failed(lessons.status)}
                  errorMessage={loadError(lessons.status, lessons.errorMessage, 'bài học')}
                  emptyMessage="Chương chưa có bài học."
                  isDisabled={!chapterId || busy}
                  onChange={(value) => setLessonId(value ?? '')}
                />
              )}
            </Field>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label="Tên quiz">
            <input
              className={fieldControlClass}
              value={name}
              maxLength={500}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Thời gian (phút)">
            <input
              className={fieldControlClass}
              inputMode="numeric"
              value={minutes}
              placeholder="Theo số câu"
              aria-invalid={minutesInvalid || undefined}
              disabled={busy}
              onChange={(event) => setMinutes(event.target.value.replace(/[^\d]/g, ''))}
            />
          </Field>
        </div>
      </div>
    </ConsoleDialog>
  )
}

/** A select's place while its choices load: the field's own height and width. */
function FieldSkeleton({ what }: { what: string }) {
  return <Skeleton className="h-10 w-full rounded-lg" role="status" aria-label={`Đang tải ${what}`} />
}

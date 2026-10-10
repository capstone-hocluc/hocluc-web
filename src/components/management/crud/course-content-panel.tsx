import { useState, type ReactNode } from 'react'
import Panel from '../../console/panel'
import Button from '../../console/button'
import Status from '../../console/status'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus } from '../../console/icons'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import {
  deleteAdminChapter,
  getAdminChapters,
  orderAdminChapters,
  publishAdminChapter,
  type ChapterAdmin,
} from '../../../services/chapterAdminService'
import {
  LESSON_CONTENT_TYPES,
  deleteAdminLesson,
  getAdminLessons,
  orderAdminLessons,
  setAdminLessonState,
  type LessonAdmin,
} from '../../../services/lessonAdminService'
import { crudError, unknownMutation } from './crud-errors'
import { movedIds } from './course-labels'
import ChapterEditorDialog from './chapter-editor-dialog'
import LessonEditorDialog from './lesson-editor-dialog'

interface Props {
  courseId: string
  readOnly?: boolean
  title?: string
  /** Extra per-chapter action rendered next to the authoring controls. */
  chapterAction?: (chapter: ChapterAdmin) => ReactNode
}

interface Removal {
  label: string
  run: () => Promise<unknown>
  reload: () => void | Promise<void>
}

const lessonMeta = (lesson: LessonAdmin) => {
  const type = LESSON_CONTENT_TYPES.find((item) => item.id === lesson.contentType)?.label ?? lesson.contentType
  const duration = lesson.durationSeconds
    ? lesson.durationSeconds < 60
      ? ` · ${lesson.durationSeconds} giây`
      : ` · ${Math.round(lesson.durationSeconds / 60)} phút`
    : ''
  return `Bài ${lesson.sequence} · ${type}${duration}`
}

export default function CourseContentPanel({
  courseId,
  readOnly = false,
  title = 'Nội dung khóa học',
  chapterAction,
}: Props) {
  const resource = useScheduleResource(`course-content:${courseId}`, () => getAdminChapters(courseId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [removal, setRemoval] = useState<Removal | null>(null)
  const [chapterEditor, setChapterEditor] = useState<{ chapter: ChapterAdmin | null } | null>(null)
  const [lessonEditor, setLessonEditor] = useState<{ chapterId: string; lesson: LessonAdmin | null } | null>(null)
  const [openChapter, setOpenChapter] = useState<string | null>(null)
  const [lessons, setLessons] = useState<Record<string, LessonAdmin[]>>({})
  const [lessonsBusy, setLessonsBusy] = useState(false)

  const chapters = resource.data ?? []

  async function act(action: () => Promise<unknown>, success: string, reload: () => void | Promise<void>) {
    if (busy) return false
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(success)
      await reload()
      return true
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        setNotice('Chưa rõ kết quả thao tác. Đã yêu cầu tải lại để kiểm tra.')
        await reload()
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  const reloadChapters = () => resource.reload()

  async function loadLessons(chapterId: string) {
    setLessonsBusy(true)
    setError('')
    try {
      const rows = await getAdminLessons(chapterId)
      setLessons((prev) => ({ ...prev, [chapterId]: rows }))
    } catch (err) {
      setError(crudError(err))
    } finally {
      setLessonsBusy(false)
    }
  }

  const reloadLessons = (chapterId: string) => () => loadLessons(chapterId)

  async function toggleChapter(chapter: ChapterAdmin) {
    if (openChapter === chapter.id) {
      setOpenChapter(null)
      return
    }
    setOpenChapter(chapter.id)
    if (!lessons[chapter.id]) await loadLessons(chapter.id)
  }

  return (
    <Panel
      title={title}
      action={
        !readOnly && (
          <Button
            size="sm"
            appearance="outline"
            disabled={busy}
            onClick={() => setChapterEditor({ chapter: null })}
          >
            <Plus size={14} />
            Thêm chương
          </Button>
        )
      }
    >
      {notice && (
        <Notice tone="info">
          <span role="status">{notice}</span>
        </Notice>
      )}
      {error && (
        <Notice tone="danger">
          <span role="alert">{error}</span>
        </Notice>
      )}
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
        empty={resource.status === 'ready' && chapters.length === 0}
        emptyMessage="Khóa học chưa có chương nào."
      >
        <ol className="divide-y divide-card-border">
          {chapters.map((chapter, index) => (
            <li key={chapter.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Button
                    size="icon"
                    appearance="ghost"
                    aria-label={openChapter === chapter.id ? `Thu gọn ${chapter.title}` : `Mở ${chapter.title}`}
                    disabled={lessonsBusy}
                    onClick={() => void toggleChapter(chapter)}
                  >
                    {openChapter === chapter.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </Button>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-text-primary">{chapter.title}</h3>
                    <p className="text-xs text-text-tertiary">Thứ tự {chapter.sequence}</p>
                  </div>
                  <Status tone={chapter.published ? 'success' : 'neutral'}>
                    {chapter.published ? 'Đã xuất bản' : 'Nháp'}
                  </Status>
                </div>
                {!readOnly && (
                  <div className="flex flex-wrap gap-1">
                    {chapterAction?.(chapter)}
                    <Button
                      size="icon"
                      appearance="ghost"
                      aria-label={`Đưa ${chapter.title} lên`}
                      disabled={busy || index === 0}
                      onClick={() =>
                        void act(
                          () =>
                            orderAdminChapters(
                              courseId,
                              movedIds(
                                chapters.map((item) => item.id),
                                index,
                                -1
                              )
                            ),
                          'Đã đổi thứ tự chương.',
                          reloadChapters
                        )
                      }
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      size="icon"
                      appearance="ghost"
                      aria-label={`Đưa ${chapter.title} xuống`}
                      disabled={busy || index === chapters.length - 1}
                      onClick={() =>
                        void act(
                          () =>
                            orderAdminChapters(
                              courseId,
                              movedIds(
                                chapters.map((item) => item.id),
                                index,
                                1
                              )
                            ),
                          'Đã đổi thứ tự chương.',
                          reloadChapters
                        )
                      }
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button
                      size="sm"
                      appearance="outline"
                      aria-label={`Sửa chương ${chapter.title}`}
                      disabled={busy}
                      onClick={() => setChapterEditor({ chapter })}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      appearance="ghost"
                      aria-label={
                        chapter.published ? `Ẩn chương ${chapter.title}` : `Xuất bản chương ${chapter.title}`
                      }
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () => publishAdminChapter(chapter, !chapter.published),
                          chapter.published ? 'Đã ẩn chương.' : 'Đã xuất bản chương.',
                          reloadChapters
                        )
                      }
                    >
                      {chapter.published ? 'Ẩn' : 'Xuất bản'}
                    </Button>
                    <Button
                      size="sm"
                      appearance="ghost"
                      variant="danger"
                      aria-label={`Xóa chương ${chapter.title}`}
                      disabled={busy}
                      onClick={() =>
                        setRemoval({
                          label: `Chương "${chapter.title}"`,
                          run: () => deleteAdminChapter(courseId, chapter.id),
                          reload: reloadChapters,
                        })
                      }
                    >
                      Xóa
                    </Button>
                  </div>
                )}
              </div>
              {openChapter === chapter.id && (
                <div className="mt-3 rounded-lg border border-card-border bg-background-gray-secondary p-3">
                  {!readOnly && (
                    <div className="mb-2 flex justify-end">
                      <Button
                        size="sm"
                        appearance="outline"
                        disabled={busy}
                        onClick={() => setLessonEditor({ chapterId: chapter.id, lesson: null })}
                      >
                        <Plus size={14} />
                        Thêm bài học
                      </Button>
                    </div>
                  )}
                  {lessonsBusy && !lessons[chapter.id] ? (
                    <p className="text-sm text-text-tertiary">Đang tải bài học…</p>
                  ) : (lessons[chapter.id] ?? []).length === 0 ? (
                    <p className="text-sm text-text-tertiary">Chương chưa có bài học.</p>
                  ) : (
                    <ul className="divide-y divide-card-border">
                      {(lessons[chapter.id] ?? []).map((lesson, lessonIndex) => (
                        <li
                          key={lesson.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">{lesson.title}</p>
                            <p className="text-xs text-text-tertiary">{lessonMeta(lesson)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <Status tone={lesson.published ? 'success' : 'neutral'}>
                              {lesson.published ? 'Đã xuất bản' : 'Nháp'}
                            </Status>
                            {lesson.preview && (
                              <span className="rounded-full border border-card-border px-2 py-0.5 text-xs text-text-tertiary">
                                Xem trước
                              </span>
                            )}
                            {!readOnly && (
                              <>
                                <Button
                                  size="icon"
                                  appearance="ghost"
                                  aria-label={`Đưa ${lesson.title} lên`}
                                  disabled={busy || lessonIndex === 0}
                                  onClick={() =>
                                    void act(
                                      () =>
                                        orderAdminLessons(
                                          chapter.id,
                                          movedIds(
                                            (lessons[chapter.id] ?? []).map((item) => item.id),
                                            lessonIndex,
                                            -1
                                          )
                                        ),
                                      'Đã đổi thứ tự bài học.',
                                      reloadLessons(chapter.id)
                                    )
                                  }
                                >
                                  <ArrowUp size={16} />
                                </Button>
                                <Button
                                  size="icon"
                                  appearance="ghost"
                                  aria-label={`Đưa ${lesson.title} xuống`}
                                  disabled={busy || lessonIndex === (lessons[chapter.id] ?? []).length - 1}
                                  onClick={() =>
                                    void act(
                                      () =>
                                        orderAdminLessons(
                                          chapter.id,
                                          movedIds(
                                            (lessons[chapter.id] ?? []).map((item) => item.id),
                                            lessonIndex,
                                            1
                                          )
                                        ),
                                      'Đã đổi thứ tự bài học.',
                                      reloadLessons(chapter.id)
                                    )
                                  }
                                >
                                  <ArrowDown size={16} />
                                </Button>
                                <Button
                                  size="sm"
                                  appearance="outline"
                                  aria-label={`Sửa bài học ${lesson.title}`}
                                  disabled={busy}
                                  onClick={() => setLessonEditor({ chapterId: chapter.id, lesson })}
                                >
                                  Sửa
                                </Button>
                                <Button
                                  size="sm"
                                  appearance="ghost"
                                  aria-label={
                                    lesson.published ? `Ẩn bài học ${lesson.title}` : `Xuất bản bài học ${lesson.title}`
                                  }
                                  disabled={busy}
                                  onClick={() =>
                                    void act(
                                      () =>
                                        setAdminLessonState(lesson, {
                                          published: !lesson.published,
                                          preview: lesson.preview,
                                        }),
                                      lesson.published ? 'Đã ẩn bài học.' : 'Đã xuất bản bài học.',
                                      reloadLessons(chapter.id)
                                    )
                                  }
                                >
                                  {lesson.published ? 'Ẩn' : 'Xuất bản'}
                                </Button>
                                <Button
                                  size="sm"
                                  appearance="ghost"
                                  aria-label={
                                    lesson.preview ? `Tắt xem trước ${lesson.title}` : `Bật xem trước ${lesson.title}`
                                  }
                                  disabled={busy}
                                  onClick={() =>
                                    void act(
                                      () =>
                                        setAdminLessonState(lesson, {
                                          published: lesson.published,
                                          preview: !lesson.preview,
                                        }),
                                      lesson.preview ? 'Đã tắt xem trước.' : 'Đã bật xem trước.',
                                      reloadLessons(chapter.id)
                                    )
                                  }
                                >
                                  {lesson.preview ? 'Tắt xem trước' : 'Xem trước'}
                                </Button>
                                <Button
                                  size="sm"
                                  appearance="ghost"
                                  variant="danger"
                                  aria-label={`Xóa bài học ${lesson.title}`}
                                  disabled={busy}
                                  onClick={() =>
                                    setRemoval({
                                      label: `Bài học "${lesson.title}"`,
                                      run: () => deleteAdminLesson(chapter.id, lesson.id),
                                      reload: reloadLessons(chapter.id),
                                    })
                                  }
                                >
                                  Xóa
                                </Button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </ScheduleResourceState>
      {chapterEditor && (
        <ChapterEditorDialog
          courseId={courseId}
          chapter={chapterEditor.chapter}
          onClose={() => setChapterEditor(null)}
          onSaved={() => {
            setChapterEditor(null)
            setNotice('Đã lưu chương.')
            void resource.reload()
          }}
        />
      )}
      {lessonEditor && (
        <LessonEditorDialog
          chapterId={lessonEditor.chapterId}
          lesson={lessonEditor.lesson}
          onClose={() => setLessonEditor(null)}
          onSaved={() => {
            const chapterId = lessonEditor.chapterId
            setLessonEditor(null)
            setNotice('Đã lưu bài học.')
            void loadLessons(chapterId)
          }}
        />
      )}
      {removal && (
        <ConfirmDialog
          title="Xóa khỏi nội dung?"
          description={
            <>
              {removal.label}. Backend sẽ chặn nếu còn dữ liệu tham chiếu.
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel="Xác nhận xóa"
          variant="danger"
          busy={busy}
          onCancel={() => setRemoval(null)}
          onConfirm={async () => {
            const target = removal
            if (await act(target.run, 'Đã xóa.', target.reload)) setRemoval(null)
          }}
        />
      )}
    </Panel>
  )
}

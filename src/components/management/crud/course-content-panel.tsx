import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import Panel from '../../console/panel'
import Button from '../../console/button'
import Status from '../../console/status'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import {
  ChevronDown,
  ChevronRight,
  EyeOff,
  Pencil,
  PlayCircle,
  Plus,
  Send,
  Trash2,
} from '../../console/icons'
import { IconAction } from '../../console/icon-action'
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
import type { ContentSection } from '../../../services/contentSectionService'
import { ApiError } from '../../../lib/api'
import { crudError, unknownMutation } from './crud-errors'
import DragHandle from './drag-handle'
import { arrayMove, useDragReorder } from './use-drag-reorder'
import ChapterEditorDialog from './chapter-editor-dialog'
import LessonEditorDialog from './lesson-editor-dialog'

interface Props {
  courseId: string
  readOnly?: boolean
  title?: string
  /** Extra per-chapter action rendered next to the authoring controls. */
  chapterAction?: (chapter: ChapterAdmin) => ReactNode
  /** The course's content sections; chapters are grouped under them when there are any. */
  sections?: ContentSection[]
  /** Called whenever the chapter list is (re)loaded, so the screen can judge readiness. */
  onChapters?: (chapters: ChapterAdmin[]) => void
  /** Called after a change that may alter section counts or readiness. */
  onChange?: () => void
}

interface ChapterGroup {
  key: string
  section: ContentSection | null
  chapters: ChapterAdmin[]
}

interface Removal {
  label: string
  run: () => Promise<unknown>
  reload: () => void | Promise<void>
}

const lessonMeta = (lesson: LessonAdmin) => {
  const type =
    LESSON_CONTENT_TYPES.find((item) => item.id === lesson.contentType)?.label ?? lesson.contentType
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
  sections = [],
  onChapters,
  onChange,
}: Props) {
  const resource = useScheduleResource(`course-content:${courseId}`, () =>
    getAdminChapters(courseId)
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [removal, setRemoval] = useState<Removal | null>(null)
  const [chapterEditor, setChapterEditor] = useState<{
    chapter: ChapterAdmin | null
    sectionId?: string | null
  } | null>(null)
  const [lessonEditor, setLessonEditor] = useState<{
    chapterId: string
    lesson: LessonAdmin | null
  } | null>(null)
  const [openChapter, setOpenChapter] = useState<string | null>(null)
  const [lessons, setLessons] = useState<Record<string, LessonAdmin[]>>({})
  const [lessonsBusy, setLessonsBusy] = useState(false)
  const [quickPublishOpen, setQuickPublishOpen] = useState(false)

  const chapters = useMemo(() => resource.data ?? [], [resource.data])
  useEffect(() => {
    if (resource.status === 'ready') onChapters?.(chapters)
  }, [resource.status, chapters, onChapters])

  // With sections the chapters are shown under them; chapters not in any section come last.
  const groups = useMemo<ChapterGroup[]>(() => {
    if (!sections.length) return [{ key: 'all', section: null, chapters }]
    const known = new Set(sections.map((section) => section.id))
    const grouped: ChapterGroup[] = sections.map((section) => ({
      key: section.id,
      section,
      chapters: chapters.filter((chapter) => chapter.sectionId === section.id),
    }))
    const loose = chapters.filter((chapter) => !chapter.sectionId || !known.has(chapter.sectionId))
    return loose.length ? [...grouped, { key: 'none', section: null, chapters: loose }] : grouped
  }, [chapters, sections])

  async function act(
    action: () => Promise<unknown>,
    success: string,
    reload: () => void | Promise<void>
  ) {
    if (busy) return false
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(success)
      await reload()
      // A lesson change moves its chapter's version too; without this the next chapter action is rejected as stale.
      if (reload !== reloadChapters) await resource.reload()
      onChange?.()
      return true
    } catch (err) {
      setError(crudError(err))
      if (unknownMutation(err)) {
        setNotice('Chưa rõ kết quả thao tác. Đã yêu cầu tải lại để kiểm tra.')
        await reload()
      } else if (err instanceof ApiError && err.status === 409) {
        await resource.reload()
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

  async function quickPublishContent() {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')

    let mutationStarted = false
    let currentChapterId: string | undefined
    let publishedLessons = 0
    let publishedChapters = 0
    const skipped: string[] = []

    try {
      const currentChapters = await getAdminChapters(courseId)
      for (const chapter of currentChapters) {
        currentChapterId = chapter.id
        let currentLessons = await getAdminLessons(chapter.id)
        let hasPublishedLesson = currentLessons.some((lesson) => lesson.published)

        for (const lesson of currentLessons) {
          if (lesson.published) continue
          try {
            mutationStarted = true
            const updated = await setAdminLessonState(lesson, {
              published: true,
              preview: lesson.preview,
            })
            currentLessons = currentLessons.map((item) =>
              item.id === updated.id ? updated : item
            )
            hasPublishedLesson = true
            publishedLessons += 1
            setLessons((previous) => ({ ...previous, [chapter.id]: currentLessons }))
          } catch (reason) {
            if (!(reason instanceof ApiError) || reason.status !== 409) throw reason
            skipped.push(`Bài học "${lesson.title}": ${crudError(reason)}`)
          }
        }

        setLessons((previous) => ({ ...previous, [chapter.id]: currentLessons }))
        if (chapter.published) continue
        if (!hasPublishedLesson) {
          skipped.push(`Chương "${chapter.title}": chưa có bài học đủ điều kiện để xuất bản.`)
          continue
        }

        try {
          // Publishing lessons changes the chapter timestamp; use a fresh version for this update.
          const refreshedChapters = await getAdminChapters(courseId)
          const currentChapter = refreshedChapters.find((item) => item.id === chapter.id)
          if (!currentChapter) throw new Error(`Không tìm thấy chương "${chapter.title}".`)
          if (currentChapter.published) continue
          mutationStarted = true
          await publishAdminChapter(currentChapter, true)
          publishedChapters += 1
        } catch (reason) {
          if (!(reason instanceof ApiError) || reason.status !== 409) throw reason
          skipped.push(`Chương "${chapter.title}": ${crudError(reason)}`)
        }
      }

      await resource.reload()
      if (publishedLessons || publishedChapters) onChange?.()
      setNotice(
        publishedLessons || publishedChapters
          ? `Đã xuất bản ${publishedLessons} bài học và ${publishedChapters} chương.`
          : skipped.length
            ? 'Không có nội dung nào được xuất bản.'
            : 'Các chương và bài học đã được xuất bản hết.'
      )
      if (skipped.length) {
        const visible = skipped.slice(0, 5)
        if (skipped.length > visible.length) visible.push(`Và ${skipped.length - visible.length} mục khác.`)
        setError(`Một số mục chưa xuất bản được: ${visible.join(' ')}`)
      }
    } catch (reason) {
      setError(crudError(reason))
      if (currentChapterId) {
        try {
          const currentLessons = await getAdminLessons(currentChapterId)
          setLessons((previous) => ({ ...previous, [currentChapterId!]: currentLessons }))
        } catch {
          // Keep the last known rows if a refresh also fails.
        }
      }
      await resource.reload()
      if (mutationStarted) {
        setNotice('Đã tải lại trạng thái. Một số mục có thể đã được xuất bản trước khi thao tác dừng.')
      }
    } finally {
      setBusy(false)
      setQuickPublishOpen(false)
    }
  }

  // Chapters reorder inside their own group; the full chapter order is rebuilt with the group's new order.
  const groupHolding = (...ids: string[]) =>
    groups.find((group) => ids.every((id) => group.chapters.some((item) => item.id === id)))
  const reorderChapters = (groupIds: string[], nextGroupIds: string[]) => {
    const queue = [...nextGroupIds]
    const all = chapters.map((item) => (groupIds.includes(item.id) ? queue.shift()! : item.id))
    return orderAdminChapters(courseId, all)
  }
  const chapterDrag = useDragReorder(
    (fromId, toId) => {
      const group = groupHolding(fromId, toId)
      if (!group) return
      const ids = group.chapters.map((item) => item.id)
      void act(
        () => reorderChapters(ids, arrayMove(ids, fromId, toId)),
        'Đã đổi thứ tự chương.',
        reloadChapters
      )
    },
    (id, direction) => {
      const group = groupHolding(id)
      if (!group) return
      const ids = group.chapters.map((item) => item.id)
      const target = ids[ids.indexOf(id) + direction]
      if (!target) return
      void act(
        () => reorderChapters(ids, arrayMove(ids, id, target)),
        'Đã đổi thứ tự chương.',
        reloadChapters
      )
    }
  )
  const chapterOfLessons = (...ids: string[]) =>
    Object.entries(lessons).find(([, list]) => ids.every((id) => list.some((l) => l.id === id)))
  const lessonDrag = useDragReorder(
    (fromId, toId) => {
      const found = chapterOfLessons(fromId, toId)
      if (!found) return
      const [chapterId, list] = found
      const ids = list.map((item) => item.id)
      void act(
        () => orderAdminLessons(chapterId, arrayMove(ids, fromId, toId)),
        'Đã đổi thứ tự bài học.',
        reloadLessons(chapterId)
      )
    },
    (id, direction) => {
      const found = chapterOfLessons(id)
      if (!found) return
      const [chapterId, list] = found
      const ids = list.map((item) => item.id)
      const target = ids[ids.indexOf(id) + direction]
      if (!target) return
      void act(
        () => orderAdminLessons(chapterId, arrayMove(ids, id, target)),
        'Đã đổi thứ tự bài học.',
        reloadLessons(chapterId)
      )
    }
  )

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
        !readOnly && chapters.length > 0 ? (
          <Button
            size="sm"
            aria-label="Xuất bản nhanh các chương và bài học"
            disabled={busy || lessonsBusy || resource.status !== 'ready'}
            onClick={() => setQuickPublishOpen(true)}
          >
            <Send size={16} />
            Xuất bản nhanh
          </Button>
        ) : null
      }
    >
      {(notice || error) && (
        <div className="mb-5 flex flex-col gap-2">
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
        </div>
      )}
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
        empty={resource.status === 'ready' && chapters.length === 0 && sections.length === 0}
        emptyMessage="Khóa học chưa có chương nào."
      >
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              {sections.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-background-gray-secondary px-4 py-2.5">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-text-primary">
                      {group.section ? group.section.title : 'Chưa xếp vào phần học'}
                    </h3>
                    <p className="text-xs text-text-tertiary">
                      {[group.section?.phaseName, `${group.chapters.length} chương`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {!readOnly && group.section && (
                    <IconAction
                      label={`Thêm chương vào ${group.section.title}`}
                      icon={Plus}
                      disabled={busy}
                      onClick={() =>
                        setChapterEditor({ chapter: null, sectionId: group.section?.id ?? null })
                      }
                    />
                  )}
                </div>
              )}
              {group.chapters.length === 0 ? (
                <p className="px-1 text-sm text-text-tertiary">Phần này chưa có chương.</p>
              ) : (
                <ol className="divide-y divide-card-border">
                  {group.chapters.map((chapter, index) => (
                    <li
                      key={chapter.id}
                      {...chapterDrag.rowProps(chapter.id)}
                      className={cn(
                        chapterDrag.rowProps(chapter.id).className,
                        'py-3 first:pt-0 last:pb-0'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {!readOnly && (
                            <DragHandle
                              {...chapterDrag.handleProps(
                                chapter.id,
                                `chương ${chapter.title}`,
                                busy
                              )}
                            />
                          )}
                          <Button
                            size="icon"
                            appearance="ghost"
                            aria-label={
                              openChapter === chapter.id
                                ? `Thu gọn ${chapter.title}`
                                : `Mở ${chapter.title}`
                            }
                            disabled={lessonsBusy}
                            onClick={() => void toggleChapter(chapter)}
                          >
                            {openChapter === chapter.id ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </Button>
                          <div className="min-w-0">
                            <h3 className="truncate font-medium text-text-primary">
                              {chapter.title}
                            </h3>
                            <p className="text-xs text-text-tertiary">Thứ tự {chapter.sequence}</p>
                          </div>
                        </div>
                        <div className="w-28 shrink-0">
                          <Status tone={chapter.published ? 'success' : 'neutral'}>
                            {chapter.published ? 'Đã xuất bản' : 'Nháp'}
                          </Status>
                        </div>
                        {!readOnly && (
                          <div className="flex shrink-0 items-center gap-1">
                            {chapterAction?.(chapter)}
                            <IconAction
                              hover="info"
                              label={`Sửa chương ${chapter.title}`}
                              icon={Pencil}
                              disabled={busy}
                              onClick={() => setChapterEditor({ chapter })}
                            />
                            <IconAction
                              hover="success"
                              label={
                                chapter.published
                                  ? `Ẩn chương ${chapter.title}`
                                  : `Xuất bản chương ${chapter.title}`
                              }
                              icon={chapter.published ? EyeOff : Send}
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () => publishAdminChapter(chapter, !chapter.published),
                                  chapter.published ? 'Đã ẩn chương.' : 'Đã xuất bản chương.',
                                  reloadChapters
                                )
                              }
                            />
                            <IconAction
                              label={`Xóa chương ${chapter.title}`}
                              icon={Trash2}
                              variant="danger"
                              disabled={busy}
                              onClick={() =>
                                setRemoval({
                                  label: `Chương "${chapter.title}"`,
                                  run: () => deleteAdminChapter(courseId, chapter.id),
                                  reload: reloadChapters,
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                      {openChapter === chapter.id && (
                        <div className="mt-3 rounded-lg border border-card-border bg-card-background p-3">
                          {lessonsBusy && !lessons[chapter.id] ? (
                            <p className="text-sm text-text-tertiary">Đang tải bài học…</p>
                          ) : (lessons[chapter.id] ?? []).length === 0 ? (
                            <p className="text-sm text-text-tertiary">Chương chưa có bài học.</p>
                          ) : (
                            <ul className="divide-y divide-card-border">
                              {(lessons[chapter.id] ?? []).map((lesson, lessonIndex) => (
                                <li
                                  key={lesson.id}
                                  {...lessonDrag.rowProps(lesson.id)}
                                  className={cn(
                                    lessonDrag.rowProps(lesson.id).className,
                                    'flex items-center gap-3 py-2 first:pt-0 last:pb-0'
                                  )}
                                >
                                  {!readOnly && (
                                    <DragHandle
                                      {...lessonDrag.handleProps(
                                        lesson.id,
                                        `bài học ${lesson.title}`,
                                        busy
                                      )}
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-text-primary">
                                      {lesson.title}
                                    </p>
                                    <p className="text-xs text-text-tertiary">
                                      {lessonMeta(lesson)}
                                    </p>
                                  </div>
                                  <div className="w-28 shrink-0">
                                    <Status tone={lesson.published ? 'success' : 'neutral'}>
                                      {lesson.published ? 'Đã xuất bản' : 'Nháp'}
                                    </Status>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    {lesson.preview && (
                                      <span className="rounded-full border border-card-border px-2 py-0.5 text-xs text-text-tertiary">
                                        Xem trước
                                      </span>
                                    )}
                                    {!readOnly && (
                                      <>
                                        <IconAction
                                          hover="info"
                                          label={`Sửa bài học ${lesson.title}`}
                                          icon={Pencil}
                                          disabled={busy}
                                          onClick={() =>
                                            setLessonEditor({ chapterId: chapter.id, lesson })
                                          }
                                        />
                                        <IconAction
                                          hover="success"
                                          label={
                                            lesson.published
                                              ? `Ẩn bài học ${lesson.title}`
                                              : `Xuất bản bài học ${lesson.title}`
                                          }
                                          icon={lesson.published ? EyeOff : Send}
                                          disabled={busy}
                                          onClick={() =>
                                            void act(
                                              () =>
                                                setAdminLessonState(lesson, {
                                                  published: !lesson.published,
                                                  preview: lesson.preview,
                                                }),
                                              lesson.published
                                                ? 'Đã ẩn bài học.'
                                                : 'Đã xuất bản bài học.',
                                              reloadLessons(chapter.id)
                                            )
                                          }
                                        />
                                        <IconAction
                                          hover="info"
                                          label={
                                            lesson.preview
                                              ? `Tắt xem trước ${lesson.title}`
                                              : `Bật xem trước ${lesson.title}`
                                          }
                                          icon={PlayCircle}
                                          disabled={busy}
                                          onClick={() =>
                                            void act(
                                              () =>
                                                setAdminLessonState(lesson, {
                                                  published: lesson.published,
                                                  preview: !lesson.preview,
                                                }),
                                              lesson.preview
                                                ? 'Đã tắt xem trước.'
                                                : 'Đã bật xem trước.',
                                              reloadLessons(chapter.id)
                                            )
                                          }
                                        />
                                        <IconAction
                                          label={`Xóa bài học ${lesson.title}`}
                                          icon={Trash2}
                                          variant="danger"
                                          disabled={busy}
                                          onClick={() =>
                                            setRemoval({
                                              label: `Bài học "${lesson.title}"`,
                                              run: () => deleteAdminLesson(chapter.id, lesson.id),
                                              reload: reloadLessons(chapter.id),
                                            })
                                          }
                                        />
                                      </>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                          {!readOnly && (
                            <div className="mt-2 flex justify-center border-t border-card-border pt-2">
                              <IconAction
                                label="Thêm bài học"
                                icon={Plus}
                                disabled={busy}
                                onClick={() =>
                                  setLessonEditor({ chapterId: chapter.id, lesson: null })
                                }
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <div className="mt-4 flex justify-center border-t border-card-border pt-3">
            <IconAction
              label="Thêm chương"
              icon={Plus}
              disabled={busy}
              onClick={() => setChapterEditor({ chapter: null })}
            />
          </div>
        )}
      </ScheduleResourceState>
      {chapterEditor && (
        <ChapterEditorDialog
          courseId={courseId}
          chapter={chapterEditor.chapter}
          sections={sections}
          defaultSectionId={chapterEditor.sectionId}
          onClose={() => setChapterEditor(null)}
          onSaved={() => {
            setChapterEditor(null)
            setNotice('Đã lưu chương.')
            void resource.reload()
            onChange?.()
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
            void resource.reload()
            onChange?.()
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
      {quickPublishOpen && (
        <ConfirmDialog
          title="Xuất bản nhanh chương và bài học?"
          description="Các bài học nháp đủ điều kiện sẽ được xuất bản trước, sau đó xuất bản chương có bài học đã xuất bản. Mục chưa đủ điều kiện sẽ được bỏ qua và báo lý do."
          cancelLabel="Hủy"
          confirmLabel="Xuất bản"
          busyLabel="Đang xuất bản..."
          busy={busy}
          onCancel={() => setQuickPublishOpen(false)}
          onConfirm={() => void quickPublishContent()}
        />
      )}
    </Panel>
  )
}

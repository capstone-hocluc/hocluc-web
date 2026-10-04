import { useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  FilePlus2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { getCourseDetail, getMainCourses, type Course, type CourseDetail, type CourseLesson } from '../../services/courseService'
import {
  addTeacherQuizQuestions,
  createTeacherQuiz,
  deleteTeacherQuiz,
  deleteTeacherQuizQuestion,
  duplicateTeacherQuiz,
  getTeacherQuiz,
  getTeacherQuizzes,
  publishTeacherQuiz,
  unpublishTeacherQuiz,
  updateTeacherQuiz,
  updateTeacherQuizQuestion,
  type TeacherQuestionType,
  type TeacherQuizEditor,
  type TeacherQuizQuestion,
  type TeacherQuizRecord,
} from '../../services/teacherQuizService'
import { getErrorMessage } from '../../lib/errors'
import { ApiError } from '../../lib/api'
import { usePageResource } from '../../hooks/usePageResource'
import Button from '../ui/Button'
import Card, { CardEyebrow, CardTitle } from '../ui/Card'
import ConfirmDialog from '../ui/ConfirmDialog'
import DropdownField from '../ui/DropdownField'
import SearchFilterBar from '../ui/SearchFilterBar'
import Skeleton from '../ui/Skeleton'
import Notice from '../ui/Notice'
import StatusBadge from '../ui/StatusBadge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/DropdownMenu'

interface TeacherQuizProps {
  course: { id: string; name: string }
  onBack: () => void
  onAction: (message: string) => void
  startCreating?: boolean
}

interface DraftOption {
  text: string
  correct: boolean
}

interface DraftQuestion {
  clientId: string
  serverId: string | null
  questionText: string
  questionType: TeacherQuestionType
  options: DraftOption[]
  explanation: string
  editable: boolean
}

const CHOICE_TYPES: TeacherQuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']
const QUIZ_STATUS_FILTERS = ['Tất cả', 'Bản nháp', 'Đã xuất bản', 'Đã lưu trữ'] as const

function createDraftQuestion(): DraftQuestion {
  return {
    clientId: crypto.randomUUID(),
    serverId: null,
    questionText: '',
    questionType: 'SINGLE_CHOICE',
    options: Array.from({ length: 4 }, () => ({ text: '', correct: false })),
    explanation: '',
    editable: true,
  }
}

function fromServerQuestion(question: TeacherQuizQuestion): DraftQuestion {
  const editable = CHOICE_TYPES.includes(question.questionType) && question.options.length <= 8
  return {
    clientId: question.id,
    serverId: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    options: question.options.map(({ text, correct }) => ({ text, correct })),
    explanation: question.explanation ?? '',
    editable,
  }
}

function quizIsLocked(quiz: TeacherQuizRecord | undefined) {
  return Boolean(quiz?.locked || (quiz?.attemptCount ?? 0) > 0)
}

function TeacherQuiz({ course, onBack, onAction, startCreating = false }: TeacherQuizProps) {
  const quizzes = usePageResource(() => getTeacherQuizzes(), [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof QUIZ_STATUS_FILTERS)[number]>('Tất cả')
  const [editorQuizId, setEditorQuizId] = useState<string | null>(null)
  const [creating, setCreating] = useState(startCreating)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TeacherQuizRecord | null>(null)
  const [forceCopyIds, setForceCopyIds] = useState<Set<string>>(() => new Set())

  const refresh = () => quizzes.reload()
  const runQuizAction = async (
    quiz: TeacherQuizRecord,
    operation: () => Promise<unknown>,
    message: string,
    forceCopyAfterSuccess = false,
  ) => {
    if (busyId) return
    setBusyId(quiz.id)
    try {
      await operation()
      if (forceCopyAfterSuccess) setForceCopyIds((current) => new Set(current).add(quiz.id))
      onAction(message)
      refresh()
    } catch (error) {
      const blockers = quiz.publishProblems?.filter(Boolean) ?? []
      onAction(
        error instanceof ApiError && error.status === 409 && quiz.status === 'DRAFT' && blockers.length > 0
          ? `Chưa thể xuất bản: ${blockers.join(', ')}. Mở chỉnh sửa để hoàn thiện quiz.`
          : getApiActionError(error)
      )
    } finally {
      setBusyId(null)
    }
  }

  if (creating || editorQuizId) {
    return (
      <TeacherQuizEditorScreen
        quizId={editorQuizId}
        course={course}
        onCancel={() => {
          setCreating(false)
          setEditorQuizId(null)
        }}
        onSaved={(message) => {
          setCreating(false)
          setEditorQuizId(null)
          onAction(message)
          refresh()
        }}
      />
    )
  }

  const quizItems = (quizzes.data ?? []).filter((quiz) => {
    if (quiz.type === 'EXAM' || quiz.type === 'PLACEMENT') return false
    const term = search.trim().toLocaleLowerCase('vi')
    const matchesSearch = !term || `${quiz.title} ${quiz.courseTitle ?? ''} ${quiz.lessonTitle ?? ''}`.toLocaleLowerCase('vi').includes(term)
    const matchesStatus = statusFilter === 'Tất cả' ||
      (statusFilter === 'Bản nháp' && quiz.status === 'DRAFT') ||
      (statusFilter === 'Đã xuất bản' && quiz.status === 'PUBLISHED') ||
      (statusFilter === 'Đã lưu trữ' && quiz.status === 'ARCHIVED')
    return matchesSearch && matchesStatus
  })
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'Tất cả'

  return (
    <section className="flex flex-col gap-5">
      <button type="button" className="hl-teacher-text-back" onClick={onBack}>
        <ArrowLeft size={16} />Quay lại lớp học
      </button>
      <div className="hl-teacher-title">
        <div>
          <h1>Bài kiểm tra</h1>
          <p>Tất cả quiz bạn được quyền quản lý.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} />Tạo quiz
        </Button>
      </div>

      <Card as="section" padding="lg" radius="lg" aria-labelledby="teacher-quiz-list-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardEyebrow>SOẠN VÀ QUẢN LÝ</CardEyebrow>
            <CardTitle id="teacher-quiz-list-title" className="text-base">Danh sách quiz</CardTitle>
          </div>
        </div>
        <SearchFilterBar
          query={search}
          onQueryChange={setSearch}
          placeholder="Tìm theo tên quiz hoặc khóa học"
          filter={statusFilter}
          onFilterChange={(value) => setStatusFilter(value as (typeof QUIZ_STATUS_FILTERS)[number])}
          filterOptions={QUIZ_STATUS_FILTERS}
          resultCount={quizzes.status === 'ready' ? quizItems.length : undefined}
          resultLabel="quiz"
        />

        {quizzes.status === 'loading' ? (
          <div className="flex flex-col gap-3" aria-label="Đang tải danh sách quiz">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : quizzes.status !== 'ready' ? (
          <div className="rounded-xl border border-line-soft bg-surface-soft p-4" role="alert">
            <p className="m-0 text-sm text-text-secondary">{quizzes.errorMessage || 'Không thể tải danh sách quiz.'}</p>
            <Button appearance="outline" className="mt-3 min-h-11" onClick={refresh}>Thử lại</Button>
          </div>
        ) : quizItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-blue bg-surface-soft px-5 py-8 text-center">
            <FilePlus2 className="mx-auto mb-2 text-primary" size={24} aria-hidden="true" />
            <strong className="block text-sm text-text-heading">
              {hasActiveFilters ? 'Không tìm thấy quiz phù hợp' : 'Chưa có quiz nào'}
            </strong>
            <p className="mt-1 mb-0 text-sm text-text-secondary">
              {hasActiveFilters ? 'Thử từ khóa hoặc trạng thái khác.' : 'Tạo quiz nhanh gắn với một bài học để bắt đầu.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {quizItems.map((quiz) => (
              <article key={quiz.id} className="flex flex-col gap-3 rounded-xl border border-line-blue bg-surface p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="m-0 truncate text-sm font-bold text-text-heading">{quiz.title}</h2>
                    <StatusBadge
                      tone={quiz.status === 'PUBLISHED' ? 'success' : quiz.status === 'DRAFT' ? 'warning' : 'neutral'}
                      size="sm"
                    >
                    {quiz.status === 'PUBLISHED' ? 'Đã xuất bản' : quiz.status === 'DRAFT' ? 'Bản nháp' : 'Đã lưu trữ'}
                  </StatusBadge>
                    {quizIsLocked(quiz) && <StatusBadge tone="locked" size="sm">Đã có lượt thi</StatusBadge>}
                  </div>
                  <p className="mt-1 mb-0 text-xs text-text-secondary">
                    {[quiz.courseTitle, quiz.lessonTitle, `${quiz.questionCount} câu`, quiz.durationMinutes ? `${quiz.durationMinutes} phút` : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                  {quiz.status === 'DRAFT' && (quiz.publishProblems?.length ?? 0) > 0 && (
                    <p className="mt-1 mb-0 text-xs text-text-muted">
                      Cần hoàn thiện: {quiz.publishProblems?.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button
                    className="min-h-11 flex-1 sm:flex-none"
                    disabled={busyId !== null}
                    onClick={() => {
                      const duplicateBeforeEdit =
                        quiz.status !== 'DRAFT' || quizIsLocked(quiz) || forceCopyIds.has(quiz.id)
                      if (!duplicateBeforeEdit) {
                        setEditorQuizId(quiz.id)
                        return
                      }
                      void runQuizAction(
                        quiz,
                        () => duplicateTeacherQuiz(quiz.id).then((copy) => {
                          setEditorQuizId(copy.id)
                          return copy
                        }),
                        'Đã tạo bản nháp để chỉnh sửa; quiz gốc chưa bị thay đổi.'
                      )
                    }}
                  >
                    <Pencil size={15} />
                    {quiz.status !== 'DRAFT' || quizIsLocked(quiz) || forceCopyIds.has(quiz.id)
                      ? 'Tạo bản nháp sửa'
                      : 'Chỉnh sửa'}
                  </Button>
                  <Button
                    appearance="outline"
                    className="min-h-11 flex-1 sm:flex-none"
                    disabled={busyId !== null}
                    onClick={() => runQuizAction(
                      quiz,
                      () => quiz.status === 'PUBLISHED' ? unpublishTeacherQuiz(quiz.id) : publishTeacherQuiz(quiz.id),
                      quiz.status === 'PUBLISHED' ? 'Đã ẩn quiz.' : 'Đã xuất bản quiz.',
                      quiz.status === 'PUBLISHED'
                    )}
                  >
                    {quiz.status === 'PUBLISHED' ? <X size={15} /> : <Send size={15} />}
                    {quiz.status === 'PUBLISHED' ? 'Ẩn quiz' : 'Xuất bản'}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button appearance="outline" className="min-h-11" disabled={busyId !== null} aria-label={`Thao tác khác với ${quiz.title}`}>
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem disabled={busyId !== null} onSelect={() => void runQuizAction(quiz, () => duplicateTeacherQuiz(quiz.id), 'Đã sao chép quiz thành bản nháp.')}>
                        <Copy size={15} />Sao chép thành bản nháp
                      </DropdownMenuItem>
                      {!quizIsLocked(quiz) && (
                        <DropdownMenuItem
                          disabled={busyId !== null}
                          className="text-danger data-[highlighted]:text-danger"
                          onSelect={() => setConfirmDelete(quiz)}
                        >
                          <Trash2 size={15} />Xóa quiz
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      {confirmDelete && (
        <ConfirmDialog
          title="Xóa quiz?"
          description={<>Quiz <strong>{confirmDelete.title}</strong> sẽ bị xóa khỏi danh sách.</>}
          cancelLabel="Hủy"
          confirmLabel="Xóa quiz"
          variant="danger"
          mobileTouchTargets
          busy={busyId === confirmDelete.id}
          busyLabel="Đang xóa..."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const target = confirmDelete
            setBusyId(target.id)
            try {
              await deleteTeacherQuiz(target.id)
              setConfirmDelete(null)
              onAction('Đã xóa quiz.')
              refresh()
            } catch (error) {
              onAction(getErrorMessage(error))
            } finally {
              setBusyId(null)
            }
          }}
        />
      )}
    </section>
  )
}

function TeacherQuizEditorScreen({
  quizId,
  course,
  onCancel,
  onSaved,
}: {
  quizId: string | null
  course: { id: string; name: string }
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const editor = usePageResource(() => quizId ? getTeacherQuiz(quizId) : Promise.resolve(null), [quizId])
  if (quizId && editor.status === 'loading') {
    return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-56" /><Skeleton className="h-64" /></div>
  }
  if (quizId && (editor.status !== 'ready' || !editor.data)) {
    return (
      <div className="rounded-xl border border-line-soft bg-surface-soft p-4" role="alert">
        <p className="m-0 text-sm text-text-secondary">{editor.errorMessage || 'Không thể tải nội dung quiz.'}</p>
        <div className="mt-3 flex gap-2">
          <Button appearance="outline" className="min-h-11" onClick={editor.reload}>Thử lại</Button>
          <Button appearance="outline" className="min-h-11" onClick={onCancel}>Quay lại</Button>
        </div>
      </div>
    )
  }
  return (
    <TeacherQuizEditorForm
      key={quizId ?? 'new-quiz'}
      initial={quizId ? editor.data : null}
      course={course}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  )
}

function TeacherQuizEditorForm({
  initial,
  course,
  onCancel,
  onSaved,
}: {
  initial: TeacherQuizEditor | null
  course: { id: string; name: string }
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const initialQuiz = initial?.quiz
  const initialQuestionsRef = useRef<TeacherQuizEditor | null>(initial)
  const [serverQuizId, setServerQuizId] = useState<string | null>(initialQuiz?.id ?? null)
  const [title, setTitle] = useState(initialQuiz?.title ?? '')
  const [duration, setDuration] = useState(String(initialQuiz?.durationMinutes ?? 30))
  const [attempts, setAttempts] = useState(String(initialQuiz?.maxAttempts ?? 1))
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    initial?.questions.map(fromServerQuestion) ?? [createDraftQuestion()]
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ambiguousCreate, setAmbiguousCreate] = useState(false)

  const courseCatalog = usePageResource(async () => {
    if (initialQuiz) return [] as Course[]
    const response = await getMainCourses()
    if (!response.data) throw new Error('Không thể tải danh sách khóa học.')
    return response.data
  }, [Boolean(initialQuiz)])

  const routeCourseId = (courseCatalog.data ?? []).some((item) => item.id === course.id) ? course.id : ''
  const activeCourseId = selectedCourseId ?? routeCourseId

  const courseDetail = usePageResource(async (): Promise<CourseDetail | null> => {
    if (!activeCourseId || initialQuiz) return null
    const response = await getCourseDetail(activeCourseId)
    if (!response.data) throw new Error('Không thể tải nội dung khóa học.')
    return response.data
  }, [activeCourseId, Boolean(initialQuiz)])

  const activeCourseDetail = courseDetail.data?.id === activeCourseId ? courseDetail.data : null
  const courseCatalogHasError = ['error', 'forbidden', 'not-found'].includes(courseCatalog.status)
  const courseCatalogError = getResourceErrorMessage(courseCatalog.status, courseCatalog.errorMessage, 'danh sách khóa học')
  const courseDetailHasError = ['error', 'forbidden', 'not-found'].includes(courseDetail.status)
  const courseDetailError = getResourceErrorMessage(courseDetail.status, courseDetail.errorMessage, 'bài học')
  const lessonOptions: Array<CourseLesson & { pathLabel: string }> = (activeCourseDetail?.phases ?? [])
    .flatMap((phase) => phase.sections.flatMap((section) => section.chapters.flatMap((chapter) =>
      chapter.lessons.map((lesson) => ({
        ...lesson,
        pathLabel: [phase.name, section.title, chapter.title, lesson.title].filter(Boolean).join(' · '),
      }))
    )))
  const effectiveLessonId = lessonOptions.some((lesson) => lesson.id === selectedLessonId)
    ? selectedLessonId
    : ''
  const settingsLocked = quizIsLocked(initialQuiz) || ambiguousCreate
  const questionsLocked = quizIsLocked(initialQuiz) || ambiguousCreate

  const updateQuestion = (clientId: string, update: Partial<DraftQuestion>) => {
    setQuestions((items) => items.map((question) => question.clientId === clientId ? { ...question, ...update } : question))
  }
  const updateOption = (question: DraftQuestion, optionIndex: number, value: Partial<DraftOption>) => {
    updateQuestion(question.clientId, {
      options: question.options.map((option, index) => index === optionIndex ? { ...option, ...value } : option),
    })
  }

  const saveQuiz = async (publish: boolean) => {
    if (busy) return
    const durationMinutes = Number(duration)
    const maxAttempts = Number(attempts)
    if (!title.trim()) {
      setError('Nhập tên quiz trước khi lưu.')
      return
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
      setError('Thời gian làm bài phải từ 1 đến 600 phút.')
      return
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 999) {
      setError('Số lần thử tối đa phải từ 1 đến 999.')
      return
    }
    if (!serverQuizId && (!activeCourseId || !effectiveLessonId)) {
      setError('Chọn khóa học và bài học để gắn quiz.')
      return
    }

    const questionsWithContent = questions.filter((question) =>
      question.questionText.trim() || question.options.some((option) => option.text.trim())
    )
    const invalidQuestion = questionsWithContent.find((question) =>
      !question.questionText.trim() || question.options.length < 2 || question.options.some((option) => !option.text.trim())
    )
    if (invalidQuestion) {
      setError('Mỗi câu hỏi đã bắt đầu cần có nội dung và điền đủ ít nhất hai lựa chọn.')
      return
    }

    setBusy(true)
    setError('')
    let quizId = serverQuizId
    try {
      if (!quizId) {
        const created = await createTeacherQuiz({
          type: 'QUICK',
          lessonId: effectiveLessonId,
          title: title.trim(),
          durationMinutes,
          maxAttempts,
        })
        quizId = created.id
        setServerQuizId(created.id)
      } else {
        const updatePayload = settingsLocked
          ? { title: title.trim() }
          : { title: title.trim(), durationMinutes, maxAttempts }
        await updateTeacherQuiz(quizId, updatePayload)
      }

      await persistQuestionChanges(quizId, questions, initialQuestionsRef.current)
      const refreshed = await getTeacherQuiz(quizId)
      initialQuestionsRef.current = refreshed
      setQuestions(refreshed.questions.map(fromServerQuestion))

      if (publish) {
        await publishTeacherQuiz(quizId)
        onSaved('Đã lưu và xuất bản quiz.')
      } else {
        onSaved(serverQuizId ? 'Đã lưu thay đổi quiz.' : 'Đã lưu quiz dưới dạng bản nháp.')
      }
    } catch (saveError) {
      if (quizId) {
        try {
          const refreshed = await getTeacherQuiz(quizId)
          const previous = initialQuestionsRef.current
          initialQuestionsRef.current = refreshed
          setQuestions((drafts) => attachSavedQuestionIds(drafts, previous, refreshed))
          setServerQuizId(refreshed.quiz.id)
        } catch {
          // Keep the form state if the follow-up read also fails.
        }
      }
      if (!serverQuizId && !quizId && isAmbiguousCreateFailure(saveError)) {
        setAmbiguousCreate(true)
        setError('Yêu cầu tạo quiz chưa có kết quả xác nhận.')
        return
      }
      const validationMessages = saveError instanceof ApiError
        ? Object.values(saveError.errors ?? {}).filter(Boolean)
        : []
      setError(
        validationMessages.length > 0
          ? `${getErrorMessage(saveError)}: ${validationMessages.join('; ')}`
          : getErrorMessage(saveError)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <button type="button" className="hl-teacher-text-back" onClick={onCancel}>
        <ArrowLeft size={16} />Quay lại danh sách quiz
      </button>
      <div className="hl-teacher-title">
        <div>
          <h1>{initialQuiz ? 'Chỉnh sửa quiz' : serverQuizId ? 'Hoàn thiện quiz nháp' : 'Tạo quiz nhanh'}</h1>
          <p>Quiz nhanh được gắn với một bài học trong khóa học.</p>
        </div>
      </div>

      {ambiguousCreate && (
        <Notice tone="warning" role="alert" aria-live="assertive">
          Máy chủ có thể đã tạo quiz nhưng phản hồi bị gián đoạn. Không gửi lại từ biểu mẫu này; hãy quay về danh sách quiz và kiểm tra thủ công trước khi tạo mới.
        </Notice>
      )}

      {!initialQuiz && (
        <Card as="section" padding="lg" radius="lg" aria-labelledby="quiz-target-title">
          <CardTitle id="quiz-target-title" className="mb-3 text-base">Chọn vị trí quiz</CardTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
              Khóa học chính
              <DropdownField
                ariaLabel="Khóa học chính"
                placeholder="Chọn khóa học"
                options={(courseCatalog.data ?? []).map((item) => ({ id: item.id, label: item.title }))}
                value={activeCourseId || null}
                isSearchable
                isLoading={courseCatalog.status === 'loading'}
                isError={courseCatalogHasError}
                errorMessage={courseCatalogError}
                emptyMessage="Không có khóa học đang mở."
                mobileTouchTargets
                isDisabled={serverQuizId !== null || ambiguousCreate}
                onChange={(value) => {
                  setSelectedCourseId(value ?? '')
                  setSelectedLessonId('')
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
              Bài học
              <DropdownField
                ariaLabel="Bài học"
                placeholder={courseDetail.status === 'error' ? 'Không tải được bài học' : 'Chọn bài học'}
                options={lessonOptions.map((lesson) => ({ id: lesson.id, label: lesson.pathLabel }))}
                value={effectiveLessonId || null}
                isSearchable
                isLoading={Boolean(activeCourseId && (!activeCourseDetail || courseDetail.status === 'loading'))}
                isError={Boolean(activeCourseId && courseDetailHasError)}
                errorMessage={courseDetailError}
                emptyMessage="Khóa học này chưa có bài học khả dụng."
                mobileTouchTargets
                isDisabled={!activeCourseId || serverQuizId !== null || ambiguousCreate}
                onChange={(value) => setSelectedLessonId(value ?? '')}
              />
            </label>
          </div>
          {courseCatalog.status === 'loading' && <p className="mt-2 mb-0 text-sm text-text-secondary" role="status">Đang tải khóa học...</p>}
          {courseCatalogHasError && (
            <div className="mt-2 flex flex-wrap items-center gap-2" role="alert">
              <p className="m-0 text-sm text-text-danger">{courseCatalogError}</p>
              {courseCatalog.status === 'error' && <Button appearance="outline" className="min-h-11" onClick={courseCatalog.reload}>Thử lại</Button>}
            </div>
          )}
          {courseCatalog.status === 'ready' && (courseCatalog.data?.length ?? 0) === 0 && (
            <p className="mt-2 mb-0 text-sm text-text-secondary">Hiện chưa có khóa học đang mở để gắn quiz.</p>
          )}
          {activeCourseId && courseDetail.status === 'ready' && lessonOptions.length === 0 && (
            <p className="mt-2 mb-0 text-sm text-text-secondary">Khóa học này chưa có bài học để gắn quiz.</p>
          )}
          {activeCourseId && courseDetail.status === 'loading' && <p className="mt-2 mb-0 text-sm text-text-secondary" role="status">Đang tải bài học...</p>}
          {activeCourseId && courseDetailHasError && (
            <div className="mt-2 flex flex-wrap items-center gap-2" role="alert">
              <p className="m-0 text-sm text-text-danger">{courseDetailError}</p>
              {courseDetail.status === 'error' && <Button appearance="outline" className="min-h-11" onClick={courseDetail.reload}>Thử lại</Button>}
            </div>
          )}
          {courseCatalog.status === 'ready' && (
            <p className="mt-2 mb-0 text-xs text-text-secondary" role="note">
              {routeCourseId
                ? 'Đã điền sẵn khóa học theo đường dẫn. Máy chủ sẽ xác thực quyền quản lý khi lưu.'
                : 'Khóa học từ đường dẫn không xuất hiện trong danh mục hiện có. Hãy chọn khóa học và bài học bạn được phép quản lý; máy chủ sẽ xác thực quyền khi lưu.'}
            </p>
          )}
          {serverQuizId && <p className="mt-2 mb-0 text-xs text-text-secondary">Quiz đã được tạo nháp. Nếu cần đổi vị trí, hãy tạo quiz mới.</p>}
        </Card>
      )}

      {initialQuiz && (
        <div className="rounded-xl border border-line-blue bg-primary-soft px-4 py-3 text-sm text-text-secondary">
          {[initialQuiz.courseTitle, initialQuiz.lessonTitle, initialQuiz.type].filter(Boolean).join(' · ')}
          {quizIsLocked(initialQuiz) && <p className="mt-1 mb-0 font-semibold">Quiz đã có lượt thi; câu hỏi và quy định làm bài đang khóa.</p>}
        </div>
      )}

      <Card as="section" padding="lg" radius="lg" aria-labelledby="quiz-settings-title">
        <CardTitle id="quiz-settings-title" className="mb-3 text-base">Thông tin quiz</CardTitle>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading md:col-span-1">
            Tên quiz
            <input className="min-h-11 rounded-xl border border-line-blue bg-surface px-3 text-sm font-normal" value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy || ambiguousCreate} maxLength={500} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
            Thời gian (phút)
            <input className="min-h-11 rounded-xl border border-line-blue bg-surface px-3 text-sm font-normal" type="number" min="1" max="600" value={duration} onChange={(event) => setDuration(event.target.value)} disabled={settingsLocked || busy} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
            Số lần làm tối đa
            <input className="min-h-11 rounded-xl border border-line-blue bg-surface px-3 text-sm font-normal" type="number" min="1" max="999" value={attempts} onChange={(event) => setAttempts(event.target.value)} disabled={settingsLocked || busy} />
          </label>
        </div>
      </Card>

      <Card as="section" padding="lg" radius="lg" aria-labelledby="quiz-questions-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="quiz-questions-title" className="text-base">Câu hỏi ({questions.length})</CardTitle>
          <Button appearance="outline" className="min-h-11" disabled={questionsLocked || busy} onClick={() => setQuestions((items) => [...items, createDraftQuestion()])}>
            <Plus size={15} />Thêm câu hỏi
          </Button>
        </div>
        {questions.length === 0 ? (
          <p className="rounded-xl bg-surface-soft p-4 text-sm text-text-secondary">Quiz nháp chưa có câu hỏi. Hãy thêm câu hỏi trước khi xuất bản.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((question, questionIndex) => (
              <article key={question.clientId} className="rounded-xl border border-line-soft bg-surface-soft p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <strong className="text-sm text-text-heading">Câu {questionIndex + 1}</strong>
                  {!question.editable && <StatusBadge tone="warning" size="sm">Định dạng chỉ đọc</StatusBadge>}
                  {question.editable && !questionsLocked && (
                    <Button variant="danger" appearance="ghost" aria-label={`Xóa câu ${questionIndex + 1}`} className="min-h-11" disabled={busy} onClick={() => setQuestions((items) => items.filter((item) => item.clientId !== question.clientId))}>
                      <Trash2 size={15} />
                    </Button>
                  )}
                </div>
                {!question.editable ? (
                  <div className="text-sm text-text-secondary">
                    <p className="mt-0 mb-2 whitespace-pre-wrap">{question.questionText}</p>
                    <ul className="m-0 pl-5">{question.options.map((option, index) => <li key={`${question.clientId}-${index}`}>{option.text}{option.correct ? ' ✓' : ''}</li>)}</ul>
                    <p className="mt-2 mb-0">Câu hỏi loại {question.questionType} chưa được hỗ trợ chỉnh sửa ở màn hình này.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
                      Nội dung câu hỏi
                      <textarea className="min-h-20 rounded-xl border border-line-blue bg-surface px-3 py-2 text-sm font-normal" value={question.questionText} disabled={questionsLocked || busy} onChange={(event) => updateQuestion(question.clientId, { questionText: event.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
                      Dạng đáp án
                      <select className="min-h-11 rounded-xl border border-line-blue bg-surface px-3 text-sm font-normal md:max-w-64" value={question.questionType} disabled={questionsLocked || busy} onChange={(event) => {
                        const questionType = event.target.value as TeacherQuestionType
                        const options = questionType === 'SINGLE_CHOICE'
                          ? question.options.map((option, index) => ({ ...option, correct: option.correct && question.options.findIndex((item) => item.correct) === index }))
                          : question.options
                        updateQuestion(question.clientId, { questionType, options })
                      }}>
                        <option value="SINGLE_CHOICE">Chọn một đáp án</option>
                        <option value="MULTIPLE_CHOICE">Chọn nhiều đáp án</option>
                      </select>
                    </label>
                    <div className="flex flex-col gap-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={`${question.clientId}-option-${optionIndex}`} className="flex items-center gap-2">
                          <input
                            type={question.questionType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                            name={`correct-${question.clientId}`}
                            aria-label={`Đánh dấu lựa chọn ${String.fromCharCode(65 + optionIndex)} là đáp án đúng`}
                            checked={option.correct}
                            disabled={questionsLocked || busy}
                            onChange={() => {
                              if (question.questionType === 'SINGLE_CHOICE') {
                                updateQuestion(question.clientId, { options: question.options.map((item, index) => ({ ...item, correct: index === optionIndex })) })
                              } else updateOption(question, optionIndex, { correct: !option.correct })
                            }}
                          />
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-xs font-bold text-text-secondary">{String.fromCharCode(65 + optionIndex)}</span>
                          <input className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-blue bg-surface px-3 text-sm" value={option.text} placeholder={`Lựa chọn ${String.fromCharCode(65 + optionIndex)}`} aria-label={`Nội dung lựa chọn ${String.fromCharCode(65 + optionIndex)} cho câu ${questionIndex + 1}`} disabled={questionsLocked || busy} onChange={(event) => updateOption(question, optionIndex, { text: event.target.value })} />
                          {question.options.length > 2 && !questionsLocked && (
                            <Button appearance="ghost" className="min-h-11" aria-label={`Xóa lựa chọn ${String.fromCharCode(65 + optionIndex)}`} disabled={busy} onClick={() => updateQuestion(question.clientId, { options: question.options.filter((_, index) => index !== optionIndex) })}>
                              <X size={15} />
                            </Button>
                          )}
                        </div>
                      ))}
                      {question.options.length < 8 && !questionsLocked && (
                        <Button appearance="ghost" className="min-h-11 self-start" disabled={busy} onClick={() => updateQuestion(question.clientId, { options: [...question.options, { text: '', correct: false }] })}>
                          <Plus size={14} />Thêm lựa chọn
                        </Button>
                      )}
                    </div>
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
                      Giải thích (không bắt buộc)
                      <textarea className="min-h-16 rounded-xl border border-line-blue bg-surface px-3 py-2 text-sm font-normal" value={question.explanation} disabled={questionsLocked || busy} onChange={(event) => updateQuestion(question.clientId, { explanation: event.target.value })} />
                    </label>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {error && <p className="mt-4 mb-0 text-sm font-medium text-text-danger" role="alert">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line-soft pt-4">
          <Button appearance="outline" className="min-h-11" disabled={busy} onClick={onCancel}>Hủy</Button>
          <Button appearance="outline" className="min-h-11" disabled={busy || ambiguousCreate} onClick={() => void saveQuiz(false)}>
            {busy ? 'Đang lưu...' : initialQuiz || serverQuizId ? 'Lưu thay đổi' : 'Lưu bản nháp'}
          </Button>
          {(!initialQuiz || initialQuiz.status !== 'PUBLISHED') && (
            <Button className="min-h-11" disabled={busy || ambiguousCreate} onClick={() => void saveQuiz(true)}>
              <CheckCircle2 size={15} />{busy ? 'Đang xử lý...' : 'Lưu và xuất bản'}
            </Button>
          )}
        </div>
      </Card>
    </section>
  )
}

async function persistQuestionChanges(
  quizId: string,
  drafts: DraftQuestion[],
  previous: TeacherQuizEditor | null
) {
  const previousQuestions = previous?.questions ?? []
  const previousById = new Map(previousQuestions.map((question) => [question.id, question]))
  const currentServerIds = new Set(drafts.flatMap((question) => question.serverId ? [question.serverId] : []))

  for (const question of previousQuestions) {
    if (!currentServerIds.has(question.id) && CHOICE_TYPES.includes(question.questionType) && question.options.length <= 8) {
      await deleteTeacherQuizQuestion(question.id)
    }
  }

  const newQuestions = drafts.filter((question) => !question.serverId && questionHasText(question))
  const existingChanges = drafts.filter((question) => {
    if (!question.serverId || !question.editable) return false
    const previousQuestion = previousById.get(question.serverId)
    return previousQuestion ? questionSignature(question) !== serverQuestionSignature(previousQuestion) : false
  })

  for (const question of existingChanges) {
    await updateTeacherQuizQuestion(question.serverId!, toSavePayload(question))
  }
  if (newQuestions.length > 0) {
    await addTeacherQuizQuestions(quizId, newQuestions.map(toSavePayload))
  }
}

function questionHasText(question: DraftQuestion) {
  return question.questionText.trim().length > 0 || question.options.some((option) => option.text.trim().length > 0)
}

function getApiActionError(error: unknown) {
  if (error instanceof ApiError) {
    const details = Object.values(error.errors ?? {}).filter(Boolean)
    if (details.length > 0) return `${getErrorMessage(error)}: ${details.join('; ')}`
  }
  return getErrorMessage(error)
}

function isAmbiguousCreateFailure(error: unknown) {
  if (!(error instanceof ApiError)) return true
  return error.status === 0 || error.status === 408 || error.status >= 500
}

function getResourceErrorMessage(status: string, errorMessage: string, resource: string) {
  if (status === 'forbidden') return `Bạn không có quyền xem ${resource}.`
  if (status === 'not-found') return `Không tìm thấy ${resource}.`
  return errorMessage || `Không thể tải ${resource}.`
}

function toSavePayload(question: DraftQuestion) {
  return {
    questionText: question.questionText.trim(),
    questionType: question.questionType,
    explanation: question.explanation.trim(),
    options: question.options.map((option) => ({ text: option.text.trim(), correct: option.correct })),
  }
}

function attachSavedQuestionIds(
  drafts: DraftQuestion[],
  previous: TeacherQuizEditor | null,
  refreshed: TeacherQuizEditor
) {
  const previousIds = new Set((previous?.questions ?? []).map((question) => question.id))
  const additions = refreshed.questions.filter((question) => !previousIds.has(question.id))
  const available = [...additions]

  return drafts.map((draft) => {
    if (draft.serverId || !questionHasText(draft)) return draft
    const signature = questionSignature(draft)
    const matchIndex = available.findIndex((question) => serverQuestionSignature(question) === signature)
    if (matchIndex < 0) return draft
    const [saved] = available.splice(matchIndex, 1)
    return { ...draft, serverId: saved.id }
  })
}

function questionSignature(question: DraftQuestion) {
  return JSON.stringify({
    questionText: question.questionText.trim(),
    questionType: question.questionType,
    explanation: question.explanation.trim(),
    options: question.options.map((option) => ({ text: option.text.trim(), correct: option.correct })),
  })
}

function serverQuestionSignature(question: TeacherQuizQuestion) {
  return JSON.stringify({
    questionText: question.questionText.trim(),
    questionType: question.questionType,
    explanation: (question.explanation ?? '').trim(),
    options: question.options.map(({ text, correct }) => ({ text: text.trim(), correct })),
  })
}

export default TeacherQuiz

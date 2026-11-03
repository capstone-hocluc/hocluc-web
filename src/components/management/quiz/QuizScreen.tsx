import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { ForbiddenPage } from '../../console/access-states'
import QuizDetails from './QuizDetails'
import { useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from '../../console/icons'
import { getQuizCourseChapters, getQuizChapterLessons, getQuizCourses } from '../../../services/quizCourseService'
import { COURSE_QUIZ_TYPES, isCourseQuizType, quizTypeLabel, quizRequirement, type CourseQuizType } from '../../../lib/quiz-types'
import type { CourseAdmin } from '../../../services/courseAdminService'
import {
  addTeacherQuizQuestions,
  AmbiguousTeacherQuestionSaveError,
  createTeacherQuiz,
  deleteTeacherQuiz,
  deleteTeacherQuizQuestion,
  duplicateTeacherQuiz,
  getTeacherQuiz,
  getTeacherQuizzes,
  publishTeacherQuiz,
  reorderTeacherQuizQuestions,
  unpublishTeacherQuiz,
  updateTeacherQuiz,
  updateTeacherQuizQuestion,
  type TeacherQuestionType,
  type TeacherQuizEditor,
  type TeacherQuizQuestion,
  type TeacherQuizRecord,
} from '../../../services/teacherQuizService'
import { getErrorMessage } from '../../../lib/errors'
import { ApiError } from '../../../lib/api'
import { usePageResource } from '../../../hooks/usePageResource'
import Button from '../../console/button'
import PageHeading from '../../console/page-heading'
import { IconAction, RowActions } from '../../console/icon-action'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import QuizCatalog from './QuizCatalog'
import QuizImportDialog from './QuizImportDialog'
import DragHandle from '../crud/drag-handle'
import { arrayMove, useDragReorder } from '../crud/use-drag-reorder'
import { cn } from '../../../lib/cn'
import Card, { CardTitle } from '../../console/card'
import ConfirmDialog from '../../console/confirm-dialog'
import DropdownField from '../../console/dropdown-field'
import SelectField from '../../console/select-field'
import { Skeleton } from '../../tailgrids/core/skeleton'
import MockExamEditorSkeleton from './MockExamEditorSkeleton'
import { describePublishProblems } from './publish-problems'
import Notice from '../../console/notice'
import StatusBadge from '../../console/status'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../tailgrids/core/dropdown'

interface TeacherQuizProps {
  navigation?: ReactNode
  readOnly?: boolean
  initialEditorId?: string | null
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

type QuizFieldError = 'title' | 'duration' | 'attempts' | 'target' | 'questions'

const CHOICE_TYPES: TeacherQuestionType[] = ['SINGLE_CHOICE']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function QuizScreen({ navigation, course, onBack, onAction, startCreating = false, readOnly = true, initialEditorId = null }: TeacherQuizProps) {
  const quizzes = usePageResource(() => getTeacherQuizzes(course.id || undefined), [course.id])
  const [editorQuizId, setEditorQuizId] = useState<string | null>(initialEditorId)
  const [creating, setCreating] = useState(!readOnly && startCreating)
  const [viewingId, setViewingId] = useState<string | null>(null)
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
    if (readOnly || busyId) return
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
          ? `Chưa thể xuất bản: ${describePublishProblems(blockers)}. Mở chỉnh sửa để hoàn thiện quiz.`
          : getApiActionError(error)
      )
    } finally {
      setBusyId(null)
    }
  }

  if (viewingId) return <QuizDetails quizId={viewingId} onBack={() => setViewingId(null)} />

  if (!readOnly && (creating || editorQuizId)) {
    return (
      <TeacherQuizEditorScreen
        quizId={editorQuizId}
        course={course}
        onCancel={() => {
          setCreating(false)
          setEditorQuizId(null)
          refresh()
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

  const quizItems = (quizzes.data ?? []).filter(quiz => quiz.type !== 'EXAM' && quiz.type !== 'PLACEMENT')

  return (
    <section className="flex min-w-0 flex-col gap-5">
      {course.id && <Button appearance="ghost" size="sm" className="self-start" onClick={onBack}><ArrowLeft size={16} />Quay lại lớp học</Button>}
      <PageHeading title="Bài kiểm tra" readOnly={readOnly}
        action={!readOnly && <Button onClick={() => setCreating(true)}><Plus size={16} />Tạo bài kiểm tra</Button>} />
      {navigation}
      <QuizCatalog scope={course.id} items={quizItems} status={quizzes.status}
        errorMessage={quizzes.errorMessage} onRetry={refresh} readOnly={readOnly}
        renderActions={(quiz) => <RowActions>
                  <IconAction label="Xem nội dung" icon={Eye} onClick={() => setViewingId(quiz.id)} />
                  {!readOnly && <>
                  <Button
                    size="sm" appearance="ghost"
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
                    size="sm"
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
                    <DropdownMenuTrigger isDisabled={busyId !== null} aria-label={`Thao tác khác với ${quiz.title}`} className="grid size-9 place-items-center rounded-lg border border-card-border text-icon-tertiary hover:bg-background-gray-secondary data-disabled:opacity-50"><MoreHorizontal size={16} /></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem isDisabled={busyId !== null} onAction={() => void runQuizAction(quiz, () => duplicateTeacherQuiz(quiz.id), 'Đã sao chép quiz thành bản nháp.')}>
                        <Copy size={15} />Sao chép thành bản nháp
                      </DropdownMenuItem>
                      {!quizIsLocked(quiz) && (
                        <DropdownMenuItem
                          isDisabled={busyId !== null}
                          className="text-badge-error-text focus:text-badge-error-text"
                          onAction={() => setConfirmDelete(quiz)}
                        >
                          <Trash2 size={15} />Xóa quiz
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </>}
        </RowActions>} />

      {!readOnly && confirmDelete && (
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
            if (readOnly) return
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
  const access = useQuizAccess()
  const editor = usePageResource(() => access.canWrite && quizId ? getTeacherQuiz(quizId) : Promise.resolve(null), [quizId, access.canWrite])
  if (!access.canWrite) return <ForbiddenPage />
  if (quizId && editor.status === 'loading') {
    return <MockExamEditorSkeleton workspace={false} />
  }
  if (quizId && (editor.status !== 'ready' || !editor.data)) {
    return (
      <div className="rounded-xl border border-card-border bg-background-gray-secondary p-4" role="alert">
        <p className="m-0 text-sm text-text-tertiary">{editor.errorMessage || 'Không thể tải nội dung quiz.'}</p>
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
      onReload={editor.reload}
    />
  )
}

function TeacherQuizEditorForm({
  initial,
  course,
  onCancel,
  onSaved,
  onReload,
}: {
  initial: TeacherQuizEditor | null
  course: { id: string; name: string }
  onCancel: () => void
  onSaved: (message: string) => void
  onReload: () => void
}) {
  const access = useQuizAccess()
  const initialQuiz = initial?.quiz
  const initialQuestionsRef = useRef<TeacherQuizEditor | null>(initial)
  const [serverQuizId, setServerQuizId] = useState<string | null>(initialQuiz?.id ?? null)
  const [title, setTitle] = useState(initialQuiz?.title ?? '')
  const [duration, setDuration] = useState(String(initialQuiz?.durationMinutes ?? 30))
  const [attempts, setAttempts] = useState(String(initialQuiz?.maxAttempts ?? 1))
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [selectedType, setSelectedType] = useState<CourseQuizType>('QUICK')
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    initial?.questions.map(fromServerQuestion) ?? [createDraftQuestion()]
  )
  const pendingQuestionFocus = useRef<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<QuizFieldError, string>>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ambiguousCreate, setAmbiguousCreate] = useState(false)
  const [ambiguousQuestionSave, setAmbiguousQuestionSave] = useState(false)
  const [importBaseline] = useState(() => JSON.stringify({ title, duration, attempts, questions }))
  const hasUnsavedChanges = JSON.stringify({ title, duration, attempts, questions }) !== importBaseline
  const unsupportedStructure = Boolean(initial && (initial.sections.length > 0 || initial.groups.length > 0))
  const importBlockedReason = !serverQuizId ? ''
    : initialQuiz?.status !== 'DRAFT' || quizIsLocked(initialQuiz) ? 'Chỉ nhập vào bản nháp chưa có lượt làm.'
      : ambiguousCreate || ambiguousQuestionSave ? 'Tải lại bài để xác nhận kết quả lưu trước khi nhập.'
        : hasUnsavedChanges ? 'Lưu thay đổi rồi mở lại bài trước khi nhập file.'
          : unsupportedStructure ? 'Cấu trúc bài này đang ở chế độ chỉ xem.' : ''

  const courseCatalog = usePageResource(async () => {
    if (initialQuiz) return [] as CourseAdmin[]
    return getQuizCourses()
  }, [Boolean(initialQuiz)])

  const routeCourseId = UUID_PATTERN.test(course.id) ? course.id : ''
  const activeCourseId = selectedCourseId ?? routeCourseId

  const courseDetail = usePageResource(async () => {
    if (!activeCourseId || initialQuiz) return null
    return getQuizCourseChapters(activeCourseId)
  }, [activeCourseId, Boolean(initialQuiz)])

  const activeCourseDetail = courseDetail.status === 'ready' && courseDetail.data?.id === activeCourseId ? courseDetail.data : null
  const courseOptions = (courseCatalog.data ?? []).map((item) => ({ id: item.id, label: item.title }))
  if (routeCourseId && activeCourseId === routeCourseId && activeCourseDetail && !courseOptions.some((option) => option.id === routeCourseId)) {
    courseOptions.unshift({ id: routeCourseId, label: activeCourseDetail.title })
  }
  const courseCatalogHasError = ['error', 'forbidden', 'not-found'].includes(courseCatalog.status)
  const courseCatalogError = getResourceErrorMessage(courseCatalog.status, courseCatalog.errorMessage, 'danh sách khóa học')
  const courseDetailHasError = ['error', 'forbidden', 'not-found'].includes(courseDetail.status)
  const courseDetailError = getResourceErrorMessage(courseDetail.status, courseDetail.errorMessage, 'chương')
  const chapterOptions = activeCourseDetail?.chapters ?? []
  const effectiveChapterId = chapterOptions.some(chapter => chapter.id === selectedChapterId) ? selectedChapterId : ''
  const needsLesson = selectedType !== 'CHAPTER'
  const chapterLessons = usePageResource(() => !initialQuiz && needsLesson && effectiveChapterId
    ? getQuizChapterLessons(effectiveChapterId) : Promise.resolve(null), [Boolean(initialQuiz), needsLesson, effectiveChapterId])
  const lessonOptions = chapterLessons.status === 'ready' && chapterLessons.data?.chapterId === effectiveChapterId ? chapterLessons.data.lessons : []
  const lessonHasError = ['error', 'forbidden', 'not-found'].includes(chapterLessons.status)
  const targetLocked = serverQuizId !== null || busy || ambiguousCreate || ambiguousQuestionSave
  const effectiveLessonId = lessonOptions.some((lesson) => lesson.id === selectedLessonId)
    ? selectedLessonId
    : ''
  const settingsLocked = quizIsLocked(initialQuiz) || ambiguousCreate || ambiguousQuestionSave
  const questionsLocked = quizIsLocked(initialQuiz) || ambiguousCreate || ambiguousQuestionSave || unsupportedStructure

  const clearFieldError = (field: QuizFieldError) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
  }

  const addQuestion = () => {
    if (!access.canWrite || questionsLocked || busy) return
    clearFieldError('questions')
    const question = createDraftQuestion()
    pendingQuestionFocus.current = question.clientId
    setQuestions(items => [...items, question])
  }
  const reorderQuestions = (fromId: string, toId: string) => {
    if (!access.canWrite || questionsLocked || busy) return
    clearFieldError('questions')
    setQuestions(items => {
      const byId = new Map(items.map(item => [item.clientId, item]))
      return arrayMove(items.map(item => item.clientId), fromId, toId).map(id => byId.get(id)!)
    })
  }
  const shiftQuestion = (id: string, direction: -1 | 1) => {
    const target = questions[questions.findIndex(item => item.clientId === id) + direction]
    if (target) reorderQuestions(id, target.clientId)
  }
  const questionDrag = useDragReorder(reorderQuestions, shiftQuestion)

  const updateQuestion = (clientId: string, update: Partial<DraftQuestion>) => {
    clearFieldError('questions')
    setQuestions((items) => items.map((question) => question.clientId === clientId ? { ...question, ...update } : question))
  }
  const updateOption = (question: DraftQuestion, optionIndex: number, value: Partial<DraftOption>) => {
    updateQuestion(question.clientId, {
      options: question.options.map((option, index) => index === optionIndex ? { ...option, ...value } : option),
    })
  }

  const saveQuiz = async (publish: boolean) => {
    if (!access.canWrite || busy) return
    if (ambiguousQuestionSave) {
      setError('Kết quả lưu câu hỏi chưa rõ. Hãy quay về danh sách và mở lại quiz để kiểm tra; không gửi lại biểu mẫu này.')
      return
    }
    const durationMinutes = Number(duration)
    const maxAttempts = Number(attempts)
    const nextFieldErrors: Partial<Record<QuizFieldError, string>> = {}
    if (!title.trim()) nextFieldErrors.title = 'Nhập tên quiz trước khi lưu.'
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
      nextFieldErrors.duration = 'Thời gian làm bài phải từ 1 đến 600 phút.'
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 999) {
      nextFieldErrors.attempts = 'Số lần thử tối đa phải từ 1 đến 999.'
    }
    if (!serverQuizId && (!activeCourseId || !effectiveChapterId || (needsLesson && !effectiveLessonId))) {
      nextFieldErrors.target = needsLesson ? 'Chọn khóa học, chương và bài học.' : 'Chọn khóa học và chương.'
    }

    const questionsWithContent = questions.filter((question) =>
      question.questionText.trim() || question.options.some((option) => option.text.trim())
    )
    const invalidQuestion = questionsWithContent.find((question) => question.editable && (
      !question.questionText.trim() || question.options.length < 2 || question.options.some((option) => !option.text.trim())
    ))
    if (invalidQuestion) {
      nextFieldErrors.questions = 'Mỗi câu hỏi đã bắt đầu cần có nội dung và điền đủ ít nhất hai lựa chọn.'
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Vui lòng kiểm tra các trường được đánh dấu.')
      return
    }

    setBusy(true)
    setFieldErrors({})
    setError('')
    let quizId = serverQuizId
    try {
      if (!quizId) {
        const created = await createTeacherQuiz({
          type: selectedType,
          ...(needsLesson ? { lessonId: effectiveLessonId } : { chapterId: effectiveChapterId }),
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

      const savedDrafts = await persistQuestionChanges(quizId, questions, initialQuestionsRef.current)
      setQuestions(savedDrafts)
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
      if (saveError instanceof AmbiguousTeacherQuestionSaveError) {
        setAmbiguousQuestionSave(true)
        setError('')
        return
      }
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
      const validation = saveError instanceof ApiError
        ? mapTeacherQuizValidationErrors(saveError.errors ?? {})
        : { fields: {}, unmapped: [] }
      setFieldErrors(validation.fields)
      setError(
        validation.unmapped.length > 0
          ? `${getErrorMessage(saveError)}: ${validation.unmapped.join('; ')}`
          : Object.keys(validation.fields).length > 0
            ? 'Một số thông tin chưa hợp lệ. Hãy kiểm tra các trường được đánh dấu.'
            : getErrorMessage(saveError)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <PageHeading onBack={onCancel} backLabel="Quay lại danh sách quiz" parent="Bài kiểm tra" title={initialQuiz ? 'Chỉnh sửa bài kiểm tra' : serverQuizId ? 'Hoàn thiện bản nháp' : 'Tạo bài kiểm tra'} />

      {ambiguousCreate && (
        <Notice tone="warning" role="alert" aria-live="assertive">
          Máy chủ có thể đã tạo quiz nhưng phản hồi bị gián đoạn. Không gửi lại từ biểu mẫu này; hãy quay về danh sách quiz và kiểm tra thủ công trước khi tạo mới.
        </Notice>
      )}
      {ambiguousQuestionSave && (
        <Notice tone="warning" role="alert" aria-live="assertive">
          Máy chủ có thể đã nhận một phần thay đổi câu hỏi nhưng phản hồi bị gián đoạn hoặc dữ liệu trả về chưa hợp lệ. Không lưu lại từ biểu mẫu này; hãy quay về danh sách và mở lại quiz để kiểm tra.
        </Notice>
      )}

      {!initialQuiz && (
        <Card as="section" padding="lg" aria-labelledby="quiz-target-title">
          <CardTitle id="quiz-target-title" className="mb-3 text-base">Loại và vị trí bài kiểm tra</CardTitle>
          <label className="mb-3 flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Loại bài kiểm tra
            <SelectField ariaLabel="Loại bài kiểm tra" className="w-full md:max-w-80" options={COURSE_QUIZ_TYPES} value={selectedType} disabled={targetLocked}
              onChange={value => {
                if (!isCourseQuizType(value) || targetLocked) return
                setSelectedType(value)
                if (value === 'CHAPTER') setSelectedLessonId('')
                clearFieldError('target')
              }} />
          </label>
          <p className="mb-4 text-sm text-text-tertiary">{quizRequirement(selectedType)}</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Khóa học
              <DropdownField ariaLabel="Khóa học" placeholder="Chọn khóa học" options={courseOptions} value={activeCourseId || null}
                isSearchable isLoading={courseCatalog.status === 'loading'} isError={courseCatalogHasError} errorMessage={courseCatalogError}
                emptyMessage="Không có khóa học khả dụng." mobileTouchTargets isDisabled={targetLocked} isInvalid={Boolean(fieldErrors.target)}
                ariaDescribedBy={fieldErrors.target ? 'teacher-quiz-target-error' : undefined}
                onChange={value => {
                  if (targetLocked) return
                  clearFieldError('target'); setSelectedCourseId(value ?? ''); setSelectedChapterId(''); setSelectedLessonId('')
                }} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Chương
              <DropdownField ariaLabel="Chương" placeholder="Chọn chương" options={chapterOptions.map(chapter => ({ id: chapter.id, label: chapter.title }))}
                value={effectiveChapterId || null} isSearchable isLoading={Boolean(activeCourseId && !activeCourseDetail && !courseDetailHasError)}
                isError={Boolean(activeCourseId && courseDetailHasError)} errorMessage={courseDetailError} emptyMessage="Khóa học chưa có chương."
                mobileTouchTargets isDisabled={!activeCourseId || targetLocked} isInvalid={Boolean(fieldErrors.target)}
                ariaDescribedBy={fieldErrors.target ? 'teacher-quiz-target-error' : undefined}
                onChange={value => {
                  if (targetLocked) return
                  clearFieldError('target'); setSelectedChapterId(value ?? ''); setSelectedLessonId('')
                }} />
            </label>
            {needsLesson && <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Bài học
              <DropdownField ariaLabel="Bài học" placeholder="Chọn bài học" options={lessonOptions.map(lesson => ({ id: lesson.id, label: lesson.title }))}
                value={effectiveLessonId || null} isSearchable isLoading={Boolean(effectiveChapterId && chapterLessons.data?.chapterId !== effectiveChapterId && !lessonHasError)}
                isError={Boolean(effectiveChapterId && lessonHasError)} errorMessage={getResourceErrorMessage(chapterLessons.status, chapterLessons.errorMessage, 'bài học')}
                emptyMessage="Chương chưa có bài học." mobileTouchTargets isDisabled={!effectiveChapterId || targetLocked} isInvalid={Boolean(fieldErrors.target)}
                ariaDescribedBy={fieldErrors.target ? 'teacher-quiz-target-error' : undefined}
                onChange={value => { if (!targetLocked) { clearFieldError('target'); setSelectedLessonId(value ?? '') } }} />
            </label>}
          </div>
          {needsLesson && effectiveChapterId && lessonHasError && <div className="mt-2 flex items-center gap-2" role="alert">
            <p className="text-sm text-badge-error-text">{getResourceErrorMessage(chapterLessons.status, chapterLessons.errorMessage, 'bài học')}</p>
            {chapterLessons.status === 'error' && <Button appearance="outline" onClick={chapterLessons.reload}>Thử lại</Button>}
          </div>}
          {fieldErrors.target && <p id="teacher-quiz-target-error" className="mt-2 mb-0 text-sm font-medium text-badge-error-text" role="alert">{fieldErrors.target}</p>}
          {courseCatalog.status === 'loading' && <Skeleton className="mt-2 h-4 w-48" role="status" aria-label="Đang tải khóa học" />}
          {courseCatalogHasError && (
            <div className="mt-2 flex flex-wrap items-center gap-2" role="alert">
              <p className="m-0 text-sm text-badge-error-text">{courseCatalogError}</p>
              {courseCatalog.status === 'error' && <Button appearance="outline" className="min-h-11" onClick={courseCatalog.reload}>Thử lại</Button>}
            </div>
          )}
          {courseCatalog.status === 'ready' && (courseCatalog.data?.length ?? 0) === 0 && (
            <p className="mt-2 mb-0 text-sm text-text-tertiary">Hiện chưa có khóa học khả dụng để gắn bài kiểm tra.</p>
          )}
          {activeCourseId && activeCourseDetail && chapterOptions.length === 0 && (
            <p className="mt-2 mb-0 text-sm text-text-tertiary">Khóa học này chưa có chương để gắn bài kiểm tra.</p>
          )}
          {activeCourseId && courseDetail.status === 'loading' && <Skeleton className="mt-2 h-4 w-40" role="status" aria-label="Đang tải chương" />}
          {activeCourseId && courseDetailHasError && (
            <div className="mt-2 flex flex-wrap items-center gap-2" role="alert">
              <p className="m-0 text-sm text-badge-error-text">{courseDetailError}</p>
              {courseDetail.status === 'error' && <Button appearance="outline" className="min-h-11" onClick={courseDetail.reload}>Thử lại</Button>}
            </div>
          )}
          {routeCourseId && courseCatalog.status === 'ready' && (
            <p className="mt-2 mb-0 text-xs text-text-tertiary" role="note">
              {routeCourseId && activeCourseId === routeCourseId && activeCourseDetail
                ? 'Đã điền sẵn khóa học theo đường dẫn. Máy chủ sẽ xác thực quyền quản lý khi lưu.'
                : routeCourseId && activeCourseId === routeCourseId && courseDetailHasError
                  ? 'Không tải được khóa học theo đường dẫn. Hãy chọn khóa học khác trong danh sách.'
                  : routeCourseId && activeCourseId === routeCourseId
                    ? 'Đang tải khóa học theo đường dẫn...'
                : 'Khóa học từ đường dẫn không xuất hiện trong danh mục hiện có. Hãy chọn khóa học và bài học bạn được phép quản lý; máy chủ sẽ xác thực quyền khi lưu.'}
            </p>
          )}
          {serverQuizId && <p className="mt-2 mb-0 text-xs text-text-tertiary">Bản nháp đã được tạo. Nếu cần đổi loại hoặc vị trí, hãy tạo bài kiểm tra mới.</p>}
        </Card>
      )}

      {initialQuiz && (
        <div className="rounded-xl border border-card-border bg-badge-blue-background px-4 py-3 text-sm text-text-tertiary">
          <StatusBadge tone="info">{quizTypeLabel(initialQuiz.type)}</StatusBadge>
          <p className="mt-2">{quizRequirement(initialQuiz.type)}</p>
          {[initialQuiz.courseTitle, initialQuiz.chapterTitle, initialQuiz.lessonTitle].filter(Boolean).join(' · ')}
          <p className="mt-2 text-xs">Loại và vị trí bài kiểm tra được giữ cố định sau khi tạo.</p>
          {quizIsLocked(initialQuiz) && <p className="mt-1 mb-0 font-medium">Quiz đã có lượt thi; câu hỏi và quy định làm bài đang khóa.</p>}
        </div>
      )}

      <Card as="section" padding="lg" aria-labelledby="quiz-settings-title">
        <CardTitle id="quiz-settings-title" className="mb-3 text-base">Thông tin bài kiểm tra</CardTitle>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary md:col-span-2">
            Tên bài kiểm tra
            <input id="teacher-quiz-title" className={`${fieldControlClass} aria-invalid:border-input-error-focus-border`} value={title} onChange={(event) => { setTitle(event.target.value); clearFieldError('title') }} disabled={busy || ambiguousCreate || ambiguousQuestionSave} maxLength={500} aria-invalid={fieldErrors.title ? true : undefined} aria-describedby={fieldErrors.title ? 'teacher-quiz-title-error' : undefined} />
            {fieldErrors.title && <span id="teacher-quiz-title-error" className="text-sm font-medium text-badge-error-text" role="alert">{fieldErrors.title}</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Thời gian (phút)
            <input id="teacher-quiz-duration" className={fieldControlClass} type="number" min="1" max="600" value={duration} onChange={(event) => { setDuration(event.target.value); clearFieldError('duration') }} disabled={settingsLocked || busy} aria-invalid={fieldErrors.duration ? true : undefined} aria-describedby={fieldErrors.duration ? 'teacher-quiz-duration-error' : undefined} />
            {fieldErrors.duration && <span id="teacher-quiz-duration-error" className="text-sm font-medium text-badge-error-text" role="alert">{fieldErrors.duration}</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Số lần làm tối đa
            <input id="teacher-quiz-attempts" className={fieldControlClass} type="number" min="1" max="999" value={attempts} onChange={(event) => { setAttempts(event.target.value); clearFieldError('attempts') }} disabled={settingsLocked || busy} aria-invalid={fieldErrors.attempts ? true : undefined} aria-describedby={fieldErrors.attempts ? 'teacher-quiz-attempts-error' : undefined} />
            {fieldErrors.attempts && <span id="teacher-quiz-attempts-error" className="text-sm font-medium text-badge-error-text" role="alert">{fieldErrors.attempts}</span>}
          </label>
        </div>
      </Card>

      <Card as="section" padding="lg" aria-labelledby="quiz-questions-title" aria-describedby={fieldErrors.questions ? 'teacher-quiz-questions-error' : undefined}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="quiz-questions-title" className="text-base">Câu hỏi ({questions.length})</CardTitle>
          <QuizImportDialog quizId={serverQuizId} blockedReason={importBlockedReason} busy={busy} onReload={onReload}
            onBusyChange={setBusy} />
          <Button appearance="outline" className="min-h-11" disabled={questionsLocked || busy} onClick={addQuestion}>
            <Plus size={15} />Thêm câu hỏi
          </Button>
        </div>
        {unsupportedStructure && <Notice tone="warning">Bài có phần hoặc nhóm câu hỏi ngoài phạm vi chỉnh sửa của màn này. Câu hỏi được giữ ở chế độ chỉ xem để bảo toàn cấu trúc.</Notice>}
        {questions.length === 0 ? (
          <p className="rounded-xl bg-background-gray-secondary p-4 text-sm text-text-tertiary">Quiz nháp chưa có câu hỏi. Hãy thêm câu hỏi trước khi xuất bản.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((question, questionIndex) => (
              <article key={question.clientId}
                {...(!questionsLocked && !busy ? questionDrag.rowProps(question.clientId) : {})}
                className={cn('rounded-xl border border-card-border bg-background-gray-secondary p-4', questionDrag.rowProps(question.clientId).className)}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {!questionsLocked && <DragHandle {...questionDrag.handleProps(question.clientId, `câu ${questionIndex + 1}`, busy)} />}
                    <strong className="text-sm text-text-primary">Câu {questionIndex + 1}</strong>
                  </div>
                  <RowActions>
                    {!questionsLocked && <>
                      <IconAction label={`Đưa câu hỏi ${questionIndex + 1} lên`} icon={ArrowUp} disabled={busy || questionIndex === 0} onClick={() => shiftQuestion(question.clientId, -1)} />
                      <IconAction label={`Đưa câu hỏi ${questionIndex + 1} xuống`} icon={ArrowDown} disabled={busy || questionIndex === questions.length - 1} onClick={() => shiftQuestion(question.clientId, 1)} />
                    </>}
                  {!question.editable && <StatusBadge tone="warning">Định dạng chỉ đọc</StatusBadge>}
                  {question.editable && !questionsLocked && (
                    <Button variant="danger" appearance="ghost" aria-label={`Xóa câu ${questionIndex + 1}`} className="min-h-11" disabled={busy} onClick={() => { clearFieldError('questions'); setQuestions((items) => items.filter((item) => item.clientId !== question.clientId)) }}>
                      <Trash2 size={15} />
                    </Button>
                  )}
                  </RowActions>
                </div>
                {!question.editable ? (
                  <div className="text-sm text-text-tertiary">
                    <p className="mt-0 mb-2 whitespace-pre-wrap">{question.questionText}</p>
                    <ul className="m-0 pl-5">{question.options.map((option, index) => <li key={`${question.clientId}-${index}`}>{option.text}{option.correct ? ' ✓' : ''}</li>)}</ul>
                    <p className="mt-2 mb-0">Câu hỏi loại {question.questionType} chưa được hỗ trợ chỉnh sửa ở màn hình này.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                      Nội dung câu hỏi
                      <textarea ref={node => {
                        if (node && pendingQuestionFocus.current === question.clientId) {
                          pendingQuestionFocus.current = null
                          node.focus()
                        }
                      }} className={textareaControlClass} value={question.questionText} disabled={questionsLocked || busy} onChange={(event) => updateQuestion(question.clientId, { questionText: event.target.value })} />
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
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-card-background text-xs font-medium text-text-tertiary">{String.fromCharCode(65 + optionIndex)}</span>
                          <input className={`${fieldControlClass} min-w-0 flex-1`} value={option.text} placeholder={`Lựa chọn ${String.fromCharCode(65 + optionIndex)}`} aria-label={`Nội dung lựa chọn ${String.fromCharCode(65 + optionIndex)} cho câu ${questionIndex + 1}`} disabled={questionsLocked || busy} onChange={(event) => updateOption(question, optionIndex, { text: event.target.value })} />
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
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                      Giải thích (không bắt buộc)
                      <textarea className={textareaControlClass} value={question.explanation} disabled={questionsLocked || busy} onChange={(event) => updateQuestion(question.clientId, { explanation: event.target.value })} />
                    </label>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        <Button appearance="outline" className="mt-4 min-h-11 w-full border-dashed" disabled={questionsLocked || busy} onClick={addQuestion}>
          <Plus size={16} />Thêm câu hỏi
        </Button>
        {!questionsLocked && <p className="mt-2 text-xs text-text-tertiary">Kéo biểu tượng bên cạnh số câu hoặc dùng nút lên/xuống để đổi vị trí. Nhấn lưu để giữ thứ tự mới.</p>}
        {fieldErrors.questions && <p id="teacher-quiz-questions-error" className="mt-4 mb-0 text-sm font-medium text-badge-error-text" role="alert">{fieldErrors.questions}</p>}
        {error && <p className="mt-4 mb-0 text-sm font-medium text-badge-error-text" role="alert">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
          <Button appearance="outline" className="min-h-11" disabled={busy} onClick={onCancel}>{ambiguousCreate || ambiguousQuestionSave ? 'Quay về danh sách quiz' : 'Hủy'}</Button>
          <Button appearance="outline" className="min-h-11" disabled={busy || ambiguousCreate || ambiguousQuestionSave} onClick={() => void saveQuiz(false)}>
            {busy ? 'Đang lưu...' : initialQuiz || serverQuizId ? 'Lưu thay đổi' : 'Lưu bản nháp'}
          </Button>
          {(!initialQuiz || initialQuiz.status !== 'PUBLISHED') && (
            <Button className="min-h-11" disabled={busy || ambiguousCreate || ambiguousQuestionSave} onClick={() => void saveQuiz(true)}>
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
): Promise<DraftQuestion[]> {
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
  const createdQuestions = newQuestions.length > 0
    ? await addTeacherQuizQuestions(quizId, newQuestions.map(toSavePayload))
    : []
  const savedIds = new Map(newQuestions.map((question, index) => [question.clientId, createdQuestions[index].id]))
  const savedDrafts = drafts.map((question) => {
    const serverId = savedIds.get(question.clientId)
    return serverId ? { ...question, clientId: serverId, serverId } : question
  })
  // BE requires every saved question exactly once, including unsupported read-only formats.
  // New blank cards have no server ID and are excluded until they contain content.
  const desiredOrder = savedDrafts.flatMap(question => question.serverId ? [question.serverId] : [])
  const serverOrder = [
    ...previousQuestions.filter(question => currentServerIds.has(question.id)).map(question => question.id),
    ...createdQuestions.map(question => question.id),
  ]
  if (desiredOrder.length > 0 && JSON.stringify(desiredOrder) !== JSON.stringify(serverOrder)) {
    await reorderTeacherQuizQuestions(quizId, desiredOrder)
  }
  return savedDrafts
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

function mapTeacherQuizValidationErrors(errors: Record<string, string>) {
  const fields: Partial<Record<QuizFieldError, string>> = {}
  const unmapped: string[] = []

  for (const [key, message] of Object.entries(errors)) {
    if (!message) continue
    const normalizedKey = key.replace(/[^a-z]/gi, '').toLowerCase()
    const field: QuizFieldError | undefined = normalizedKey.includes('title')
      ? 'title'
      : normalizedKey.includes('duration')
        ? 'duration'
        : normalizedKey.includes('attempt')
          ? 'attempts'
          : normalizedKey.includes('course') || normalizedKey.includes('chapter') || normalizedKey.includes('lesson') || normalizedKey === 'type'
            ? 'target'
            : normalizedKey.includes('question') || normalizedKey.includes('option')
              ? 'questions'
              : undefined

    if (field) fields[field] = fields[field] ? `${fields[field]}; ${message}` : message
    else unmapped.push(message)
  }

  return { fields, unmapped }
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

export default QuizScreen

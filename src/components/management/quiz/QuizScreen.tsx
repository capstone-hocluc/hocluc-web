import QuizLabelRun from './QuizLabelRun'
import QuizQuestionSkill from './QuizQuestionSkill'
import { useQuizLabels } from './useQuizLabels'
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
  Clock3,
  Pencil,
  Plus,
  Settings,
  Send,
  Trash2,
  X,
} from '../../console/icons'
import {
  addTeacherQuizQuestions,
  AmbiguousTeacherQuestionSaveError,
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
import QuizAnswerReviewDialog from './QuizAnswerReviewDialog'
import DragHandle from '../crud/drag-handle'
import { arrayMove, useDragReorder } from '../crud/use-drag-reorder'
import { cn } from '../../../lib/cn'
import ConfirmDialog from '../../console/confirm-dialog'
import MockExamEditorSkeleton from './MockExamEditorSkeleton'
import EditorFrame from './EditorFrame'
import EditorLayoutToggle from './EditorLayoutToggle'
import EditorTopBar from './EditorTopBar'
import { useEditorLayout } from './editor-layout'
import { useMinWidth } from '../../../hooks/use-min-width'
import QuizCreateDialog from './QuizCreateDialog'
import QuizSettingsSheet, { type QuizSettingsValues } from './QuizSettingsSheet'
import { formatApiError, mapTeacherQuizValidationErrors, type QuizFieldError } from './quiz-form-errors'
import ScrollArea from '../../ui/ScrollArea'
import { useConsoleFocus } from '../../console/console-focus'
import { describePublishProblems } from './publish-problems'
import Notice from '../../console/notice'
import StatusBadge from '../../console/status'

interface TeacherQuizProps {
  navigation?: ReactNode
  readOnly?: boolean
  /** The quiz open in the editor, from the address; null shows the list. */
  editorId?: string | null
  /** Opens a quiz in the editor (an id) or goes back to the list (null), through the address. */
  onEditorChange: (id: string | null) => void
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


const CHOICE_TYPES: TeacherQuestionType[] = ['SINGLE_CHOICE']

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

function QuizScreen({ navigation, course, onBack, onAction, startCreating = false, readOnly = true, editorId = null, onEditorChange }: TeacherQuizProps) {
  const quizzes = usePageResource(() => getTeacherQuizzes(course.id || undefined), [course.id])
  const [creating, setCreating] = useState(!readOnly && startCreating)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TeacherQuizRecord | null>(null)
  const [answerSettingsQuiz, setAnswerSettingsQuiz] = useState<TeacherQuizRecord | null>(null)
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
          : formatApiError(error)
      )
    } finally {
      setBusyId(null)
    }
  }

  if (viewingId) return <QuizDetails quizId={viewingId} onBack={() => setViewingId(null)} />

  if (!readOnly && editorId) {
    return (
      <TeacherQuizEditorScreen
        quizId={editorId}
        onCancel={() => {
          onEditorChange(null)
          refresh()
        }}
        onSaved={(message) => {
          onEditorChange(null)
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
                  <IconAction
                    label={quiz.status !== 'DRAFT' || quizIsLocked(quiz) || forceCopyIds.has(quiz.id) ? 'Tạo bản nháp sửa' : 'Chỉnh sửa'}
                    icon={Pencil}
                    disabled={busyId !== null}
                    onClick={() => {
                      const duplicateBeforeEdit =
                        quiz.status !== 'DRAFT' || quizIsLocked(quiz) || forceCopyIds.has(quiz.id)
                      if (!duplicateBeforeEdit) {
                        onEditorChange(quiz.id)
                        return
                      }
                      void runQuizAction(
                        quiz,
                        () => duplicateTeacherQuiz(quiz.id).then((copy) => {
                          onEditorChange(copy.id)
                          return copy
                        }),
                        'Đã tạo bản nháp để chỉnh sửa; quiz gốc chưa bị thay đổi.'
                      )
                    }}
                  />
                  <IconAction
                    label={quiz.status === 'PUBLISHED' ? 'Ẩn quiz' : 'Xuất bản'}
                    icon={quiz.status === 'PUBLISHED' ? X : Send}
                    disabled={busyId !== null}
                    onClick={() => runQuizAction(
                      quiz,
                      () => quiz.status === 'PUBLISHED' ? unpublishTeacherQuiz(quiz.id) : publishTeacherQuiz(quiz.id),
                      quiz.status === 'PUBLISHED' ? 'Đã ẩn quiz.' : 'Đã xuất bản quiz.',
                      quiz.status === 'PUBLISHED'
                    )}
                  />
                  {quiz.status !== 'ARCHIVED' && (
                    <IconAction label="Cấu hình xem đáp án" icon={Eye} disabled={busyId !== null} onClick={() => setAnswerSettingsQuiz(quiz)} />
                  )}
                  <IconAction label="Sao chép thành bản nháp" icon={Copy} disabled={busyId !== null}
                    onClick={() => void runQuizAction(quiz, () => duplicateTeacherQuiz(quiz.id), 'Đã sao chép quiz thành bản nháp.')} />
                  {!quizIsLocked(quiz) && (
                    <IconAction label="Xóa quiz" icon={Trash2} variant="danger" disabled={busyId !== null} onClick={() => setConfirmDelete(quiz)} />
                  )}
                  </>}
        </RowActions>} />

      {!readOnly && creating && (
        <QuizCreateDialog routeCourseId={course.id} onClose={() => { setCreating(false); if (startCreating) onEditorChange(null) }}
          onCreated={(created) => {
            setCreating(false)
            refresh()
            onEditorChange(created.id)
          }} />
      )}
      {!readOnly && answerSettingsQuiz && (
        <QuizAnswerReviewDialog quiz={answerSettingsQuiz} busy={busyId === answerSettingsQuiz.id}
          onCancel={() => setAnswerSettingsQuiz(null)}
          onSave={(showAnswers) => void runQuizAction(answerSettingsQuiz, async () => {
            await updateTeacherQuiz(answerSettingsQuiz.id, { showAnswers })
            setAnswerSettingsQuiz(null)
          }, 'Đã lưu cấu hình xem đáp án.')} />
      )}
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
  onCancel,
  onSaved,
}: {
  quizId: string
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const access = useQuizAccess()
  const [layout] = useEditorLayout()
  useConsoleFocus(layout === 'workspace')
  const editor = usePageResource(() => access.canWrite ? getTeacherQuiz(quizId) : Promise.resolve(null), [quizId, access.canWrite])
  if (!access.canWrite) return <ForbiddenPage />
  if (editor.status === 'loading') {
    return <MockExamEditorSkeleton rail={false} />
  }
  if (editor.status !== 'ready' || !editor.data) {
    return (
      <div className="m-6 rounded-xl border border-card-border bg-background-gray-secondary p-4" role="alert">
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
      key={quizId}
      initial={editor.data}
      onCancel={onCancel}
      onSaved={onSaved}
      onReload={editor.reload}
    />
  )
}

/** A quiz just made has no questions yet; it opens with an empty one, ready to type into. */
function initialQuestions(initial: TeacherQuizEditor) {
  if (initial.questions.length > 0 || quizIsLocked(initial.quiz)) return initial.questions.map(fromServerQuestion)
  return [createDraftQuestion()]
}

function TeacherQuizEditorForm({
  initial,
  onCancel,
  onSaved,
  onReload,
}: {
  initial: TeacherQuizEditor
  onCancel: () => void
  onSaved: (message: string) => void
  onReload: () => void
}) {
  const access = useQuizAccess()
  const [layout] = useEditorLayout()
  // In the assistant's frame the settings sit beside the questions when there is room; a drawer otherwise.
  const settingsDocked = useMinWidth(1024) && layout === 'workspace'
  const initialQuiz = initial.quiz
  const quizId = initialQuiz.id
  const initialQuestionsRef = useRef<TeacherQuizEditor | null>(initial)
  const quizLabels = useQuizLabels(quizId)
  const [values, setValues] = useState<QuizSettingsValues>({
    title: initialQuiz.title,
    duration: String(initialQuiz.durationMinutes ?? 30),
    attempts: String(initialQuiz.maxAttempts ?? 1),
    showAnswers: initialQuiz.showAnswers ?? false,
  })
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => initialQuestions(initial))
  // The empty first question of a new quiz takes the cursor.
  const pendingQuestionFocus = useRef<string | null>(initial.questions.length === 0 ? questions[0]?.clientId ?? null : null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<QuizFieldError, string>>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ambiguousQuestionSave, setAmbiguousQuestionSave] = useState(false)
  const [importBaseline] = useState(() => JSON.stringify({ values, questions }))
  const hasUnsavedChanges = JSON.stringify({ values, questions }) !== importBaseline
  const unsupportedStructure = initial.sections.length > 0 || initial.groups.length > 0
  const importBlockedReason = initialQuiz.status !== 'DRAFT' || quizIsLocked(initialQuiz) ? 'Chỉ nhập vào bản nháp chưa có lượt làm.'
    : ambiguousQuestionSave ? 'Tải lại bài để xác nhận kết quả lưu trước khi nhập.'
      : hasUnsavedChanges ? 'Lưu thay đổi rồi mở lại bài trước khi nhập file.'
        : unsupportedStructure ? 'Cấu trúc bài này đang ở chế độ chỉ xem.' : ''
  const settingsLocked = quizIsLocked(initialQuiz) || ambiguousQuestionSave
  const questionsLocked = quizIsLocked(initialQuiz) || ambiguousQuestionSave || unsupportedStructure

  const updateValue = <K extends keyof QuizSettingsValues>(key: K, value: QuizSettingsValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    const field: QuizFieldError | null = key === 'title' ? 'title' : key === 'duration' ? 'duration' : key === 'attempts' ? 'attempts' : null
    if (field) clearFieldError(field)
  }

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
    const durationMinutes = Number(values.duration)
    const maxAttempts = Number(values.attempts)
    const nextFieldErrors: Partial<Record<QuizFieldError, string>> = {}
    if (!values.title.trim()) nextFieldErrors.title = 'Nhập tên quiz trước khi lưu.'
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
      nextFieldErrors.duration = 'Thời gian làm bài phải từ 1 đến 600 phút.'
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 999) {
      nextFieldErrors.attempts = 'Số lần thử tối đa phải từ 1 đến 999.'
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
      if (nextFieldErrors.title || nextFieldErrors.duration || nextFieldErrors.attempts) setSettingsOpen(true)
      return
    }

    setBusy(true)
    setFieldErrors({})
    setError('')
    try {
      await updateTeacherQuiz(quizId, settingsLocked
        ? { title: values.title.trim(), showAnswers: values.showAnswers }
        : { title: values.title.trim(), durationMinutes, maxAttempts, showAnswers: values.showAnswers })

      const savedDrafts = await persistQuestionChanges(quizId, questions, initialQuestionsRef.current)
      setQuestions(savedDrafts)
      const refreshed = await getTeacherQuiz(quizId)
      initialQuestionsRef.current = refreshed
      setQuestions(refreshed.questions.map(fromServerQuestion))

      if (publish) {
        await publishTeacherQuiz(quizId)
        onSaved('Đã lưu và xuất bản quiz.')
      } else {
        onSaved('Đã lưu thay đổi quiz.')
      }
    } catch (saveError) {
      if (saveError instanceof AmbiguousTeacherQuestionSaveError) {
        setAmbiguousQuestionSave(true)
        setError('')
        return
      }
      try {
        const refreshed = await getTeacherQuiz(quizId)
        const previous = initialQuestionsRef.current
        initialQuestionsRef.current = refreshed
        setQuestions((drafts) => attachSavedQuestionIds(drafts, previous, refreshed))
      } catch {
        // Keep the form state if the follow-up read also fails.
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
    <EditorFrame
      layout={layout}
      header={<EditorTopBar layout={layout} title={initialQuiz.title} backLabel="Quay lại danh sách quiz" status={initialQuiz.status} onBack={onCancel}>
        <Button appearance="ghost" aria-pressed={settingsDocked ? settingsOpen : undefined} onClick={() => setSettingsOpen((open) => !open)} disabled={busy}>
          <Settings size={15} />Thiết lập
        </Button>
        <Button appearance="ghost" className={ambiguousQuestionSave ? undefined : 'max-sm:hidden'} disabled={busy} onClick={onCancel}>
          {ambiguousQuestionSave ? 'Quay về danh sách quiz' : 'Hủy'}
        </Button>
        <Button appearance="outline" disabled={busy || ambiguousQuestionSave} onClick={() => void saveQuiz(false)}>
          <Clock3 size={15} />{busy ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
        {initialQuiz.status !== 'PUBLISHED' && (
          <Button disabled={busy || ambiguousQuestionSave} onClick={() => void saveQuiz(true)}>
            <CheckCircle2 size={15} />{busy ? 'Đang xử lý...' : 'Lưu và xuất bản'}
          </Button>
        )}
        <EditorLayoutToggle />
      </EditorTopBar>}
      notices={(error || ambiguousQuestionSave) && <>
        {error && <Notice tone="danger" role="alert" className="font-medium">{error}</Notice>}
        {ambiguousQuestionSave && (
          <Notice tone="warning" role="alert" aria-live="assertive">
            Máy chủ có thể đã nhận một phần thay đổi câu hỏi nhưng phản hồi bị gián đoạn hoặc dữ liệu trả về chưa hợp lệ. Không lưu lại từ biểu mẫu này; hãy quay về danh sách và mở lại quiz để kiểm tra.
          </Notice>
        )}
      </>}
      aside={<QuizSettingsSheet docked={settingsDocked} open={settingsOpen} onClose={() => setSettingsOpen(false)} quiz={initialQuiz} values={values} onChange={updateValue}
        fieldErrors={fieldErrors} nameDisabled={busy || ambiguousQuestionSave} rulesDisabled={settingsLocked || busy} locked={quizIsLocked(initialQuiz)} />}
    >
      <ScrollArea aria-label="Nội dung bài kiểm tra" className="min-h-0 flex-1">
        <section aria-labelledby="quiz-questions-title" aria-describedby={fieldErrors.questions ? 'teacher-quiz-questions-error' : undefined}
          className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="quiz-questions-title" className="m-0 text-base font-semibold text-text-primary">Câu hỏi ({questions.length})</h2>
            <div className="flex flex-wrap items-center gap-2">
              <QuizLabelRun quizId={quizId} resource={quizLabels} />
              <QuizImportDialog quizId={quizId} blockedReason={importBlockedReason} busy={busy} onReload={onReload} onBusyChange={setBusy} />
              <Button appearance="outline" className="min-h-11" disabled={questionsLocked || busy} onClick={addQuestion}>
                <Plus size={15} />Thêm câu hỏi
              </Button>
            </div>
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
                  {question.serverId && <QuizQuestionSkill quizId={quizId} questionId={question.serverId} resource={quizLabels} />}
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
          <Button appearance="outline" className="min-h-11 w-full border-dashed" disabled={questionsLocked || busy} onClick={addQuestion}>
            <Plus size={16} />Thêm câu hỏi
          </Button>
          {!questionsLocked && <p className="m-0 text-xs text-text-tertiary">Kéo biểu tượng bên cạnh số câu hoặc dùng nút lên/xuống để đổi vị trí. Nhấn lưu để giữ thứ tự mới.</p>}
          {fieldErrors.questions && <p id="teacher-quiz-questions-error" className="m-0 text-sm font-medium text-badge-error-text" role="alert">{fieldErrors.questions}</p>}
        </section>
      </ScrollArea>
    </EditorFrame>
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

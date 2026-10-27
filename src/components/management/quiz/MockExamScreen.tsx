import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { getCategories, type Category } from '../../../services/categoryService'
import { ForbiddenPage } from '../../console/access-states'
import QuizDetails from './QuizDetails'
import { useRef, useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import {
  ArrowDown,
  ArrowLeft,
  Eye,
  ArrowUp,
  ClipboardCheck,
  Clock3,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from '../../console/icons'
import { getQuizCourses } from '../../../services/quizCourseService'
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
  setTeacherQuizLayout,
  unpublishTeacherQuiz,
  updateTeacherQuiz,
  updateTeacherQuizQuestion,
  type SaveTeacherQuestionRequest,
  type TeacherQuestionType,
  type TeacherQuizEditor,
  type TeacherQuizQuestion,
  type TeacherQuizRecord,
  type CreateTeacherQuizRequest,
  type TeacherQuizSectionSpec,
} from '../../../services/teacherQuizService'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { usePageResource } from '../../../hooks/usePageResource'
import Button from '../../console/button'
import PageHeading from '../../console/page-heading'
import { IconAction, RowActions } from '../../console/icon-action'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import QuizCatalog from './QuizCatalog'
import QuizImportDialog from './QuizImportDialog'
import QuizPdfImportPanel from './QuizPdfImportPanel'
import DragHandle from '../crud/drag-handle'
import { arrayMove, useDragReorder } from '../crud/use-drag-reorder'
import { cn } from '../../../lib/cn'
import Card, { CardEyebrow, CardTitle } from '../../console/card'
import ConfirmDialog from '../../console/confirm-dialog'
import DropdownField from '../../console/dropdown-field'
import { Skeleton } from '../../tailgrids/core/skeleton'
import Notice from '../../console/notice'
import StatusBadge from '../../console/status'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../tailgrids/core/dropdown'

type AssessmentType = 'EXAM' | 'PLACEMENT'

interface TeacherMockExamsProps {
  onOpenEditor?: (quizId: string) => void
  navigation?: ReactNode
  assessmentType?: AssessmentType
  readOnly?: boolean
  startCreating?: boolean
  initialEditorId?: string | null
  onBack: () => void
  onAction: (message: string) => void
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
  imageUrl: string | null
  categoryId: string | null
  difficulty: string | null
  sourcePage: number | null
  marks: number | null
  needsReview: boolean
  reviewNote: string
  editable: boolean
}

interface DraftSection {
  clientId: string
  title: string
  categoryId: string | null
  suggestedMinutes: string
  unassigned: boolean
  questions: DraftQuestion[]
}

interface ExamSettings {
  description: string
  title: string
  courseId: string
  duration: string
  maxAttempts: string
  passingPercentage: string
  availableFrom: string
  availableUntil: string
  showAnswers: boolean
  practiceAllowed: boolean
}

interface PendingExamCreate {
  type: AssessmentType
  existingIds: Set<string>
  startedAt: number
  createdById: string | null
  title: string
  courseId: string
  durationMinutes: number
  maxAttempts: number
  passingPercentage: number | null
  showAnswers: boolean
  practiceAllowed: boolean
  availableFrom: number | null
  availableUntil: number | null
}


const CHOICE_TYPES: TeacherQuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']
const QUESTION_TYPE_OPTIONS: Array<{ id: TeacherQuestionType; label: string }> = [
  { id: 'SINGLE_CHOICE', label: 'Trắc nghiệm một đáp án' },
  { id: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm nhiều đáp án' },
  { id: 'LONG_ANSWER', label: 'Tự luận' },
]

function createDraftQuestion(): DraftQuestion {
  return {
    clientId: 'local-question-' + crypto.randomUUID(),
    serverId: null,
    questionText: '',
    questionType: 'SINGLE_CHOICE',
    options: Array.from({ length: 4 }, () => ({ text: '', correct: false })),
    explanation: '',
    imageUrl: null,
    categoryId: null,
    difficulty: null,
    sourcePage: null,
    marks: null,
    needsReview: false,
    reviewNote: '',
    editable: true,
  }
}

function createDraftSection(title = ''): DraftSection {
  return {
    clientId: 'local-section-' + crypto.randomUUID(),
    title,
    categoryId: null,
    suggestedMinutes: '',
    unassigned: false,
    questions: [],
  }
}

function createUnassignedSection(questions: DraftQuestion[]): DraftSection {
  return {
    clientId: 'unassigned-questions',
    title: 'Câu hỏi chưa xếp phần',
    categoryId: null,
    suggestedMinutes: '',
    unassigned: true,
    questions,
  }
}

function fromServerQuestion(question: TeacherQuizQuestion): DraftQuestion {
  const editable = question.questionType === 'SINGLE_CHOICE'
  return {
    clientId: question.id,
    serverId: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    options: question.options.map((option) => ({ text: option.text, correct: option.correct })),
    explanation: question.explanation ?? '',
    imageUrl: question.imageUrl,
    categoryId: question.categoryId,
    difficulty: question.difficulty ?? null,
    sourcePage: question.sourcePage,
    marks: question.marks,
    needsReview: question.needsReview,
    reviewNote: question.reviewNote ?? '',
    editable: editable && question.options.length <= 8,
  }
}

function fromServerEditor(editor: TeacherQuizEditor): DraftSection[] {
  const questions = [...editor.questions].sort((a, b) => a.sequence - b.sequence)
  const orderedSections = [...editor.sections]
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((section) => [
      { section, displayTitle: section.title },
      ...[...section.children]
        .sort((a, b) => a.sequence - b.sequence)
        .map((child) => ({ section: child, displayTitle: section.title + ' · ' + child.title })),
    ])
  const sectionIds = new Set(orderedSections.map(({ section }) => section.id))
  const sections: DraftSection[] = orderedSections.map(({ section, displayTitle }) => ({
      clientId: section.id,
      title: displayTitle,
      categoryId: section.categoryId,
      suggestedMinutes: section.suggestedMinutes == null ? '' : String(section.suggestedMinutes),
      unassigned: false,
      questions: questions
        .filter((question) => question.sectionId === section.id)
        .map(fromServerQuestion),
    }))
  const unassigned = questions
    .filter((question) => !question.sectionId || !sectionIds.has(question.sectionId))
    .map(fromServerQuestion)
  if (unassigned.length > 0) sections.push(createUnassignedSection(unassigned))
  return sections
}

function sectionStructureIsSupported(editor: TeacherQuizEditor, sections: DraftSection[]) {
  if (editor.groups.length > 0 || editor.sections.some((section) => section.children.length > 0)) return false
  const displayedQuestionIds = sections.flatMap((section) => section.questions.map((question) => question.serverId))
  const serverQuestionIds = [...editor.questions]
    .sort((a, b) => a.sequence - b.sequence)
    .map((question) => question.id)
  return displayedQuestionIds.length === serverQuestionIds.length &&
    displayedQuestionIds.every((id, index) => id === serverQuestionIds[index])
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined
}

function isLocked(quiz: TeacherQuizRecord | null | undefined) {
  return Boolean(quiz?.locked || (quiz?.attemptCount ?? 0) > 0)
}

function findPendingExamCreateCandidates(
  quizzes: TeacherQuizRecord[],
  pending: PendingExamCreate | null,
  now = Date.now(),
) {
  if (!pending || !pending.createdById) return []
  return quizzes.filter((quiz) => {
    if (pending.existingIds.has(quiz.id) || quiz.type !== pending.type || quiz.status !== 'DRAFT') return false
    if (!pending.createdById || quiz.createdById !== pending.createdById) return false
    if (quiz.title !== pending.title || (quiz.courseId ?? '') !== pending.courseId) return false
    if (quiz.durationMinutes !== pending.durationMinutes ||
      quiz.maxAttempts !== pending.maxAttempts ||
      quiz.passingPercentage !== pending.passingPercentage) return false
    if (quiz.showAnswers !== pending.showAnswers || quiz.practiceAllowed !== pending.practiceAllowed) return false
    if (dateTimeMillis(quiz.availableFrom) !== pending.availableFrom ||
      dateTimeMillis(quiz.availableUntil) !== pending.availableUntil) return false
    const createdAt = quiz.createdAt ? new Date(quiz.createdAt).getTime() : Number.NaN
    return Number.isFinite(createdAt) &&
      createdAt >= pending.startedAt - 30_000 &&
      createdAt <= now + 30_000
  })
}

function dateTimeMillis(value: string | null | undefined) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function statusLabel(status: TeacherQuizRecord['status']) {
  if (status === 'PUBLISHED') return 'Đã xuất bản'
  if (status === 'ARCHIVED') return 'Đã lưu trữ'
  return 'Bản nháp'
}

function statusTone(status: TeacherQuizRecord['status']) {
  if (status === 'PUBLISHED') return 'success' as const
  if (status === 'ARCHIVED') return 'neutral' as const
  return 'warning' as const
}

function formatApiError(error: unknown) {
  const details = error instanceof ApiError
    ? Object.values(error.errors ?? {}).filter(Boolean).join('; ')
    : ''
  return details ? getErrorMessage(error) + ': ' + details : getErrorMessage(error)
}

function questionHasAnyContent(question: DraftQuestion) {
  return question.questionText.trim() !== '' ||
    question.explanation.trim() !== '' ||
    question.options.some((option) => option.text.trim() !== '')
}

function questionFingerprint(question: {
  questionText: string
  questionType: TeacherQuestionType
  explanation: string | null
  options: Array<{ text: string; correct: boolean }>
}) {
  return JSON.stringify([
    question.questionType,
    question.questionText.trim().replace(/\s+/g, ' '),
    (question.explanation ?? '').trim().replace(/\s+/g, ' '),
    question.options.map((option) => [option.text.trim().replace(/\s+/g, ' '), option.correct]),
  ])
}

function attachNewQuestionIds(sections: DraftSection[], editor: TeacherQuizEditor) {
  const remaining = [...editor.questions]
  return sections.map((section) => ({
    ...section,
    questions: section.questions.map((draft) => {
      if (draft.serverId) {
        const existing = remaining.findIndex((question) => question.id === draft.serverId)
        if (existing >= 0) remaining.splice(existing, 1)
        return draft
      }
      const fingerprint = questionFingerprint({
        questionText: draft.questionText,
        questionType: draft.questionType,
        explanation: draft.explanation,
        options: draft.options.filter((option) => option.text.trim()),
      })
      const matchIndex = remaining.findIndex((question) => questionFingerprint(question) === fingerprint)
      if (matchIndex < 0) return draft
      const [match] = remaining.splice(matchIndex, 1)
      return { ...draft, serverId: match.id, clientId: match.id }
    }),
  }))
}

function questionPayload(question: DraftQuestion): SaveTeacherQuestionRequest {
  const questionType = question.questionType
  const options = CHOICE_TYPES.includes(questionType)
    ? question.options
        .filter((option) => option.text.trim())
        .map((option) => ({ text: option.text.trim(), correct: option.correct }))
    : questionType === 'LONG_ANSWER'
      ? []
      : undefined
  return {
    questionText: question.questionText.trim(),
    questionType,
    explanation: question.explanation,
    options,
    // Omit the resolved URL so BE keeps its canonical storage reference.
    categoryId: question.categoryId ?? undefined,
    difficulty: question.difficulty ?? undefined,
    sourcePage: question.sourcePage ?? undefined,
    marks: question.marks ?? undefined,
    needsReview: question.needsReview,
    reviewNote: question.reviewNote.trim() || undefined,
  }
}

function questionPayloadMatchesServer(draft: DraftQuestion, server: TeacherQuizQuestion) {
  const payload = questionPayload(draft)
  return payload.questionText === server.questionText &&
    payload.questionType === server.questionType &&
    payload.explanation === (server.explanation ?? '') &&
    (payload.categoryId ?? null) === server.categoryId &&
    (payload.difficulty ?? null) === (server.difficulty ?? null) &&
    (payload.sourcePage ?? null) === server.sourcePage &&
    (payload.marks ?? null) === server.marks &&
    payload.needsReview === server.needsReview &&
    (payload.reviewNote ?? '') === (server.reviewNote ?? '') &&
    payload.options?.length === server.options.length &&
    (payload.options ?? []).every((option, index) =>
      option.text === server.options[index]?.text && option.correct === server.options[index]?.correct
    )
}

function sectionLayoutSpecs(sections: DraftSection[], questionCounts: Map<string, number>): TeacherQuizSectionSpec[] {
  let sequence = 1
  return sections
    .filter((section) => !section.unassigned)
    .map((section) => {
      const count = questionCounts.get(section.clientId) ?? 0
      const fromQuestion = count > 0 ? sequence : undefined
      if (count > 0) sequence += count
      const suggestedMinutes = Number(section.suggestedMinutes)
      return {
        title: section.title.trim(),
        categoryId: section.categoryId ?? undefined,
        suggestedMinutes: Number.isInteger(suggestedMinutes) && suggestedMinutes > 0 ? suggestedMinutes : undefined,
        fromQuestion,
        toQuestion: fromQuestion === undefined ? undefined : sequence - 1,
      }
    })
}

function existingLayoutSpecs(editor: TeacherQuizEditor): TeacherQuizSectionSpec[] {
  return [...editor.sections]
    .sort((a, b) => a.sequence - b.sequence)
    .map((section) => ({
      title: section.title,
      categoryId: section.categoryId ?? undefined,
      suggestedMinutes: section.suggestedMinutes ?? undefined,
      fromQuestion: section.questionCount > 0 ? section.firstQuestion : undefined,
      toQuestion: section.questionCount > 0 ? section.lastQuestion : undefined,
    }))
}

function sameLayout(a: TeacherQuizSectionSpec[], b: TeacherQuizSectionSpec[]) {
  return JSON.stringify(a.map((item) => [
    item.title,
    item.categoryId ?? null,
    item.suggestedMinutes ?? null,
    item.fromQuestion ?? null,
    item.toQuestion ?? null,
  ])) === JSON.stringify(b.map((item) => [
    item.title,
    item.categoryId ?? null,
    item.suggestedMinutes ?? null,
    item.fromQuestion ?? null,
    item.toQuestion ?? null,
  ]))
}

function MockExamScreen({ navigation, assessmentType = 'EXAM', onAction, onOpenEditor, readOnly = true, startCreating = false, initialEditorId = null }: TeacherMockExamsProps) {
  const placement = assessmentType === 'PLACEMENT'
  const quizzes = usePageResource(() => getTeacherQuizzes(), [])
  const [creating, setCreating] = useState(!readOnly && startCreating)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editorQuizId, setEditorQuizId] = useState<string | null>(initialEditorId)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TeacherQuizRecord | null>(null)
  const [forceCopyIds, setForceCopyIds] = useState<Set<string>>(() => new Set())

  const refresh = () => quizzes.reload()
  const runAction = async (
    quiz: TeacherQuizRecord,
    operation: () => Promise<unknown>,
    successMessage: string,
    forceCopyAfterSuccess = false,
  ) => {
    if (readOnly || busyId) return
    setBusyId(quiz.id)
    try {
      await operation()
      if (forceCopyAfterSuccess) {
        setForceCopyIds((current) => new Set(current).add(quiz.id))
      }
      onAction(successMessage)
      refresh()
    } catch (error) {
      const blockers = quiz.publishProblems?.filter(Boolean) ?? []
      onAction(
        error instanceof ApiError && error.status === 409 && quiz.status === 'DRAFT' && blockers.length > 0
          ? 'Chưa thể xuất bản: ' + blockers.join(', ') + '. Mở đề để hoàn thiện.'
          : getErrorMessage(error)
      )
    } finally {
      setBusyId(null)
    }
  }

  const openExamForEdit = async (exam: TeacherQuizRecord) => {
    if (readOnly) return
    const shouldDuplicate =
      exam.status !== 'DRAFT' || isLocked(exam) || forceCopyIds.has(exam.id)
    if (!shouldDuplicate) {
      setEditorQuizId(exam.id)
      return
    }
    if (readOnly || busyId) return
    setBusyId(exam.id)
    try {
      const copy = await duplicateTeacherQuiz(exam.id)
      onAction('Đã tạo bản nháp để chỉnh sửa; đề gốc chưa bị thay đổi.')
      refresh()
      setEditorQuizId(copy.id)
    } catch (error) {
      onAction(getErrorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  if (viewingId) return <QuizDetails quizId={viewingId} onBack={() => setViewingId(null)} />

  if (!readOnly && (creating || editorQuizId)) {
    return (
      <TeacherMockExamEditor
        onCreated={id => { if (onOpenEditor) onOpenEditor(id); else { setCreating(false); setEditorQuizId(id) } }}
        assessmentType={assessmentType}
        quizId={editorQuizId}
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

  const examItems = (quizzes.data ?? []).filter(quiz => quiz.type === assessmentType)

  return (
    <section className="flex min-w-0 flex-col gap-5">
      <PageHeading title={navigation ? 'Bài kiểm tra' : placement ? 'Đánh giá đầu vào' : 'Bài thi thử'} readOnly={readOnly}
        subtitle={placement ? 'Quản lý bài đánh giá đầu vào độc lập với khóa học.' : readOnly ? 'Xem nội dung và theo dõi bài kiểm tra trong các khóa được phân công.' : 'Quản lý đề thi thử, lịch làm bài và nội dung câu hỏi.'}
        action={!readOnly && <Button onClick={() => setCreating(true)}><Plus size={16} />{placement ? 'Tạo đánh giá đầu vào' : 'Tạo đề thi thử'}</Button>} />
      {navigation}
      {placement && <Notice tone="info">Student sẽ nhận bài đã xuất bản được tạo mới nhất. Xuất bản lại bài cũ không thay đổi thời điểm tạo bài. Khi ẩn bài đang dùng, bài đã xuất bản mới nhất còn lại sẽ được chọn.</Notice>}
      <QuizCatalog items={examItems} status={quizzes.status}
        errorMessage={quizzes.errorMessage} onRetry={refresh} readOnly={readOnly} exam placement={placement}
        renderActions={(exam) => <RowActions>
                  <IconAction label="Xem nội dung" icon={Eye} onClick={() => setViewingId(exam.id)} />
                  {!readOnly && <>
                  <Button
                    size="sm" appearance="ghost"
                    disabled={busyId !== null}
                    onClick={() => void openExamForEdit(exam)}
                  >
                    <Pencil size={15} />
                    {exam.status !== 'DRAFT' || isLocked(exam) || forceCopyIds.has(exam.id)
                      ? 'Tạo bản nháp sửa'
                      : 'Chỉnh sửa'}
                  </Button>
                  {exam.status !== 'ARCHIVED' && (
                    <Button
                      appearance="outline"
                      size="sm"
                      disabled={busyId !== null}
                      onClick={() => void runAction(
                        exam,
                        () => exam.status === 'PUBLISHED' ? unpublishTeacherQuiz(exam.id) : publishTeacherQuiz(exam.id),
                        placement ? exam.status === 'PUBLISHED' ? 'Đã ẩn bài đánh giá đầu vào.' : 'Đã xuất bản bài đánh giá đầu vào.' : exam.status === 'PUBLISHED' ? 'Đã ẩn đề thi thử.' : 'Đã xuất bản đề thi thử.',
                        exam.status === 'PUBLISHED'
                      )}
                    >
                      {exam.status === 'PUBLISHED' ? <X size={15} /> : <Send size={15} />}
                      {exam.status === 'PUBLISHED' ? placement ? 'Ẩn bài' : 'Ẩn đề thi' : 'Xuất bản'}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger isDisabled={busyId !== null} aria-label={'Thao tác khác với ' + exam.title} className="grid size-9 place-items-center rounded-lg border border-card-border text-icon-tertiary hover:bg-background-gray-secondary data-disabled:opacity-50"><MoreHorizontal size={16} /></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem isDisabled={busyId !== null} onAction={() => void runAction(exam, () => duplicateTeacherQuiz(exam.id), 'Đã sao chép đề thi thành bản nháp.')}>
                        <Copy size={15} />Sao chép thành bản nháp
                      </DropdownMenuItem>
                      {!isLocked(exam) && (
                        <DropdownMenuItem
                          isDisabled={busyId !== null}
                          className="text-badge-error-text focus:text-badge-error-text"
                          onAction={() => setConfirmDelete(exam)}
                        >
                          <Trash2 size={15} />Xóa đề thi
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </>}
        </RowActions>} />

      {!readOnly && confirmDelete && (
        <ConfirmDialog
          title={placement ? 'Xóa bài đánh giá đầu vào?' : 'Xóa đề thi thử?'}
          description={<>Đề <strong>{confirmDelete.title}</strong> sẽ bị xóa khỏi danh sách.</>}
          cancelLabel="Hủy"
          confirmLabel="Xóa đề"
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
              onAction('Đã xóa đề thi thử.')
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

function TeacherMockExamEditor({
  onCreated,
  assessmentType,
  quizId,
  onCancel,
  onSaved,
}: {
  onCreated: (id: string) => void
  assessmentType: AssessmentType
  quizId: string | null
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const access = useQuizAccess()
  const editor = usePageResource(() => access.canWrite && quizId ? getTeacherQuiz(quizId) : Promise.resolve(null), [quizId, access.canWrite])
  if (!access.canWrite) return <ForbiddenPage />
  if (quizId && editor.status === 'loading') {
    return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48" /><Skeleton className="h-72" /></div>
  }
  if (quizId && (editor.status !== 'ready' || !editor.data)) {
    return (
      <div className="rounded-xl border border-card-border bg-background-gray-secondary p-4" role="alert">
        <p className="m-0 text-sm text-text-tertiary">
          {editor.status === 'forbidden'
            ? 'Tài khoản hiện tại không có quyền chỉnh sửa đề thi này.'
            : editor.status === 'not-found'
              ? 'Không tìm thấy đề thi hoặc đề đã được xóa.'
              : editor.errorMessage || 'Không thể tải nội dung đề thi.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button appearance="outline" className="min-h-11" onClick={editor.reload}>Thử lại</Button>
          <Button appearance="outline" className="min-h-11" onClick={onCancel}>Quay lại</Button>
        </div>
      </div>
    )
  }
  if (quizId && editor.data?.quiz.type !== assessmentType) return <Notice tone="warning">Bài kiểm tra không thuộc loại đang mở. <Button appearance="outline" onClick={onCancel}>Quay lại</Button></Notice>
  return (
    <TeacherMockExamForm
      key={quizId ?? 'new-exam'}
      assessmentType={assessmentType}
      initial={quizId ? editor.data : null}
      onCancel={onCancel}
      onSaved={onSaved}
      onReload={editor.reload}
      onCreated={onCreated}
    />
  )
}

function TeacherMockExamForm({
  onCreated,
  assessmentType,
  initial,
  onCancel,
  onSaved,
  onReload,
}: {
  onCreated: (id: string) => void
  assessmentType: AssessmentType
  initial: TeacherQuizEditor | null
  onCancel: () => void
  onSaved: (message: string) => void
  onReload: () => void
}) {
  const access = useQuizAccess()
  const placement = assessmentType === 'PLACEMENT'
  const { profile: currentUser } = useCurrentUser()
  const originalEditorRef = useRef<TeacherQuizEditor | null>(initial)
  const initialQuiz = initial?.quiz ?? null
  const [serverQuizId, setServerQuizId] = useState<string | null>(initialQuiz?.id ?? null)
  const [quizSnapshot, setQuizSnapshot] = useState<TeacherQuizRecord | null>(initialQuiz)
  const [settings, setSettings] = useState<ExamSettings>({
    description: initialQuiz?.description ?? '',
    title: initialQuiz?.title ?? '',
    courseId: initialQuiz?.courseId ?? '',
    duration: String(initialQuiz?.durationMinutes ?? (placement ? 30 : 120)),
    maxAttempts: String(initialQuiz?.maxAttempts ?? 1),
    passingPercentage: String(initialQuiz?.passingPercentage ?? 60),
    availableFrom: toDateTimeLocal(initialQuiz?.availableFrom),
    availableUntil: toDateTimeLocal(initialQuiz?.availableUntil),
    showAnswers: initialQuiz?.showAnswers ?? false,
    practiceAllowed: initialQuiz?.practiceAllowed ?? !placement,
  })
  const [sections, setSections] = useState<DraftSection[]>(() =>
    initial ? fromServerEditor(initial) : [createDraftSection('Phần 1')]
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ambiguousCreate, setAmbiguousCreate] = useState(false)
  const [ambiguousQuestionSave, setAmbiguousQuestionSave] = useState(false)
  const [importBaseline] = useState(() => JSON.stringify({ settings, sections }))
  const hasUnsavedChanges = JSON.stringify({ settings, sections }) !== importBaseline
  const aiReading = initial?.latestJob?.kind === 'EXAM_FILE' && (initial.latestJob.status === 'PENDING' || initial.latestJob.status === 'RUNNING')
  const pendingCreateRef = useRef<PendingExamCreate | null>(null)

  const courseCatalog = usePageResource(async () => {
    if (initialQuiz || placement) return [] as CourseAdmin[]
    return getQuizCourses('MAIN')
  }, [Boolean(initialQuiz), placement])
  const categories = usePageResource(() => placement ? getCategories() : Promise.resolve([] as Category[]), [placement])
  const categoryOptions = (categories.data ?? []).filter(category => category.active).map(category => ({ id: category.id, label: category.name }))

  const settingsLocked = isLocked(quizSnapshot)
  const questionsLocked = aiReading || settingsLocked || ambiguousCreate || ambiguousQuestionSave
  const publishedQuiz = Boolean(quizSnapshot && quizSnapshot.status !== 'DRAFT')
  const fieldsLocked = aiReading || settingsLocked || publishedQuiz || ambiguousCreate || ambiguousQuestionSave
  const structureSupported = initial ? sectionStructureIsSupported(initial, fromServerEditor(initial)) : true
  const structureReadOnly = !structureSupported
  const canEditQuestions = !questionsLocked && !publishedQuiz && !structureReadOnly
  const hasCreatedQuiz = serverQuizId !== null
  const importBlockedReason = !serverQuizId ? ambiguousCreate || ambiguousQuestionSave ? 'Kiểm tra danh sách đề trước khi tạo lại.'
    : sections.length !== 1 || sections[0].title !== 'Phần 1' || sections[0].categoryId || sections[0].suggestedMinutes || sections.some(s => s.questions.some(q => questionHasAnyContent(q) || q.explanation.trim() || q.options.some(o => o.correct)))
      ? 'Đang có nội dung hoặc cấu trúc soạn tay. Lưu bản nháp trước để giữ nội dung, rồi nhập thêm file.' : ''
    : aiReading ? 'AI đang đọc PDF. Kiểm tra tiến trình trước khi nhập thêm.'
    : publishedQuiz || settingsLocked ? 'Chỉ nhập vào bản nháp chưa có lượt làm.'
      : ambiguousCreate || ambiguousQuestionSave ? 'Tải lại bài để xác nhận kết quả lưu trước khi nhập.'
        : hasUnsavedChanges ? 'Lưu thay đổi rồi mở lại bài trước khi nhập file.'
          : structureReadOnly ? 'Cấu trúc bài này đang ở chế độ chỉ xem.' : ''

  const updateSettings = <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const updateSection = (clientId: string, update: Partial<DraftSection>) => {
    setSections((items) => items.map((section) => section.clientId === clientId ? { ...section, ...update } : section))
  }

  const updateQuestion = (sectionId: string, clientId: string, update: Partial<DraftQuestion>) => {
    setSections((items) => items.map((section) => section.clientId !== sectionId ? section : ({
      ...section,
      questions: section.questions.map((question) => question.clientId === clientId ? { ...question, ...update } : question),
    })))
  }

  const addSection = () => {
    const unassigned = sections.find((section) => section.unassigned)
    const next = sections.filter((section) => !section.unassigned)
    next.push(createDraftSection('Phần ' + (next.length + 1)))
    if (unassigned) next.push(unassigned)
    setSections(next)
  }

  const moveSection = (clientId: string, direction: -1 | 1) => {
    setSections((items) => {
      const index = items.findIndex((section) => section.clientId === clientId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length || items[nextIndex]?.unassigned) return items
      const next = [...items]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  const removeSection = (section: DraftSection) => {
    setSections((items) => {
      const remaining = items.filter((item) => item.clientId !== section.clientId)
      if (section.questions.length === 0) return remaining
      const currentUnassigned = remaining.find((item) => item.unassigned)
      const questions = [...(currentUnassigned?.questions ?? []), ...section.questions]
      const withoutUnassigned = remaining.filter((item) => !item.unassigned)
      return [...withoutUnassigned, createUnassignedSection(questions)]
    })
  }

  const moveQuestion = (sectionId: string, clientId: string, direction: -1 | 1) => {
    if (!access.canWrite || !canEditQuestions || busy) return
    setSections((items) => items.map((section) => {
      if (section.clientId !== sectionId) return section
      const index = section.questions.findIndex((question) => question.clientId === clientId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= section.questions.length) return section
      const next = [...section.questions]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return { ...section, questions: next }
    }))
  }

  const questionDrag = useDragReorder(
    (fromId, toId) => {
      if (!access.canWrite || !canEditQuestions || busy) return
      setSections(items => items.map(section => {
        const ids = section.questions.map(question => question.clientId)
        // Keep the existing section boundary; dragging does not assign questions to another section.
        if (!ids.includes(fromId) || !ids.includes(toId) || !section.questions.find(question => question.clientId === fromId)?.editable) return section
        const byId = new Map(section.questions.map(question => [question.clientId, question]))
        return { ...section, questions: arrayMove(ids, fromId, toId).map(id => byId.get(id)!) }
      }))
    },
    (id, direction) => {
      const section = sections.find(item => item.questions.some(question => question.clientId === id))
      if (section) moveQuestion(section.clientId, id, direction)
    }
  )

  const validate = (publish: boolean) => {
    const title = settings.title.trim()
    if (!title) return 'Nhập tên đề thi trước khi lưu.'
    if (!placement && !serverQuizId && !settings.courseId) return 'Chọn khóa học chính cho đề thi.'
    const duration = Number(settings.duration)
    if (!Number.isInteger(duration) || duration < 1 || duration > 600) return 'Thời gian làm bài phải từ 1 đến 600 phút.'
    const attempts = Number(settings.maxAttempts)
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 999) return 'Số lượt làm tối đa phải từ 1 đến 999.'
    const passingText = settings.passingPercentage.trim()
    const passing = Number(passingText)
    const passingDecimalDigits = passingText.split('.')[1]?.length ?? 0
    if (!Number.isFinite(passing) || passing < 0 || passing > 100 || passingDecimalDigits > 2) {
      return 'Điểm đạt phải từ 0 đến 100%, tối đa 2 chữ số thập phân.'
    }
    if (settings.availableFrom && Number.isNaN(new Date(settings.availableFrom).getTime())) return 'Thời điểm bắt đầu không hợp lệ.'
    if (settings.availableUntil && Number.isNaN(new Date(settings.availableUntil).getTime())) return 'Thời hạn làm bài không hợp lệ.'
    if (settings.availableFrom && settings.availableUntil &&
      new Date(settings.availableUntil).getTime() <= new Date(settings.availableFrom).getTime()) {
      return 'Thời hạn làm bài phải sau thời điểm bắt đầu.'
    }
    if (quizSnapshot?.availableFrom && !settings.availableFrom) return 'API hiện tại không hỗ trợ xóa thời điểm bắt đầu đã lưu; hãy chọn thời điểm mới.'
    if (quizSnapshot?.availableUntil && !settings.availableUntil) return 'API hiện tại không hỗ trợ xóa hạn làm bài đã lưu; hãy chọn hạn mới.'

    if (canEditQuestions) {
      const activeSections = sections.filter((section) => section.title.trim() || section.questions.some(questionHasAnyContent))
      const nonEmptyQuestions = activeSections.flatMap((section) => section.questions.filter(questionHasAnyContent))
      for (const section of activeSections) {
        const hasQuestions = section.questions.some(questionHasAnyContent)
        if (!section.unassigned && hasQuestions && !section.title.trim()) return 'Đặt tên cho mỗi phần có câu hỏi.'
      }
      for (const question of nonEmptyQuestions) {
        if (!question.questionText.trim()) return 'Mỗi câu hỏi cần có nội dung.'
        if (CHOICE_TYPES.includes(question.questionType)) {
          const options = question.options.filter((option) => option.text.trim())
          if (options.length < 2) return 'Mỗi câu trắc nghiệm cần ít nhất hai lựa chọn.'
          if (!question.needsReview && !options.some((option) => option.correct)) {
            return 'Chọn ít nhất một đáp án đúng hoặc đánh dấu câu hỏi cần rà soát.'
          }
          if (question.questionType === 'SINGLE_CHOICE' && options.filter((option) => option.correct).length > 1) {
            return 'Câu trắc nghiệm một đáp án chỉ được chọn một đáp án đúng.'
          }
        }
      }
      if (publish && nonEmptyQuestions.length === 0) return 'Thêm ít nhất một câu hỏi trước khi xuất bản.'
      if (placement && publish && nonEmptyQuestions.some(question => question.questionType !== 'SINGLE_CHOICE')) return 'Màn Student hiện chỉ làm được câu hỏi một đáp án. Cần hoàn thiện hỗ trợ loại câu hỏi khác trước khi xuất bản bài này.'
    }
    return ''
  }

  const getImportCreateRequest = (): CreateTeacherQuizRequest | null => {
    const validation = validate(false)
    if (validation || settings.title.trim().length > 500) {
      setError(validation || 'Tên đề thi tối đa 500 ký tự.')
      return null
    }
    setError('')
    return {
      type: assessmentType, title: settings.title.trim(), durationMinutes: Number(settings.duration), maxAttempts: Number(settings.maxAttempts),
      ...(placement ? { description: settings.description.trim() } : { courseId: settings.courseId,
        passingPercentage: Number(settings.passingPercentage), showAnswers: settings.showAnswers, practiceAllowed: settings.practiceAllowed }),
      ...(fromDateTimeLocal(settings.availableFrom) ? { availableFrom: fromDateTimeLocal(settings.availableFrom) } : {}),
      ...(fromDateTimeLocal(settings.availableUntil) ? { availableUntil: fromDateTimeLocal(settings.availableUntil) } : {}),
    }
  }

  const checkPendingCreate = async () => {
    const pending = pendingCreateRef.current
    if (!pending || busy) return
    setBusy(true)
    try {
      const candidates = findPendingExamCreateCandidates(await getTeacherQuizzes(), pending)
      if (candidates.length === 0) {
        setError('Chưa thấy đề phù hợp trong danh sách. Kết quả tạo vẫn chưa xác định; đừng gửi tạo lại. Hãy quay về danh sách và kiểm tra sau.')
      } else if (candidates.length === 1) {
        setError('Có một đề phù hợp nhưng FE không thể xác nhận đây là đúng lần gửi ở màn hình này. Hãy quay về danh sách và tự kiểm tra trước khi chọn đề; FE sẽ không tự mở hoặc sửa đề đó.')
      } else {
        setError(`Có ${candidates.length} đề phù hợp nên không thể xác định đề vừa tạo. Hãy quay về danh sách và kiểm tra thủ công; FE sẽ không tự chọn.`)
      }
    } catch (checkError) {
      setError('Không thể xác nhận kết quả tạo đề: ' + getErrorMessage(checkError))
    } finally {
      setBusy(false)
    }
  }

  const save = async (publish: boolean) => {
    if (!access.canWrite) return
    if (busy || aiReading) return
    if (publishedQuiz) {
      setError('Đề đã xuất bản hoặc lưu trữ chỉ xem. Tạo bản nháp để chỉnh sửa nội dung.')
      return
    }
    if (ambiguousCreate) {
      setError('Hãy kiểm tra kết quả tạo đề trước khi gửi lại để tránh tạo trùng.')
      return
    }
    if (ambiguousQuestionSave) {
      setError('Kết quả lưu câu hỏi chưa rõ. Hãy quay về danh sách và mở lại đề để kiểm tra; không gửi lại biểu mẫu này.')
      return
    }
    const validationMessage = validate(publish)
    if (validationMessage) {
      setError(validationMessage)
      return
    }
    setBusy(true)
    setError('')
    let quizId = serverQuizId
    try {
      const durationMinutes = Number(settings.duration)
      const maxAttempts = Number(settings.maxAttempts)
      const passingPercentage = Number(settings.passingPercentage)
      if (!quizId) {
        const existing = await getTeacherQuizzes()
        const pending: PendingExamCreate = {
          type: assessmentType,
          existingIds: new Set(existing.map((quiz) => quiz.id)),
          startedAt: Date.now(),
          createdById: currentUser?.id ?? null,
          title: settings.title.trim(),
          courseId: settings.courseId,
          durationMinutes,
          maxAttempts,
          passingPercentage: placement ? null : passingPercentage,
          showAnswers: settings.showAnswers,
          practiceAllowed: settings.practiceAllowed,
          availableFrom: dateTimeMillis(fromDateTimeLocal(settings.availableFrom)),
          availableUntil: dateTimeMillis(fromDateTimeLocal(settings.availableUntil)),
        }
        pendingCreateRef.current = pending
        try {
          const created = await createTeacherQuiz({
            type: assessmentType,
            ...(placement ? { description: settings.description.trim() } : { courseId: settings.courseId }),
            title: settings.title.trim(),
            durationMinutes,
            maxAttempts,
            ...(!placement ? { passingPercentage, showAnswers: settings.showAnswers, practiceAllowed: settings.practiceAllowed } : {}),
            ...(fromDateTimeLocal(settings.availableFrom) ? { availableFrom: fromDateTimeLocal(settings.availableFrom) } : {}),
            ...(fromDateTimeLocal(settings.availableUntil) ? { availableUntil: fromDateTimeLocal(settings.availableUntil) } : {}),
          })
          quizId = created.id
          setServerQuizId(created.id)
          setQuizSnapshot(created)
          pendingCreateRef.current = null
        } catch (creationError) {
          if (creationError instanceof ApiError && creationError.status < 500 && creationError.status !== 408) throw creationError
          setAmbiguousCreate(true)
          throw new Error(
            'Không xác định được máy chủ đã tạo đề hay chưa. Đừng gửi tạo lại; hãy kiểm tra danh sách thủ công trước.',
            { cause: creationError },
          )
        }
      } else {
        const updatePayload = settingsLocked
          ? { title: settings.title.trim(), ...(placement ? { description: settings.description.trim() } : {}) }
          : {
              title: settings.title.trim(),
              ...(placement ? { description: settings.description.trim() } : {}),
              durationMinutes,
              maxAttempts,
              ...(!placement ? { passingPercentage, showAnswers: settings.showAnswers, practiceAllowed: settings.practiceAllowed } : {}),
              ...(fromDateTimeLocal(settings.availableFrom) ? { availableFrom: fromDateTimeLocal(settings.availableFrom) } : {}),
              ...(fromDateTimeLocal(settings.availableUntil) ? { availableUntil: fromDateTimeLocal(settings.availableUntil) } : {}),
            }
        await updateTeacherQuiz(quizId, updatePayload)
      }

      if (canEditQuestions && quizId) {
        const original = originalEditorRef.current
        const activeSections = sections
          .filter((section) => section.title.trim() || section.questions.some(questionHasAnyContent))
          .map((section) => ({
            ...section,
            questions: section.questions.filter(questionHasAnyContent),
          }))
        const finalQuestionDrafts = activeSections.flatMap((section) => section.questions)
        const retainedIds = new Set(finalQuestionDrafts.map((question) => question.serverId).filter(Boolean))

        for (const serverQuestion of original?.questions ?? []) {
          if (!retainedIds.has(serverQuestion.id)) await deleteTeacherQuizQuestion(serverQuestion.id)
        }

        for (const question of finalQuestionDrafts) {
          if (!question.serverId || !question.editable) continue
          const previous = original?.questions.find((item) => item.id === question.serverId)
          if (!previous || questionPayloadMatchesServer(question, previous)) continue
          await updateTeacherQuizQuestion(question.serverId, questionPayload(question))
        }

        const newQuestions = finalQuestionDrafts.filter((question) => !question.serverId)
        let workingSections = activeSections
        if (newQuestions.length > 0) {
          const createdQuestions = await addTeacherQuizQuestions(
            quizId,
            newQuestions.map(questionPayload)
          )
          const newIds = new Map<string, string>()
          for (const [index, draft] of newQuestions.entries()) {
            const createdQuestion = createdQuestions[index]
            if (createdQuestion) newIds.set(draft.clientId, createdQuestion.id)
          }
          workingSections = activeSections.map((section) => ({
            ...section,
            questions: section.questions.map((question) => {
              const id = newIds.get(question.clientId)
              return id ? { ...question, clientId: id, serverId: id } : question
            }),
          }))
          setSections(workingSections)
        }

        const finalServerQuestions = workingSections.flatMap((section) => section.questions)
        if (finalServerQuestions.some((question) => !question.serverId)) {
          throw new Error('Đã lưu đề nhưng chưa xác định được mã của một số câu hỏi. Tải lại đề rồi thử tiếp.')
        }
        const finalQuestionIds = finalServerQuestions.map((question) => question.serverId as string)
        const currentQuestionIds = (original?.questions ?? [])
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .map((question) => question.id)
        const questionOrderChanged = JSON.stringify(finalQuestionIds) !== JSON.stringify(currentQuestionIds)
        if (questionOrderChanged && finalQuestionIds.length > 0) {
          await reorderTeacherQuizQuestions(quizId, finalQuestionIds)
        }

        const questionCounts = new Map(
          workingSections.map((section) => [section.clientId, section.questions.length])
        )
        const desiredLayout = sectionLayoutSpecs(workingSections, questionCounts)
        const previousLayout = original ? existingLayoutSpecs(original) : []
        if (!sameLayout(desiredLayout, previousLayout)) await setTeacherQuizLayout(quizId, desiredLayout)
      }

      if (publish && quizId) await publishTeacherQuiz(quizId)
      if (quizId) originalEditorRef.current = await getTeacherQuiz(quizId)
      onSaved(
        publish
          ? 'Đã lưu và xuất bản đề thi thử.'
          : serverQuizId ? 'Đã lưu thay đổi đề thi thử.' : 'Đã lưu đề thi dưới dạng bản nháp.'
      )
    } catch (saveError) {
      if (saveError instanceof AmbiguousTeacherQuestionSaveError) {
        setAmbiguousQuestionSave(true)
        setError('')
        return
      }
      let message = formatApiError(saveError)
      if (quizId) {
        try {
          const refreshed = await getTeacherQuiz(quizId)
          originalEditorRef.current = refreshed
          setServerQuizId(refreshed.quiz.id)
          setQuizSnapshot(refreshed.quiz)
          const refreshedIds = new Set(refreshed.questions.map((question) => question.id))
          setSections((draftSections) => attachNewQuestionIds(
            draftSections.map((section) => ({
              ...section,
              questions: section.questions.filter((question) =>
                !question.serverId || refreshedIds.has(question.serverId)
              ),
            })),
            refreshed
          ))
          const blockers = refreshed.quiz.publishProblems?.filter(Boolean) ?? []
          if (publish && saveError instanceof ApiError && saveError.status === 409 && blockers.length > 0) {
            message = 'Chưa thể xuất bản: ' + blockers.join(', ') + '. Hoàn thiện nội dung trong đề rồi thử lại.'
          }
        } catch {
          // Preserve the local form if the follow-up read also fails.
        }
      }
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const courseCatalogHasError = ['error', 'forbidden', 'not-found'].includes(courseCatalog.status)
  const courseOptions = (courseCatalog.data ?? []).map((course) => ({ id: course.id, label: course.title }))
  const serverCourseName = quizSnapshot?.courseTitle || 'Khóa học đã chọn'

  return (
    <section className="flex flex-col gap-4">
      <Button appearance="ghost" size="sm" className="self-start" type="button" onClick={onCancel}>
        <ArrowLeft size={16} />{placement ? 'Quay lại đánh giá đầu vào' : 'Quay lại danh sách đề thi'}
      </Button>
      <PageHeading title={placement ? initialQuiz ? 'Chỉnh sửa đánh giá đầu vào' : hasCreatedQuiz ? 'Hoàn thiện bài đầu vào nháp' : 'Tạo đánh giá đầu vào' : initialQuiz ? 'Chỉnh sửa đề thi thử' : hasCreatedQuiz ? 'Hoàn thiện đề thi nháp' : 'Tạo đề thi thử'} action={quizSnapshot ? <StatusBadge tone={statusTone(quizSnapshot.status)}>{statusLabel(quizSnapshot.status)}</StatusBadge> : undefined} />

      <Card as="section" padding="lg" aria-labelledby="exam-settings-title">
        <div className="mb-4">
          <CardEyebrow>THÔNG TIN VÀ QUY ĐỊNH</CardEyebrow>
          <CardTitle id="exam-settings-title" className="text-base">{placement ? 'Thông tin bài đánh giá' : 'Cấu hình đề thi'}</CardTitle>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary md:col-span-2">
            {placement ? 'Tên bài đánh giá đầu vào' : 'Tên đề thi thử'}
            <input
              className={fieldControlClass}
              value={settings.title}
              onChange={(event) => updateSettings('title', event.target.value)}
              placeholder={placement ? 'Ví dụ: Đánh giá năng lực đầu vào' : 'Ví dụ: Đề thi thử V-ACT số 02'}
              disabled={publishedQuiz || busy || aiReading}
              maxLength={500}
            />
          </label>
          {placement && <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary md:col-span-2">
            Mô tả
            <textarea aria-label="Mô tả" className={textareaControlClass} value={settings.description} disabled={publishedQuiz || busy || aiReading}
              onChange={event => updateSettings('description', event.target.value)} />
            <span className="text-xs font-normal text-text-tertiary">Không gắn khóa học. Student được xem đáp án sau khi bài đã chấm; kết quả được phân loại theo môn.</span>
          </label>}
          {!placement && !initialQuiz && (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary md:col-span-2">
              Khóa học chính
              <DropdownField
                ariaLabel="Khóa học chính"
                placeholder="Chọn khóa học chính"
                options={courseOptions}
                value={settings.courseId || null}
                onChange={(value) => updateSettings('courseId', value ?? '')}
                isSearchable
                isLoading={courseCatalog.status === 'loading'}
                isError={courseCatalogHasError}
                errorMessage={courseCatalog.errorMessage || 'Không thể tải danh sách khóa học chính.'}
                emptyMessage="Không tìm thấy khóa học chính."
                mobileTouchTargets
                isDisabled={hasCreatedQuiz || busy}
              />
              <span className="text-xs font-normal text-text-tertiary">
                Chọn khóa học mà bạn được phép quản lý; quyền sẽ được xác nhận khi lưu.
              </span>
              {courseCatalogHasError && (
                <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-badge-error-text" role="alert">
                  Không tải được danh sách khóa học chính.
                  <Button appearance="ghost" size="sm" onClick={courseCatalog.reload}>Thử tải lại</Button>
                </span>
              )}
            </label>
          )}
          {!placement && initialQuiz && (
            <div className="rounded-lg border border-card-border bg-background-gray-secondary px-3 py-2.5 text-sm md:col-span-2">
              <span className="block text-xs font-medium text-text-tertiary">Khóa học</span>
              <strong className="mt-1 block text-text-primary">{serverCourseName}</strong>
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Thời gian làm bài (phút)
            <input
              className={fieldControlClass}
              type="number" min="1" max="600"
              value={settings.duration}
              onChange={(event) => updateSettings('duration', event.target.value)}
              disabled={fieldsLocked || busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Số lượt làm tối đa
            <input
              className={fieldControlClass}
              type="number" min="1" max="999"
              value={settings.maxAttempts}
              onChange={(event) => updateSettings('maxAttempts', event.target.value)}
              disabled={fieldsLocked || busy}
            />
          </label>
          {!placement && <><label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Điểm đạt (%)
            <input
              className={fieldControlClass}
              type="number" min="0" max="100" step="0.01"
              value={settings.passingPercentage}
              onChange={(event) => updateSettings('passingPercentage', event.target.value)}
              disabled={fieldsLocked || busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Bắt đầu làm bài
            <input
              className={fieldControlClass}
              type="datetime-local"
              value={settings.availableFrom}
              onChange={(event) => updateSettings('availableFrom', event.target.value)}
              disabled={fieldsLocked || busy}
              required={Boolean(quizSnapshot?.availableFrom)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Hạn làm bài
            <input
              className={fieldControlClass}
              type="datetime-local"
              value={settings.availableUntil}
              onChange={(event) => updateSettings('availableUntil', event.target.value)}
              disabled={fieldsLocked || busy}
              required={Boolean(quizSnapshot?.availableUntil)}
            />
          </label></>}
        </div>
        {!placement && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-card-border px-3 py-2 text-sm text-text-primary">
            <input type="checkbox" checked={settings.showAnswers} onChange={(event) => updateSettings('showAnswers', event.target.checked)} disabled={fieldsLocked || busy} />
            Cho phép xem đáp án sau khi nộp
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-card-border px-3 py-2 text-sm text-text-primary">
            <input type="checkbox" checked={settings.practiceAllowed} onChange={(event) => updateSettings('practiceAllowed', event.target.checked)} disabled={fieldsLocked || busy} />
            Cho phép học viên luyện tập lại
          </label>
        </div>}
        {settingsLocked && (
          <p className="mt-3 mb-0 rounded-lg bg-badge-warning-bg px-3 py-2 text-xs text-badge-warning-text">
            Đề đã có lượt thi. Các quy định và câu hỏi được khóa; bạn vẫn có thể đổi tên đề.
          </p>
        )}
        {publishedQuiz && (
          <p className="mt-3 mb-0 rounded-lg bg-badge-info-bg px-3 py-2 text-xs text-badge-info-text">
            Đề đã xuất bản hoặc lưu trữ được mở chỉ xem. Hãy tạo bản nháp để chỉnh sửa nhằm giữ nguyên đề gốc.
          </p>
        )}
      </Card>

      <Card as="section" padding="lg" aria-labelledby="exam-sections-title">
        {placement && <div className="mb-4 space-y-2">
          <p className="text-sm text-text-tertiary">Gắn môn/nhóm đánh giá cho từng câu để có kết quả theo môn. Câu chưa gắn môn vẫn được tính điểm tổng.</p>
          {categories.status === 'loading' && <p role="status" className="text-sm">Đang tải môn học...</p>}
          {['error', 'forbidden', 'not-found'].includes(categories.status) && <Notice tone="warning">{categories.errorMessage || 'Không tải được các môn bạn được phép xem. Có thể lưu nháp và bổ sung sau.'}<Button appearance="outline" onClick={categories.reload}>Thử tải môn học</Button></Notice>}
        </div>}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardEyebrow>{placement ? 'NỘI DUNG ĐÁNH GIÁ' : 'NỘI DUNG ĐỀ THI'}</CardEyebrow>
            <CardTitle id="exam-sections-title" className="mb-0 text-base">Các phần và câu hỏi</CardTitle>
          </div>
          <QuizImportDialog quizId={serverQuizId} blockedReason={importBlockedReason} busy={busy} onReload={onReload}
            getCreateRequest={getImportCreateRequest} onCreated={onCreated} onUncertainCreate={() => setAmbiguousCreate(true)} onBusyChange={setBusy} />
          {canEditQuestions && (
            <Button appearance="outline" className="min-h-11" onClick={addSection} disabled={busy}>
              <Plus size={15} />Thêm phần thi
            </Button>
          )}
        </div>
        {canEditQuestions && <p className="mb-4 text-xs text-text-tertiary">Kéo biểu tượng cạnh số câu hoặc dùng nút lên/xuống để sắp xếp trong cùng phần thi. Nhấn lưu để giữ thứ tự mới.</p>}
        {serverQuizId && initial?.latestJob?.kind === 'EXAM_FILE' && <QuizPdfImportPanel quizId={serverQuizId} jobId={initial.latestJob.id}
          blockedReason={hasUnsavedChanges ? 'Lưu thay đổi rồi mở lại bài trước khi áp dụng.' : publishedQuiz || settingsLocked ? 'Chỉ áp dụng vào bản nháp chưa có lượt làm.' : ambiguousQuestionSave ? 'Tải lại bài để kiểm tra kết quả lưu.' : ''}
          busy={busy} onBusyChange={setBusy} onReload={onReload} />}
        {structureReadOnly && (
          <div className="mb-4 rounded-xl border border-badge-warning-text/20 bg-badge-warning-bg p-3 text-sm text-badge-warning-text" role="status">
            Đề này có nhóm câu hỏi hoặc phần lồng nhau. Nội dung đang ở chế độ chỉ xem để giữ nguyên cấu trúc; bạn vẫn có thể lưu các thông tin đề thi được phép sửa.
          </div>
        )}
        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-card-border bg-background-gray-secondary p-5 text-center text-sm text-text-tertiary">
            Chưa có phần thi hoặc câu hỏi. Thêm một phần để bắt đầu soạn đề.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sections.map((section, sectionIndex) => (
              <section key={section.clientId} className="rounded-xl border border-card-border bg-background-gray-secondary p-4">
                <div className="mb-3 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {section.unassigned ? (
                      <div>
                        <h3 className="m-0 text-sm font-medium text-text-primary">{section.title}</h3>
                        <p className="mt-1 mb-0 text-xs text-text-tertiary">Các câu hỏi này chưa được gán vào phần thi nào.</p>
                      </div>
                    ) : (
                      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-tertiary">
                        <span>Phần {sectionIndex + 1} · {section.questions.length} câu</span>
                        <input
                          className={fieldControlClass}
                          value={section.title}
                          onChange={(event) => updateSection(section.clientId, { title: event.target.value })}
                          placeholder="Tên phần thi, ví dụ: Tư duy định lượng"
                          disabled={!canEditQuestions || busy}
                        />
                      </label>
                    )}
                  </div>
                  {canEditQuestions && !section.unassigned && (
                    <div className="flex shrink-0 gap-1">
                      <Button appearance="outline" size="icon" aria-label="Đưa phần lên" disabled={busy || sectionIndex === 0} onClick={() => moveSection(section.clientId, -1)}><ArrowUp size={15} /></Button>
                      <Button appearance="outline" size="icon" aria-label="Đưa phần xuống" disabled={busy || sections[sectionIndex + 1]?.unassigned === true || sectionIndex === sections.filter((item) => !item.unassigned).length - 1} onClick={() => moveSection(section.clientId, 1)}><ArrowDown size={15} /></Button>
                      <Button variant="danger" appearance="ghost" size="icon" aria-label={'Xóa phần ' + (sectionIndex + 1)} disabled={busy} onClick={() => removeSection(section)}><Trash2 size={15} /></Button>
                    </div>
                  )}
                </div>

                {section.questions.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {section.questions.map((question, questionIndex) => {
                      const editable = canEditQuestions && question.editable && (!placement || question.questionType === 'SINGLE_CHOICE')
                      const typeLabel = QUESTION_TYPE_OPTIONS.find((option) => option.id === question.questionType)?.label ??
                        (question.questionType === 'TRUE_FALSE' ? 'Đúng / sai' : 'Trả lời ngắn')
                      return (
                        <article key={question.clientId}
                          {...(canEditQuestions && !busy ? questionDrag.rowProps(question.clientId) : {})}
                          className={cn('rounded-xl border border-card-border bg-card-background p-4', questionDrag.rowProps(question.clientId).className)}>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1">
                              {editable && <DragHandle {...questionDrag.handleProps(question.clientId, `câu ${questionIndex + 1} trong phần ${sectionIndex + 1}`, busy)} />}
                              <strong className="text-sm text-primary">Câu {questionIndex + 1}</strong>
                            </div>
                            <div className="flex gap-1">
                              {editable && (
                                <>
                                  <Button appearance="outline" size="icon" aria-label="Đưa câu hỏi lên" disabled={busy || questionIndex === 0} onClick={() => moveQuestion(section.clientId, question.clientId, -1)}><ArrowUp size={14} /></Button>
                                  <Button appearance="outline" size="icon" aria-label="Đưa câu hỏi xuống" disabled={busy || questionIndex === section.questions.length - 1} onClick={() => moveQuestion(section.clientId, question.clientId, 1)}><ArrowDown size={14} /></Button>
                                  <Button variant="danger" appearance="ghost" size="icon" aria-label="Xóa câu hỏi" disabled={busy} onClick={() => updateSection(section.clientId, { questions: section.questions.filter((item) => item.clientId !== question.clientId) })}><Trash2 size={14} /></Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="grid gap-3">
                            {!question.editable && (
                              <p className="rounded-lg border border-card-border bg-background-gray-secondary px-3 py-2.5 text-sm text-text-tertiary">{typeLabel} · chỉ xem</p>
                            )}
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                              Nội dung câu hỏi
                              <textarea
                                className={textareaControlClass}
                                value={question.questionText}
                                onChange={(event) => updateQuestion(section.clientId, question.clientId, { questionText: event.target.value })}
                                placeholder="Nhập nội dung câu hỏi"
                                disabled={!editable || busy}
                              />
                            </label>
                            {placement && <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                              Môn/nhóm đánh giá
                              <DropdownField ariaLabel={`Môn cho câu ${questionIndex + 1} trong ${section.title}`}
                                options={categoryOptions.some(option => option.id === question.categoryId) || !question.categoryId ? categoryOptions : [...categoryOptions, { id: question.categoryId, label: 'Môn đã gắn' }]}
                                value={question.categoryId} placeholder="Chọn môn (không bắt buộc)"
                                isLoading={categories.status === 'loading'} emptyMessage="Chưa có môn khả dụng."
                                isDisabled={!editable || busy || categories.status !== 'ready'}
                                onChange={value => updateQuestion(section.clientId, question.clientId, { categoryId: value })} />
                            </label>}
                            {CHOICE_TYPES.includes(question.questionType) ? (
                              <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <span className="text-xs font-medium text-text-tertiary">Lựa chọn · đánh dấu đáp án đúng</span>
                                  {editable && question.options.length < 8 && (
                                    <Button appearance="ghost" size="sm" onClick={() => updateQuestion(section.clientId, question.clientId, { options: [...question.options, { text: '', correct: false }] })} disabled={busy}>
                                      <Plus size={14} />Thêm lựa chọn
                                    </Button>
                                  )}
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                  {question.options.map((option, optionIndex) => (
                                    <label key={question.clientId + '-option-' + optionIndex} className={'flex min-w-0 items-center gap-2 rounded-lg border p-2 ' + (option.correct ? 'border-badge-success-text/40 bg-badge-success-bg' : 'border-card-border bg-card-background')}>
                                      <input
                                        type={question.questionType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                                        name={'correct-' + question.clientId}
                                        checked={option.correct}
                                        onChange={(event) => {
                                          const options = question.options.map((item, index) => ({
                                            ...item,
                                            correct: index === optionIndex
                                              ? event.target.checked
                                              : question.questionType === 'SINGLE_CHOICE' ? false : item.correct,
                                          }))
                                          updateQuestion(section.clientId, question.clientId, { options })
                                        }}
                                        disabled={!editable || busy}
                                        aria-label={'Đánh dấu lựa chọn ' + String.fromCharCode(65 + optionIndex) + ' là đáp án đúng'}
                                      />
                                      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-badge-blue-background text-xs font-medium text-primary">{String.fromCharCode(65 + optionIndex)}</span>
                                      <input
                                        className={`${fieldControlClass} min-w-0 flex-1`}
                                        value={option.text}
                                        onChange={(event) => {
                                          const options = question.options.map((item, index) => index === optionIndex ? { ...item, text: event.target.value } : item)
                                          updateQuestion(section.clientId, question.clientId, { options })
                                        }}
                                        placeholder={'Lựa chọn ' + String.fromCharCode(65 + optionIndex)}
                                        disabled={!editable || busy}
                                      />
                                      {editable && question.options.length > 2 && (
                                        <button
                                          type="button"
                                          className="grid size-8 shrink-0 place-items-center rounded-md text-text-tertiary hover:bg-badge-danger-bg hover:text-badge-error-text"
                                          aria-label={'Bỏ lựa chọn ' + String.fromCharCode(65 + optionIndex)}
                                          disabled={busy}
                                          onClick={() => updateQuestion(section.clientId, question.clientId, { options: question.options.filter((_, index) => index !== optionIndex) })}
                                        ><X size={14} /></button>
                                      )}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                                Đáp án / hướng dẫn chấm
                                <textarea
                                  className={textareaControlClass}
                                  value={question.explanation}
                                  onChange={(event) => updateQuestion(section.clientId, question.clientId, { explanation: event.target.value })}
                                  placeholder="Nhập đáp án gợi ý hoặc tiêu chí chấm điểm"
                                  disabled={!editable || busy}
                                />
                              </label>
                            )}
                            {question.imageUrl && (
                              <a className="text-xs font-medium text-primary underline" href={question.imageUrl} target="_blank" rel="noreferrer">Xem ảnh đính kèm</a>
                            )}
                            {editable && (
                              <div className="rounded-lg border border-card-border bg-background-gray-secondary p-3">
                                <label className="flex items-center gap-2 text-xs font-medium text-text-primary">
                                  <input type="checkbox" checked={question.needsReview} onChange={(event) => updateQuestion(section.clientId, question.clientId, { needsReview: event.target.checked })} disabled={busy} />
                                  Câu hỏi cần rà soát trước khi xuất bản
                                </label>
                                {question.needsReview && (
                                  <textarea
                                    className="mt-2 min-h-16 w-full rounded-lg border border-card-border bg-card-background px-3 py-2 text-sm font-normal text-text-primary outline-none focus-visible:border-primary"
                                    value={question.reviewNote}
                                    onChange={(event) => updateQuestion(section.clientId, question.clientId, { reviewNote: event.target.value })}
                                    placeholder="Ghi chú nội bộ về nội dung cần rà soát"
                                    disabled={busy}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="m-0 rounded-lg border border-dashed border-card-border px-3 py-4 text-center text-xs text-text-tertiary">Phần này chưa có câu hỏi.</p>
                )}
                {canEditQuestions && (
                  <Button appearance="outline" className="mt-3 min-h-10" onClick={() => updateSection(section.clientId, { questions: [...section.questions, createDraftQuestion()] })} disabled={busy}>
                    <Plus size={15} />Thêm câu hỏi
                  </Button>
                )}
              </section>
            ))}
          </div>
        )}
      </Card>

      {error && <p className="m-0 rounded-xl border border-badge-danger-text/25 bg-badge-danger-bg p-3 text-sm font-medium text-badge-danger-text" role="alert">{error}</p>}
      {ambiguousQuestionSave && (
        <Notice tone="warning" role="alert" aria-live="assertive">
          Máy chủ có thể đã nhận một phần thay đổi câu hỏi nhưng phản hồi bị gián đoạn hoặc dữ liệu trả về chưa hợp lệ. Không gửi lại từ biểu mẫu này; hãy quay về danh sách và mở lại đề để kiểm tra.
        </Notice>
      )}
      {ambiguousCreate && (
        <Card as="section" padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="m-0 text-sm text-text-tertiary">Kết quả tạo đề chưa rõ. Kiểm tra lại danh sách trước khi gửi thao tác tạo lần nữa.</p>
          <Button appearance="outline" className="min-h-11" onClick={() => void checkPendingCreate()} disabled={busy}>
            {busy ? 'Đang kiểm tra...' : 'Kiểm tra kết quả tạo'}
          </Button>
        </Card>
      )}
      <Card as="section" padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-xs leading-5 text-text-tertiary">
          Đề mới được lưu ở trạng thái bản nháp. Có thể xuất bản sau khi đã đủ câu hỏi và đáp án.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button appearance="ghost" className="min-h-11" onClick={onCancel} disabled={busy}>
            {ambiguousCreate || ambiguousQuestionSave ? 'Quay về danh sách' : 'Hủy'}
          </Button>
          <Button
            appearance="outline"
            className="min-h-11"
            onClick={() => ambiguousCreate ? void checkPendingCreate() : void save(false)}
            disabled={busy || aiReading || publishedQuiz || ambiguousQuestionSave}
          >
            {ambiguousCreate ? <ClipboardCheck size={15} /> : <Clock3 size={15} />}
            {busy ? 'Đang kiểm tra...' : ambiguousCreate ? 'Kiểm tra danh sách' : initialQuiz || hasCreatedQuiz ? 'Lưu thay đổi' : 'Lưu bản nháp'}
          </Button>
          {quizSnapshot?.status !== 'ARCHIVED' && (
            <Button className="min-h-11" onClick={() => void save(true)} disabled={busy || aiReading || settingsLocked || publishedQuiz || ambiguousCreate || ambiguousQuestionSave}>
              <Send size={15} />{busy ? 'Đang xử lý...' : 'Lưu và xuất bản'}
            </Button>
          )}
        </div>
      </Card>
    </section>
  )
}

export default MockExamScreen

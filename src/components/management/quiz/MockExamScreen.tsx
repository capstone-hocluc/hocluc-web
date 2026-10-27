import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { getCategories, type Category } from '../../../services/categoryService'
import { ForbiddenPage } from '../../console/access-states'
import QuizDetails from './QuizDetails'
import { useRef, useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
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
  type CreateTeacherQuizRequest,
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
  type TeacherQuizSectionSpec,
} from '../../../services/teacherQuizService'
import { createTeacherQuizWithFile } from '../../../services/aiExtractionService'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { usePageResource } from '../../../hooks/usePageResource'
import Button from '../../console/button'
import PageHeading from '../../console/page-heading'
import { IconAction, RowActions } from '../../console/icon-action'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import QuizCatalog from './QuizCatalog'
import QuizImportDialog from './QuizImportDialog'
import ExamExtractionPanel from './ExamExtractionPanel'
import Card from '../../console/card'
import DateTimeField from '../../console/date-time-field'
import { Checkbox } from '../../tailgrids/core/checkbox'
import QuizPdfImportPanel from './QuizPdfImportPanel'
import ConfirmDialog from '../../console/confirm-dialog'
import DropdownField from '../../console/dropdown-field'
import { emptyExamFileDraft, type ExamFileDraft } from './exam-file-draft'
import ExamFileOnCreate from './ExamFileOnCreate'
import ExamEditorSteps from './ExamEditorSteps'
import { describePublishProblems } from './publish-problems'
import MockExamEditorSkeleton from './MockExamEditorSkeleton'
import ExamQuestionEditor from './ExamQuestionEditor'
import ExamQuestionRail from './ExamQuestionRail'
import { CHOICE_TYPES, type DraftQuestion, type DraftSection } from './exam-draft'
import ScrollArea from '../../ui/ScrollArea'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import { useConsoleFocus } from '../../console/console-focus'
import { Skeleton } from '../../tailgrids/core/skeleton'
import Notice from '../../console/notice'
import StatusBadge from '../../console/status'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../tailgrids/core/dropdown'

type AssessmentType = 'EXAM' | 'PLACEMENT'

const LAST_EXAM_STEP = 2

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


function createDraftQuestion(): DraftQuestion {
  return {
    clientId: 'local-question-' + crypto.randomUUID(),
    serverId: null,
    questionText: '',
    questionType: 'SINGLE_CHOICE',
    difficulty: null,
    options: Array.from({ length: 4 }, () => ({ text: '', correct: false })),
    explanation: '',
    imageUrl: null,
    categoryId: null,
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
    parentTitle: null,
    childTitle: null,
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
    parentTitle: null,
    childTitle: null,
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
    marks: question.marksFixed ? question.marks : null,
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
      { section, displayTitle: section.title, parentTitle: null as string | null, childTitle: null as string | null },
      ...[...section.children]
        .sort((a, b) => a.sequence - b.sequence)
        .map((child) => ({ section: child, displayTitle: section.title + ' · ' + child.title, parentTitle: section.title as string | null, childTitle: child.title as string | null })),
    ])
  const sectionIds = new Set(orderedSections.map(({ section }) => section.id))
  const sections: DraftSection[] = orderedSections.map(({ section, displayTitle, parentTitle, childTitle }) => ({
      clientId: section.id,
      title: displayTitle,
      parentTitle,
      childTitle,
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
    (payload.marks ?? null) === (server.marksFixed ? server.marks : null) &&
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
  // The editor takes the whole window, so a save that keeps it open reports here instead of in the page above.
  const [editorNotice, setEditorNotice] = useState('')
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
          ? 'Chưa thể xuất bản: ' + describePublishProblems(blockers) + '. Mở đề để hoàn thiện.'
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
        notice={editorNotice}
        onCancel={() => {
          setCreating(false)
          setEditorQuizId(null)
          setEditorNotice('')
          refresh()
        }}
        onSaved={(message, openQuizId) => {
          setCreating(false)
          setEditorQuizId(openQuizId ?? null)
          setEditorNotice(openQuizId ? message : '')
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
  notice,
  onCancel,
  onSaved,
}: {
  onCreated: (id: string) => void
  assessmentType: AssessmentType
  quizId: string | null
  notice: string
  onCancel: () => void
  onSaved: (message: string, openQuizId?: string) => void
}) {
  const access = useQuizAccess()
  useConsoleFocus()
  // Kept here, not in the form, so reloading the exam (after an import, say) stays on the step the teacher was on.
  const [step, setStep] = useState<number | null>(null)
  const editor = usePageResource(() => access.canWrite && quizId ? getTeacherQuiz(quizId) : Promise.resolve(null), [quizId, access.canWrite])
  if (!access.canWrite) return <ForbiddenPage />
  if (quizId && editor.status === 'loading') {
    return <MockExamEditorSkeleton />
  }
  if (quizId && (editor.status !== 'ready' || !editor.data)) {
    return (
      <div className="m-6 rounded-xl border border-card-border bg-background-gray-secondary p-4" role="alert">
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
  if (quizId && editor.data?.quiz.type !== assessmentType) return <div className="p-6"><Notice tone="warning">Bài kiểm tra không thuộc loại đang mở. <Button appearance="outline" onClick={onCancel}>Quay lại</Button></Notice></div>
  return (
    <TeacherMockExamForm
      key={quizId ?? 'new-exam'}
      assessmentType={assessmentType}
      initial={quizId ? editor.data : null}
      initialStep={step}
      onStepChange={setStep}
      notice={notice}
      onCancel={onCancel}
      onSaved={(message, openQuizId) => {
        // A PDF stored with the new draft opens the editor on the PDF step, where its reading is shown.
        if (openQuizId) setStep(1)
        onSaved(message, openQuizId)
      }}
      onReload={editor.reload}
      onCreated={onCreated}
    />
  )
}

function TeacherMockExamForm({
  onCreated,
  assessmentType,
  initial,
  initialStep,
  onStepChange,
  notice,
  onCancel,
  onSaved,
  onReload,
}: {
  onCreated: (id: string) => void
  assessmentType: AssessmentType
  initial: TeacherQuizEditor | null
  initialStep: number | null
  onStepChange: (step: number) => void
  notice: string
  onCancel: () => void
  onSaved: (message: string, openQuizId?: string) => void
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pdfApplyAttempted, setPdfApplyAttempted] = useState(false)
  const [ambiguousCreate, setAmbiguousCreate] = useState(false)
  const [examFileDraft, setExamFileDraft] = useState<ExamFileDraft>(emptyExamFileDraft)
  const savingWithFile = !serverQuizId && examFileDraft.file !== null
  const [ambiguousQuestionSave, setAmbiguousQuestionSave] = useState(false)
  const [importBaseline] = useState(() => JSON.stringify({ settings, sections }))
  const hasUnsavedChanges = JSON.stringify({ settings, sections }) !== importBaseline
  const aiReading = initial?.latestJob?.kind === 'EXAM_FILE' && (initial.latestJob.status === 'PENDING' || initial.latestJob.status === 'RUNNING')
  const pendingCreateRef = useRef<PendingExamCreate | null>(null)
  // A paper still being read, ready to review, or stored but not yet read reopens on its PDF step; everything else starts on the settings.
  const [step, setStep] = useState(() => {
    if (initialStep !== null) return initialStep
    const reading = initial?.latestJob && initial.latestJob.status !== 'APPLIED'
    const unread = initial?.quiz.examFile && initial.questions.length === 0
    return reading || unread ? 1 : 0
  })

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
  // A nested structure (groups, parent sections) stays fixed, but the content of each question can still be corrected.
  const canEditContent = !questionsLocked && !publishedQuiz
  const canEditQuestions = canEditContent && !structureReadOnly
  const hasCreatedQuiz = serverQuizId !== null
  // Questions are numbered across the whole exam, in the order they are saved.
  const numbered = sections.flatMap((section) => section.questions.map((question) => ({ section, question })))
  const activeEntry = numbered.find((entry) => entry.question.clientId === selectedId)
    ?? numbered.find((entry) => entry.section.clientId === selectedId)
    ?? (sections.some((section) => section.clientId === selectedId) ? null : numbered[0] ?? null)
  const activeSection = activeEntry?.section ?? sections.find((section) => section.clientId === selectedId) ?? sections[0] ?? null
  const railSelectedId = activeEntry ? activeEntry.question.clientId : selectedId
  const importBlockedReason = !serverQuizId ? ambiguousCreate || ambiguousQuestionSave ? 'Kiểm tra danh sách đề trước khi tạo lại.'
    : sections.length !== 1 || sections[0].title !== 'Phần 1' || sections[0].categoryId || sections[0].suggestedMinutes || sections.some(s => s.questions.some(q => questionHasAnyContent(q) || q.explanation.trim() || q.options.some(o => o.correct)))
      ? 'Đang có nội dung hoặc cấu trúc soạn tay. Lưu bản nháp trước để giữ nội dung, rồi nhập thêm file.' : ''
    : aiReading ? 'AI đang đọc PDF. Kiểm tra tiến trình trước khi nhập thêm.'
    : publishedQuiz || settingsLocked ? 'Chỉ nhập vào bản nháp chưa có lượt làm.'
      : ambiguousCreate || ambiguousQuestionSave ? 'Tải lại bài để xác nhận kết quả lưu trước khi nhập.'
        : hasUnsavedChanges ? 'Lưu thay đổi rồi mở lại bài trước khi nhập file.'
          : structureReadOnly ? 'Cấu trúc bài này đang ở chế độ chỉ xem.' : ''

  const extractBlockedReason = !serverQuizId ? ''
    : publishedQuiz || settingsLocked ? 'Chỉ đọc đề vào bản nháp chưa có lượt làm.'
      : ambiguousCreate || ambiguousQuestionSave ? 'Tải lại bài để xác nhận kết quả lưu trước khi đọc đề.'
        : hasUnsavedChanges ? 'Lưu thay đổi rồi mở lại bài trước khi đọc đề bằng AI.'
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
    const created = createDraftSection('Phần ' + (next.length + 1))
    next.push(created)
    if (unassigned) next.push(unassigned)
    setSections(next)
    setSelectedId(created.clientId)
  }

  const addQuestion = (sectionId: string) => {
    const created = createDraftQuestion()
    setSections((items) => items.map((section) => section.clientId === sectionId ? { ...section, questions: [...section.questions, created] } : section))
    setSelectedId(created.clientId)
  }

  const deleteQuestion = (sectionId: string, clientId: string) => {
    const index = numbered.findIndex((entry) => entry.question.clientId === clientId)
    const neighbour = numbered[index + 1] ?? numbered[index - 1]
    setSections((items) => items.map((section) => section.clientId === sectionId
      ? { ...section, questions: section.questions.filter((question) => question.clientId !== clientId) }
      : section))
    setSelectedId(neighbour ? neighbour.question.clientId : sectionId)
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

  const validateSettings = () => {
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
    return ''
  }

  /** The first problem found, with the step and question it belongs to so the editor can show it. */
  const validate = (publish: boolean): { message: string; step?: number; questionId?: string } => {
    const settingsError = validateSettings()
    if (settingsError) return { message: settingsError, step: 0 }

    if (canEditContent) {
      const activeSections = sections.filter((section) => section.title.trim() || section.questions.some(questionHasAnyContent))
      const allQuestions = activeSections.flatMap((section) => section.questions.filter(questionHasAnyContent))
      // With a fixed structure only the questions the teacher changed are checked, so one fix can be saved while others still lack answers.
      const originalQuestions = originalEditorRef.current?.questions ?? []
      const nonEmptyQuestions = structureReadOnly
        ? allQuestions.filter((question) => {
          const previous = originalQuestions.find((item) => item.id === question.serverId)
          return !previous || !questionPayloadMatchesServer(question, previous)
        })
        : allQuestions
      for (const section of activeSections) {
        const hasQuestions = section.questions.some(questionHasAnyContent)
        if (!section.unassigned && hasQuestions && !section.title.trim()) return { message: 'Đặt tên cho mỗi phần có câu hỏi.', step: 2, questionId: section.clientId }
      }
      for (const question of nonEmptyQuestions) {
        const at = { step: 2, questionId: question.clientId }
        if (!question.questionText.trim()) return { message: 'Mỗi câu hỏi cần có nội dung.', ...at }
        if (CHOICE_TYPES.includes(question.questionType)) {
          const options = question.options.filter((option) => option.text.trim())
          if (options.length < 2) return { message: 'Mỗi câu trắc nghiệm cần ít nhất hai lựa chọn.', ...at }
          if (!question.needsReview && !options.some((option) => option.correct)) {
            return { message: 'Chọn ít nhất một đáp án đúng hoặc đánh dấu câu hỏi cần rà soát.', ...at }
          }
          if (question.questionType === 'SINGLE_CHOICE' && options.filter((option) => option.correct).length > 1) {
            return { message: 'Câu trắc nghiệm một đáp án chỉ được chọn một đáp án đúng.', ...at }
          }
        }
      }
      if (publish && allQuestions.length === 0) return { message: 'Thêm ít nhất một câu hỏi trước khi xuất bản.', step: 2 }
      if (placement && publish && allQuestions.some(question => question.questionType !== 'SINGLE_CHOICE')) return { message: 'Màn Student hiện chỉ làm được câu hỏi một đáp án. Cần hoàn thiện hỗ trợ loại câu hỏi khác trước khi xuất bản bài này.', step: 2 }
    }
    return { message: '' }
  }

  const goToStep = (target: number) => {
    // Moving on from the settings checks them first, so a bad value is reported where it can be fixed.
    if (target > 0 && step === 0 && !publishedQuiz) {
      const problem = validateSettings()
      if (problem) { setError(problem); return }
    }
    setError('')
    const next = Math.max(0, Math.min(LAST_EXAM_STEP, target))
    setStep(next)
    onStepChange(next)
  }

  const getImportCreateRequest = (): CreateTeacherQuizRequest | null => {
    const validation = validate(false).message
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
    if (busy) return
    if (!pending) {
      setError('Kết quả nhập file chưa rõ. Hãy quay về danh sách và kiểm tra đề trước khi tạo lại.')
      return
    }
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
    const problem = validate(publish)
    if (problem.message) {
      setError(problem.message)
      if (problem.questionId) setSelectedId(problem.questionId)
      if (problem.step !== undefined && problem.step !== step) {
        setStep(problem.step)
        onStepChange(problem.step)
      }
      return
    }
    setBusy(true)
    setError('')
    let quizId = serverQuizId
    let openAfterSave: string | undefined
    let fileWarning = ''
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
          const createPayload: CreateTeacherQuizRequest = {
            type: assessmentType,
            ...(placement ? { description: settings.description.trim() } : { courseId: settings.courseId }),
            title: settings.title.trim(),
            durationMinutes,
            maxAttempts,
            ...(!placement ? { passingPercentage, showAnswers: settings.showAnswers, practiceAllowed: settings.practiceAllowed } : {}),
            ...(fromDateTimeLocal(settings.availableFrom) ? { availableFrom: fromDateTimeLocal(settings.availableFrom) } : {}),
            ...(fromDateTimeLocal(settings.availableUntil) ? { availableUntil: fromDateTimeLocal(settings.availableUntil) } : {}),
          }
          const pdf = examFileDraft.file
          const createdWithFile = pdf
            ? await createTeacherQuizWithFile(createPayload, pdf, {
              read: examFileDraft.read,
              fromPage: examFileDraft.fromPage ? Number(examFileDraft.fromPage) : undefined,
              toPage: examFileDraft.toPage ? Number(examFileDraft.toPage) : undefined,
              hints: examFileDraft.hints,
            })
            : null
          const created = createdWithFile ? createdWithFile.quiz : await createTeacherQuiz(createPayload)
          openAfterSave = createdWithFile ? created.id : undefined
          fileWarning = createdWithFile?.warnings[0] ?? ''
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

      if (canEditContent && quizId) {
        const original = originalEditorRef.current
        const activeSections = sections
          .filter((section) => section.title.trim() || section.questions.some(questionHasAnyContent))
          .map((section) => ({
            ...section,
            questions: section.questions.filter(questionHasAnyContent),
          }))
        const finalQuestionDrafts = activeSections.flatMap((section) => section.questions)
        const retainedIds = new Set(finalQuestionDrafts.map((question) => question.serverId).filter(Boolean))

        if (canEditQuestions) {
          for (const serverQuestion of original?.questions ?? []) {
            if (!retainedIds.has(serverQuestion.id)) await deleteTeacherQuizQuestion(serverQuestion.id)
          }
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
        if (canEditQuestions && questionOrderChanged && finalQuestionIds.length > 0) {
          await reorderTeacherQuizQuestions(quizId, finalQuestionIds)
        }

        const questionCounts = new Map(
          workingSections.map((section) => [section.clientId, section.questions.length])
        )
        const desiredLayout = sectionLayoutSpecs(workingSections, questionCounts)
        const previousLayout = original ? existingLayoutSpecs(original) : []
        if (canEditQuestions && !sameLayout(desiredLayout, previousLayout)) await setTeacherQuizLayout(quizId, desiredLayout)
      }

      if (publish && quizId) await publishTeacherQuiz(quizId)
      if (quizId) originalEditorRef.current = await getTeacherQuiz(quizId)
      onSaved(
        publish
          ? 'Đã lưu và xuất bản đề thi thử.'
          : serverQuizId ? 'Đã lưu thay đổi đề thi thử.'
            : openAfterSave ? `Đã lưu đề thi dưới dạng bản nháp cùng file PDF.${fileWarning ? ' AI chưa được bật trên máy chủ này nên file chỉ được lưu; đọc đề sau khi AI sẵn sàng.' : ''}`
              : 'Đã lưu đề thi dưới dạng bản nháp.',
        openAfterSave
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
            message = 'Chưa thể xuất bản: ' + describePublishProblems(blockers) + '. Hoàn thiện nội dung trong đề rồi thử lại.'
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

  const headingLabel = placement
    ? initialQuiz ? 'Chỉnh sửa đánh giá đầu vào' : hasCreatedQuiz ? 'Hoàn thiện bài đầu vào nháp' : 'Tạo đánh giá đầu vào'
    : initialQuiz ? 'Chỉnh sửa đề thi thử' : hasCreatedQuiz ? 'Hoàn thiện đề thi nháp' : 'Tạo đề thi thử'
  const backLabel = placement ? 'Quay lại đánh giá đầu vào' : 'Quay lại danh sách đề thi'
  const editableSections = sections.filter((section) => !section.unassigned)

  const numberOf = new Map(numbered.map((entry, index) => [entry.question.clientId, index + 1]))

  const sectionBar = (section: DraftSection) => {
    const sectionIndex = sections.indexOf(section)
    const position = editableSections.indexOf(section) + 1
    return (
      <div className="mx-auto flex w-full max-w-3xl items-end gap-2 px-4 pt-4 sm:px-6">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium text-text-tertiary">
          <span>Phần {position} · {section.questions.length} câu</span>
          <input
            className={fieldControlClass}
            value={section.title}
            onChange={(event) => updateSection(section.clientId, { title: event.target.value })}
            placeholder="Tên phần thi, ví dụ: Tư duy định lượng"
            disabled={busy}
          />
        </label>
        <div className="flex shrink-0 gap-1">
          <Button appearance="outline" size="icon" aria-label="Đưa phần lên" disabled={busy || sectionIndex === 0} onClick={() => moveSection(section.clientId, -1)}><ArrowUp size={15} /></Button>
          <Button appearance="outline" size="icon" aria-label="Đưa phần xuống" disabled={busy || sections[sectionIndex + 1]?.unassigned === true || sectionIndex === editableSections.length - 1} onClick={() => moveSection(section.clientId, 1)}><ArrowDown size={15} /></Button>
          <Button variant="danger" appearance="ghost" size="icon" aria-label={'Xóa phần ' + position} disabled={busy} onClick={() => removeSection(section)}><Trash2 size={15} /></Button>
        </div>
      </div>
    )
  }

  const questionEditor = (section: DraftSection, question: DraftQuestion) => {
    const number = numberOf.get(question.clientId) ?? 0
    const position = section.questions.indexOf(question)
    return (
      <ExamQuestionEditor
        key={question.clientId}
        question={question}
        number={number}
        sectionTitle={section.title}
        placement={placement}
        editable={canEditContent && question.editable && (!placement || question.questionType === 'SINGLE_CHOICE')}
        structureEditable={canEditQuestions}
        busy={busy}
        canMoveUp={position > 0}
        canMoveDown={position < section.questions.length - 1}
        categoryOptions={categoryOptions}
        categoriesReady={categories.status === 'ready'}
        categoriesLoading={categories.status === 'loading'}
        onChange={(update) => updateQuestion(section.clientId, question.clientId, update)}
        onMove={(direction) => moveQuestion(section.clientId, question.clientId, direction)}
        onDelete={() => deleteQuestion(section.clientId, question.clientId)}
        onPrevious={number > 1 ? () => setSelectedId(numbered[number - 2].question.clientId) : null}
        onNext={number < numbered.length ? () => setSelectedId(numbered[number].question.clientId) : null}
      />
    )
  }

  // In the drawer every choice also closes it, so the question it leads to is in view.
  const rail = (afterChoice?: () => void) => (
    <ExamQuestionRail sections={sections} selectedId={railSelectedId} canEditStructure={canEditQuestions} busy={busy}
      onSelect={(clientId) => { setSelectedId(clientId); afterChoice?.() }}
      onAddQuestion={(sectionId) => { addQuestion(sectionId); afterChoice?.() }}
      onAddSection={() => { addSection(); afterChoice?.() }} />
  )

  return (
    <section className="flex h-dvh min-w-0 flex-col bg-card-surface-area">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-card-border px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" aria-label={backLabel} title={backLabel} onClick={onCancel}
            className="-ml-1.5 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-icon-primary hover:bg-background-gray-secondary">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <h1 className="m-0 min-w-0 truncate text-lg font-semibold text-text-primary">{headingLabel}</h1>
          {quizSnapshot && <StatusBadge tone={statusTone(quizSnapshot.status)}>{statusLabel(quizSnapshot.status)}</StatusBadge>}
        </div>
        <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1">
          <ExamEditorSteps current={step} onSelect={goToStep} disabled={busy} />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button appearance="ghost" className={ambiguousCreate || ambiguousQuestionSave ? undefined : 'max-sm:hidden'} onClick={onCancel} disabled={busy}>
            {ambiguousCreate || ambiguousQuestionSave ? 'Quay về danh sách' : 'Hủy'}
          </Button>
          <Button
            appearance="outline"
            onClick={() => ambiguousCreate ? void checkPendingCreate() : void save(false)}
            disabled={busy || publishedQuiz || ambiguousQuestionSave}
          >
            {ambiguousCreate ? <ClipboardCheck size={15} /> : <Clock3 size={15} />}
            {busy ? (savingWithFile ? 'Đang tải file và lưu...' : 'Đang kiểm tra...') : ambiguousCreate ? 'Kiểm tra danh sách' : initialQuiz || hasCreatedQuiz ? 'Lưu thay đổi' : 'Lưu bản nháp'}
          </Button>
          {quizSnapshot?.status !== 'ARCHIVED' && step === LAST_EXAM_STEP && (
            <Button onClick={() => void save(true)} disabled={busy || settingsLocked || publishedQuiz || ambiguousCreate || ambiguousQuestionSave || savingWithFile}>
              <Send size={15} />{busy ? 'Đang xử lý...' : 'Lưu và xuất bản'}
            </Button>
          )}
        </div>
      </header>

      {(error || notice || ambiguousQuestionSave || ambiguousCreate) && (
        <div className="flex shrink-0 flex-col gap-3 px-4 pt-3 sm:px-6">
          {notice && <Notice role="status">{notice}</Notice>}
          {error && <Notice tone="danger" role="alert" className="font-medium">{error}</Notice>}
          {ambiguousQuestionSave && (
            <Notice tone="warning" role="alert" aria-live="assertive">
              Máy chủ có thể đã nhận một phần thay đổi câu hỏi nhưng phản hồi bị gián đoạn. Không gửi lại từ biểu mẫu này; hãy quay về danh sách và mở lại đề để kiểm tra.
            </Notice>
          )}
          {ambiguousCreate && (
            <Card as="section" padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p className="m-0 text-sm text-text-tertiary">Kết quả tạo đề chưa rõ. Kiểm tra lại danh sách trước khi gửi thao tác tạo lần nữa.</p>
              <Button appearance="outline" onClick={() => void checkPendingCreate()} disabled={busy}>
                {busy ? 'Đang kiểm tra...' : 'Kiểm tra kết quả tạo'}
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Steps are hidden, not unmounted, so a reading in progress keeps polling while the teacher looks at another step. */}
      <div className="min-h-0 flex-1">
        <ScrollArea hidden={step !== 0} className="h-full">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <Card as="section" padding="lg" aria-label={placement ? 'Thông tin bài đánh giá' : 'Cấu hình đề thi'}>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary md:col-span-3">
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
          {placement && <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary md:col-span-3">
            Mô tả
            <textarea aria-label="Mô tả" className={textareaControlClass} value={settings.description} disabled={publishedQuiz || busy || aiReading}
              onChange={event => updateSettings('description', event.target.value)} />
            <span className="text-xs font-normal text-text-tertiary">Không gắn khóa học. Student được xem đáp án sau khi bài đã chấm; kết quả được phân loại theo môn.</span>
          </label>}
          {!placement && !initialQuiz && (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary md:col-span-3">
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
            <p className="m-0 text-sm md:col-span-3">
              <span className="block text-xs font-medium text-text-tertiary">Khóa học</span>
              <strong className="text-text-primary">{serverCourseName}</strong>
            </p>
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
          {!placement && <>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Điểm đạt (%)
              <input
                className={fieldControlClass}
                type="number" min="0" max="100" step="0.01"
                value={settings.passingPercentage}
                onChange={(event) => updateSettings('passingPercentage', event.target.value)}
                disabled={fieldsLocked || busy}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2 md:col-span-3">
              <DateTimeField
                label="Bắt đầu làm bài"
                value={settings.availableFrom}
                onChange={(value) => updateSettings('availableFrom', value)}
                disabled={fieldsLocked || busy}
                required={Boolean(quizSnapshot?.availableFrom)}
              />
              <DateTimeField
                label="Hạn làm bài"
                value={settings.availableUntil}
                onChange={(value) => updateSettings('availableUntil', value)}
                disabled={fieldsLocked || busy}
                required={Boolean(quizSnapshot?.availableUntil)}
              />
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 md:col-span-3">
              <Checkbox isSelected={settings.showAnswers} onChange={(checked) => updateSettings('showAnswers', checked)} isDisabled={fieldsLocked || busy} className="text-sm text-text-primary">
                Cho phép xem đáp án sau khi nộp
              </Checkbox>
              <Checkbox isSelected={settings.practiceAllowed} onChange={(checked) => updateSettings('practiceAllowed', checked)} isDisabled={fieldsLocked || busy} className="text-sm text-text-primary">
                Cho phép học viên luyện tập lại
              </Checkbox>
            </div>
          </>}
        </div>
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
          </div>
        </ScrollArea>

        <ScrollArea hidden={step !== 1} className="h-full">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
      {!serverQuizId && <ExamFileOnCreate value={examFileDraft} onChange={setExamFileDraft} disabled={busy || ambiguousCreate} />}

      <ExamExtractionPanel quizId={serverQuizId} examFile={quizSnapshot?.examFile ?? null} latestJob={initial?.latestJob ? { ...initial.latestJob, result: null } : null}
        existingQuestionCount={initial?.questions.length ?? 0} applyLocked={pdfApplyAttempted} onApplyAttempt={() => setPdfApplyAttempted(true)} blockedReason={extractBlockedReason} busy={busy} onReload={() => { onStepChange(step); onReload() }} />
      {serverQuizId && initial?.latestJob?.kind === 'EXAM_FILE' && <QuizPdfImportPanel quizId={serverQuizId} jobId={initial.latestJob.id} applyLocked={pdfApplyAttempted} onApplyAttempt={() => setPdfApplyAttempted(true)} blockedReason={extractBlockedReason} busy={busy} onBusyChange={setBusy} onReload={() => { onStepChange(step); onReload() }} />}
          </div>
        </ScrollArea>

        <div hidden={step !== 2} className="flex h-full flex-col lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
          <aside aria-label="Mục lục đề" className="hidden min-h-0 flex-col border-r border-card-border bg-card-background lg:flex">
            {rail()}
          </aside>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 px-4 pt-3 sm:px-6"><QuizImportDialog quizId={serverQuizId} blockedReason={importBlockedReason} busy={busy} onReload={() => { onStepChange(step); onReload() }} getCreateRequest={getImportCreateRequest} onCreated={onCreated} onUncertainCreate={() => setAmbiguousCreate(true)} onBusyChange={setBusy} /></div>
            <div className="flex shrink-0 border-b border-card-border px-4 py-2 sm:px-6 lg:hidden">
              <Button appearance="outline" size="sm" onClick={() => setRailOpen(true)}>Danh sách câu</Button>
            </div>
            <ScrollArea aria-label="Nội dung đề" className="min-h-0 flex-1">
              {placement && ['loading', 'error', 'forbidden', 'not-found'].includes(categories.status) && (
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pt-4 sm:px-6">
                  {categories.status === 'loading' && <Skeleton className="h-4 w-44" role="status" aria-label="Đang tải môn học" />}
                  {['error', 'forbidden', 'not-found'].includes(categories.status) && <Notice tone="warning">{categories.errorMessage || 'Không tải được các môn bạn được phép xem. Có thể lưu nháp và bổ sung sau.'}<Button appearance="outline" onClick={categories.reload}>Thử tải môn học</Button></Notice>}
                </div>
              )}
              {activeSection && canEditQuestions && !activeSection.unassigned && sectionBar(activeSection)}
              {activeEntry ? questionEditor(activeEntry.section, activeEntry.question) : (
                <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 p-4 sm:p-6">
                  <p className="m-0 w-full rounded-xl border border-dashed border-card-border bg-background-gray-secondary p-5 text-center text-sm text-text-tertiary">
                    {sections.length === 0 ? 'Chưa có phần thi hoặc câu hỏi. Thêm một phần để bắt đầu soạn đề.' : 'Phần này chưa có câu hỏi.'}
                  </p>
                  {canEditQuestions && (sections.length === 0
                    ? <Button appearance="outline" onClick={addSection} disabled={busy}><Plus size={15} />Thêm phần thi</Button>
                    : activeSection && <Button appearance="outline" onClick={() => addQuestion(activeSection.clientId)} disabled={busy}><Plus size={15} />Thêm câu hỏi đầu tiên</Button>)}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {step < LAST_EXAM_STEP && (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-card-border px-4 py-3 sm:px-6">
          <div>
            {step > 0 && (
              <Button appearance="outline" onClick={() => goToStep(step - 1)} disabled={busy}>
                <ArrowLeft size={15} />Quay lại
              </Button>
            )}
          </div>
          <Button onClick={() => goToStep(step + 1)} disabled={busy}>
            Tiếp tục<ArrowRight size={15} />
          </Button>
        </footer>
      )}

      <SheetOverlay isOpen={railOpen} onOpenChange={setRailOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-80! max-w-80! border-r border-card-border bg-card-background p-0">
          <SheetTitle className="sr-only">Danh sách câu hỏi</SheetTitle>
          {rail(() => setRailOpen(false))}
        </SheetContent>
      </SheetOverlay>
    </section>
  )
}

export default MockExamScreen

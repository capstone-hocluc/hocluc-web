import TeacherPageHeader, { TeacherBackLink } from './TeacherPageHeader'
import { useRef, useState } from 'react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Copy,
  FilePlus2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { getMainCourses, type Course } from '../../services/courseService'
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
  type TeacherQuizSectionSpec,
} from '../../services/teacherQuizService'
import { ApiError } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
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

interface TeacherMockExamsProps {
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
  existingIds: Set<string>
  startedAt: number
  createdById: string | null
  title: string
  courseId: string
  durationMinutes: number
  maxAttempts: number
  passingPercentage: number
  showAnswers: boolean
  practiceAllowed: boolean
  availableFrom: number | null
  availableUntil: number | null
}

type StatusFilter = 'Tất cả' | 'Bản nháp' | 'Đã xuất bản' | 'Đã lưu trữ'

const STATUS_FILTERS: StatusFilter[] = ['Tất cả', 'Bản nháp', 'Đã xuất bản', 'Đã lưu trữ']
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
  const editable =
    CHOICE_TYPES.includes(question.questionType) || question.questionType === 'LONG_ANSWER'
  return {
    clientId: question.id,
    serverId: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    options: question.options.map((option) => ({ text: option.text, correct: option.correct })),
    explanation: question.explanation ?? '',
    imageUrl: question.imageUrl,
    categoryId: question.categoryId,
    difficulty: question.difficulty,
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

function displayDate(value: string | null) {
  if (!value) return 'Chưa đặt lịch'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Thời gian không hợp lệ'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
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
    if (pending.existingIds.has(quiz.id) || quiz.type !== 'EXAM' || quiz.status !== 'DRAFT') return false
    if (!pending.createdById || quiz.createdById !== pending.createdById) return false
    if (quiz.title !== pending.title || quiz.courseId !== pending.courseId) return false
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
    (payload.difficulty ?? null) === server.difficulty &&
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

function TeacherMockExams({ onBack, onAction }: TeacherMockExamsProps) {
  const quizzes = usePageResource(() => getTeacherQuizzes(), [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Tất cả')
  const [creating, setCreating] = useState(false)
  const [editorQuizId, setEditorQuizId] = useState<string | null>(null)
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
    if (busyId) return
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
    const shouldDuplicate =
      exam.status !== 'DRAFT' || isLocked(exam) || forceCopyIds.has(exam.id)
    if (!shouldDuplicate) {
      setEditorQuizId(exam.id)
      return
    }
    if (busyId) return
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

  if (creating || editorQuizId) {
    return (
      <TeacherMockExamEditor
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

  const allExams = (quizzes.data ?? []).filter((quiz) => quiz.type === 'EXAM')
  const term = search.trim().toLocaleLowerCase('vi')
  const examItems = allExams.filter((exam) => {
    const matchesSearch = !term ||
      (exam.title + ' ' + (exam.courseTitle ?? '')).toLocaleLowerCase('vi').includes(term)
    const matchesStatus = statusFilter === 'Tất cả' ||
      (statusFilter === 'Bản nháp' && exam.status === 'DRAFT') ||
      (statusFilter === 'Đã xuất bản' && exam.status === 'PUBLISHED') ||
      (statusFilter === 'Đã lưu trữ' && exam.status === 'ARCHIVED')
    return matchesSearch && matchesStatus
  })
  const hasActiveFilters = Boolean(term) || statusFilter !== 'Tất cả'

  return (
    <section className="flex flex-col gap-5">
      <TeacherBackLink onClick={onBack}>Quay lại tổng quan</TeacherBackLink>
      <TeacherPageHeader
        title="Bài thi thử"
        description="Quản lý đề thi, thời gian làm bài và lượt dự thi."
        actions={
          <Button className="min-h-11" onClick={() => setCreating(true)}>
            <Plus size={16} />Tạo đề thi thử
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3" padding="md" radius="lg">
          <ClipboardCheck className="text-primary" size={21} aria-hidden="true" />
          <div><strong className="block text-base text-text-heading">{allExams.length}</strong><span className="text-xs text-text-secondary">Đề thi thử</span></div>
        </Card>
        <Card className="flex items-center gap-3" padding="md" radius="lg">
          <CheckCircle2 className="text-success" size={21} aria-hidden="true" />
          <div><strong className="block text-base text-text-heading">{allExams.filter((exam) => exam.status === 'PUBLISHED').length}</strong><span className="text-xs text-text-secondary">Đang xuất bản</span></div>
        </Card>
        <Card className="flex items-center gap-3" padding="md" radius="lg">
          <Users className="text-primary" size={21} aria-hidden="true" />
          <div><strong className="block text-base text-text-heading">{allExams.reduce((total, exam) => total + exam.attemptCount, 0)}</strong><span className="text-xs text-text-secondary">Lượt dự thi</span></div>
        </Card>
      </div>

      <Card as="section" padding="lg" radius="lg" aria-labelledby="teacher-exam-list-title">
        <div className="mb-4">
          <CardEyebrow>SOẠN VÀ QUẢN LÝ</CardEyebrow>
          <CardTitle id="teacher-exam-list-title" className="text-base">Danh sách đề thi thử</CardTitle>
        </div>
        <SearchFilterBar
          query={search}
          onQueryChange={setSearch}
          placeholder="Tìm theo tên đề thi hoặc khóa học"
          filter={statusFilter}
          onFilterChange={(value) => setStatusFilter(value as StatusFilter)}
          filterOptions={STATUS_FILTERS}
          resultCount={quizzes.status === 'ready' ? examItems.length : undefined}
          resultLabel="đề thi"
        />

        {quizzes.status === 'loading' ? (
          <div className="flex flex-col gap-3" aria-label="Đang tải danh sách đề thi">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : quizzes.status !== 'ready' ? (
          <div className="rounded-xl border border-line-soft bg-surface-soft p-4" role="alert">
            <p className="m-0 text-sm text-text-secondary">
              {quizzes.status === 'forbidden'
                ? 'Tài khoản hiện tại chưa có quyền xem các đề thi được giao.'
                : quizzes.errorMessage || 'Không thể tải danh sách đề thi.'}
            </p>
            <Button appearance="outline" className="mt-3 min-h-11" onClick={refresh}>Thử lại</Button>
          </div>
        ) : examItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-blue bg-surface-soft px-5 py-8 text-center">
            <FilePlus2 className="mx-auto mb-2 text-primary" size={24} aria-hidden="true" />
            <strong className="block text-sm text-text-heading">
              {hasActiveFilters ? 'Không tìm thấy đề thi phù hợp' : 'Chưa có đề thi thử'}
            </strong>
            <p className="mt-1 mb-0 text-sm text-text-secondary">
              {hasActiveFilters ? 'Thử từ khóa hoặc trạng thái khác.' : 'Tạo đề thi thử đầu tiên cho một khóa học chính.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {examItems.map((exam) => (
              <article key={exam.id} className="flex flex-col gap-3 rounded-xl border border-line-blue bg-surface p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="m-0 text-sm font-bold text-text-heading">{exam.title}</h2>
                    <StatusBadge tone={statusTone(exam.status)} size="sm">{statusLabel(exam.status)}</StatusBadge>
                    {isLocked(exam) && <StatusBadge tone="locked" size="sm">Đã có lượt thi</StatusBadge>}
                  </div>
                  <p className="mt-1 mb-0 text-xs text-text-secondary">
                    {[exam.courseTitle, exam.questionCount + ' câu', exam.durationMinutes ? exam.durationMinutes + ' phút' : null,
                      exam.passingPercentage != null ? 'Điểm đạt ' + exam.passingPercentage + '%' : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-1 mb-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1"><CalendarClock size={13} />Hạn làm: {displayDate(exam.availableUntil)}</span>
                    <span className="inline-flex items-center gap-1"><Users size={13} />{exam.attemptCount} lượt thi</span>
                  </p>
                  {exam.status === 'DRAFT' && (exam.publishProblems?.length ?? 0) > 0 && (
                    <p className="mt-1 mb-0 text-xs text-text-muted">Cần hoàn thiện: {exam.publishProblems?.join(', ')}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button
                    className="min-h-11 flex-1 sm:flex-none"
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
                      className="min-h-11 flex-1 sm:flex-none"
                      disabled={busyId !== null}
                      onClick={() => void runAction(
                        exam,
                        () => exam.status === 'PUBLISHED' ? unpublishTeacherQuiz(exam.id) : publishTeacherQuiz(exam.id),
                        exam.status === 'PUBLISHED' ? 'Đã ẩn đề thi thử.' : 'Đã xuất bản đề thi thử.',
                        exam.status === 'PUBLISHED'
                      )}
                    >
                      {exam.status === 'PUBLISHED' ? <X size={15} /> : <Send size={15} />}
                      {exam.status === 'PUBLISHED' ? 'Ẩn đề thi' : 'Xuất bản'}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button appearance="outline" className="min-h-11" disabled={busyId !== null} aria-label={'Thao tác khác với ' + exam.title}>
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem disabled={busyId !== null} onSelect={() => void runAction(exam, () => duplicateTeacherQuiz(exam.id), 'Đã sao chép đề thi thành bản nháp.')}>
                        <Copy size={15} />Sao chép thành bản nháp
                      </DropdownMenuItem>
                      {!isLocked(exam) && (
                        <DropdownMenuItem
                          disabled={busyId !== null}
                          className="text-danger data-[highlighted]:text-danger"
                          onSelect={() => setConfirmDelete(exam)}
                        >
                          <Trash2 size={15} />Xóa đề thi
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
          title="Xóa đề thi thử?"
          description={<>Đề <strong>{confirmDelete.title}</strong> sẽ bị xóa khỏi danh sách.</>}
          cancelLabel="Hủy"
          confirmLabel="Xóa đề"
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
  quizId,
  onCancel,
  onSaved,
}: {
  quizId: string | null
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const editor = usePageResource(() => quizId ? getTeacherQuiz(quizId) : Promise.resolve(null), [quizId])
  if (quizId && editor.status === 'loading') {
    return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48" /><Skeleton className="h-72" /></div>
  }
  if (quizId && (editor.status !== 'ready' || !editor.data)) {
    return (
      <div className="rounded-xl border border-line-soft bg-surface-soft p-4" role="alert">
        <p className="m-0 text-sm text-text-secondary">
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
  return (
    <TeacherMockExamForm
      key={quizId ?? 'new-exam'}
      initial={quizId ? editor.data : null}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  )
}

function TeacherMockExamForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: TeacherQuizEditor | null
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const { profile: currentUser } = useCurrentUser()
  const originalEditorRef = useRef<TeacherQuizEditor | null>(initial)
  const initialQuiz = initial?.quiz ?? null
  const [serverQuizId, setServerQuizId] = useState<string | null>(initialQuiz?.id ?? null)
  const [quizSnapshot, setQuizSnapshot] = useState<TeacherQuizRecord | null>(initialQuiz)
  const [settings, setSettings] = useState<ExamSettings>({
    title: initialQuiz?.title ?? '',
    courseId: initialQuiz?.courseId ?? '',
    duration: String(initialQuiz?.durationMinutes ?? 120),
    maxAttempts: String(initialQuiz?.maxAttempts ?? 1),
    passingPercentage: String(initialQuiz?.passingPercentage ?? 60),
    availableFrom: toDateTimeLocal(initialQuiz?.availableFrom),
    availableUntil: toDateTimeLocal(initialQuiz?.availableUntil),
    showAnswers: initialQuiz?.showAnswers ?? false,
    practiceAllowed: initialQuiz?.practiceAllowed ?? true,
  })
  const [sections, setSections] = useState<DraftSection[]>(() =>
    initial ? fromServerEditor(initial) : [createDraftSection('Phần 1')]
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ambiguousCreate, setAmbiguousCreate] = useState(false)
  const [ambiguousQuestionSave, setAmbiguousQuestionSave] = useState(false)
  const pendingCreateRef = useRef<PendingExamCreate | null>(null)

  const courseCatalog = usePageResource(async () => {
    if (initialQuiz) return [] as Course[]
    const response = await getMainCourses()
    if (!response.data) throw new Error('Không thể tải danh sách khóa học chính.')
    return response.data
  }, [Boolean(initialQuiz)])

  const settingsLocked = isLocked(quizSnapshot)
  const questionsLocked = settingsLocked || ambiguousCreate || ambiguousQuestionSave
  const publishedQuiz = Boolean(quizSnapshot && quizSnapshot.status !== 'DRAFT')
  const fieldsLocked = settingsLocked || publishedQuiz || ambiguousCreate || ambiguousQuestionSave
  const structureSupported = initial ? sectionStructureIsSupported(initial, fromServerEditor(initial)) : true
  const structureReadOnly = !structureSupported
  const canEditQuestions = !questionsLocked && !publishedQuiz && !structureReadOnly
  const hasCreatedQuiz = serverQuizId !== null

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

  const validate = (publish: boolean) => {
    const title = settings.title.trim()
    if (!title) return 'Nhập tên đề thi trước khi lưu.'
    if (!serverQuizId && !settings.courseId) return 'Chọn khóa học chính cho đề thi.'
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
    }
    return ''
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
    if (busy) return
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
          existingIds: new Set(existing.map((quiz) => quiz.id)),
          startedAt: Date.now(),
          createdById: currentUser?.id ?? null,
          title: settings.title.trim(),
          courseId: settings.courseId,
          durationMinutes,
          maxAttempts,
          passingPercentage,
          showAnswers: settings.showAnswers,
          practiceAllowed: settings.practiceAllowed,
          availableFrom: dateTimeMillis(fromDateTimeLocal(settings.availableFrom)),
          availableUntil: dateTimeMillis(fromDateTimeLocal(settings.availableUntil)),
        }
        pendingCreateRef.current = pending
        try {
          const created = await createTeacherQuiz({
            type: 'EXAM',
            courseId: settings.courseId,
            title: settings.title.trim(),
            durationMinutes,
            maxAttempts,
            passingPercentage,
            showAnswers: settings.showAnswers,
            practiceAllowed: settings.practiceAllowed,
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
          ? { title: settings.title.trim() }
          : {
              title: settings.title.trim(),
              durationMinutes,
              maxAttempts,
              passingPercentage,
              showAnswers: settings.showAnswers,
              practiceAllowed: settings.practiceAllowed,
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
      <TeacherBackLink onClick={onCancel}>Quay lại danh sách đề thi</TeacherBackLink>
      <TeacherPageHeader
        title={initialQuiz ? 'Chỉnh sửa đề thi thử' : hasCreatedQuiz ? 'Hoàn thiện đề thi nháp' : 'Tạo đề thi thử'}
        description="Thiết lập khóa học, thời gian làm bài và cấu trúc câu hỏi."
        actions={quizSnapshot && <StatusBadge tone={statusTone(quizSnapshot.status)} size="sm">{statusLabel(quizSnapshot.status)}</StatusBadge>}
      />

      <Card as="section" padding="lg" radius="lg" aria-labelledby="exam-settings-title">
        <div className="mb-4">
          <CardEyebrow>THÔNG TIN VÀ QUY ĐỊNH</CardEyebrow>
          <CardTitle id="exam-settings-title" className="text-base">Cấu hình đề thi</CardTitle>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading md:col-span-2">
            Tên đề thi thử
            <input
              className="h-11 rounded-lg border border-border-primary bg-surface px-3 text-sm font-normal text-text-strong outline-none focus-visible:border-primary"
              value={settings.title}
              onChange={(event) => updateSettings('title', event.target.value)}
              placeholder="Ví dụ: Đề thi thử V-ACT số 02"
              disabled={publishedQuiz || busy}
              maxLength={500}
            />
          </label>
          {!initialQuiz && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading md:col-span-2">
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
              <span className="text-xs font-normal text-text-muted">
                Chọn khóa học mà bạn được phép quản lý; quyền sẽ được xác nhận khi lưu.
              </span>
              {courseCatalogHasError && (
                <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-danger" role="alert">
                  Không tải được danh sách khóa học chính.
                  <Button appearance="ghost" size="sm" onClick={courseCatalog.reload}>Thử tải lại</Button>
                </span>
              )}
            </label>
          )}
          {initialQuiz && (
            <div className="rounded-lg border border-border-subtle bg-surface-soft px-3 py-2.5 text-sm md:col-span-2">
              <span className="block text-xs font-semibold text-text-muted">Khóa học</span>
              <strong className="mt-1 block text-text-heading">{serverCourseName}</strong>
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
            Thời gian làm bài (phút)
            <input
              className="h-11 rounded-lg border border-border-primary bg-surface px-3 text-sm font-normal text-text-strong outline-none focus-visible:border-primary"
              type="number" min="1" max="600"
              value={settings.duration}
              onChange={(event) => updateSettings('duration', event.target.value)}
              disabled={fieldsLocked || busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
            Số lượt làm tối đa
            <input
              className="h-11 rounded-lg border border-border-primary bg-surface px-3 text-sm font-normal text-text-strong outline-none focus-visible:border-primary"
              type="number" min="1" max="999"
              value={settings.maxAttempts}
              onChange={(event) => updateSettings('maxAttempts', event.target.value)}
              disabled={fieldsLocked || busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
            Điểm đạt (%)
            <input
              className="h-11 rounded-lg border border-border-primary bg-surface px-3 text-sm font-normal text-text-strong outline-none focus-visible:border-primary"
              type="number" min="0" max="100" step="0.01"
              value={settings.passingPercentage}
              onChange={(event) => updateSettings('passingPercentage', event.target.value)}
              disabled={fieldsLocked || busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
            Bắt đầu làm bài
            <input
              className="h-11 rounded-lg border border-border-primary bg-surface px-3 text-sm font-normal text-text-strong outline-none focus-visible:border-primary"
              type="datetime-local"
              value={settings.availableFrom}
              onChange={(event) => updateSettings('availableFrom', event.target.value)}
              disabled={fieldsLocked || busy}
              required={Boolean(quizSnapshot?.availableFrom)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
            Hạn làm bài
            <input
              className="h-11 rounded-lg border border-border-primary bg-surface px-3 text-sm font-normal text-text-strong outline-none focus-visible:border-primary"
              type="datetime-local"
              value={settings.availableUntil}
              onChange={(event) => updateSettings('availableUntil', event.target.value)}
              disabled={fieldsLocked || busy}
              required={Boolean(quizSnapshot?.availableUntil)}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-heading">
            <input type="checkbox" checked={settings.showAnswers} onChange={(event) => updateSettings('showAnswers', event.target.checked)} disabled={fieldsLocked || busy} />
            Cho phép xem đáp án sau khi nộp
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-heading">
            <input type="checkbox" checked={settings.practiceAllowed} onChange={(event) => updateSettings('practiceAllowed', event.target.checked)} disabled={fieldsLocked || busy} />
            Cho phép học viên luyện tập lại
          </label>
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

      <Card as="section" padding="lg" radius="lg" aria-labelledby="exam-sections-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardEyebrow>NỘI DUNG ĐỀ THI</CardEyebrow>
            <CardTitle id="exam-sections-title" className="mb-0 text-base">Các phần và câu hỏi</CardTitle>
          </div>
          {canEditQuestions && (
            <Button appearance="outline" className="min-h-11" onClick={addSection} disabled={busy}>
              <Plus size={15} />Thêm phần thi
            </Button>
          )}
        </div>
        {structureReadOnly && (
          <div className="mb-4 rounded-xl border border-badge-warning-text/20 bg-badge-warning-bg p-3 text-sm text-badge-warning-text" role="status">
            Đề này có nhóm câu hỏi hoặc phần lồng nhau. Nội dung đang ở chế độ chỉ xem để giữ nguyên cấu trúc; bạn vẫn có thể lưu các thông tin đề thi được phép sửa.
          </div>
        )}
        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-blue bg-surface-soft p-5 text-center text-sm text-text-secondary">
            Chưa có phần thi hoặc câu hỏi. Thêm một phần để bắt đầu soạn đề.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sections.map((section, sectionIndex) => (
              <section key={section.clientId} className="rounded-xl border border-line-blue bg-surface-soft p-4">
                <div className="mb-3 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {section.unassigned ? (
                      <div>
                        <h3 className="m-0 text-sm font-bold text-text-heading">{section.title}</h3>
                        <p className="mt-1 mb-0 text-xs text-text-muted">Các câu hỏi này chưa được gán vào phần thi nào.</p>
                      </div>
                    ) : (
                      <label className="flex flex-col gap-1.5 text-xs font-bold text-text-secondary">
                        <span>Phần {sectionIndex + 1} · {section.questions.length} câu</span>
                        <input
                          className="h-10 rounded-lg border border-border-primary bg-surface px-3 text-sm font-semibold text-text-heading outline-none focus-visible:border-primary"
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
                      const editable = canEditQuestions && question.editable
                      const typeLabel = QUESTION_TYPE_OPTIONS.find((option) => option.id === question.questionType)?.label ??
                        (question.questionType === 'TRUE_FALSE' ? 'Đúng / sai' : 'Trả lời ngắn')
                      return (
                        <article key={question.clientId} className="rounded-xl border border-border-subtle bg-surface p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <strong className="text-sm text-primary">Câu {questionIndex + 1}</strong>
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
                            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
                              Loại câu hỏi
                              {question.editable ? (
                                <DropdownField
                                  ariaLabel="Loại câu hỏi"
                                  options={QUESTION_TYPE_OPTIONS}
                                  value={question.questionType}
                                  onChange={(value) => {
                                    if (!value) return
                                    const nextType = value as TeacherQuestionType
                                    updateQuestion(section.clientId, question.clientId, {
                                      questionType: nextType,
                                      options: nextType === 'LONG_ANSWER'
                                        ? []
                                        : question.options.length > 0
                                          ? question.options.map((option) => ({ ...option, correct: nextType === 'SINGLE_CHOICE' ? false : option.correct }))
                                          : Array.from({ length: 2 }, () => ({ text: '', correct: false })),
                                    })
                                  }}
                                  mobileTouchTargets
                                  isDisabled={!editable || busy}
                                />
                              ) : (
                                <span className="rounded-lg border border-border-subtle bg-surface-soft px-3 py-2.5 text-sm font-normal text-text-secondary">{typeLabel} · chỉ xem</span>
                              )}
                            </label>
                            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
                              Nội dung câu hỏi
                              <textarea
                                className="min-h-24 rounded-lg border border-border-primary bg-surface px-3 py-2.5 text-sm font-normal leading-6 text-text-strong outline-none focus-visible:border-primary disabled:bg-surface-soft"
                                value={question.questionText}
                                onChange={(event) => updateQuestion(section.clientId, question.clientId, { questionText: event.target.value })}
                                placeholder="Nhập nội dung câu hỏi"
                                disabled={!editable || busy}
                              />
                            </label>
                            {CHOICE_TYPES.includes(question.questionType) ? (
                              <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <span className="text-xs font-bold text-text-secondary">Lựa chọn · đánh dấu đáp án đúng</span>
                                  {editable && question.options.length < 8 && (
                                    <Button appearance="ghost" size="sm" onClick={() => updateQuestion(section.clientId, question.clientId, { options: [...question.options, { text: '', correct: false }] })} disabled={busy}>
                                      <Plus size={14} />Thêm lựa chọn
                                    </Button>
                                  )}
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                  {question.options.map((option, optionIndex) => (
                                    <label key={question.clientId + '-option-' + optionIndex} className={'flex min-w-0 items-center gap-2 rounded-lg border p-2 ' + (option.correct ? 'border-badge-success-text/40 bg-badge-success-bg' : 'border-border-subtle bg-surface')}>
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
                                      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">{String.fromCharCode(65 + optionIndex)}</span>
                                      <input
                                        className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm text-text-strong outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:text-text-muted"
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
                                          className="grid size-8 shrink-0 place-items-center rounded-md text-text-muted hover:bg-badge-danger-bg hover:text-danger"
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
                              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-heading">
                                Đáp án / hướng dẫn chấm
                                <textarea
                                  className="min-h-20 rounded-lg border border-border-primary bg-surface px-3 py-2.5 text-sm font-normal leading-6 text-text-strong outline-none focus-visible:border-primary disabled:bg-surface-soft"
                                  value={question.explanation}
                                  onChange={(event) => updateQuestion(section.clientId, question.clientId, { explanation: event.target.value })}
                                  placeholder="Nhập đáp án gợi ý hoặc tiêu chí chấm điểm"
                                  disabled={!editable || busy}
                                />
                              </label>
                            )}
                            {question.imageUrl && (
                              <a className="text-xs font-semibold text-primary underline" href={question.imageUrl} target="_blank" rel="noreferrer">Xem ảnh đính kèm</a>
                            )}
                            {editable && (
                              <div className="rounded-lg border border-border-subtle bg-surface-soft p-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-text-heading">
                                  <input type="checkbox" checked={question.needsReview} onChange={(event) => updateQuestion(section.clientId, question.clientId, { needsReview: event.target.checked })} disabled={busy} />
                                  Câu hỏi cần rà soát trước khi xuất bản
                                </label>
                                {question.needsReview && (
                                  <textarea
                                    className="mt-2 min-h-16 w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm font-normal text-text-strong outline-none focus-visible:border-primary"
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
                  <p className="m-0 rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-text-muted">Phần này chưa có câu hỏi.</p>
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

      {error && <p className="m-0 rounded-xl border border-badge-danger-text/25 bg-badge-danger-bg p-3 text-sm font-semibold text-badge-danger-text" role="alert">{error}</p>}
      {ambiguousQuestionSave && (
        <Notice tone="warning" role="alert" aria-live="assertive">
          Máy chủ có thể đã nhận một phần thay đổi câu hỏi nhưng phản hồi bị gián đoạn. Không gửi lại từ biểu mẫu này; hãy quay về danh sách và mở lại đề để kiểm tra.
        </Notice>
      )}
      {ambiguousCreate && (
        <Card as="section" padding="md" radius="lg" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="m-0 text-sm text-text-secondary">Kết quả tạo đề chưa rõ. Kiểm tra lại danh sách trước khi gửi thao tác tạo lần nữa.</p>
          <Button appearance="outline" className="min-h-11" onClick={() => void checkPendingCreate()} disabled={busy}>
            {busy ? 'Đang kiểm tra...' : 'Kiểm tra kết quả tạo'}
          </Button>
        </Card>
      )}
      <Card as="section" padding="md" radius="lg" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-xs leading-5 text-text-muted">
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
            disabled={busy || publishedQuiz || ambiguousQuestionSave}
          >
            {ambiguousCreate ? <ClipboardCheck size={15} /> : <Clock3 size={15} />}
            {busy ? 'Đang kiểm tra...' : ambiguousCreate ? 'Kiểm tra danh sách' : initialQuiz || hasCreatedQuiz ? 'Lưu thay đổi' : 'Lưu bản nháp'}
          </Button>
          {quizSnapshot?.status !== 'ARCHIVED' && (
            <Button className="min-h-11" onClick={() => void save(true)} disabled={busy || settingsLocked || publishedQuiz || ambiguousCreate || ambiguousQuestionSave}>
              <Send size={15} />{busy ? 'Đang xử lý...' : 'Lưu và xuất bản'}
            </Button>
          )}
        </div>
      </Card>
    </section>
  )
}

export default TeacherMockExams

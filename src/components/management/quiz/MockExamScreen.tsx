import QuizLabelRun from './QuizLabelRun'
import QuizQuestionSkill from './QuizQuestionSkill'
import { useQuizLabels } from './useQuizLabels'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { getCategories, type Category } from '../../../services/categoryService'
import { ForbiddenPage } from '../../console/access-states'
import QuizDetails from './QuizDetails'
import { useRef, useState, type ReactNode } from 'react'
import {
  ArrowDown,
  Eye,
  ArrowUp,
  Clock3,
  Copy,
  KeyRound,
  Pencil,
  Settings,
  Plus,
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
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { usePageResource } from '../../../hooks/usePageResource'
import Button from '../../console/button'
import PageHeading from '../../console/page-heading'
import { IconAction, RowActions } from '../../console/icon-action'
import { fieldControlClass } from '../../console/form-field'
import QuizCatalog from './QuizCatalog'
import QuizImportDialog from './QuizImportDialog'
import QuizAnswerReviewDialog from './QuizAnswerReviewDialog'
import ConfirmDialog from '../../console/confirm-dialog'
import { describePublishProblems } from './publish-problems'
import EditorFrame from './EditorFrame'
import EditorLayoutToggle from './EditorLayoutToggle'
import EditorTopBar from './EditorTopBar'
import { useEditorLayout } from './editor-layout'
import { useMinWidth } from '../../../hooks/use-min-width'
import ExamCreateDialog from './ExamCreateDialog'
import ExamSettingsSheet from './ExamSettingsSheet'
import { examSettingsOf, examUpdatePayload, isExamLocked as isLocked, validateExamSettings, type AssessmentType, type ExamSettings } from './exam-settings'
import { formatApiError } from './quiz-form-errors'
import MockExamEditorSkeleton from './MockExamEditorSkeleton'
import ExamQuestionEditor from './ExamQuestionEditor'
import ExamQuestionRail from './ExamQuestionRail'
import { CHOICE_TYPES, type DraftQuestion, type DraftSection } from './exam-draft'
import ScrollArea from '../../ui/ScrollArea'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import { useConsoleFocus } from '../../console/console-focus'
import { Skeleton } from '../../tailgrids/core/skeleton'
import Notice from '../../console/notice'

interface TeacherMockExamsProps {
  navigation?: ReactNode
  assessmentType?: AssessmentType
  readOnly?: boolean
  startCreating?: boolean
  /** The quiz open in the editor, from the address; null shows the list. */
  editorId?: string | null
  /** Opens a quiz in the editor (an id) or goes back to the list (null), through the address. */
  onEditorChange: (id: string | null) => void
  onBack: () => void
  onAction: (message: string) => void
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

function MockExamScreen({ navigation, assessmentType = 'EXAM', onAction, readOnly = true, startCreating = false, editorId = null, onEditorChange }: TeacherMockExamsProps) {
  const placement = assessmentType === 'PLACEMENT'
  const quizzes = usePageResource(() => getTeacherQuizzes(), [])
  const [creating, setCreating] = useState(!readOnly && startCreating)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TeacherQuizRecord | null>(null)
  const [answerSettingsQuiz, setAnswerSettingsQuiz] = useState<TeacherQuizRecord | null>(null)
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
      onEditorChange(exam.id)
      return
    }
    if (readOnly || busyId) return
    setBusyId(exam.id)
    try {
      const copy = await duplicateTeacherQuiz(exam.id)
      onAction('Đã tạo bản nháp để chỉnh sửa; đề gốc chưa bị thay đổi.')
      refresh()
      onEditorChange(copy.id)
    } catch (error) {
      onAction(getErrorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  if (viewingId) return <QuizDetails quizId={viewingId} onBack={() => setViewingId(null)} />

  if (!readOnly && editorId) {
    return (
      <TeacherMockExamEditor
        assessmentType={assessmentType}
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

  const examItems = (quizzes.data ?? []).filter(quiz => quiz.type === assessmentType)

  return (
    <section className="flex min-w-0 flex-col gap-5">
      <PageHeading title={navigation ? 'Bài kiểm tra' : placement ? 'Đánh giá đầu vào' : 'Bài thi thử'} readOnly={readOnly}
        action={!readOnly && <Button onClick={() => setCreating(true)}><Plus size={16} />{placement ? 'Tạo đánh giá đầu vào' : 'Tạo đề thi thử'}</Button>} />
      {navigation}
      {placement && <Notice tone="info">Tất cả đề đã xuất bản đều hiển thị trong mục đề thi thử miễn phí, đề xuất bản mới nhất lên trước. Học sinh chọn đề để thi; lần thi chính thức đầu tiên đã chấm được dùng để đánh giá năng lực theo khóa được gắn.</Notice>}
      <QuizCatalog items={examItems} status={quizzes.status}
        errorMessage={quizzes.errorMessage} onRetry={refresh} readOnly={readOnly} exam placement={placement}
        renderActions={(exam) => <RowActions>
                  <IconAction label="Xem nội dung" icon={Eye} onClick={() => setViewingId(exam.id)} />
                  {!readOnly && <>
                  <IconAction
                    label={exam.status !== 'DRAFT' || isLocked(exam) || forceCopyIds.has(exam.id) ? 'Tạo bản nháp sửa' : 'Chỉnh sửa'}
                    icon={Pencil}
                    disabled={busyId !== null}
                    onClick={() => void openExamForEdit(exam)}
                  />
                  {exam.status !== 'ARCHIVED' && (
                    <IconAction
                      label={exam.status === 'PUBLISHED' ? placement ? 'Ẩn bài' : 'Ẩn đề thi' : 'Xuất bản'}
                      icon={exam.status === 'PUBLISHED' ? X : Send}
                      disabled={busyId !== null}
                      onClick={() => void runAction(
                        exam,
                        () => exam.status === 'PUBLISHED' ? unpublishTeacherQuiz(exam.id) : publishTeacherQuiz(exam.id),
                        placement ? exam.status === 'PUBLISHED' ? 'Đã ẩn bài đánh giá đầu vào.' : 'Đã xuất bản bài đánh giá đầu vào.' : exam.status === 'PUBLISHED' ? 'Đã ẩn đề thi thử.' : 'Đã xuất bản đề thi thử.',
                        exam.status === 'PUBLISHED'
                      )}
                    />
                  )}
                  {!placement && exam.status !== 'ARCHIVED' && (
                    <IconAction label="Cấu hình xem đáp án" icon={KeyRound} disabled={busyId !== null} onClick={() => setAnswerSettingsQuiz(exam)} />
                  )}
                  <IconAction label="Sao chép thành bản nháp" icon={Copy} disabled={busyId !== null}
                    onClick={() => void runAction(exam, () => duplicateTeacherQuiz(exam.id), 'Đã sao chép đề thi thành bản nháp.')} />
                  {!isLocked(exam) && (
                    <IconAction label="Xóa đề thi" icon={Trash2} variant="danger" disabled={busyId !== null} onClick={() => setConfirmDelete(exam)} />
                  )}
                  </>}
        </RowActions>} />

      {!readOnly && creating && (
        <ExamCreateDialog assessmentType={assessmentType} onClose={() => { setCreating(false); if (startCreating) onEditorChange(null) }}
          onCreated={(created) => {
            setCreating(false)
            refresh()
            onEditorChange(created.id)
          }} />
      )}
      {!readOnly && !placement && answerSettingsQuiz && (
        <QuizAnswerReviewDialog quiz={answerSettingsQuiz} busy={busyId === answerSettingsQuiz.id}
          onCancel={() => setAnswerSettingsQuiz(null)}
          onSave={(showAnswers) => void runAction(answerSettingsQuiz, async () => {
            await updateTeacherQuiz(answerSettingsQuiz.id, { showAnswers })
            setAnswerSettingsQuiz(null)
          }, 'Đã lưu cấu hình xem đáp án.')} />
      )}
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
  assessmentType,
  quizId,
  onCancel,
  onSaved,
}: {
  assessmentType: AssessmentType
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
    return <MockExamEditorSkeleton />
  }
  if (editor.status !== 'ready' || !editor.data) {
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
  if (editor.data.quiz.type !== assessmentType) return <div className="p-6"><Notice tone="warning">Bài kiểm tra không thuộc loại đang mở. <Button appearance="outline" onClick={onCancel}>Quay lại</Button></Notice></div>
  return (
    <TeacherMockExamForm
      key={quizId}
      assessmentType={assessmentType}
      initial={editor.data}
      onCancel={onCancel}
      onSaved={onSaved}
      onReload={editor.reload}
    />
  )
}

/** A draft just made has no parts yet; it opens with an empty first part to put questions in. */
function initialSections(editor: TeacherQuizEditor) {
  return editor.sections.length === 0 && editor.questions.length === 0 ? [createDraftSection('Phần 1')] : fromServerEditor(editor)
}

function TeacherMockExamForm({
  assessmentType,
  initial,
  onCancel,
  onSaved,
  onReload,
}: {
  assessmentType: AssessmentType
  initial: TeacherQuizEditor
  onCancel: () => void
  onSaved: (message: string) => void
  onReload: () => void
}) {
  const access = useQuizAccess()
  const [layout] = useEditorLayout()
  // In the assistant's frame the settings sit beside the questions when there is room; a drawer otherwise.
  const settingsDocked = useMinWidth(1024) && layout === 'workspace'
  const placement = assessmentType === 'PLACEMENT'
  const originalEditorRef = useRef<TeacherQuizEditor | null>(initial)
  const serverQuizId = initial.quiz.id
  const quizLabels = useQuizLabels(serverQuizId)
  const [quizSnapshot, setQuizSnapshot] = useState<TeacherQuizRecord>(initial.quiz)
  const [settings, setSettings] = useState<ExamSettings>(() => examSettingsOf(initial.quiz, placement))
  const [sections, setSections] = useState<DraftSection[]>(() => initialSections(initial))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ambiguousQuestionSave, setAmbiguousQuestionSave] = useState(false)
  const [importBaseline] = useState(() => JSON.stringify({ settings, sections }))
  const hasUnsavedChanges = JSON.stringify({ settings, sections }) !== importBaseline

  const categories = usePageResource(() => placement ? getCategories() : Promise.resolve([] as Category[]), [placement])
  const categoryOptions = (categories.data ?? []).filter(category => category.active).map(category => ({ id: category.id, label: category.name }))

  const settingsLocked = isLocked(quizSnapshot)
  const questionsLocked = settingsLocked || ambiguousQuestionSave
  const publishedQuiz = quizSnapshot.status !== 'DRAFT'
  const fieldsLocked = settingsLocked || publishedQuiz || ambiguousQuestionSave
  const structureReadOnly = !sectionStructureIsSupported(initial, fromServerEditor(initial))
  // A nested structure (groups, parent sections) stays fixed, but the content of each question can still be corrected.
  const canEditContent = !questionsLocked && !publishedQuiz
  const canEditQuestions = canEditContent && !structureReadOnly
  // Questions are numbered across the whole exam, in the order they are saved.
  const numbered = sections.flatMap((section) => section.questions.map((question) => ({ section, question })))
  const activeEntry = numbered.find((entry) => entry.question.clientId === selectedId)
    ?? numbered.find((entry) => entry.section.clientId === selectedId)
    ?? (sections.some((section) => section.clientId === selectedId) ? null : numbered[0] ?? null)
  const activeSection = activeEntry?.section ?? sections.find((section) => section.clientId === selectedId) ?? sections[0] ?? null
  const railSelectedId = activeEntry ? activeEntry.question.clientId : selectedId
  const importBlockedReason = publishedQuiz || settingsLocked ? 'Chỉ nhập vào bản nháp chưa có lượt làm.'
      : ambiguousQuestionSave ? 'Tải lại bài để xác nhận kết quả lưu trước khi nhập.'
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

  /** The first problem found, and where it is: in the settings, which are then opened, or on a question, which is then shown. */
  const validate = (publish: boolean): { message: string; inSettings?: boolean; questionId?: string } => {
    const settingsError = validateExamSettings(settings, placement, quizSnapshot)
    if (settingsError) return { message: settingsError, inSettings: true }

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
        if (!section.unassigned && hasQuestions && !section.title.trim()) return { message: 'Đặt tên cho mỗi phần có câu hỏi.', questionId: section.clientId }
      }
      for (const question of nonEmptyQuestions) {
        const at = { questionId: question.clientId }
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
      if (publish && allQuestions.length === 0) return { message: 'Thêm ít nhất một câu hỏi trước khi xuất bản.' }
      if (placement && publish && allQuestions.some(question => question.questionType !== 'SINGLE_CHOICE')) return { message: 'Màn Student hiện chỉ làm được câu hỏi một đáp án. Cần hoàn thiện hỗ trợ loại câu hỏi khác trước khi xuất bản bài này.' }
    }
    return { message: '' }
  }

  const save = async (publish: boolean) => {
    if (!access.canWrite) return
    if (busy) return
    if (publishedQuiz) {
      setError('Đề đã xuất bản hoặc lưu trữ chỉ xem. Tạo bản nháp để chỉnh sửa nội dung.')
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
      if (problem.inSettings) setSettingsOpen(true)
      return
    }
    setBusy(true)
    setError('')
    const quizId = serverQuizId
    try {
      await updateTeacherQuiz(quizId, examUpdatePayload(settings, placement, settingsLocked))

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

      if (publish) await publishTeacherQuiz(quizId)
      originalEditorRef.current = await getTeacherQuiz(quizId)
      onSaved(publish ? 'Đã lưu và xuất bản đề thi thử.' : 'Đã lưu thay đổi đề thi thử.')
    } catch (saveError) {
      if (saveError instanceof AmbiguousTeacherQuestionSaveError) {
        setAmbiguousQuestionSave(true)
        setError('')
        return
      }
      let message = formatApiError(saveError)
      try {
        const refreshed = await getTeacherQuiz(quizId)
        originalEditorRef.current = refreshed
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
      setError(message)
    } finally {
      setBusy(false)
    }
  }

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
        skill={question.serverId && <QuizQuestionSkill quizId={serverQuizId} questionId={question.serverId} resource={quizLabels} />}
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
    <EditorFrame
      layout={layout}
      header={<EditorTopBar layout={layout} title={quizSnapshot.title} backLabel={backLabel} status={quizSnapshot.status} onBack={onCancel}>
        <Button appearance="ghost" aria-pressed={settingsDocked ? settingsOpen : undefined} onClick={() => setSettingsOpen((open) => !open)} disabled={busy}>
          <Settings size={15} />Thiết lập
        </Button>
        <Button appearance="ghost" className={ambiguousQuestionSave ? undefined : 'max-sm:hidden'} onClick={onCancel} disabled={busy}>
          {ambiguousQuestionSave ? 'Quay về danh sách' : 'Hủy'}
        </Button>
        <Button appearance="outline" onClick={() => void save(false)} disabled={busy || publishedQuiz || ambiguousQuestionSave}>
          <Clock3 size={15} />{busy ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
        {quizSnapshot.status !== 'ARCHIVED' && (
          <Button onClick={() => void save(true)} disabled={busy || settingsLocked || publishedQuiz || ambiguousQuestionSave}>
            <Send size={15} />{busy ? 'Đang xử lý...' : 'Lưu và xuất bản'}
          </Button>
        )}
        <EditorLayoutToggle />
      </EditorTopBar>}
      notices={(error || ambiguousQuestionSave) && <>
        {error && <Notice tone="danger" role="alert" className="font-medium">{error}</Notice>}
        {ambiguousQuestionSave && (
          <Notice tone="warning" role="alert" aria-live="assertive">
            Máy chủ có thể đã nhận một phần thay đổi câu hỏi nhưng phản hồi bị gián đoạn. Không gửi lại từ biểu mẫu này; hãy quay về danh sách và mở lại đề để kiểm tra.
          </Notice>
        )}
      </>}
      rail={rail()}
      railLabel="Mục lục đề"
      aside={<ExamSettingsSheet docked={settingsDocked} open={settingsOpen} onClose={() => setSettingsOpen(false)} placement={placement} settings={settings}
        onChange={updateSettings} courseName={quizSnapshot.courseTitle || 'Khóa học đã chọn'}
        error={error && error === validateExamSettings(settings, placement, quizSnapshot) ? error : ''}
        nameDisabled={publishedQuiz || busy} rulesDisabled={fieldsLocked || busy} locked={settingsLocked} published={publishedQuiz}
        fromRequired={Boolean(quizSnapshot.availableFrom)} untilRequired={Boolean(quizSnapshot.availableUntil)} />}
    >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pt-3 sm:px-6">
              <QuizLabelRun quizId={serverQuizId} resource={quizLabels} />
              <QuizImportDialog quizId={serverQuizId} blockedReason={importBlockedReason} busy={busy} onReload={onReload} onBusyChange={setBusy} /></div>
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

      <SheetOverlay isOpen={railOpen} onOpenChange={setRailOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-80! max-w-80! border-r border-card-border bg-card-background p-0">
          <SheetTitle className="sr-only">Danh sách câu hỏi</SheetTitle>
          {rail(() => setRailOpen(false))}
        </SheetContent>
      </SheetOverlay>
    </EditorFrame>
  )
}

export default MockExamScreen

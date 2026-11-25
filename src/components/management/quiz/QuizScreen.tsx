import { useState, type ReactNode } from 'react'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { usePageResource } from '../../../hooks/usePageResource'
import { ArrowLeft, Copy, Eye, KeyRound, Pencil, Plus, Send, Trash2, X } from '../../console/icons'
import {
  deleteTeacherQuiz,
  duplicateTeacherQuiz,
  getTeacherQuizzes,
  publishTeacherQuiz,
  unpublishTeacherQuiz,
  updateTeacherQuiz,
  type TeacherQuizRecord,
} from '../../../services/teacherQuizService'
import Button from '../../console/button'
import ConfirmDialog from '../../console/confirm-dialog'
import { IconAction, RowActions } from '../../console/icon-action'
import PageHeading from '../../console/page-heading'
import QuizAnswerReviewDialog from './QuizAnswerReviewDialog'
import QuizCatalog from './QuizCatalog'
import QuizCreateDialog from './QuizCreateDialog'
import QuizDetails from './QuizDetails'
import QuizEditor from './QuizEditor'
import { isExamLocked as quizIsLocked } from './exam-settings'
import { formatApiError } from './quiz-form-errors'
import { describePublishProblems } from './publish-problems'

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

export default function QuizScreen({ navigation, course, onBack, onAction, startCreating = false, readOnly = true, editorId = null, onEditorChange }: TeacherQuizProps) {
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
      <QuizEditor
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
                    <IconAction label="Cấu hình xem đáp án" icon={KeyRound} disabled={busyId !== null} onClick={() => setAnswerSettingsQuiz(quiz)} />
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

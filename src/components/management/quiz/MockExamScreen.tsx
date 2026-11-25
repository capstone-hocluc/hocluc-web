import { useState, type ReactNode } from 'react'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { usePageResource } from '../../../hooks/usePageResource'
import { Copy, Eye, KeyRound, Pencil, Plus, Send, Trash2, X } from '../../console/icons'
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
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import ExamCreateDialog from './ExamCreateDialog'
import QuizAnswerReviewDialog from './QuizAnswerReviewDialog'
import QuizCatalog from './QuizCatalog'
import QuizDetails from './QuizDetails'
import QuizEditor from './QuizEditor'
import { isExamLocked as isLocked, type AssessmentType } from './exam-settings'
import { describePublishProblems } from './publish-problems'

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

export default function MockExamScreen({ navigation, assessmentType = 'EXAM', onAction, readOnly = true, startCreating = false, editorId = null, onEditorChange }: TeacherMockExamsProps) {
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
      <QuizEditor
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
